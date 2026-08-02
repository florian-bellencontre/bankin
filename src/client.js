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
import { ContentScript } from 'cozy-clisk/dist/contentscript'
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
// Cookies that make up a Bankin session: the access token, the device id,
// and the two the app sets alongside them.
const SESSION_COOKIES = ['bwAt', 'bwDi', 'bwLg', 'bwPs']
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// No API client is hardcoded here. It is read at runtime from the Bankin' web
// app itself (see readWebAppApiClient): the app ships its client to every
// visitor, so the konnector picks it up the same way instead of carrying a
// copy. The account fields and a build-time value still take precedence.
const DEFAULT_CLIENT_ID = process.env.DEFAULT_CLIENT_ID
const DEFAULT_CLIENT_SECRET = process.env.DEFAULT_CLIENT_SECRET

// The sourceAccountIdentifier must be byte-for-byte the same on every run,
// see getUserDataFromWebsite.
const normalizeEmail = email => String(email).trim().toLowerCase()

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

    if (await this.runInWorker('checkAuthenticated')) {
      this.log('info', 'Already authenticated')
      await this.saveSession()
      return true
    }

    // The webview starts blank on every run, so put back the session saved
    // last time before asking anything: as long as it holds, the user has
    // nothing to do.
    if (await this.restoreSession()) {
      if (await this.runInWorker('checkAuthenticated')) {
        this.log('info', 'Session restored, no need to sign in again')
        return true
      }
      this.log('info', 'The saved session has expired')
    }

    // No autologin attempt on purpose: the captcha makes it pointless, and a
    // failed programmatic login is exactly what gets an account flagged.
    this.log('info', 'Not authenticated, showing the login form')
    await this.showLoginFormAndWaitForAuthentication()
    await this.saveSession()
    return true
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
    // The app may keep the token in sessionStorage rather than in a cookie
    // (it picks one or the other at runtime). Save it under the cookie name
    // so a single mechanism covers both cases.
    if (!cookies.some(cookie => cookie.name === ACCESS_TOKEN_COOKIE)) {
      const stored = this.readStorage('ACCESS_TOKEN')
      if (stored) {
        cookies.push({
          name: ACCESS_TOKEN_COOKIE,
          value: stored,
          domain: window.location.hostname,
          path: '/'
        })
      }
    }
    return cookies
  }

  // W
  async writeSessionCookies(cookies) {
    for (const cookie of cookies) {
      // one year, like the web app does for its device cookie; the access
      // token has its own two hour lifetime server side anyway
      document.cookie = `${cookie.name}=${encodeURIComponent(
        cookie.value
      )};path=/;max-age=31536000`
      // put the token back where the app looks for it too
      if (cookie.name === ACCESS_TOKEN_COOKIE) {
        try {
          window.sessionStorage.setItem('ACCESS_TOKEN', cookie.value)
        } catch (err) {
          // storage disabled, the cookie is enough
        }
      }
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
    const token = this.findAccessToken()
    if (token) {
      // Hand it to the pilot immediately. This method is polled during the
      // login, so we are on the live session page here; later on any
      // navigation would wipe the sessionStorage that holds it.
      this.sendToPilot({ accessToken: token, deviceId: this.findDeviceId() })
      return true
    }
    const onSignInPage =
      window.location.pathname.startsWith('/signin') ||
      Boolean(document.querySelector('#signin_email'))
    return !onSignInPage
  }

  // P
  async showLoginFormAndWaitForAuthentication() {
    this.log('info', '📍️ showLoginFormAndWaitForAuthentication starts')
    await this.setWorkerState({ visible: true })
    await this.runInWorkerUntilTrue({
      method: 'waitForAuthenticated',
      // the default timeout is short for a login that needs a captcha
      timeout: 5 * 60 * 1000
    })
    await this.setWorkerState({ visible: false })
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
    const credentials = await this.getCredentials()
    if (credentials && credentials.clientId && credentials.clientSecret) {
      this.log('info', 'API client from the account fields')
      return {
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret
      }
    }
    const fromWebApp = await this.runInWorker('readWebAppApiClient')
    if (fromWebApp && fromWebApp.clientId && fromWebApp.clientSecret) {
      this.log('info', 'API client read from the Bankin web app')
      return fromWebApp
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
    let token = this.store && this.store.accessToken
    if (token) {
      this.log('info', 'Using the token captured during the authentication')
    } else {
      this.log('info', 'No token captured yet, asking the worker')
      token = await this.runInWorker('findAccessToken')
      if (token === false) {
        // not "no token": the worker reloaded mid-call
        this.log('warn', 'The worker reloaded, asking for the token again')
        token = await this.runInWorker('findAccessToken')
      }
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
      apiClient
    )
    if (bankinData === false) {
      this.log('warn', 'The worker returned false, retrying once')
      bankinData = await this.runInWorker(
        'fetchBankinData',
        token,
        deviceId,
        apiClient
      )
    }
    // the worker reports its failures as data, an exception would cross the
    // bridge as a bare "false" and lose the message
    if (bankinData && bankinData.error) {
      throw new Error(bankinData.error)
    }
    if (!bankinData || !bankinData.accounts) {
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
    // the clisk bridge cannot write io.cozy.bank.* itself. The payload travels
    // through the account document, so keep an eye on its size.
    const payloadSize = JSON.stringify(bankinData).length
    this.log(
      'info',
      `Handing ${Math.round(payloadSize / 1024)} KB over to the server part`
    )
    if (payloadSize > 2 * 1024 * 1024) {
      this.log(
        'warn',
        'The payload is above 2 MB, the account document may be rejected'
      )
    }

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
  async fetchBankinData(givenToken, givenDeviceId, givenApiClient) {
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
        throw new Error(`${path} answered ${response.status}${detail}`)
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

    let allOperations = []
    for (const account of accounts) {
      let path = `/v2/accounts/${account.vendorId}/transactions?limit=200`
      let pages = 0
      const before = allOperations.length
      // The API paginates; follow next_uri until it is gone.
      while (path) {
        const page = await call(path)
        allOperations = allOperations.concat(formatOperations(page.resources))
        path = page.pagination && page.pagination.next_uri
        pages++
      }
      this.log(
        'info',
        `Account ${account.vendorId}: ${
          allOperations.length - before
        } operations in ${pages} page(s)`
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
    const known =
      this.getCookie(DEVICE_ID_COOKIE) || this.readStorage('DEVICE_ID')
    if (known) return known
    const guessed = [...this.getCookies(), ...this.storageEntries()].find(
      entry => UUID_RE.test(entry.value)
    )
    return guessed ? guessed.value : ''
  }

  /**
   * The access token is the only long opaque value left once the known short
   * ones (lang, analytics, device) are ruled out.
   */
  // W
  findAccessToken() {
    const known =
      this.getCookie(ACCESS_TOKEN_COOKIE) || this.readStorage('ACCESS_TOKEN')
    if (known) return known
    const guessed = [...this.getCookies(), ...this.storageEntries()].find(
      entry =>
        entry.value.length >= 20 &&
        !UUID_RE.test(entry.value) &&
        !/^(bwLg|bwAm|bwCk|bwPs)$/.test(entry.name)
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

const connector = new BankinContentScript()
connector
  .init({
    additionalExposedMethodsNames: [
      'checkAuthenticated',
      'getUserEmail',
      'fetchBankinData',
      'findAccessToken',
      'readWebAppApiClient',
      'readSessionCookies',
      'writeSessionCookies'
    ]
  })
  .catch(err => {
    log.warn(err)
  })
