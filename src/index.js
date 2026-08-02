const {
  BaseKonnector,
  updateOrCreate,
  log,
  cozyClient,
  categorize
} = require('cozy-konnector-libs')
const doctypes = require('cozy-doctypes/dist')
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

  const operations = filterOperations(allOperations)
  log(
    'info',
    `Keeping #${operations.length} operations out of #${allOperations.length}`
  )
  const categorizedTransactions = await categorize(operations)
  const operationsByAccount = groupByAccount(categorizedTransactions)

  let importFailed = false
  try {
    // Save one account at a time: BankingReconciliator throws when a
    // transaction has no matching account, so a single unknown account would
    // otherwise discard the whole run.
    const savedAccounts = []
    for (const account of accounts) {
      const accountOperations = operationsByAccount[account.vendorId]
      if (!accountOperations) {
        log('warn', `No operation for account ${account.vendorId}, skipping`)
        continue
      }
      log(
        'info',
        `Saving account ${account.vendorId} with ` +
          `#${accountOperations.length} operations`
      )
      const { accounts: saved } = await reconciliator.save(
        [account],
        accountOperations
      )
      savedAccounts.push(saved[0])
    }
    // Operations whose account was not returned by the API would make the
    // reconciliator throw, so point them out rather than losing them silently.
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
 * Bankin' returns the full history and operations that have not happened yet;
 * we only want settled operations from the last few months.
 */
const filterOperations = operations => {
  // moment mutates, so derive each bound from its own instance
  const tomorrow = moment().add(1, 'days').format('YYYY-MM-DD')
  const threshold = moment().subtract(3, 'months').format('YYYY-MM-DD')

  return (
    operations
      .filter(
        operation =>
          !operation.is_future &&
          // dates are 'YYYY-MM-DDT12:00:00.000Z', which still compares
          // correctly against a 'YYYY-MM-DD' bound
          operation.date < tomorrow &&
          operation.date >= threshold
      )
      // is_future is only there to be filtered on, it has no place in the
      // saved io.cozy.bank.operations documents
      .map(({ is_future, ...operation }) => operation) // eslint-disable-line no-unused-vars
  )
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
