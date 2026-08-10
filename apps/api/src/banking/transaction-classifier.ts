import { TransactionCategory } from '@prisma/client'

/**
 * Multi-signal transaction classifier.
 *
 * Priority order:
 *   1. Direction guard  — some categories only make sense as credit or debit
 *   2. Description rules — most reliable; covers UK-specific merchants & references
 *   3. Merchant name rules
 *   4. TrueLayer category mapping — used as a tiebreaker / hint
 *   5. Direction default — credits not otherwise matched → gig_income; debits → other
 *
 * NOTE: this is the deterministic (free) first pass. Transactions left as `other`
 * by these rules are candidates for the LLM categorizer (see transaction-
 * categorizer.ts) — that pass runs only on the `other` bucket and can never
 * touch amount/date/balance.
 */

interface TxnInput {
  description: string | null
  merchantName: string | null
  amount: number
  direction: 'credit' | 'debit'
  tlCategory: string // raw TrueLayer transaction_category
}

/**
 * Clean a raw statement description so the rules below match the merchant /
 * intent rather than the bank's boilerplate wrapper. Wise (and similar fintech
 * statements) wrap every line in templates like:
 *   "Card transaction issued by Cursor Usage Mid A Card ending in 1720 ..."
 *   "Sent money to mohammed khan Transaction: TRANSFER-123 Reference: ..."
 *   "Received money from WISE PAYMENTS LT BIN with reference SalaryWiseJUL26"
 *   "Paid to BARCLAYCARD Transaction: DIRECT_DEBIT-123 Reference: ..."
 * We peel off the leading "issued by / sent money to / received money from /
 * paid to / converted to" subject and drop the trailing "Transaction: ... /
 * Reference: ... / Card ending in ..." metadata, so the rules see the part
 * that actually identifies the transaction.
 */
export function cleanDescription(raw: string): string {
  let s = raw
  // Drop trailing metadata: "Transaction: ...", "Reference: ...", "Card ending in ...",
  // "MOHAMMED ... KHAN" account-holder echoes, transaction-id fragments.
  s = s.replace(/\s+Transaction:\s+[A-Z0-9_-]+.*$/i, ' ')
  s = s.replace(/\s+Reference:\s+.*$/i, ' ')
  s = s.replace(/\s+Card ending in\s+\S+.*$/i, ' ')
  s = s.replace(/\s+with reference\s+.*$/i, ' ')
  // Collapse repeated whitespace from the stripping above.
  s = s.replace(/\s{2,}/g, ' ').trim()
  return s
}

// ─── Description rule sets ────────────────────────────────────────────────────

// Each entry: [pattern, category, direction constraint]
// direction null = applies to both
const DESCRIPTION_RULES: Array<[RegExp, TransactionCategory, 'credit' | 'debit' | null]> = [
  // ── Salary / employment income ──────────────────────────────────────────────
  [/\b(salary|salaries|payroll|wages|wage|emoluments|paye pay|employer pay|monthly pay|weekly pay)\b/i, TransactionCategory.salary, 'credit'],
  // Wise payroll credits arrive as "Received money from WISE PAYMENTS LT BIN ...
  // reference SalaryWiseJUL26" — the "wise payments" + salary-reference combo is
  // the strongest available signal that a recurring credit is salary.
  [/\bwise\s*payments\b.*\bsalary/i, TransactionCategory.salary, 'credit'],
  [/\bsalary\s*(wise|jul|jun|aug|sep|oct|nov|dec|jan|feb|mar|apr|may)\b/i, TransactionCategory.salary, 'credit'],
  [/\bwise\s*payments\b/i, TransactionCategory.salary, 'credit'],

  // ── Gig / freelance income ──────────────────────────────────────────────────
  [/\b(uber\s*(eats)?|deliveroo|just\s*eat|stuart delivery|gophr|pedal\s*me)\b/i, TransactionCategory.gig_income, 'credit'],
  [/\b(fiverr|upwork|freelancer|toptal|peopleperhour|bark\.com)\b/i, TransactionCategory.gig_income, 'credit'],
  [/\b(airbnb\s*payout|vrbo\s*payout)\b/i, TransactionCategory.gig_income, 'credit'],
  // Dividend / equity proceeds (Computershare / Citibank equity-plan credits)
  [/\b(computershare|equateplus|transaction proceeds|dividend|citibank ire fin)\b/i, TransactionCategory.gig_income, 'credit'],

  // ── Government benefits ─────────────────────────────────────────────────────
  [/\b(universal credit|uc payment|pip payment|esa payment|jsa payment|child benefit|tax credit|working tax|child tax)\b/i, TransactionCategory.government_benefit, 'credit'],
  [/\b(hmrc|dwp|department for work|jobcentre|pension credit|attendance allowance|carer.?s allowance)\b/i, TransactionCategory.government_benefit, 'credit'],

  // ── Rent / housing ──────────────────────────────────────────────────────────
  [/\b(rent|rental payment|rent payment|monthly rent|landlord|letting agent|folio|foxtons|openrent|rightmove rent|spareroom)\b/i, TransactionCategory.rent_payment, 'debit'],
  [/\b(housing association|council housing|social housing|housing benefit)\b/i, TransactionCategory.rent_payment, null],

  // ── Mortgage ── (map to loan_repayment as closest equivalent)
  [/\b(mortgage|remortgage|mortgage payment|barclays mortgage|lloyds mortgage|nationwide mortgage|santander mortgage|hsbc mortgage|natwest mortgage|halifax mortgage|virgin money mortgage)\b/i, TransactionCategory.loan_repayment, 'debit'],

  // ── Loan / credit card repayments ───────────────────────────────────────────
  [/\b(loan repayment|loan payment|personal loan|car finance|hire purchase|hp payment|pcp payment)\b/i, TransactionCategory.loan_repayment, 'debit'],
  [/\b(credit card payment|card repayment|minimum payment|amex payment|barclaycard payment|lloyds card|halifax card|capital one|vanquis|aqua card|fluid card|tesco credit|m&s credit)\b/i, TransactionCategory.loan_repayment, 'debit'],
  // "Paid to BARCLAYCARD Transaction: DIRECT_DEBIT-..." — a card-repayment DD.
  [/\b(barclaycard|amex|american express|capital one|vanquis)\b/i, TransactionCategory.loan_repayment, 'debit'],
  [/\bdirect_debit\b/i, TransactionCategory.loan_repayment, 'debit'],
  [/\b(klarna|clearpay|laybuy|payl8r|buy now pay later)\b/i, TransactionCategory.loan_repayment, 'debit'],

  // ── Utilities ───────────────────────────────────────────────────────────────
  [/\b(british gas|bg energy|eon energy|edf energy|octopus energy|bulb energy|npower|sse energy|scottish power|southern electric|ovo energy|shell energy)\b/i, TransactionCategory.utilities, 'debit'],
  [/\b(thames water|anglian water|severn trent|united utilities|yorkshire water|southern water|wessex water|dwr cymru|welsh water|affinity water|bristol water)\b/i, TransactionCategory.utilities, 'debit'],
  [/\b(bt broadband|sky broadband|virgin media|vodafone|o2\b|o2 mobile|three mobile|ee mobile|talktalk|now broadband|plusnet|hyperoptic)\b/i, TransactionCategory.utilities, 'debit'],
  [/\b(gas bill|electric bill|electricity bill|water bill|broadband bill|phone bill|council tax)\b/i, TransactionCategory.utilities, 'debit'],
  // SaaS / developer subscriptions — recurring software spend, closest fit is
  // utilities (a regular bill). Kept here rather than a new enum value so we
  // don't need a schema change for the categorizer.
  [/\b(cursor|perplexity|vercel|anthropic|claude|github|render\.com|sourcegraph|lovable|posthog|stripe\b|openai|deepseek|screwfix|supabase|railway\.com|notion|linear|figma|slack|google cloud)\b/i, TransactionCategory.utilities, 'debit'],
  // Energy/utility providers that appear as card transactions.
  [/\b(e\.?on next|e\.?on energy|npower|sse)\b/i, TransactionCategory.utilities, 'debit'],
  // Retail/online shopping where we don't have a finer category — group as
  // groceries (the closest "general spending" bucket the enum offers).
  [/\b(asos\.com|asos\b|amazon\b|ebay\b|ikea\b|argos\b|john lewis\b)\b/i, TransactionCategory.groceries, 'debit'],
  // Streaming/entertainment via card (Apple, Google YouTube, Canva, Stan).
  [/\b(apple\.com|google youtubepremium|youtube premium|canva\b|stan\.com|disney)\b/i, TransactionCategory.entertainment, 'debit'],
  // VPN / security subscriptions → utilities (recurring bill).
  [/\b(expressvpn|nordvpn|mcafee|norton|1password)\b/i, TransactionCategory.utilities, 'debit'],
  // Microsoft (365 / subscriptions) → utilities.
  [/\bpaypal\s*\*microsoft|microsoft\s*365|microsoft\b/i, TransactionCategory.utilities, 'debit'],
  // Uber Eats (when it appears as "Uber *Eats").
  [/\buber\s*\*?eats\b/i, TransactionCategory.groceries, 'debit'],

  // ── Groceries / supermarkets ────────────────────────────────────────────────
  [/\b(tesco|tesco extra|tesco express|tesco metro|sainsbury.?s|asda|morrisons|waitrose|marks and spencer food|m&s food|aldi|lidl|co-?op food|ocado|iceland foods|farmfoods|budgens|londis|spar)\b/i, TransactionCategory.groceries, 'debit'],
  // Fast food / takeaway (Wise often shows "Card transaction issued by Mcdonald S Restaurant")
  [/\b(mcdonald|kfc|burger king|subway|dominos|papa john|five guys|nando.?s|greggs|pret a manger|costa coffee|starbucks|cafe nero)\b/i, TransactionCategory.groceries, 'debit'],

  // ── Transport ───────────────────────────────────────────────────────────────
  [/\b(tfl|transport for london|oyster card|contactless tfl|tube|london underground|national rail|trainline|gwr|lner|avanti west|southeastern|southern rail|thameslink|cross country|chiltern railways|greater anglia|c2c rail|merseyrail|northern rail|scotrail|transpennine)\b/i, TransactionCategory.transport, 'debit'],
  [/\b(uber ride|uber\s*\*?trip|bolt ride|black cab|addison lee|free now|taxi fare|parking charge|ncp parking|q-park|ringgo|justpark|petrol|bp fuel|shell fuel|esso|texaco|total energies|tesco pay at pump)\b/i, TransactionCategory.transport, 'debit'],
  [/\b(ryanair|easyjet|british airways|virgin atlantic|jet2|wizz air|flixbus|national express coach|megabus)\b/i, TransactionCategory.transport, 'debit'],

  // ── Entertainment ───────────────────────────────────────────────────────────
  [/\b(netflix|spotify|amazon prime|disney\+|apple tv|hbo max|now tv|sky cinema|paramount\+|apple music|youtube premium|tidal|deezer)\b/i, TransactionCategory.entertainment, 'debit'],
  [/\b(odeon|vue cinema|cineworld|picturehouse|showcase cinema|curzon cinema|bfi)\b/i, TransactionCategory.entertainment, 'debit'],

  // ── Healthcare ──────────────────────────────────────────────────────────────
  [/\b(boots pharmacy|lloyds pharmacy|well pharmacy|superdrug|nhs prescription|nhs dental|dentist|dental practice|optician|specsavers|vision express|boots optician)\b/i, TransactionCategory.healthcare, 'debit'],
  [/\b(bupa|vitality health|axa health|aviva health|nuffield health|private health|health insurance|hims & hers|lovisa)\b/i, TransactionCategory.healthcare, 'debit'],

  // ── Education ───────────────────────────────────────────────────────────────
  [/\b(student loans company|slc|student loan|tuition fee|university fee|school fee|college fee|coursera|udemy|skillshare|linkedin learning|duolingo|chegg)\b/i, TransactionCategory.education, null],

  // ── Savings / investments ───────────────────────────────────────────────────
  [/\b(isa transfer|savings transfer|savings account|savings acc\b|to .*savings|\bsaver\b|instant saver|easy access saver|cash isa|lifetime isa|help to buy isa|nest egg|monzo pot|starling space|revolut vault|plum save|chip save|vanguard|hargreaves lansdown|freetrade|trading 212|nutmeg|wealthify|moneyfarm)\b/i, TransactionCategory.savings_transfer, null],
  // Person-to-person transfers ("Sent money to X", "Received money from X") —
  // these are movements between the user's own accounts or repayments between
  // individuals; closest fit is savings_transfer (a non-spend movement of money).
  [/\b(sent money to|received money from|converted to)\b/i, TransactionCategory.savings_transfer, null],

  // ── Cash withdrawals ────────────────────────────────────────────────────────
  [/\b(atm withdrawal|cash machine|cashpoint|link atm|barclays atm|lloyds atm|natwest atm|hsbc atm|cashback at)\b/i, TransactionCategory.cash_withdrawal, null],
]

// ─── Merchant name rules ──────────────────────────────────────────────────────

const MERCHANT_RULES: Array<[RegExp, TransactionCategory, 'credit' | 'debit' | null]> = [
  [/\b(tesco|sainsbury|asda|morrisons|waitrose|aldi|lidl|co-?op)\b/i, TransactionCategory.groceries, 'debit'],
  [/\b(netflix|spotify|disney|amazon prime)\b/i, TransactionCategory.entertainment, 'debit'],
  [/\b(uber|deliveroo|just\s*eat)\b/i, TransactionCategory.gig_income, 'credit'],
  [/\b(tfl|trainline|national rail)\b/i, TransactionCategory.transport, 'debit'],
  [/\b(boots|lloyds pharmacy|superdrug)\b/i, TransactionCategory.healthcare, 'debit'],
]

// ─── TrueLayer category fallback map ─────────────────────────────────────────

const TL_CATEGORY_MAP: Record<string, TransactionCategory> = {
  SALARY:             TransactionCategory.salary,
  INCOME:             TransactionCategory.salary,
  GIG_PAYMENTS:       TransactionCategory.gig_income,
  RENTAL:             TransactionCategory.rent_payment,
  BILLS:              TransactionCategory.utilities,
  BILL_PAYMENT:       TransactionCategory.utilities,
  DIRECT_DEBIT:       TransactionCategory.utilities,
  TRANSPORT:          TransactionCategory.transport,
  SHOPPING:           TransactionCategory.groceries,
  ENTERTAINMENT:      TransactionCategory.entertainment,
  HEALTHCARE:         TransactionCategory.healthcare,
  EDUCATION:          TransactionCategory.education,
  SAVINGS:            TransactionCategory.savings_transfer,
  LOAN_REPAYMENT:     TransactionCategory.loan_repayment,
  GOVERNMENT:         TransactionCategory.government_benefit,
  INVESTMENT:         TransactionCategory.investment,
  CASH:               TransactionCategory.cash_withdrawal,
  ATM:                TransactionCategory.cash_withdrawal,
}

// ─── Classifier ───────────────────────────────────────────────────────────────

export function classifyTransaction(txn: TxnInput): TransactionCategory {
  // Clean the raw description FIRST so the rules match the merchant/intent and
  // not the bank's "Transaction: ... / Reference: ... / Card ending in ..."
  // boilerplate wrapper (Wise and similar fintech statements).
  const desc = cleanDescription(txn.description ?? '')
  const merchant = txn.merchantName ?? ''
  const dir = txn.direction

  // 1. Description rules
  for (const [pattern, category, constraint] of DESCRIPTION_RULES) {
    if (constraint !== null && constraint !== dir) continue
    if (pattern.test(desc)) return category
  }

  // 2. Merchant name rules
  for (const [pattern, category, constraint] of MERCHANT_RULES) {
    if (constraint !== null && constraint !== dir) continue
    if (pattern.test(merchant)) return category
  }

  // 3. TrueLayer category hint
  const tlMapped = TL_CATEGORY_MAP[txn.tlCategory?.toUpperCase() ?? '']
  if (tlMapped) return tlMapped

  // 4. Direction default — an unrecognised credit is likely some form of income
  return TransactionCategory.other
}
