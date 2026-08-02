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
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// The web client sends its credentials to a public API client; the account
// can override it with its own through the advanced fields.
const DEFAULT_CLIENT_ID = process.env.DEFAULT_CLIENT_ID
const DEFAULT_CLIENT_SECRET = process.env.DEFAULT_CLIENT_SECRET

class BankinContentScript extends ContentScript {
  // P
  async ensureAuthenticated({ account }) {
    this.log('info', '📍️ ensureAuthenticated starts')
    if (!account) {
      await this.ensureNotAuthenticated()
    }
    await this.goto(`${baseUrl}/signin`)
    await this.waitForElementInWorker('#signin_email, .accounts, #root')

    if (await this.runInWorker('checkAuthenticated')) {
      this.log('info', 'Already authenticated')
      return true
    }

    // No autologin attempt on purpose: the captcha makes it pointless, and a
    // failed programmatic login is exactly what gets an account flagged.
    await this.showLoginFormAndWaitForAuthentication()
    return true
  }

  // P
  async ensureNotAuthenticated() {
    this.log('info', '📍️ ensureNotAuthenticated starts')
    await this.goto(`${baseUrl}/signin`)
    await this.waitForElementInWorker('#signin_email, .accounts, #root')
    if (!(await this.runInWorker('checkAuthenticated'))) {
      return true
    }
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
    // Watch the login field while the user types, so that the email is known
    // even if /v2/users/me cannot be reached later.
    const emailField = document.querySelector('#signin_email')
    if (emailField && !emailField.dataset.cliskListener) {
      emailField.dataset.cliskListener = '1'
      emailField.addEventListener('change', () => {
        if (emailField.value) {
          this.sendToPilot({ email: emailField.value })
        }
      })
    }
    // Do not rely on the token alone: the app stores it either in a cookie or
    // in sessionStorage, and it may even be HttpOnly, in which case the page
    // cannot see it at all and the login would never be detected. Leaving the
    // signin page is the reliable signal.
    if (this.findAccessToken()) {
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

  // P
  async getUserDataFromWebsite() {
    this.log('info', '📍️ getUserDataFromWebsite starts')
    // same token dance as in fetch(): the page may not see a HttpOnly cookie
    const token =
      (await this.runInWorker('findAccessToken')) ||
      (await this.findTokenInNativeCookies())
    const email = await this.runInWorker('getUserEmail', token)
    if (email) {
      return { sourceAccountIdentifier: email }
    }
    // Fall back on what the user typed in the login form: losing the
    // identifier here would abort a run that could otherwise succeed.
    const typedEmail = this.store && this.store.email
    if (typedEmail) {
      this.log('info', 'Using the email from the login form')
      return { sourceAccountIdentifier: typedEmail }
    }
    throw new Error(
      'Could not find the user email, cannot give a sourceAccountIdentifier'
    )
  }

  // W
  async getUserEmail(givenToken) {
    const token = givenToken || this.findAccessToken()
    if (!token) return null
    const { clientId, clientSecret } = this.getApiClient()
    // Never throw from here: the caller has a fallback on the email typed in
    // the login form, and losing the identifier would abort the whole run.
    try {
      const response = await window.fetch(
        `${apiUrl}/v2/users/me?client_id=${encodeURIComponent(
          clientId
        )}&client_secret=${encodeURIComponent(clientSecret)}`,
        {
          headers: {
            'bankin-version': bankinVersion,
            'bankin-device': this.findDeviceId(),
            authorization: `Bearer ${token}`
          }
        }
      )
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

    // The worker reads the token from the page (cookie or sessionStorage). If
    // it cannot see it — a HttpOnly cookie is invisible to javascript — fall
    // back on the native cookie jar, which only the pilot can read.
    let token = await this.runInWorker('findAccessToken')
    if (token) {
      this.log('info', 'Access token found from the page')
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
    const bankinData = await this.runInWorker('fetchBankinData', token)
    if (!bankinData || !bankinData.accounts) {
      throw new Error('Could not fetch the accounts from the Bankin API')
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

    this.log('info', 'Starting the server job which saves the bank documents')
    let job
    try {
      job = await this.bridge.call('runServerJob')
    } catch (err) {
      // runServerJob is a fairly recent addition to the flagship app: on an
      // older one the bridge simply has no such method, which would otherwise
      // surface as an unhelpful "not a function"/timeout error.
      this.log(
        'error',
        `The server job could not be run: ${err.message}. If this says the ` +
          'method is unknown, the Twake/Cozy app is too old for this ' +
          'konnector: update it and run again.'
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
  async fetchBankinData(givenToken) {
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
    const deviceId = this.findDeviceId()
    if (!deviceId) {
      this.log(
        'warn',
        'No device id cookie found, calling the API without one; ' +
          'Bankin may reject the requests'
      )
    }
    const { clientId, clientSecret } = this.getApiClient()
    if (!clientId || !clientSecret) {
      throw new Error(
        'No API client id/secret available: the konnector was built without ' +
          'DEFAULT_CLIENT_ID/DEFAULT_CLIENT_SECRET'
      )
    }

    const call = async path => {
      const separator = path.includes('?') ? '&' : '?'
      const url =
        `${apiUrl}${path}${separator}client_id=${encodeURIComponent(
          clientId
        )}` + `&client_secret=${encodeURIComponent(clientSecret)}`
      const response = await window.fetch(url, {
        headers: {
          'bankin-version': bankinVersion,
          'bankin-device': deviceId,
          authorization: `Bearer ${token}`
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

  // W
  getApiClient() {
    return {
      clientId: DEFAULT_CLIENT_ID,
      clientSecret: DEFAULT_CLIENT_SECRET
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
      'findAccessToken'
    ]
  })
  .catch(err => {
    log.warn(err)
  })
