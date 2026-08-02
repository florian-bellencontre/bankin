/**
 * Client-side part of the Bankin' konnector.
 *
 * Bankin' put an hCaptcha in front of /v2/authenticate, so a server cannot log
 * in any more: the challenge is checked before the credentials, a wrong
 * password gets the very same `challenge_required` answer. The user therefore
 * signs in inside the webview, solving the captcha themselves.
 *
 * Every call to the Bankin' API is then made *from the webview*, so they all
 * come from the user's own IP with the webview user agent, exactly like a
 * normal use of the app. The server part never talks to Bankin': it only
 * receives the collected data and writes it to the Cozy.
 */
// Import the subpath, not the package root: the root re-exports cozy-client,
// which pulls react into the webview bundle. cozy-clisk is pinned to 0.38.2
// for the same reason, 0.42 having an "exports" field that hides this path.
import {
  ContentScript,
  RequestInterceptor
} from 'cozy-clisk/dist/contentscript'
import Minilog from '@cozy/minilog'

import { formatBanks, formatAccounts, formatOperations } from './bankin-format'

const log = Minilog('ContentScript')
Minilog.enable()

const baseUrl = 'https://app2.bankin.com'
const apiUrl = 'https://sync.bankin.com'
const bankinVersion = '2018-06-15'
// Cookie names used by the web app, read from its bundle. They are minified
// and could be renamed by a redeploy, so they are only the preferred names:
// findAccessToken/findDeviceId fall back to recognising the value itself.
const ACCESS_TOKEN_COOKIE = 'bwAt'
const DEVICE_ID_COOKIE = 'bwDi'
// Cookies that make up a Bankin session. The device id is deliberately NOT
// restored: the API ties a token to the device it was issued for, so putting
// an old device back in the page makes every freshly obtained token be
// rejected. Let the app manage bwDi itself.
// The access token is deliberately absent. Writing it back creates a second
// cookie of the same name — ours is host-only, the app's is set on the parent
// domain — and document.cookie then returns ours, hiding the live session
// behind a dead token. It only lives two hours anyway, so restoring it buys
// almost nothing.
const SESSION_COOKIES = ['bwLg', 'bwPs']
// ...but it is still part of a session and must go when we drop one.
const DEVICE_COOKIE_TO_WIPE = 'bwDi'
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// No API client is hardcoded here. It is read at runtime from the Bankin' web
// app itself (see readWebAppApiClient): the app ships its client to every
// visitor, so the konnector picks it up the same way instead of carrying a
// copy. The account fields and a build-time value still take precedence.
const DEFAULT_CLIENT_ID = process.env.DEFAULT_CLIENT_ID
const DEFAULT_CLIENT_SECRET = process.env.DEFAULT_CLIENT_SECRET

// Always re-read this many days, whatever is already saved: a bank can
// confirm an operation days late, and a pending one changes when it settles.
const ALWAYS_REFETCH_DAYS = 30
// A quiet stretch longer than this between two saved days is treated as a
// missed run rather than a bank that moved no money.
const HOLE_GAP_DAYS = 10
// When the saved history stops dead (the old 3 month window), extend it by
// this much per run instead of pulling everything at once.
const BACKFILL_DAYS = 180

// CouchDB refuses documents above 8 MB and the payload rides in the account
// document; ~370 bytes per operation leaves plenty of room at this size.
const MAX_OPERATIONS_PER_BATCH = 5000

/**
 * Cut the collected data into slices small enough for the account document.
 * Every slice carries all the accounts: the server part needs them to attach
 * the operations, and they are tiny compared to the operations.
 */
const splitOperations = (bankinData, size) => {
  const { accounts, allOperations } = bankinData
  if (allOperations.length <= size) return [bankinData]
  const batches = []
  for (let i = 0; i < allOperations.length; i += size) {
    batches.push({ accounts, allOperations: allOperations.slice(i, i + size) })
  }
  return batches
}

// The access token lives two hours (maxAge 0x1c20 in the app bundle). It is
// written back with exactly that lifetime, and never restored once older,
// so the page cannot end up holding a token that outlived its validity.
const TOKEN_LIFETIME_SECONDS = 7200

// After a login the app needs a moment to store its session; poll instead of
// trusting the first value the page exposes.
const SESSION_READY_ATTEMPTS = 6
const SESSION_READY_DELAY_MS = 1000

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const dateMinusDays = (day, count) => {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - count)
  return date.toISOString().slice(0, 10)
}

const daysBetween = (from, to) =>
  Math.round(
    (new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000
  )

// The sourceAccountIdentifier must be byte-for-byte the same on every run,
// see getUserDataFromWebsite.
const normalizeEmail = email => String(email).trim().toLowerCase()

// ---------------------------------------------------------------------------
// Watching the app's own API traffic
//
// Every version of this konnector so far tried to work out *where* the app
// keeps its session — a cookie, sessionStorage, the native jar — and every one
// of them ended up reading a token the API answered "expired" to, seconds
// after a successful login. Guessing the storage is the wrong problem.
//
// Whatever it stores and wherever it stores it, the app puts the token it
// considers current in the Authorization header of every call it makes, and
// receives a brand new one in the body of /v2/authenticate. Watching those two
// things gives the live session with no guesswork at all, and answers the
// question the logs never could: does the app re-authenticate when the user
// signs in, or does it reuse something stale?
// ---------------------------------------------------------------------------

// Requests made by the konnector carry this header so the watcher can tell
// them from the app's, and never hands back a token it supplied itself.
const OWN_REQUEST_MARK = 'X-Cozy-Konnector'

const captured = {
  accessToken: null,
  deviceId: null,
  // where the token came from, for the logs
  from: null,
  // did the app really call /v2/authenticate during this run?
  authenticateSeen: false
}

const resetCapturedAuth = () => {
  captured.accessToken = null
  captured.deviceId = null
  captured.from = null
  captured.authenticateSeen = false
}

const headerLookup = headers => name => {
  if (!headers) return null
  if (typeof headers.get === 'function') return headers.get(name)
  const key = Object.keys(headers).find(
    candidate => candidate.toLowerCase() === name.toLowerCase()
  )
  return key ? headers[key] : null
}

/**
 * Record the session carried by a request the app just made.
 * Only requests to the API count, and only the app's own: ours are marked.
 */
const rememberRequest = (url, headers, from) => {
  if (!url || !String(url).includes('sync.bankin.com')) return
  const header = headerLookup(headers)
  if (header(OWN_REQUEST_MARK)) return
  const authorization = header('Authorization') || ''
  const token = authorization.replace(/^Bearer\s+/i, '').trim()
  const device = header('Bankin-Device')
  if (device) captured.deviceId = device
  if (!token) return
  if (token !== captured.accessToken) {
    captured.accessToken = token
    captured.from = from
  }
}

/**
 * Patch fetch and XHR to read the Authorization header off the app's calls.
 * Nothing is read from the responses here and no value is ever logged.
 */
const watchApiTraffic = () => {
  const savedFetch = window.fetch
  window.fetch = function (input, options) {
    try {
      const url =
        typeof input === 'string'
          ? input
          : (input && input.url) || String(input)
      const headers =
        (options && options.headers) || (input && input.headers) || null
      rememberRequest(url, headers, 'a fetch call')
    } catch (err) {
      log.warn(`Could not watch a fetch call: ${err.message}`)
    }
    return savedFetch.apply(window, arguments)
  }

  const savedOpen = window.XMLHttpRequest.prototype.open
  const savedSetRequestHeader = window.XMLHttpRequest.prototype.setRequestHeader
  window.XMLHttpRequest.prototype.open = function (method, url) {
    this._bankinUrl = url
    this._bankinHeaders = {}
    return savedOpen.apply(this, arguments)
  }
  window.XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    try {
      if (this._bankinHeaders) {
        this._bankinHeaders[name] = value
        rememberRequest(this._bankinUrl, this._bankinHeaders, 'an xhr call')
      }
    } catch (err) {
      log.warn(`Could not watch an xhr header: ${err.message}`)
    }
    return savedSetRequestHeader.apply(this, arguments)
  }
}

// The response of a login is the only place a token appears before the app has
// stored it anywhere, so it is also the only proof that a login really
// happened. Kept apart from the header watcher: this one answers "did the app
// authenticate", the other "what is it using right now".
const requestInterceptor = new RequestInterceptor([
  {
    identifier: 'authenticate',
    method: 'POST',
    url: '/v2/authenticate',
    serialization: 'json'
  }
])
requestInterceptor.on('response', ({ identifier, response }) => {
  if (identifier !== 'authenticate') return
  captured.authenticateSeen = true
  const token = response && response.access_token
  if (token) {
    captured.accessToken = token
    captured.from = 'the login response'
  }
})
requestInterceptor.init()
watchApiTraffic()

class BankinContentScript extends ContentScript {
  // P
  async ensureAuthenticated({ account } = {}) {
    this.log('info', '📍️ ensureAuthenticated starts')

    // Copy whatever the user filled in the account to the keychain, right
    // away: the launcher overwrites auth with {accountName} as soon as it
    // knows the identifier, so these values are only readable on the first
    // runs, while they are needed on every one.
    await this.keepAccountFields(account)

    // An account created before this konnector became client-side has no
    // auth.accountName. The launcher then compares our identifier to
    // undefined, always disagrees, logs the user out and retries for ever
    // (WRONG_ACCOUNT_IDENTIFIER). Nothing here can fix it — the check runs
    // before the launcher writes the name — so at least say so out loud.
    if (account && account._id && !(account.auth && account.auth.accountName)) {
      this.log(
        'warn',
        'This account has no auth.accountName: the app will refuse every ' +
          'identifier and keep logging you out. Delete the Bankin account in ' +
          'the Cozy and add it again to get a clean one.'
      )
    }

    // Never log the user out first, unlike most konnectors: the session is
    // the only thing we have. Signing in again costs a captcha, and the token
    // only lives two hours, so an existing session is precious.
    await this.goto(baseUrl)
    await this.waitForElementInWorker('#signin_email, #root')

    // Grab the API client now, while a page of the app is loaded: it lives in
    // the app bundle, which is not reachable from the login page, and every
    // check below needs it.
    await this.getApiCredentials()

    // A token in the page only means a session was opened at some point. It
    // lives two hours, and an expired one still looks perfectly valid from
    // here, so ask the API whether it is actually still good — otherwise the
    // run goes all the way to the first API call before failing on a 401.
    if (await this.runInWorker('checkAuthenticated')) {
      if (await this.isSessionUsable()) {
        this.log('info', 'Already authenticated')
        await this.saveSession()
        return true
      }
      // Same reason as below: a dead token left in the page would satisfy
      // waitForAuthenticated straight away.
      this.log('info', 'A session is present but the API rejects it, clearing')
      await this.clearSession()
    }

    // The webview starts blank on every run, so put back the session saved
    // last time before asking anything: as long as it holds, the user has
    // nothing to do.
    if (await this.restoreSession()) {
      if (
        (await this.runInWorker('checkAuthenticated')) &&
        (await this.isSessionUsable())
      ) {
        this.log('info', 'Session restored, no need to sign in again')
        return true
      }
      // Wipe what we just put back. Those cookies are dead, and leaving them
      // in the page would make waitForAuthenticated — which polls
      // checkAuthenticated, and a token is a token — return at once, as if
      // the user had already signed in.
      this.log('info', 'The saved session has expired, clearing it')
      await this.clearSession()
    }

    // No autologin attempt on purpose: the captcha makes it pointless, and a
    // failed programmatic login is exactly what gets an account flagged.
    this.log('info', 'Not authenticated, showing the login form')
    await this.showLoginFormAndWaitForAuthentication()
    // Back to normal: incognito was only there to force a real login, and
    // leaving it on would throw the fresh session away at the end of the run.
    if (this.incognito) {
      try {
        await this.bridge.call('setIncognito', false)
        this.incognito = false
      } catch (err) {
        this.log('warn', `Could not leave incognito: ${err.message}`)
      }
    }
    // Give the app a moment to finish settling its session: it writes its
    // cookies as the dashboard loads, and reading them too early gets the
    // half-written state — which is what a token refused milliseconds after
    // a successful login looks like.
    await this.waitForSessionReady()
    await this.saveSession()
    return true
  }

  /**
   * Wait until the session in the page is actually accepted by the API.
   * Right after a login the app is still storing its token, so the first
   * value readable from the page can be the previous one, or a partial one.
   */
  // P
  async waitForSessionReady() {
    for (let attempt = 1; attempt <= SESSION_READY_ATTEMPTS; attempt++) {
      if (await this.isSessionUsable()) {
        this.log('info', `Session ready after ${attempt} attempt(s)`)
        return true
      }
      if (attempt < SESSION_READY_ATTEMPTS) {
        await sleep(SESSION_READY_DELAY_MS)
      }
    }
    this.log(
      'warn',
      'The session is still refused after the login; carrying on anyway, ' +
        'the fetch will tell'
    )
    return false
  }

  /**
   * Is the session in the page still accepted by the API? The token expires
   * after two hours and nothing in the page says so, so ask the cheapest
   * authenticated endpoint. A network problem answers "yes" on purpose: it
   * is better to try the run than to send the user through a captcha for
   * what may be a passing glitch.
   */
  // P
  async isSessionUsable() {
    const token = await this.runInWorker('findAccessToken')
    if (!token) return false
    const apiClient = await this.getApiCredentials()
    let status = await this.runInWorker('checkToken', token, apiClient)
    // Calls to the API are blocked from the login page; if that is where we
    // are, move to an app page and ask again before concluding.
    if (String(status).startsWith('network')) {
      this.log('info', 'Token check blocked, retrying from an app page')
      await this.goto(baseUrl)
      await this.waitForElementInWorker('#signin_email, #root')
      status = await this.runInWorker('checkToken', token, apiClient)
    }
    if (status === 'ok') return true
    if (String(status).startsWith('expired')) {
      // log the reason the API gave, it is the only thing that says whether
      // the token is stale, tied to another device, or something else
      this.log('info', `The access token is not accepted — ${status}`)
      return false
    }
    // Anything else means the question could not be answered: no API client,
    // or a request that did not even reach Bankin' — which happens when the
    // worker sits on the login page, where calls to the API are blocked.
    // Treating that as "probably fine" is what kept letting dead sessions
    // through, only to fail later in the middle of the fetch. A login costs
    // the user one captcha; a false positive costs the whole run.
    this.log('warn', `Could not check the token (${status}), asking to login`)
    return false
  }

  /**
   * Ask the API whether the token still works. Returns 'ok', 'expired' or a
   * short reason, never throws: an exception would reach the pilot as a bare
   * "false" and be indistinguishable from an expired token.
   */
  // W
  async checkToken(token, apiClient) {
    const { clientId, clientSecret } = this.getApiClient(apiClient)
    if (!clientId || !clientSecret) return 'no api client'
    // Describe the token without ever logging it: when the API keeps
    // refusing a freshly obtained one, the shape says whether we are even
    // reading the right value.
    this.log(
      'info',
      `Checking a token of ${String(token).length} chars ` +
        `(${/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token) ? 'jwt' : 'opaque'}), ` +
        `device ${this.findDeviceId() ? 'present' : 'MISSING'}, ` +
        `cookies: ${
          this.getCookies()
            .map(cookie => cookie.name)
            .join(',') || 'none'
        }`
    )
    try {
      const response = await window.fetch(`${apiUrl}/v2/users/me`, {
        headers: {
          [OWN_REQUEST_MARK]: '1',
          'Bankin-Version': bankinVersion,
          'Bankin-Device': this.findDeviceId(),
          'Client-Id': clientId,
          'Client-Secret': clientSecret,
          Authorization: `Bearer ${token}`
        }
      })
      if (response.ok) return 'ok'
      // The body names the actual reason (expired_token, invalid_token,
      // device_mismatch...). Without it a 401 says nothing about what to fix.
      let detail = ''
      try {
        detail = (await response.text()).slice(0, 200)
      } catch (err) {
        detail = '(no body)'
      }
      if (response.status === 401 || response.status === 403) {
        return `expired: ${detail}`
      }
      return `http ${response.status}: ${detail}`
    } catch (err) {
      return `network: ${err.message}`
    }
  }

  /**
   * The account fields (login, and the optional API client) only survive
   * until the launcher rewrites auth with the account name, so copy them to
   * the keychain while they can still be read.
   */
  // P
  async keepAccountFields(account) {
    const auth = (account && account.auth) || {}
    const worth = ['login', 'email', 'password', 'clientId', 'clientSecret']
      .filter(key => auth[key])
      .reduce((kept, key) => {
        kept[key === 'login' ? 'email' : key] = auth[key]
        return kept
      }, {})
    if (!Object.keys(worth).length) return false
    try {
      const previous = (await this.getCredentials()) || {}
      await this.saveCredentials({ ...previous, ...worth })
      this.log(
        'info',
        `Kept the account fields: ${Object.keys(worth).join(', ')}`
      )
      return true
    } catch (err) {
      this.log('warn', `Could not keep the account fields: ${err.message}`)
      return false
    }
  }

  /**
   * Drop the session from the page. Used when a token turns out to be dead:
   * leaving it there would fool waitForAuthenticated, which only looks for
   * the presence of a token.
   */
  // P
  async clearSession() {
    await this.runInWorker('wipeSessionCookies')
    // Forget the token captured earlier too, otherwise fetch() would happily
    // reuse the expired one it was handed before the check.
    if (this.store) {
      delete this.store.accessToken
      delete this.store.deviceId
    }
    await this.goto(`${baseUrl}/signin`)
    await this.waitForElementInWorker('#signin_email')

    // document.cookie only reaches the cookies the page can see; the webview
    // keeps its own jar. When an expired token survives there, the app reads
    // it on load, believes it is still signed in, never calls
    // /v2/authenticate — and the user signs in on a form that hands back the
    // very same dead token. Incognito is the only way to make the webview
    // start from nothing.
    if (await this.runInWorker('findAccessToken')) {
      this.log(
        'info',
        'A token survived in the webview jar, restarting it incognito so the ' +
          'app really signs in again'
      )
      try {
        await this.bridge.call('setIncognito', true)
        this.incognito = true
        await this.goto(`${baseUrl}/signin`)
        await this.waitForElementInWorker('#signin_email')
      } catch (err) {
        this.log('warn', `Could not switch to incognito: ${err.message}`)
      }
    }
  }

  // W
  async wipeSessionCookies() {
    // Dropping a session means forgetting the token seen on the wire too,
    // otherwise findAccessToken would keep handing back the dead one it
    // captured before the wipe.
    resetCapturedAuth()
    // Every cookie the app owns, not just the ones we know by name: a
    // leftover would be mistaken for a token by findAccessToken. The device
    // id is kept: it identifies this webview to Bankin', a token is issued
    // for it, and removing it makes the app register a new device on every
    // login for nothing.
    const names = new Set(
      [
        ...SESSION_COOKIES,
        ...this.getCookies()
          .map(cookie => cookie.name)
          .filter(name => /^bw[A-Za-z]{2}$/.test(name)),
        // the access token is not in SESSION_COOKIES any more, but a copy
        // written by an older version may still shadow the live one
        ACCESS_TOKEN_COOKIE
      ].filter(name => name !== DEVICE_COOKIE_TO_WIPE)
    )
    // A cookie is only removed by an expiry that repeats its exact domain and
    // path. The app sets some of them on the bare host and others on the
    // parent domain, and document.cookie does not say which — so expire every
    // combination.
    const host = window.location.hostname
    const domains = [
      null, // no domain attribute: matches the ones set without it
      host, // app2.bankin.com
      `.${host}`,
      host.split('.').slice(-2).join('.'), // bankin.com
      `.${host.split('.').slice(-2).join('.')}`
    ]
    const past = 'expires=Thu, 01 Jan 1970 00:00:00 GMT'
    for (const name of names) {
      for (const domain of domains) {
        for (const path of ['/', window.location.pathname]) {
          document.cookie =
            `${name}=;path=${path};${past}` +
            (domain ? `;domain=${domain}` : '')
        }
      }
    }
    try {
      window.sessionStorage.removeItem('ACCESS_TOKEN')
      window.localStorage.removeItem('ACCESS_TOKEN')
    } catch (err) {
      // storage disabled, the cookies were the important part
    }
    return true
  }

  /**
   * Keep the session cookies so the next run does not have to ask for a new
   * login. They are stored in the phone keychain, per account.
   */
  // P
  async saveSession() {
    const cookies = await this.runInWorker('readSessionCookies')
    if (!cookies || !cookies.length) {
      this.log('info', 'No session cookie to save')
      return false
    }
    let saved = 0
    for (const cookie of cookies) {
      try {
        await this.bridge.call('saveCookieToKeychain', cookie)
        saved++
      } catch (err) {
        this.log('warn', `Could not save the cookie ${cookie.name}`)
      }
    }
    if (saved) {
      // Remember when: a token older than its two hour life must not be put
      // back, it would be read as the current session and refused.
      try {
        const credentials = (await this.getCredentials()) || {}
        await this.saveCredentials({
          ...credentials,
          sessionSavedAt: String(Date.now())
        })
      } catch (err) {
        this.log('warn', `Could not record the session date: ${err.message}`)
      }
    }
    this.log('info', `Saved ${saved} session cookie(s) for the next run`)
    return saved > 0
  }

  /**
   * Put back the cookies saved by a previous run. Returns false when there is
   * nothing to restore, so the caller knows a login is unavoidable.
   */
  // P
  async restoreSession() {
    this.log('info', 'Looking for a saved session')
    // Skip the whole dance when the saved session cannot possibly still be
    // valid: restoring a dead token only gets it read back as the current
    // one, and the API then answers expired_token on a fresh login.
    const credentials = (await this.getCredentials()) || {}
    const savedAt = Number(credentials.sessionSavedAt || 0)
    if (savedAt) {
      const ageSeconds = Math.round((Date.now() - savedAt) / 1000)
      if (ageSeconds > TOKEN_LIFETIME_SECONDS) {
        this.log(
          'info',
          `The saved session is ${Math.round(ageSeconds / 60)} min old, ` +
            'past its two hour life: not restoring it'
        )
        return false
      }
      this.log('info', `The saved session is ${ageSeconds}s old`)
    }
    const restored = []
    for (const name of SESSION_COOKIES) {
      let cookie
      try {
        cookie = await this.bridge.call('getCookieFromKeychainByName', name)
      } catch (err) {
        this.log('warn', `Could not read the saved cookie ${name}`)
        continue
      }
      if (cookie && cookie.value) {
        restored.push({ name, value: cookie.value })
      }
    }
    if (!restored.length) {
      this.log('info', 'No saved session')
      return false
    }
    await this.runInWorker('writeSessionCookies', restored)
    // the app reads its cookies on start, so reload for them to take effect
    await this.goto(baseUrl)
    await this.waitForElementInWorker('#signin_email, #root')
    this.log('info', `Restored ${restored.length} session cookie(s)`)
    return true
  }

  // W
  async readSessionCookies() {
    const cookies = this.getCookies()
      .filter(cookie => SESSION_COOKIES.includes(cookie.name))
      .map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: window.location.hostname,
        path: '/'
      }))
    return cookies
  }

  // W
  async writeSessionCookies(cookies) {
    for (const cookie of cookies) {
      // Two hours, exactly like the app does: writing the token with a one
      // year lifetime made it outlive its own validity in the page, so a
      // later run kept reading a long-dead token instead of the fresh one.
      document.cookie = `${cookie.name}=${encodeURIComponent(
        cookie.value
      )};path=/;max-age=${TOKEN_LIFETIME_SECONDS}`
    }
    return true
  }

  /**
   * Called by the launcher when the user asks to reconnect the account. This
   * is the only place allowed to drop the session.
   */
  // P
  async ensureNotAuthenticated() {
    this.log('info', '📍️ ensureNotAuthenticated starts')
    await this.goto(baseUrl)
    await this.waitForElementInWorker('#signin_email, #root')
    if (!(await this.runInWorker('checkAuthenticated'))) {
      this.log('info', 'Already logged out')
      return true
    }
    this.log('info', 'Clearing the session')
    await this.evaluateInWorker(function clearSession() {
      window.localStorage.clear()
      window.sessionStorage.clear()
      document.cookie.split(';').forEach(cookie => {
        const name = cookie.split('=')[0].trim()
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
      })
    })
    await this.goto(`${baseUrl}/signin`)
    await this.waitForElementInWorker('#signin_email')
    return true
  }

  // W
  async checkAuthenticated() {
    // Watch the login fields while the user types: their email is what gives
    // a stable sourceAccountIdentifier. This method is polled during the
    // login, so it doubles as the place to (re)install the listeners.
    // 'input' as well as 'change': the app may submit before a change event
    // is emitted, and then the page is gone.
    for (const [selector, key] of [
      ['#signin_email', 'email'],
      ['#signin_password', 'password']
    ]) {
      const field = document.querySelector(selector)
      if (field && !field.dataset.cliskListener) {
        field.dataset.cliskListener = '1'
        const send = () => {
          if (field.value) {
            this.sendToPilot({ [key]: field.value })
          }
        }
        field.addEventListener('input', send)
        field.addEventListener('change', send)
      }
    }
    // Do not rely on the token alone: the app stores it either in a cookie or
    // in sessionStorage, and it may even be HttpOnly, in which case the page
    // cannot see it at all and the login would never be detected. Leaving the
    // signin page is the reliable signal.
    // Being on the login page means not authenticated, whatever token may be
    // lying around: a cookie we failed to expire would otherwise end the wait
    // immediately and close the form under the user's eyes.
    const onSignInPage =
      window.location.pathname.startsWith('/signin') ||
      Boolean(document.querySelector('#signin_email'))
    if (onSignInPage) return false

    // Only now is a token worth keeping. Sending it from the login page would
    // hand over the stale one that survived the wipe, and it would then be
    // used instead of the one the user just obtained.
    const token = this.findAccessToken()
    if (token) {
      this.sendToPilot({ accessToken: token, deviceId: this.findDeviceId() })
    }
    return true
  }

  /**
   * Put the saved identifiers back in the form before showing it. They are
   * already in the Cozy account, so retyping them every run is pure friction.
   *
   * Prefilled, never submitted: the captcha needs a human anyway, and a
   * programmatic login attempt is exactly what gets an account flagged.
   */
  // P
  async prefillLoginForm() {
    const credentials = (await this.getCredentials()) || {}
    const email = credentials.email || (this.store && this.store.email)
    const password = credentials.password || (this.store && this.store.password)
    if (!email && !password) {
      this.log('info', 'Nothing saved to prefill the login form with')
      return false
    }
    // Only ever log which fields were filled, never what went in them.
    const filled = await this.runInWorker('fillLoginForm', email, password)
    if (filled && filled.length) {
      this.log('info', `Login form prefilled (${filled.join(', ')})`)
      return true
    }
    this.log('info', 'The login form was not there to be prefilled')
    return false
  }

  // W
  fillLoginForm(email, password) {
    // React keeps its own copy of the value and ignores a plain assignment,
    // leaving the field looking filled while the app still submits an empty
    // one. Going through the native setter is what makes it notice.
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set
    const filled = []
    for (const [selector, value, name] of [
      ['#signin_email', email, 'email'],
      ['#signin_password', password, 'password']
    ]) {
      if (!value) continue
      const field = document.querySelector(selector)
      if (!field) continue
      nativeSetter.call(field, value)
      field.dispatchEvent(new Event('input', { bubbles: true }))
      field.dispatchEvent(new Event('change', { bubbles: true }))
      filled.push(name)
    }
    return filled
  }

  // P
  async showLoginFormAndWaitForAuthentication() {
    this.log('info', '📍️ showLoginFormAndWaitForAuthentication starts')
    await this.prefillLoginForm()
    await this.setWorkerState({ visible: true })
    await this.runInWorkerUntilTrue({
      method: 'waitForAuthenticated',
      // the default timeout is short for a login that needs a captcha
      timeout: 5 * 60 * 1000
    })
    await this.setWorkerState({ visible: false })

    // The one thing the logs never said. If the app did not authenticate,
    // then whatever token is readable afterwards is not a new one, and no
    // amount of looking for it in a better place will help.
    const seen = (await this.runInWorker('readCapturedAuth')) || {}
    if (seen.authenticateSeen) {
      this.log('info', 'The app called /v2/authenticate: this login is real')
    } else {
      this.log(
        'warn',
        'The app never called /v2/authenticate during this login: it reused a ' +
          'session it already had'
      )
    }
    this.log(
      'info',
      seen.hasToken
        ? `Token captured from ${seen.from} (${seen.tokenLength} chars)`
        : 'No token seen on the app traffic, falling back to the stored ones'
    )
  }

  /**
   * The API client id/secret, in order of preference:
   *  1. the account's advanced fields, kept in the phone keychain
   *  2. the Bankin' web app itself, which ships its own client to every
   *     visitor (see readWebAppApiClient)
   * Nothing is hardcoded in this konnector.
   */
  // P
  async getApiCredentials() {
    // Read once per run: it is asked for at several points, and reading it
    // depends on the page currently loaded — from /signin the app bundle is
    // not reachable, and a miss there used to silently disable the token
    // check.
    if (this.apiCredentials) return this.apiCredentials

    const credentials = await this.getCredentials()
    if (credentials && credentials.clientId && credentials.clientSecret) {
      this.log('info', 'API client from the saved credentials')
      this.apiCredentials = {
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret
      }
      return this.apiCredentials
    }

    const fromWebApp = await this.runInWorker('readWebAppApiClient')
    if (fromWebApp && fromWebApp.clientId && fromWebApp.clientSecret) {
      this.log('info', 'API client read from the Bankin web app')
      this.apiCredentials = fromWebApp
      // Keep it for the next runs: the app bundle is only readable from its
      // own pages, and this saves re-downloading it every time.
      try {
        await this.saveCredentials({ ...(credentials || {}), ...fromWebApp })
      } catch (err) {
        this.log('warn', `Could not keep the API client: ${err.message}`)
      }
      return this.apiCredentials
    }

    this.log('warn', 'Could not determine the API client')
    return null
  }

  /**
   * Read the API client out of the web app's own javascript bundle. The app
   * declares it next to the API base url, and its client secret is the only
   * 64 character literal of the bundle. Doing it at runtime keeps those
   * values out of this repository, and follows Bankin' if they rotate them.
   */
  // W
  async readWebAppApiClient() {
    try {
      const scripts = [...document.querySelectorAll('script[src]')]
        .map(script => script.src)
        .filter(src => src.includes('/static/js/'))
      for (const src of scripts) {
        const source = await window.fetch(src).then(response => response.text())
        // '<api url>','<32 hex client id>'
        const idMatch = source.match(
          /sync\.bankin\.com\/v2['"],\s*['"]([0-9a-f]{32})['"]/
        )
        if (!idMatch) continue
        const secretMatch = source.match(/['"]([0-9a-zA-Z]{64})['"]/)
        if (!secretMatch) continue
        return { clientId: idMatch[1], clientSecret: secretMatch[1] }
      }
      return null
    } catch (err) {
      this.log('warn', `Could not read the web app api client: ${err.message}`)
      return null
    }
  }

  /**
   * Last resort when the token cannot be seen from the page: the launcher can
   * read the native cookie jar, which also holds the HttpOnly cookies.
   * Only the pilot can call it, hence this being here and not in the worker.
   */
  // P
  async findTokenInNativeCookies() {
    this.log('info', 'Looking for the token in the native cookie jar')
    let cookies
    try {
      cookies = await this.bridge.call('getCookiesByDomain', 'app2.bankin.com')
    } catch (err) {
      this.log('warn', `Could not read the native cookies: ${err.message}`)
      return null
    }
    const names = Object.keys(cookies || {})
    this.log('info', `Native cookies: ${names.join(', ') || 'none'}`)
    const valueOf = cookie =>
      cookie && typeof cookie === 'object' ? cookie.value : cookie

    const known = valueOf(cookies && cookies[ACCESS_TOKEN_COOKIE])
    if (known) return known

    const guessedName = names.find(name => {
      const value = valueOf(cookies[name]) || ''
      return (
        value.length >= 20 &&
        !UUID_RE.test(value) &&
        !/^(bwLg|bwAm|bwCk|bwPs)$/.test(name)
      )
    })
    return guessedName ? valueOf(cookies[guessedName]) : null
  }

  /**
   * The launcher compares this to account.auth.accountName on EVERY run and,
   * when they differ, logs the user out and starts the authentication over
   * (WRONG_ACCOUNT_IDENTIFIER) — an endless login/logout loop. The value must
   * therefore be identical on every single run.
   *
   * The API answer is the most reliable source here: it identifies the
   * Bankin' account itself, while the login form is only filled in on the
   * runs where the user actually signs in. The typed email is kept as a
   * fallback for when the API cannot be reached.
   */
  // P
  async getUserDataFromWebsite() {
    this.log('info', '📍️ getUserDataFromWebsite starts')

    const token =
      (await this.runInWorker('findAccessToken')) ||
      (await this.findTokenInNativeCookies())
    const email = await this.runInWorker(
      'getUserEmail',
      token,
      await this.getApiCredentials()
    )
    if (email) {
      this.log('info', 'Identifier taken from the API')
      return { sourceAccountIdentifier: normalizeEmail(email) }
    }

    const credentials = await this.getCredentials()
    if (credentials && credentials.email) {
      this.log('info', 'Identifier taken from the saved credentials')
      return { sourceAccountIdentifier: normalizeEmail(credentials.email) }
    }

    const typedEmail = this.store && this.store.email
    if (typedEmail) {
      this.log('info', 'Identifier taken from the login form')
      return { sourceAccountIdentifier: normalizeEmail(typedEmail) }
    }

    throw new Error(
      'Could not find the user email, cannot give a sourceAccountIdentifier'
    )
  }

  // W
  async getUserEmail(givenToken, givenApiClient) {
    const token = givenToken || this.findAccessToken()
    if (!token) return null
    const { clientId, clientSecret } = this.getApiClient(givenApiClient)
    if (!clientId || !clientSecret) return null
    // Never throw from here: the caller has a fallback on the email typed in
    // the login form, and losing the identifier would abort the whole run.
    try {
      const response = await window.fetch(`${apiUrl}/v2/users/me`, {
        headers: {
          [OWN_REQUEST_MARK]: '1',
          'Bankin-Version': bankinVersion,
          'Bankin-Device': this.findDeviceId(),
          'Client-Id': clientId,
          'Client-Secret': clientSecret,
          Authorization: `Bearer ${token}`
        }
      })
      if (!response.ok) {
        this.log('warn', `/v2/users/me answered ${response.status}`)
        return null
      }
      const user = await response.json()
      return user.email || null
    } catch (err) {
      this.log('warn', `Could not reach /v2/users/me: ${err.message}`)
      return null
    }
  }

  /**
   * How far back this run has to go.
   *
   * The API is paginated newest first, so the cost of a run is the number of
   * pages walked. Two rules decide where to stop:
   *
   *  - always re-read the last ALWAYS_REFETCH_DAYS days. Banks confirm
   *    operations days after they happened, and a pending one can change its
   *    date or amount when it settles, so the recent past is never final;
   *  - if the saved history has holes — days missing inside a stretch we are
   *    supposed to have — go back to before the oldest hole to fill it.
   *
   * With nothing saved yet, take everything: that is the first import.
   */
  // P
  async getFetchSince() {
    let operations
    try {
      operations = await this.queryAll({
        toDefinition: () => ({ doctype: 'io.cozy.bank.operations' })
      })
    } catch (err) {
      this.log('warn', `Could not read the saved operations: ${err.message}`)
      return null // no idea, take everything
    }

    const saved = (operations || []).filter(
      operation => operation && operation.date
    )
    const allDays = [
      ...new Set(saved.map(operation => String(operation.date).slice(0, 10)))
    ].sort()

    if (!allDays.length) {
      this.log('info', 'No operation saved yet, importing the whole history')
      return { fallback: null, byAccount: {} }
    }

    const newest = allDays[allDays.length - 1]
    const oldest = allDays[0]

    // Holes are looked for per account, not over all of them at once. With 22
    // accounts, one of them missing three months is invisible in the union:
    // the others keep every day covered, the calendar looks continuous, and
    // nothing is ever refetched. That is exactly how a whole quarter can go
    // missing from a single account while the logs report a healthy history.
    const daysByAccount = new Map()
    for (const operation of saved) {
      const key = String(operation.vendorAccountId || '')
      if (!key) continue
      if (!daysByAccount.has(key)) daysByAccount.set(key, new Set())
      daysByAccount.get(key).add(String(operation.date).slice(0, 10))
    }

    // The truncated past: previous versions only kept a 3 month window, so
    // the history stops dead at its start instead of at the real beginning of
    // the account. That edge is a hole too, and the loop above cannot see it
    // because there is nothing saved before it. Walk back a slice at a time,
    // run after run, and stop as soon as a run brings nothing older: the
    // account has then given everything it has.
    // Compare against how far the previous run *asked*, not what it got: when
    // we already asked for older operations and the history still starts
    // here, the account simply has nothing before that date and there is no
    // point digging every run.
    const askedBefore = await this.getKnownHistoryStart()
    let deepest = null
    if (askedBefore && askedBefore < oldest) {
      this.log(
        'info',
        `History goes back to ${oldest} and ${askedBefore} was already asked ` +
          'for: nothing older to get'
      )
    } else {
      deepest = dateMinusDays(oldest, BACKFILL_DAYS)
      await this.setKnownHistoryStart(deepest)
      this.log(
        'info',
        `History starts at ${oldest}, reaching back to ${deepest} to extend it`
      )
    }

    const byAccount = {}
    let holes = 0
    for (const [vendorAccountId, daySet] of daysByAccount) {
      const days = [...daySet].sort()
      let since = dateMinusDays(days[days.length - 1], ALWAYS_REFETCH_DAYS)
      // A quiet stretch inside one account's own history: the bank did not
      // simply move no money for that long, a run was missed or cut short.
      for (let i = 1; i < days.length; i++) {
        const gap = daysBetween(days[i - 1], days[i])
        if (gap > HOLE_GAP_DAYS) {
          const holeStart = dateMinusDays(days[i - 1], 1)
          if (holeStart < since) since = holeStart
          holes++
          this.log(
            'warn',
            `Account ${vendorAccountId}: nothing between ${days[i - 1]} and ` +
              `${days[i]} (${gap} days), going back there to fill the hole`
          )
          break
        }
      }
      if (deepest && deepest < since) since = deepest
      byAccount[vendorAccountId] = since
    }

    this.log(
      'info',
      `${allDays.length} days saved (${oldest} to ${newest}) over ` +
        `${daysByAccount.size} account(s), ${holes} with a hole to fill`
    )
    // Accounts with nothing saved — new ones, and the ones that never had a
    // single operation — are not in the map and take the whole history. That
    // costs one page for an empty account, and is the only way a genuinely
    // new account gets imported in full.
    return { fallback: null, byAccount }
  }

  /**
   * The oldest day we have already imported, remembered between runs so the
   * backfill knows whether it made progress last time.
   */
  // P
  async getKnownHistoryStart() {
    const credentials = await this.getCredentials()
    return (credentials && credentials.historyStart) || null
  }

  // P
  async setKnownHistoryStart(day) {
    try {
      const credentials = (await this.getCredentials()) || {}
      await this.saveCredentials({ ...credentials, historyStart: day })
    } catch (err) {
      this.log('warn', `Could not remember the history start: ${err.message}`)
    }
  }

  // P
  async fetch(context) {
    this.log('info', '📍️ fetch starts')

    // Persist what the user typed, so that the next runs have a stable
    // sourceAccountIdentifier even when nothing is typed (see
    // getUserDataFromWebsite). The password is only stored so the account
    // behaves like other konnectors; it is never replayed, the captcha
    // makes an automatic login impossible anyway.
    //
    // The API client id/secret are kept here too: they live in the phone
    // keychain, never in the published bundle. They come from the account
    // fields, which the launcher wipes from auth once it writes accountName,
    // so this is the only place they survive from one run to the next.
    const previousCredentials = (await this.getCredentials()) || {}
    const accountAuth = (context.account && context.account.auth) || {}
    const credentials = {
      ...previousCredentials,
      ...(this.store && this.store.email ? { email: this.store.email } : {}),
      ...(this.store && this.store.password
        ? { password: this.store.password }
        : {}),
      ...(accountAuth.clientId ? { clientId: accountAuth.clientId } : {}),
      ...(accountAuth.clientSecret
        ? { clientSecret: accountAuth.clientSecret }
        : {})
    }
    if (Object.keys(credentials).length) {
      try {
        await this.saveCredentials(credentials)
      } catch (err) {
        this.log('warn', `Could not save the credentials: ${err.message}`)
      }
    }

    // Do NOT navigate before reading the token: the app keeps it in
    // sessionStorage, which is wiped by a reload, and the token grabbed
    // during the authentication is the one we want.
    // Prefer what the page holds right now over what was captured earlier:
    // after a fresh login the page has the new token, while the pilot may
    // still be holding one from before.
    let token = await this.runInWorker('findAccessToken')
    if (token === false) {
      // not "no token": the worker reloaded mid-call
      this.log('warn', 'The worker reloaded, asking for the token again')
      token = await this.runInWorker('findAccessToken')
    }
    if (token) {
      this.log('info', 'Using the token currently in the page')
    } else if (this.store && this.store.accessToken) {
      token = this.store.accessToken
      this.log('info', 'Using the token captured during the authentication')
    }
    if (token) {
      this.log('info', 'Access token available')
    } else {
      this.log('info', 'No token visible from the page, trying the cookie jar')
      token = await this.findTokenInNativeCookies()
      if (!token) {
        throw new Error(
          'Could not find the Bankin access token, neither in the page nor ' +
            'in the native cookies. The session may have expired: run the ' +
            'konnector again and sign in.'
        )
      }
      this.log('info', 'Access token found in the native cookie jar')
    }

    // Collect everything from the webview, i.e. from the user's own IP.
    // runInWorker resolves to false when the worker reloaded mid-call, so
    // retry once rather than reporting a fetch failure.
    const deviceId = (this.store && this.store.deviceId) || ''
    const apiClient = await this.getApiCredentials()
    const since = await this.getFetchSince()
    this.log(
      'info',
      `API client: ${
        apiClient ? 'from the saved credentials' : 'from the build'
      }`
    )
    let bankinData = await this.runInWorker(
      'fetchBankinData',
      token,
      deviceId,
      apiClient,
      since
    )
    if (bankinData === false) {
      this.log('warn', 'The worker returned false, retrying once')
      bankinData = await this.runInWorker(
        'fetchBankinData',
        token,
        deviceId,
        apiClient,
        since
      )
    }
    // the worker reports its failures as data, an exception would cross the
    // bridge as a bare "false" and lose the message
    if (bankinData && bankinData.error) {
      throw new Error(bankinData.error)
    }
    if (!bankinData || !bankinData.accounts) {
      // A session that expired between the check and here is by far the most
      // common cause, and it is not something the user can act on beyond
      // running the konnector again.
      if (!(await this.isSessionUsable())) {
        throw new Error(
          'The Bankin session expired during the run (the token only lives ' +
            'two hours). Run the konnector again and sign in.'
        )
      }
      throw new Error(
        'Could not fetch the accounts from the Bankin API ' +
          `(the worker returned ${JSON.stringify(bankinData)}). If this is ` +
          '"false", the webview reloaded while fetching.'
      )
    }
    this.log(
      'info',
      `Fetched ${bankinData.accounts.length} accounts and ` +
        `${bankinData.allOperations.length} operations`
    )
    if (bankinData.accounts.length === 0) {
      this.log(
        'warn',
        'The API returned no account at all: nothing will be saved'
      )
    }

    // Hand the data over to the server part, which owns the bank doctypes:
    // the clisk bridge cannot write io.cozy.bank.* itself. The payload
    // travels through the account document, and CouchDB refuses documents
    // above 8 MB, so send it in slices when the history gets long.
    const payloadSize = JSON.stringify(bankinData).length
    this.log(
      'info',
      `${Math.round(payloadSize / 1024)} KB to hand over to the server part`
    )
    const batches = splitOperations(bankinData, MAX_OPERATIONS_PER_BATCH)
    if (batches.length > 1) {
      this.log(
        'info',
        `Sending it in ${batches.length} batches to stay under the document ` +
          'size limit'
      )
    }
    for (const [index, batch] of batches.entries()) {
      if (batches.length > 1) {
        this.log(
          'info',
          `Batch ${index + 1}/${batches.length}: ` +
            `${batch.allOperations.length} operations`
        )
      }
      await this.sendToServer(context, batch)
    }
    return
  }

  /**
   * Give one slice of the collected data to the server part and wait for it
   * to be written.
   */
  // P
  async sendToServer(context, bankinData) {
    // saveAccountData and runServerJob are exposed by the flagship launcher
    // (see ReactNativeLauncher exposedMethodsNames) but cozy-clisk has no
    // wrapper for them, so go through the bridge like its own methods do.
    // The launcher hands us {manifest, account, trigger, job,
    // sourceAccountIdentifier, flags}: the existing data lives in account.data
    // and must be kept, it holds the device id used by the server part.
    const previousData = (context.account && context.account.data) || {}
    try {
      await this.bridge.call('saveAccountData', {
        ...previousData,
        bankinData
      })
    } catch (err) {
      this.log(
        'error',
        `Could not save the data on the account: ${err.message}`
      )
      throw err
    }

    // The data is safe in the account from here on: even if the job below
    // never runs, the next execution will import it.
    this.log('info', 'Starting the server job which saves the bank documents')
    let job
    try {
      job = await Promise.race([
        this.bridge.call('runServerJob', {}, { timeout: 10 * 60 * 1000 }),
        // The launcher already started a job of its own for this konnector
        // before calling fetch(); if the stack serialises them, waiting for
        // ours could last forever. Do not hang the whole run on it.
        new Promise((resolve, reject) =>
          setTimeout(
            () => reject(new Error('the server job did not finish in 10 min')),
            10 * 60 * 1000
          )
        )
      ])
    } catch (err) {
      // runServerJob is a fairly recent addition to the flagship app: on an
      // older one the bridge simply has no such method.
      this.log(
        'error',
        `The server job could not be run: ${err.message}. If this says the ` +
          'method is unknown, the Twake/Cozy app is too old for this ' +
          'konnector: update it and run again. The collected data has been ' +
          'saved and will be imported by the next run.'
      )
      throw err
    }
    // runServerJob resolves when the job is done, whether it worked or not:
    // without this the konnector would report a success on a failed import.
    const state = job && (job.attributes ? job.attributes.state : job.state)
    this.log('info', `Server job finished in state "${state}"`)
    if (state === 'errored') {
      const error =
        (job.attributes ? job.attributes.error : job.error) || 'unknown error'
      throw new Error(`The server part failed to save the data: ${error}`)
    }
  }

  // W
  async fetchBankinData(givenToken, givenDeviceId, givenApiClient, sinceSpec) {
    // First thing, before anything can throw: prove the method really ran.
    // A silent failure here used to surface as an unexplained "false".
    this.log('info', '📍️ fetchBankinData starts (in the worker)')
    // the pilot passes the token it managed to find, so that a HttpOnly
    // cookie invisible from here does not stop the run
    const token = givenToken || this.findAccessToken()
    if (!token) {
      // Most likely cause: the 2h token expired while the konnector was open.
      throw new Error(
        'No access token found in the page. Either the session expired, or ' +
          `Bankin renamed its storage (expected "${ACCESS_TOKEN_COOKIE}" or ` +
          `an ACCESS_TOKEN entry, found cookies: ${
            this.getCookies()
              .map(cookie => cookie.name)
              .join(', ') || 'none'
          })`
      )
    }
    // the pilot passes what it captured during the login: a navigation may
    // have cleared the cookies this page can see
    const deviceId = givenDeviceId || this.findDeviceId()
    if (!deviceId) {
      this.log(
        'warn',
        'No device id cookie found, calling the API without one; ' +
          'Bankin may reject the requests'
      )
    }
    const { clientId, clientSecret } = this.getApiClient(givenApiClient)
    if (!clientId || !clientSecret) {
      // Should not happen, the web app client is used by default; this only
      // triggers if someone empties both the constants and the fields.
      return {
        error:
          'No Bankin API client id/secret available. Fill the "Client ID" ' +
          'and "Client Secret" advanced fields of the account.'
      }
    }

    // Same shape as the web app's own requests: the client goes in headers,
    // not in the query string (read from its bundle).
    const call = async path => {
      const response = await window.fetch(`${apiUrl}${path}`, {
        headers: {
          [OWN_REQUEST_MARK]: '1',
          'Bankin-Version': bankinVersion,
          'Bankin-Device': deviceId,
          'Client-Id': clientId,
          'Client-Secret': clientSecret,
          Authorization: `Bearer ${token}`
        }
      })
      if (!response.ok) {
        // The body carries the real reason (expired_token, invalid_token,
        // challenge_required...); without it a 401 is unactionable.
        let detail = ''
        try {
          detail = ` - ${(await response.text()).slice(0, 200)}`
        } catch (err) {
          detail = ''
        }
        // Log before throwing: this exception crosses the bridge as a bare
        // "false", so the reason would otherwise never reach the logs.
        this.log('warn', `${path} answered ${response.status}${detail}`)
        const error = new Error(`${path} answered ${response.status}${detail}`)
        error.status = response.status
        throw error
      }
      return response.json()
    }

    this.log('info', 'Fetching the banks')
    const banks = formatBanks((await call('/v2/banks?limit=200')).resources)
    this.log('info', `Found ${Object.keys(banks).length} banks`)

    this.log('info', 'Fetching the accounts')
    const accounts = formatAccounts(
      (await call('/v2/accounts?limit=200')).resources,
      banks
    )
    this.log('info', `Found ${accounts.length} accounts`)

    const { fallback = null, byAccount = {} } = sinceSpec || {}

    let allOperations = []
    for (const account of accounts) {
      // Each account has its own starting point: one of them missing a
      // quarter must dig that far back without dragging the other 21 with it.
      const since = Object.prototype.hasOwnProperty.call(
        byAccount,
        account.vendorId
      )
        ? byAccount[account.vendorId]
        : fallback
      let path = `/v2/accounts/${account.vendorId}/transactions?limit=200`
      let pages = 0
      let stoppedEarly = false
      const before = allOperations.length
      // The API paginates, newest first; follow next_uri until it is gone or
      // until we reach operations we already have.
      while (path) {
        const page = await call(path)
        const operations = formatOperations(page.resources)
        allOperations = allOperations.concat(operations)
        pages++

        if (since && operations.length) {
          // resources are ordered newest first: once the last one of the page
          // is older than what we need, the following pages are older still
          const oldest = operations[operations.length - 1].date.slice(0, 10)
          if (oldest < since) {
            stoppedEarly = true
            break
          }
        }
        path = page.pagination && page.pagination.next_uri
      }
      this.log(
        'info',
        `Account ${account.vendorId}: ${allOperations.length - before} ` +
          `operations in ${pages} page(s)` +
          (since ? ` since ${since}` : ' (whole history)') +
          (stoppedEarly ? ', stopped there' : '')
      )
    }

    return { accounts, allOperations }
  }

  // W
  getCookie(name) {
    const found = document.cookie
      .split(';')
      .map(cookie => cookie.trim())
      .find(cookie => cookie.startsWith(`${name}=`))
    return found ? decodeURIComponent(found.slice(name.length + 1)) : null
  }

  // W
  getCookies() {
    return document.cookie
      .split(';')
      .map(cookie => cookie.trim())
      .filter(Boolean)
      .map(cookie => {
        const index = cookie.indexOf('=')
        return {
          name: cookie.slice(0, index),
          value: decodeURIComponent(cookie.slice(index + 1))
        }
      })
  }

  /**
   * Depending on a runtime check, the web app stores its token either in a
   * cookie or in sessionStorage under the literal key 'ACCESS_TOKEN'
   * (see the bundle: `isXxx() ? sessionStorage.setItem('ACCESS_TOKEN', …)
   * : cookies.set(ACCESS_TOKEN, …)`). Look in every place rather than
   * betting on one.
   */
  // W
  readStorage(key) {
    for (const storage of [window.sessionStorage, window.localStorage]) {
      try {
        const value = storage && storage.getItem(key)
        if (value) return value
      } catch (err) {
        // storage can throw when it is disabled, just skip it
      }
    }
    return null
  }

  // W
  storageEntries() {
    const entries = []
    for (const storage of [window.sessionStorage, window.localStorage]) {
      try {
        if (!storage) continue
        for (let i = 0; i < storage.length; i++) {
          const name = storage.key(i)
          entries.push({ name, value: storage.getItem(name) || '' })
        }
      } catch (err) {
        // ignore an unavailable storage
      }
    }
    return entries
  }

  /**
   * The device id is a uuid, which makes it recognisable even if the cookie
   * gets renamed.
   */
  // W
  findDeviceId() {
    // A token is issued for one device; take the one the app pairs with the
    // token we captured rather than risk mixing the two.
    if (captured.deviceId) return captured.deviceId
    const known =
      this.getCookie(DEVICE_ID_COOKIE) || this.readStorage('DEVICE_ID')
    if (known) return known
    const guessed = [...this.getCookies(), ...this.storageEntries()].find(
      entry => UUID_RE.test(entry.value)
    )
    return guessed ? guessed.value : ''
  }

  /**
   * What was seen on the app's own API traffic. Never returns the token
   * itself, only what can be said about it without writing it down.
   */
  // W
  readCapturedAuth() {
    return {
      hasToken: Boolean(captured.accessToken),
      tokenLength: captured.accessToken ? captured.accessToken.length : 0,
      from: captured.from,
      authenticateSeen: captured.authenticateSeen
    }
  }

  /**
   * The access token is the only long opaque value left once the known short
   * ones (lang, analytics, device) are ruled out.
   */
  // W
  findAccessToken() {
    // What the app is actually using beats anything found lying around: a
    // stored value can be a leftover of a previous session, the header of a
    // live request cannot.
    if (captured.accessToken) return captured.accessToken
    const known =
      this.getCookie(ACCESS_TOKEN_COOKIE) || this.readStorage('ACCESS_TOKEN')
    if (known) return known
    // Guessing by shape was meant to survive a rename, but it happily picks
    // up any leftover long value — an analytics id, a Bankin session id —
    // and calls it a token. That made "logged out" look like "logged in",
    // so the login form returned at once and the run failed later. Only
    // consider entries whose name looks like the app's own (bw + 2 letters),
    // which is what a rename would still produce.
    const guessed = [...this.getCookies(), ...this.storageEntries()].find(
      entry =>
        /^bw[A-Za-z]{2}$/.test(entry.name) &&
        !/^(bwLg|bwAm|bwCk|bwPs|bwDi)$/.test(entry.name) &&
        entry.value.length >= 20 &&
        !UUID_RE.test(entry.value)
    )
    return guessed ? guessed.value : null
  }

  /**
   * The API client credentials. They are baked in at build time, but a build
   * made without them still works if the pilot found them in the keychain
   * (see fetch), which keeps them out of a public bundle.
   */
  // W
  getApiClient(given) {
    return {
      clientId: (given && given.clientId) || DEFAULT_CLIENT_ID,
      clientSecret: (given && given.clientSecret) || DEFAULT_CLIENT_SECRET
    }
  }
}

// The interceptor must be handed over, not just created: that is what gives it
// a logger, without which it throws while reporting an interception.
const connector = new BankinContentScript({ requestInterceptor })
connector
  .init({
    additionalExposedMethodsNames: [
      'checkAuthenticated',
      'getUserEmail',
      'fetchBankinData',
      'findAccessToken',
      'readCapturedAuth',
      'fillLoginForm',
      'readWebAppApiClient',
      'checkToken',
      'readSessionCookies',
      'writeSessionCookies',
      'wipeSessionCookies'
    ]
  })
  .catch(err => {
    log.warn(err)
  })
