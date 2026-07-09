import type {
  IncomeProfile,
  ExpenseProfile,
  Commitment,
  PaymentBehaviour,
  AffordabilityProfile,
  AffordabilityRating,
} from './types'
import { round2 } from './util'

// Calibrated to TAKE-HOME income (statements show net, not gross). A prudent
// buffer is kept aside for savings/unexpected costs, and rent is capped at a
// share of take-home rather than the gross-based multiples letting agents use.
const BUFFER_RATE = 0.1 // keep at least 10% of income spare
const BUFFER_FLOOR = 150 // or £150, whichever is larger
const RENT_CEILING_RATE = 0.4 // rent shouldn't exceed 40% of take-home
const STRESS_DROP = 0.2 // model a 20% income drop

export function analyzeAffordability(
  income: IncomeProfile,
  expenses: ExpenseProfile,
  commitments: Commitment[],
  payment: PaymentBehaviour
): AffordabilityProfile {
  const monthlyIncome = income.averageMonthlyIncome
  const totalSpend = expenses.averageMonthlySpend
  const essentialOutgoings = round2(totalSpend * expenses.essentialShare)
  const discretionarySpend = round2(Math.max(0, totalSpend - essentialOutgoings))

  const rent = commitments.find((c) => c.category === 'rent_payment')
  const currentRent = rent ? round2(rent.amount) : null
  const debtRepayments = round2(
    commitments.filter((c) => c.category === 'loan_repayment').reduce((s, c) => s + c.amount, 0)
  )
  const fixedCommitments = round2(commitments.reduce((s, c) => s + c.amount, 0))

  const disposableIncome = round2(monthlyIncome - essentialOutgoings)
  const surplusAfterAll = round2(monthlyIncome - totalSpend)

  // Highest sustainable rent: what's left after non-rent essentials and a buffer,
  // capped at a share of take-home. The lower (more conservative) of the two.
  const nonRentEssentials = round2(Math.max(0, essentialOutgoings - (currentRent ?? 0)))
  const buffer = Math.max(monthlyIncome * BUFFER_RATE, BUFFER_FLOOR)
  const residualMaxRent = monthlyIncome - nonRentEssentials - buffer
  const ceilingMaxRent = monthlyIncome * RENT_CEILING_RATE
  const maxAffordableRent = round2(Math.max(0, Math.min(residualMaxRent, ceilingMaxRent)))
  const headroomForNewRent = round2(Math.max(0, maxAffordableRent - (currentRent ?? 0)))

  const ratio = (n: number) => (monthlyIncome > 0 ? round2(n / monthlyIncome) : 0)
  const ratios = {
    rentToIncome: currentRent && monthlyIncome > 0 ? round2(currentRent / monthlyIncome) : null,
    debtToIncome: ratio(debtRepayments),
    commitmentsToIncome: ratio(fixedCommitments),
    essentialsToIncome: ratio(essentialOutgoings),
  }

  const stressedIncome = monthlyIncome * (1 - STRESS_DROP)
  const stressTest = {
    incomeDropPct: STRESS_DROP * 100,
    surplusUnderStress: round2(stressedIncome - totalSpend),
    stillPositive: stressedIncome - totalSpend > 0,
    essentialsCovered: stressedIncome >= essentialOutgoings,
  }

  const incomeIsVariable = income.consistency === 'variable' || income.consistency === 'one_off'
  const rating = rateAffordability(ratios.rentToIncome, surplusAfterAll, payment.overdraftMonths, stressTest.surplusUnderStress)

  return {
    monthlyIncome,
    essentialOutgoings,
    discretionarySpend,
    currentRent,
    debtRepayments,
    fixedCommitments,
    disposableIncome,
    surplusAfterAll,
    ratios,
    maxAffordableRent,
    headroomForNewRent,
    stressTest,
    incomeIsVariable,
    rating,
    notes: buildNotes({
      monthlyIncome,
      currentRent,
      rentToIncome: ratios.rentToIncome,
      surplusAfterAll,
      disposableIncome,
      overdraftMonths: payment.overdraftMonths,
      incomeIsVariable,
      stressTest,
    }),
  }
}

function rateAffordability(
  rentToIncome: number | null,
  surplus: number,
  overdraftMonths: number | null,
  stressSurplus: number
): AffordabilityRating {
  const overdraftDependent = (overdraftMonths ?? 0) >= 2
  if (surplus < 0 || overdraftDependent || (rentToIncome !== null && rentToIncome > 0.55)) return 'at_risk'
  if ((rentToIncome !== null && rentToIncome > 0.45) || stressSurplus < 0) return 'stretched'
  if (rentToIncome !== null && rentToIncome > 0.35) return 'manageable'
  return 'comfortable'
}

function buildNotes(x: {
  monthlyIncome: number
  currentRent: number | null
  rentToIncome: number | null
  surplusAfterAll: number
  disposableIncome: number
  overdraftMonths: number | null
  incomeIsVariable: boolean
  stressTest: { stillPositive: boolean; surplusUnderStress: number; essentialsCovered: boolean }
}): string[] {
  const notes: string[] = []
  const gbp = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`

  if (x.rentToIncome !== null) {
    const pct = Math.round(x.rentToIncome * 100)
    const band =
      x.rentToIncome <= 0.35
        ? 'comfortably within the affordable range'
        : x.rentToIncome <= 0.45
          ? 'within a manageable range'
          : 'on the high side'
    notes.push(`Rent is ${pct}% of take-home income, ${band}.`)
  } else {
    notes.push('No rent commitment was detected in this statement.')
  }

  notes.push(
    x.surplusAfterAll >= 0
      ? `${gbp(x.surplusAfterAll)} is left over each month after all spending.`
      : `Spending exceeds income by ${gbp(-x.surplusAfterAll)} in an average month.`
  )

  if ((x.overdraftMonths ?? 0) >= 1) {
    notes.push(`The account went into overdraft in ${x.overdraftMonths} month(s).`)
  }

  if (x.incomeIsVariable) {
    notes.push('Income varies month to month, so affordability can fluctuate.')
  }

  notes.push(
    x.stressTest.stillPositive
      ? `Resilient to a 20% income drop, with ${gbp(x.stressTest.surplusUnderStress)} still spare.`
      : x.stressTest.essentialsCovered
        ? 'A 20% income drop would erase the monthly surplus but still cover essentials.'
        : 'A 20% income drop would leave essential costs uncovered.'
  )

  return notes
}
