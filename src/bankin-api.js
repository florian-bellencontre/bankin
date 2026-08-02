const { requestFactory, errors, log } = require('cozy-konnector-libs')

const {
  formatBanks,
  formatAccounts,
  formatOperations
} = require('./bankin-format')

const request = requestFactory({
  // the debug mode shows all the details about http request and responses. Very useful for
  // debugging but very verbose. That is why it is commented out by default
  debug: false,
  // activates [cheerio](https://cheerio.js.org/) parsing on each page
  cheerio: false,
  // If cheerio is activated do not forget to deactivate json parsing (which is activated by
  // default in cozy-konnector-libs
  json: true,
  // this allows request-promise to keep cookies between requests
  jar: true,
  // Bankin API rejects (403) requests without user agent, 'true' will send a random realistic one
  userAgent: true
})

module.exports = class BankinApi {
  constructor(
    { clientId, clientSecret, email, password },
    { bankinDeviceId, bankinAccessToken }
  ) {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.email = email
    this.password = password
    this.bankinDeviceId = bankinDeviceId
    // Token harvested by the companion CliSK connector, which is the only way
    // past the captcha; see the comment in authenticate().
    this.savedAccessToken = bankinAccessToken
    this.baseUrl = 'https://sync.bankin.com'
    this.bankinVersion = '2018-06-15'
    this.accessToken = ''
    this.banks = []
  }

  async generateDeviceId() {
    const url = `${this.baseUrl}/v2/devices`
    const queryString = {
      client_id: this.clientId,
      client_secret: this.clientSecret
    }
    const requestPayload = {
      os: 'web',
      version: '1.0.0',
      width: 1920,
      height: 1080,
      model: 'web',
      has_fingerprint: false
    }

    const options = {
      url,
      body: requestPayload,
      json: true,
      qs: queryString,
      method: 'POST',
      headers: {
        'bankin-version': this.bankinVersion
      }
    }

    try {
      const response = await request(options)

      this.bankinDeviceId = response.udid
      return this.bankinDeviceId
    } catch (error) {
      log('error', error)
      throw new Error(errors.VENDOR_DOWN)
    }
  }

  async init() {
    if (!this.bankinDeviceId) {
      log('info', 'Generating device id ...')
      await this.generateDeviceId()
      log('info', 'Successfully generated device id')
    }

    // A token saved by a previous run is worth trying first: since Bankin' put
    // an hCaptcha in front of /v2/authenticate, a password login from a server
    // is rejected outright, so a manually provided token is the only way in.
    if (this.savedAccessToken) {
      log('info', 'Trying the access token saved by a previous run ...')
      this.accessToken = this.savedAccessToken
      if (await this.isTokenValid()) {
        log('info', 'Saved access token is still valid')
      } else {
        log('warn', 'Saved access token is no longer valid')
        this.accessToken = ''
      }
    }

    if (!this.accessToken) {
      log('info', 'Authenticating ...')
      await this.authenticate()
      log('info', 'Successfully logged in')
    }

    log('info', 'Fetching banks')
    await this.fetchBanks()
    log('info', `Found #${Object.keys(this.banks).length} banks`)
  }

  /**
   * Cheapest authenticated call we have, used to tell an expired token from a
   * working one before we start a full sync.
   */
  async isTokenValid() {
    try {
      await request({
        url: `${this.baseUrl}/v2/accounts`,
        qs: {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          limit: 1
        },
        method: 'GET',
        headers: {
          'bankin-version': this.bankinVersion,
          'bankin-device': this.bankinDeviceId,
          authorization: `Bearer ${this.accessToken}`
        }
      })
      return true
    } catch (error) {
      return false
    }
  }

  async authenticate() {
    const url = `${this.baseUrl}/v2/authenticate`
    const qs = {
      client_id: this.clientId,
      client_secret: this.clientSecret
    }

    const options = {
      url,
      qs,
      // Since 2025 the endpoint is a new service that reads the credentials
      // from a JSON body; sending them as query parameters returns a 400.
      body: {
        email: this.email,
        password: this.password
      },
      json: true,
      method: 'POST',
      headers: {
        'bankin-version': this.bankinVersion,
        'bankin-device': this.bankinDeviceId
      }
    }

    try {
      const tokens = await request(options)

      this.accessToken = tokens.access_token
      return tokens
    } catch (error) {
      // Bankin' now gates the login behind an hCaptcha challenge, which cannot
      // be solved by a server-side connector. It is a hard gate: even a wrong
      // password gets this same answer, so there is no way around it.
      if (this.isChallengeError(error)) {
        log(
          'error',
          "Bankin' asks for a captcha, which cannot be solved from a server. " +
            'Run the "Bankin\' (connexion)" connector first: it opens the login ' +
            'page so you can sign in, and stores the resulting token for this one.'
        )
        throw new Error(errors.CHALLENGE_ASKED)
      }

      throw new Error(errors.LOGIN_FAILED)
    }
  }

  isChallengeError(error) {
    const body = (error && error.error) || {}
    return (
      error.statusCode === 401 &&
      (body.error_code === 'challenge_required' ||
        String(error.message || '').includes('challenge_required'))
    )
  }

  async fetchAllOperations() {
    await this.init()
    log('info', 'Fetching the list of accounts')
    const accounts = await this.fetchAccounts()
    log('info', `Found #${accounts.length} accounts`)

    const allOperations = await this.fetchAccountsOperations(accounts)

    return { accounts, allOperations }
  }

  async fetchAccountsOperations(accounts) {
    let allOperations = []

    log('info', 'Fetching operations')
    for (let account of accounts) {
      log(
        'info',
        `Fetching operations of account ${account.vendorId} - ${account.label}`
      )
      let operations = await this.fetchOperations(account)
      log('info', `Found #${operations.length} operations`)

      allOperations = [...allOperations, ...operations]
    }
    log('info', `Found #${allOperations.length} operations before filtering`)
    allOperations = this.filterOperations(accounts, allOperations)
    log('info', `Found #${allOperations.length} operations after filtering`)

    return allOperations
  }

  filterOperations(accounts, operations) {
    const vendorsIds = accounts.map(account => account.vendorId)
    const operationsIds = []

    return operations
      .filter(operation => {
        return vendorsIds.indexOf(operation.vendorAccountId) !== -1
      })
      .filter(operation => {
        if (operationsIds.indexOf(operation.vendorId) === -1) {
          operationsIds.push(operation.vendorId)

          return true
        }

        return false
      })
  }

  async fetchBanks() {
    const url = `${this.baseUrl}/v2/banks`
    const qs = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      limit: 200
    }

    const options = {
      url,
      qs,
      method: 'GET',
      headers: {
        'bankin-version': this.bankinVersion
      }
    }

    try {
      const response = await request(options)

      this.banks = formatBanks(response.resources)
      return this.banks
    } catch (error) {
      log('error', `Could not fetch the banks: ${error.message}`)
      throw new Error(errors.VENDOR_DOWN)
    }
  }

  async fetchAccounts() {
    const url = `${this.baseUrl}/v2/accounts`
    const qs = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      limit: 200
    }

    const options = {
      url,
      qs,
      method: 'GET',
      headers: {
        'bankin-version': this.bankinVersion,
        authorization: `Bearer ${this.accessToken}`
      }
    }

    try {
      const response = await request(options)

      return formatAccounts(response.resources, this.banks)
    } catch (error) {
      log('error', `Could not fetch the accounts: ${error.message}`)
      throw new Error(errors.VENDOR_DOWN)
    }
  }

  async fetchOperations(account) {
    const url = `${this.baseUrl}/v2/accounts/${account.vendorId}/transactions`
    const qs = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      limit: 200
    }

    const options = {
      url,
      qs,
      method: 'GET',
      headers: {
        'bankin-version': this.bankinVersion,
        authorization: `Bearer ${this.accessToken}`
      }
    }
    let operations = []
    let hasNext = false

    do {
      const response = await request(options)

      operations = [...operations, ...formatOperations(response.resources)]
      hasNext = false

      if (response.pagination.next_uri) {
        hasNext = true
        options.url = `${this.baseUrl}${response.pagination.next_uri}`
      }
    } while (hasNext)

    return operations
  }
}
