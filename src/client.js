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
    // The web app keeps its access token in a cookie; its presence is what
    // tells the app itself that the user is logged in.
    return Boolean(this.findAccessToken())
  }

  // P
  async showLoginFormAndWaitForAuthentication() {
    this.log('info', '📍️ showLoginFormAndWaitForAuthentication starts')
    await this.setWorkerState({ visible: true })
    await this.runInWorkerUntilTrue({ method: 'waitForAuthenticated' })
    await this.setWorkerState({ visible: false })
  }

  // P
  async getUserDataFromWebsite() {
    this.log('info', '📍️ getUserDataFromWebsite starts')
    const email = await this.runInWorker('getUserEmail')
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
  async getUserEmail() {
    const token = this.findAccessToken()
    if (!token) return null
    const { clientId, clientSecret } = this.getApiClient()
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
    if (!response.ok) return null
    const user = await response.json()
    return user.email || null
  }

  // P
  async fetch(context) {
    this.log('info', '📍️ fetch starts')

    // Collect everything from the webview, i.e. from the user's own IP.
    const bankinData = await this.runInWorker('fetchBankinData')
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
  async fetchBankinData() {
    const token = this.findAccessToken()
    if (!token) {
      // Most likely cause: the 2h token expired while the konnector was open.
      throw new Error(
        'No access token found in the page cookies. Either the session ' +
          'expired, or Bankin renamed its cookies (expected ' +
          `"${ACCESS_TOKEN_COOKIE}", found: ${
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
   * The device id is a uuid, which makes it recognisable even if the cookie
   * gets renamed.
   */
  // W
  findDeviceId() {
    const known = this.getCookie(DEVICE_ID_COOKIE)
    if (known) return known
    const guessed = this.getCookies().find(cookie => UUID_RE.test(cookie.value))
    return guessed ? guessed.value : ''
  }

  /**
   * The access token is the only long opaque cookie left once the known short
   * ones (lang, analytics, device) are ruled out.
   */
  // W
  findAccessToken() {
    const known = this.getCookie(ACCESS_TOKEN_COOKIE)
    if (known) return known
    const guessed = this.getCookies().find(
      cookie =>
        cookie.value.length >= 20 &&
        !UUID_RE.test(cookie.value) &&
        !/^(bwLg|bwAm|bwCk|bwPs)$/.test(cookie.name)
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
      'getCookie',
      'getApiClient'
    ]
  })
  .catch(err => {
    log.warn(err)
  })
