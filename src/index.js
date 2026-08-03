const {
  BaseKonnector,
  updateOrCreate,
  log,
  cozyClient,
  categorize
} = require('cozy-konnector-libs')
const doctypes = require('cozy-doctypes/dist')
// Not re-exported by cozy-doctypes' index, hence the deep path. This is the
// fuzzy matcher the reconciliator uses internally to recognise a transaction
// whose vendor id has changed; see dropAlreadySaved below.
const {
  matchTransactions
} = require('cozy-doctypes/dist/banking/matching-transactions')
const moment = require('moment')

const {
  Document,
  BankAccount,
  BankTransaction,
  BalanceHistory,
  BankingReconciliator
} = doctypes
BankAccount.registerClient(cozyClient)
BalanceHistory.registerClient(cozyClient)
Document.registerClient(cozyClient)

const reconciliator = new BankingReconciliator({ BankAccount, BankTransaction })

module.exports = new BaseKonnector(start)

async function start() {
  const accountData = this.getAccountData() || {}

  // This half NEVER talks to Bankin'. Their login is behind a captcha, so the
  // only thing a server request would achieve is a failed authentication,
  // which makes the Cozy ask the user to log in again. All the fetching is
  // done by the client-side part, from the user's phone, and left here.
  //
  // NB: the data cannot travel as runServerJob arguments, BaseKonnector
  // rebuilds `fields` from account.auth/oauth only and drops the rest.
  const harvested = accountData.bankinData

  if (!harvested) {
    // Expected: when the account is created the launcher fires a server job
    // of its own, before the client-side part had a chance to collect
    // anything. There is simply nothing to do yet.
    log('info', 'No data collected by the client-side part yet, nothing to do')
    return
  }

  const { accounts, allOperations } = harvested
  if (!Array.isArray(accounts) || !Array.isArray(allOperations)) {
    throw new Error(
      'The data left by the client-side part is malformed ' +
        `(accounts: ${typeof accounts}, operations: ${typeof allOperations})`
    )
  }
  log(
    'info',
    `Received #${accounts.length} accounts and #${allOperations.length} operations`
  )

  const operations = dedupePayload(filterOperations(allOperations))
  log(
    'info',
    `Keeping #${operations.length} operations out of #${allOperations.length}`
  )
  const categorizedTransactions = await categorize(operations)
  const operationsByAccount = groupByAccount(categorizedTransactions)

  let importFailed = false
  try {
    // Operations whose account was not returned by the API are what makes the
    // reconciliator throw, so leave them out — and say so, rather than losing
    // them silently.
    const knownIds = accounts.map(account => account.vendorId)
    const orphans = Object.keys(operationsByAccount).filter(
      id => !knownIds.includes(id)
    )
    if (orphans.length) {
      log(
        'warn',
        `Ignored operations belonging to unknown accounts: ${orphans.join(
          ', '
        )}`
      )
    }
    for (const account of accounts) {
      if (!operationsByAccount[account.vendorId]) {
        log('warn', `No operation for account ${account.vendorId}, skipping`)
      }
    }

    // One single call, not one per account. reconciliator.save() reloads the
    // whole transaction collection (BankTransaction.fetchAll) every time it
    // runs, so looping made the server reload it once per account — 22 times
    // per batch here, which is where the thirty seconds went. Passing every
    // account at once is safe now that the orphans above are left out: an
    // orphan transaction is the only thing that makes it throw.
    const accountsToSave = accounts.filter(
      account => operationsByAccount[account.vendorId]
    )
    const operationsToSave = await dropAlreadySaved(
      accountsToSave,
      operationsByAccount
    )
    let savedAccounts = []
    if (accountsToSave.length) {
      log(
        'info',
        `Saving #${accountsToSave.length} accounts with ` +
          `#${operationsToSave.length} operations`
      )
      // useSplitDate: false, or nothing older than a week ever gets written.
      // The reconciliator otherwise takes the most recent transaction already
      // saved, walks back seven days, and silently discards every fetched
      // operation older than that (getMissedTransactions, whose `oldestDate`
      // variable actually holds the *newest* date). Backfilling a hole is
      // exactly the case it throws away: the client part goes and gets three
      // missing months, hands them over, and they never reach CouchDB.
      // Disabling it is safe — reconciliate still recognises what is already
      // there by vendorId, which Bankin' gives us, so nothing is duplicated.
      const { accounts: saved } = await reconciliator.save(
        accountsToSave,
        operationsToSave,
        { useSplitDate: false }
      )
      savedAccounts = saved
    }
    log('info', `Saved #${savedAccounts.length} accounts`)
    const balances = await fetchBalances(savedAccounts)
    await saveBalances(balances)
  } catch (error) {
    importFailed = true
    log('error', `Could not save the bank documents: ${error.message || error}`)
    log('error', error)
  }

  try {
    log('info', 'Saving account data...')
    if (importFailed) {
      // Keep the harvested data so a new run can retry without asking the user
      // to log in again, the token being valid for two hours only.
      log('warn', 'Import failed, keeping the collected data for a retry')
    } else {
      // Drop the payload once imported: it is bulky and keeping it around
      // would make the next run import stale data.
      delete accountData.bankinData
    }
    // merge: false, otherwise saveAccountData merges with the remote data and
    // the deleted key comes back.
    await this.saveAccountData(accountData, { merge: false })
  } catch (error) {
    log('error', 'Could not save account data')
    log('error', error)
  }

  // Surface the failure: without this the job ends in "done" and the
  // client-side part reports a successful sync on an empty import.
  if (importFailed) {
    throw new Error('Could not save the bank documents, see the logs above')
  }
}

/**
 * Bankin' also returns operations that have not happened yet; keep everything
 * else.
 *
 * There used to be a three month window here, but the client-side part now
 * decides how far back to go (it knows what is already saved, and stops
 * paginating accordingly). Cutting again on this side would throw away the
 * very operations it went to fetch, and leave holes that never get filled.
 */
const filterOperations = operations => {
  const tomorrow = moment().add(1, 'days').format('YYYY-MM-DD')

  return (
    operations
      .filter(
        operation =>
          !operation.is_future &&
          // dates are 'YYYY-MM-DDT12:00:00.000Z', which still compares
          // correctly against a 'YYYY-MM-DD' bound
          operation.date < tomorrow
      )
      // is_future is only there to be filtered on, it has no place in the
      // saved io.cozy.bank.operations documents
      .map(({ is_future, ...operation }) => operation) // eslint-disable-line no-unused-vars
  )
}

/**
 * Two operations with the same vendorId in the same payload become two
 * documents, not one: bulkSave runs 30 createOrUpdate in parallel, so both
 * look for an existing document, both find nothing, and both create one. The
 * server-side fetching code used to guard against this (its filterOperations
 * kept a list of the ids it had seen); the client-side rewrite lost it, and
 * the API does hand back the same operation twice at a page boundary.
 */
const dedupePayload = operations => {
  const seen = new Set()
  const kept = operations.filter(operation => {
    const key = String(operation.vendorId)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  if (kept.length !== operations.length) {
    log(
      'warn',
      `Bankin' returned #${
        operations.length - kept.length
      } operations twice, keeping one copy of each`
    )
  }
  return kept
}

/**
 * Leave out the operations already saved under a *different* vendorId.
 *
 * Bankin' does not keep an operation's id forever: when a bank connection is
 * refreshed or re-created, the same real transaction comes back with a new id.
 * The reconciliator normally covers this — getMissedTransactions runs the fuzzy
 * matcher below over everything older than its split date, and only saves what
 * has no counterpart. But we pass useSplitDate: false (we have to, or nothing
 * older than a week is ever written), and that skips the matcher entirely, so
 * every re-issued operation lands as a second document: same date, same amount,
 * same label, and no way for the reconciliator to notice.
 *
 * So run the same matcher here, without the seven-day frontier that made the
 * option unusable in the first place.
 */
const dropAlreadySaved = async (accounts, operationsByAccount) => {
  const [stackAccounts, stackOperations] = await Promise.all([
    BankAccount.fetchAll(),
    BankTransaction.fetchAll()
  ])
  const cozyIdByVendorId = new Map(
    stackAccounts
      .filter(account => account.vendorId && account._id)
      .map(account => [String(account.vendorId), account._id])
  )
  // The matcher reads .label and .date without checking, and a document
  // written by another source may have neither.
  const usable = stackOperations.filter(
    operation => operation && operation.date && operation.label
  )

  const toSave = []
  let dropped = 0
  for (const account of accounts) {
    const vendorId = String(account.vendorId)
    const cozyId = cozyIdByVendorId.get(vendorId)
    // Both keys on purpose: vendorAccountId is what this konnector writes and
    // it survives reconciliation, while `account` catches the documents saved
    // under an account document this run no longer matches.
    const saved = usable.filter(
      operation =>
        String(operation.vendorAccountId) === vendorId ||
        (cozyId && operation.account === cozyId)
    )
    const fetched = operationsByAccount[vendorId]

    if (!saved.length) {
      toSave.push(...fetched)
      continue
    }

    const twins = new Set()
    for (const result of matchTransactions(fetched, saved)) {
      // A match on the vendor id is the normal case: the operation is already
      // there under the same id, and the reconciliator will update it in
      // place. Only a match on the *content* means a second document.
      if (
        result.match &&
        String(result.match.vendorId) !== String(result.transaction.vendorId)
      ) {
        twins.add(result.transaction)
      }
    }
    dropped += twins.size
    toSave.push(...fetched.filter(operation => !twins.has(operation)))
  }

  if (dropped) {
    log(
      'warn',
      `Left out #${dropped} operations already saved under another ` +
        `Bankin' id, they would have been duplicates`
    )
  }
  return toSave
}

const groupByAccount = transactions =>
  transactions.reduce((groups, transaction) => {
    const accountId = transaction.vendorAccountId
    if (!groups[accountId]) {
      groups[accountId] = []
    }
    groups[accountId].push(transaction)
    return groups
  }, {})

const fetchBalances = accounts => {
  const now = moment()
  const todayAsString = now.format('YYYY-MM-DD')
  const currentYear = now.year()

  return Promise.all(
    accounts.map(async account => {
      const history = await getBalanceHistory(currentYear, account._id)
      history.balances[todayAsString] = account.balance

      return history
    })
  )
}

const getBalanceHistory = async (year, accountId) => {
  const index = await cozyClient.data.defineIndex(
    'io.cozy.bank.balancehistories',
    ['year', 'relationships.account.data._id']
  )
  const options = {
    selector: { year, 'relationships.account.data._id': accountId },
    limit: 1
  }
  const [balance] = await cozyClient.data.query(index, options)

  if (balance) {
    log(
      'info',
      `Found a io.cozy.bank.balancehistories document for year ${year} and account ${accountId}`
    )
    return balance
  }

  log(
    'info',
    `io.cozy.bank.balancehistories document not found for year ${year} and account ${accountId}, creating a new one`
  )
  return getEmptyBalanceHistory(year, accountId)
}

const getEmptyBalanceHistory = (year, accountId) => {
  return {
    year,
    balances: {},
    metadata: {
      version: 1
    },
    relationships: {
      account: {
        data: {
          _id: accountId,
          _type: 'io.cozy.bank.accounts'
        }
      }
    }
  }
}

const saveBalances = balances => {
  return updateOrCreate(balances, 'io.cozy.bank.balancehistories', ['_id'])
}
