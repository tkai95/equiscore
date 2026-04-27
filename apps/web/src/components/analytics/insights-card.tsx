'use client'

import { Sparkles, TrendingUp, AlertTriangle, Info, Loader2 } from 'lucide-react'

interface Insight {
  type: 'positive' | 'warning' | 'info'
  title: string
  body: string
}

const config = {
  positive: {
    icon: TrendingUp,
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    icon_colour: 'text-emerald-600',
    title_colour: 'text-emerald-900',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    icon_colour: 'text-amber-600',
    title_colour: 'text-amber-900',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    icon_colour: 'text-blue-600',
    title_colour: 'text-blue-900',
  },
}

export function InsightsCard({
  insights,
  isLoading,
  unavailable,
  hasData,
  onGenerate,
}: {
  insights: Insight[]
  isLoading: boolean
  unavailable?: boolean
  hasData: boolean
  onGenerate: () => void
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-700">AI Insights</h2>
        </div>
        {hasData && insights.length === 0 && !isLoading && !unavailable && (
          <button
            onClick={onGenerate}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Generate
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analysing your transactions...
        </div>
      )}

      {unavailable && (
        <p className="text-sm text-gray-500">
          AI insights are not available right now. Try again later.
        </p>
      )}

      {!hasData && !isLoading && (
        <p className="text-sm text-gray-500">
          Connect a bank account to generate personalised insights.
        </p>
      )}

      {insights.length > 0 && (
        <div className="space-y-3">
          {insights.map((insight, i) => {
            const { icon: Icon, bg, border, icon_colour, title_colour } = config[insight.type]
            return (
              <div key={i} className={`rounded-lg border p-4 ${bg} ${border}`}>
                <div className="mb-1 flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${icon_colour}`} />
                  <p className={`text-sm font-semibold ${title_colour}`}>{insight.title}</p>
                </div>
                <p className="text-sm leading-relaxed text-gray-600">{insight.body}</p>
              </div>
            )
          })}
        </div>
      )}

      {hasData && insights.length === 0 && !isLoading && !unavailable && (
        <p className="text-sm text-gray-500">
          Click Generate to get AI-powered insights based on your transaction history.
        </p>
      )}
    </div>
  )
}
