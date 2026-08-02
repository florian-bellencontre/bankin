/**
 * Turning the Bankin' API payloads into Cozy documents.
 *
 * Shared by the two halves of the konnector: the client-side part calls the
 * API from the webview, the server-side part still has its own code path for
 * standalone runs. Keeping the mapping here means both produce documents that
 * dedupe against each other.
 */
const accountTypeMapping = require('./account-type-mapping')
const operationCategoryMapping = require('./operation-category-mapping')

/**
 * The banks endpoint answers a country > parent bank > bank tree; flatten it
 * to a bank id -> bank lookup.
 */
const formatBanks = countries => {
  const banks = {}

  countries.forEach(country => {
    country.parent_banks.forEach(parentBank => {
      parentBank.banks.forEach(bank => {
        banks[bank.id] = bank
      })
    })
  })

  return banks
}

const formatAccounts = (accounts, banks) =>
  accounts.map(account => ({
    label: account.name,
    institutionLabel:
      account.bank.id in banks ? banks[account.bank.id].name : 'none',
    balance: account.balance,
    type:
      account.type in accountTypeMapping
        ? accountTypeMapping[account.type]
        : 'none',
    number: String(account.id),
    vendorId: String(account.id)
  }))

const formatOperations = operations =>
  operations.map(operation => ({
    // a bare 'YYYY-MM-DD' is parsed as UTC midnight, which can land on the
    // previous day once rendered in a western timezone: pin it to midday
    date: operation.date + 'T12:00:00.000Z',
    label: operation.description,
    originalBankLabel: operation.raw_description,
    type: 'none',
    automaticCategoryId:
      operation.category.id in operationCategoryMapping
        ? operationCategoryMapping[operation.category.id].cozyCategoryId
        : 0,
    // ISO strings rather than Date objects: the client-side part sends these
    // documents over the launcher bridge, which JSON-serialises them anyway,
    // and cozy-doctypes' matcher reads dates as strings (`op.date.substr`).
    // Keeping strings on both paths makes them produce identical documents.
    dateImport: new Date().toISOString(),
    dateOperation: new Date(operation.date).toISOString(),
    currency: operation.currency_code,
    vendorAccountId: String(operation.account.id),
    vendorId: operation.id,
    amount: operation.amount,
    // kept so the server part can filter out operations that have not
    // happened yet, then dropped before saving
    is_future: operation.is_future
  }))

module.exports = { formatBanks, formatAccounts, formatOperations }
