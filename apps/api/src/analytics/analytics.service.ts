import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@equiscore/database'

const CATEGORY_LABELS: Record<string, string> = {
  salary: 'Salary',
  gig_income: 'Freelance / Gig',
  government_benefit: 'Benefits',
  rent_payment: 'Rent',
  utilities: 'Utilities',
  groceries: 'Groceries',
  transport: 'Transport',
  entertainment: 'Entertainment',
  healthcare: 'Healthcare',
  education: 'Education',
  loan_repayment: 'Loan Repayments',
  cash_withdrawal: 'Cash / ATM',
  savings_transfer: 'Savings Transfer',
  investment: 'Investments',
  other: 'Other',
}

const INCOME_CATEGORIES = new Set(['salary', 'gig_income', 'government_benefit'])
const EXPENSE_CATEGORIES = new Set([
  'rent_payment', 'utilities', 'groceries', 'transport', 'entertainment',
  'healthcare', 'education', 'loan_repayment', 'cash_withdrawal', 'other',
])

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name)

  constructor(private readonly config: ConfigService) {}

  async getSummary(userId: string) {
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    const transactions = await db.bankTransaction.findMany({
      where: {
        bankAccount: { bankConnection: { userId } },
        bookedAt: { gte: twelveMonthsAgo },
      },
      select: {
        amount: true,
        direction: true,
        category: true,
        merchantName: true,
        description: true,
        bookedAt: true,
      },
      orderBy: { bookedAt: 'asc' },
    })

    const monthlyMap = new Map<string, { income: number; expenses: number }>()
    const categoryTotals = new Map<string, { total: number; count: number }>()
    const merchantTotals = new Map<string, { total: number; count: number; category: string }>()

    const now = new Date()
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    for (const txn of transactions) {
      const d = txn.bookedAt
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

      if (!monthlyMap.has(monthKey)) monthlyMap.set(monthKey, { income: 0, expenses: 0 })
      const monthly = monthlyMap.get(monthKey)!
      if (txn.direction === 'credit') monthly.income += txn.amount
      else monthly.expenses += txn.amount

      const cat = txn.category ?? 'other'
      if (!categoryTotals.has(cat)) categoryTotals.set(cat, { total: 0, count: 0 })
      const catData = categoryTotals.get(cat)!
      catData.total += txn.amount
      catData.count++

      if (txn.direction === 'debit' && cat !== 'savings_transfer' && cat !== 'investment') {
        const name = txn.merchantName?.trim() || this.cleanDescription(txn.description) || 'Unknown'
        if (!merchantTotals.has(name)) merchantTotals.set(name, { total: 0, count: 0, category: cat })
        const m = merchantTotals.get(name)!
        m.total += txn.amount
        m.count++
      }
    }

    const sortedMonths = Array.from(monthlyMap.keys()).sort()
    const monthlySummary = sortedMonths.map((month) => {
      const d = monthlyMap.get(month)!
      return {
        month,
        income: round2(d.income),
        expenses: round2(d.expenses),
        net: round2(d.income - d.expenses),
      }
    })

    const completedMonths = monthlySummary.filter((m) => m.month < currentMonthKey)
    const avgMonthlyIncome = avg(completedMonths.map((m) => m.income))
    const avgMonthlyExpenses = avg(completedMonths.map((m) => m.expenses))

    const currentMonthData = monthlySummary.find((m) => m.month === currentMonthKey)
    const previousMonthKey = getPreviousMonthKey(currentMonthKey)
    const previousMonthData = monthlySummary.find((m) => m.month === previousMonthKey)

    const savingsRate =
      avgMonthlyIncome > 0
        ? Math.max(0, round1(((avgMonthlyIncome - avgMonthlyExpenses) / avgMonthlyIncome) * 100))
        : 0

    const incomeChangePct =
      previousMonthData && previousMonthData.income > 0
        ? round1(
            (((currentMonthData?.income ?? 0) - previousMonthData.income) / previousMonthData.income) * 100
          )
        : 0
    const expensesChangePct =
      previousMonthData && previousMonthData.expenses > 0
        ? round1(
            (((currentMonthData?.expenses ?? 0) - previousMonthData.expenses) / previousMonthData.expenses) * 100
          )
        : 0

    const totalExpenseAmount = Array.from(categoryTotals.entries())
      .filter(([cat]) => EXPENSE_CATEGORIES.has(cat))
      .reduce((acc, [, d]) => acc + d.total, 0)

    const categoryBreakdown = [
      ...Array.from(categoryTotals.entries())
        .filter(([cat]) => INCOME_CATEGORIES.has(cat))
        .map(([category, data]) => ({
          category,
          label: CATEGORY_LABELS[category] ?? category,
          totalAmount: round2(data.total),
          transactionCount: data.count,
          type: 'income' as const,
          percentage: 0,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount),
      ...Array.from(categoryTotals.entries())
        .filter(([cat]) => EXPENSE_CATEGORIES.has(cat))
        .map(([category, data]) => ({
          category,
          label: CATEGORY_LABELS[category] ?? category,
          totalAmount: round2(data.total),
          transactionCount: data.count,
          type: 'expense' as const,
          percentage: totalExpenseAmount > 0 ? round1((data.total / totalExpenseAmount) * 100) : 0,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount),
    ]

    const topMerchants = Array.from(merchantTotals.entries())
      .map(([name, data]) => ({
        name,
        totalAmount: round2(data.total),
        transactionCount: data.count,
        category: data.category,
        label: CATEGORY_LABELS[data.category] ?? data.category,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10)

    return {
      monthlySummary,
      categoryBreakdown,
      topMerchants,
      stats: {
        avgMonthlyIncome: round2(avgMonthlyIncome),
        avgMonthlyExpenses: round2(avgMonthlyExpenses),
        currentMonthIncome: round2(currentMonthData?.income ?? 0),
        currentMonthExpenses: round2(currentMonthData?.expenses ?? 0),
        currentMonthNet: round2(currentMonthData?.net ?? 0),
        previousMonthIncome: round2(previousMonthData?.income ?? 0),
        previousMonthExpenses: round2(previousMonthData?.expenses ?? 0),
        totalTransactions: transactions.length,
        monthsOfData: sortedMonths.length,
        savingsRate,
      },
      monthOverMonth: { incomeChangePct, expensesChangePct },
    }
  }

  async getInsights(userId: string) {
    // GLM (Z.ai) if configured, else Claude. Note: this narrative path sends
    // *aggregated* summary figures (income, category/merchant totals) — never
    // raw statements — to whichever provider is set.
    if (!this.config.get<string>('GLM_API_KEY') && !this.config.get<string>('ANTHROPIC_API_KEY')) {
      this.logger.warn('No insights LLM key set (GLM_API_KEY / ANTHROPIC_API_KEY) — insights unavailable')
      return { insights: [], generatedAt: new Date().toISOString(), unavailable: true }
    }

    const summary = await this.getSummary(userId)
    const { stats, categoryBreakdown, topMerchants, monthOverMonth } = summary

    const topExpenses = categoryBreakdown
      .filter((c) => c.type === 'expense')
      .slice(0, 5)
      .map((c) => `  - ${c.label}: £${c.totalAmount.toLocaleString('en-GB')} (${c.transactionCount} transactions)`)
      .join('\n')

    const topMerchantLines = topMerchants
      .slice(0, 5)
      .map((m) => `  - ${m.name}: £${m.totalAmount.toLocaleString('en-GB')} (${m.transactionCount} transactions, ${m.label})`)
      .join('\n')

    const prompt = `You are a financial analyst reviewing a UK user's transaction data. Provide exactly 4 concise, specific financial insights. Use British English and GBP (£).

Financial Summary:
- Months of data: ${stats.monthsOfData}
- Average monthly income: £${stats.avgMonthlyIncome.toLocaleString('en-GB')}
- Average monthly expenses: £${stats.avgMonthlyExpenses.toLocaleString('en-GB')}
- Average savings rate: ${stats.savingsRate}%
- This month income: £${stats.currentMonthIncome.toLocaleString('en-GB')} (${monthOverMonth.incomeChangePct >= 0 ? '+' : ''}${monthOverMonth.incomeChangePct}% vs last month)
- This month expenses: £${stats.currentMonthExpenses.toLocaleString('en-GB')} (${monthOverMonth.expensesChangePct >= 0 ? '+' : ''}${monthOverMonth.expensesChangePct}% vs last month)

Top spending categories:
${topExpenses || '  No expense data available'}

Top merchants:
${topMerchantLines || '  No merchant data available'}

Return ONLY valid JSON, no markdown or other text:
{"insights":[{"type":"positive"|"warning"|"info","title":"max 6 word title","body":"1-2 sentences with specific £ amounts or percentages"}]}`

    try {
      const text = await this.generateNarrative(prompt)
      // Parse defensively — a model may wrap the JSON in prose or fences.
      const jsonStr = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
      const parsed = JSON.parse(jsonStr) as {
        insights: Array<{ type: string; title: string; body: string }>
      }
      return { insights: parsed.insights ?? [], generatedAt: new Date().toISOString() }
    } catch (err) {
      this.logger.warn(`Insights generation failed: ${String(err)}`)
      return { insights: [], generatedAt: new Date().toISOString(), error: 'Failed to generate insights' }
    }
  }

  /**
   * Generate the narrative from a prompt. Prefers GLM (Z.ai, OpenAI-compatible)
   * when GLM_API_KEY is set; otherwise Claude Haiku. Extraction of raw
   * statements stays on Claude and never routes here.
   */
  private async generateNarrative(prompt: string): Promise<string> {
    const glmKey = this.config.get<string>('GLM_API_KEY')
    if (glmKey) {
      const baseUrl = this.config.get<string>('GLM_BASE_URL') ?? 'https://api.z.ai/api/paas/v4'
      const model = this.config.get<string>('GLM_MODEL') ?? 'glm-5.2'
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${glmKey}` },
        body: JSON.stringify({ model, max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
      })
      if (!res.ok) {
        throw new Error(`GLM request failed: ${res.status} ${await res.text().catch(() => '')}`)
      }
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
      return data.choices?.[0]?.message?.content ?? '{}'
    }

    const client = new Anthropic({ apiKey: this.config.get<string>('ANTHROPIC_API_KEY') })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })
    return response.content[0]?.type === 'text' ? response.content[0].text : '{}'
  }

  private cleanDescription(desc: string | null): string {
    if (!desc) return ''
    return desc
      .replace(/\b\d{8,}\b/g, '')
      .replace(/REF\s*\w+/gi, '')
      .trim()
      .slice(0, 40)
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}
function round1(n: number) {
  return Math.round(n * 10) / 10
}
function avg(nums: number[]) {
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
}
function getPreviousMonthKey(key: string): string {
  const parts = key.split('-')
  const year = Number(parts[0])
  const month = Number(parts[1])
  if (month === 1) return `${year - 1}-12`
  return `${year}-${String(month - 1).padStart(2, '0')}`
}
