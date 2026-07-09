'use client'

import { useState, useRef, useEffect, Fragment } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { MessageCircle, X, Send, Sparkles } from 'lucide-react'
import { streamChat } from '@/lib/api'
import { cn } from '@/lib/utils'

type Msg = { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'How much do I spend on subscriptions?',
  'Can I afford £1,400 a month rent?',
  'Why is my Trust Profile a C?',
  'What can I do to raise my score?',
]

export function ChatWidget() {
  const { getToken } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const navigate = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  const send = async (text: string) => {
    const q = text.trim()
    if (!q || loading) return
    setInput('')
    const history = messages
    setMessages((m) => [...m, { role: 'user', content: q }, { role: 'assistant', content: '' }])
    setLoading(true)
    try {
      const token = await getToken()
      await streamChat(token!, q, history, (tok) => {
        setMessages((m) => {
          const copy = [...m]
          const i = copy.length - 1
          copy[i] = { role: 'assistant', content: copy[i]!.content + tok }
          return copy
        })
      })
    } catch {
      setMessages((m) => {
        const copy = [...m]
        const i = copy.length - 1
        if (copy[i]?.role === 'assistant' && !copy[i]!.content) {
          copy[i] = { role: 'assistant', content: "Sorry, I couldn't reach the assistant just now. Please try again." }
        }
        return copy
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ask EquiScore"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-cream-surface shadow-lg transition-transform hover:scale-105"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[min(44rem,80vh)] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-brand px-4 py-3 text-cream-surface">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="font-semibold">Ask EquiScore</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-lg p-1 transition-colors hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div>
                <p className="text-sm text-gray-500">
                  Ask about your payments, affordability, or Trust Profile — or how to do anything on
                  EquiScore. Answers use your own data.
                </p>
                <div className="mt-3 space-y-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:border-brand/40 hover:bg-cream/40"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-brand px-3.5 py-2 text-sm leading-relaxed text-cream-surface">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[92%] rounded-2xl bg-gray-100 px-3.5 py-2.5 text-sm leading-relaxed text-gray-800">
                    {m.content ? (
                      <Markdown text={m.content} onNavigate={navigate} />
                    ) : (
                      <ThinkingDots />
                    )}
                  </div>
                </div>
              )
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="flex items-center gap-2 border-t border-gray-100 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-cream-surface disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="px-3 pb-2 text-center text-[10px] text-gray-400">
            Answers use your own EquiScore data and may not always be perfect.
          </p>
        </div>
      )}
    </>
  )
}

function ThinkingDots() {
  return (
    <span className="flex items-center gap-1 py-0.5 text-gray-400">
      {[0, 150, 300].map((d) => (
        <span
          key={d}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </span>
  )
}

// ── Lightweight Markdown renderer (bold, links, code, bullet / numbered lists) ──

function Markdown({ text, onNavigate }: { text: string; onNavigate: (href: string) => void }) {
  const blocks = text.trim().split(/\n{2,}/)
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => (
        <Block key={i} block={block} onNavigate={onNavigate} />
      ))}
    </div>
  )
}

function Block({ block, onNavigate }: { block: string; onNavigate: (href: string) => void }) {
  const lines = block.split('\n').filter((l) => l.trim() !== '')
  if (lines.length > 0 && lines.every((l) => /^\s*[-*]\s+/.test(l))) {
    return (
      <ul className="list-disc space-y-1 pl-5">
        {lines.map((l, i) => (
          <li key={i}>
            <Inline text={l.replace(/^\s*[-*]\s+/, '')} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    )
  }
  if (lines.length > 0 && lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
    return (
      <ol className="list-decimal space-y-1 pl-5">
        {lines.map((l, i) => (
          <li key={i}>
            <Inline text={l.replace(/^\s*\d+\.\s+/, '')} onNavigate={onNavigate} />
          </li>
        ))}
      </ol>
    )
  }
  return (
    <p>
      <Inline text={block} onNavigate={onNavigate} />
    </p>
  )
}

const INLINE = /(\*\*([^*]+)\*\*)|(\[([^\]]+)\]\(([^)]+)\))|(`([^`]+)`)/g

function Inline({ text, onNavigate }: { text: string; onNavigate: (href: string) => void }) {
  const nodes: React.ReactNode[] = []
  let last = 0
  let key = 0
  let m: RegExpExecArray | null
  INLINE.lastIndex = 0
  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > last) nodes.push(<Text key={key++}>{text.slice(last, m.index)}</Text>)
    if (m[1]) nodes.push(<strong key={key++}>{m[2]}</strong>)
    else if (m[3]) {
      const href = m[5]!
      const label = m[4]!
      nodes.push(<Anchor key={key++} href={href} label={label} onNavigate={onNavigate} />)
    } else if (m[6]) {
      nodes.push(
        <code key={key++} className="rounded bg-gray-200/70 px-1 py-0.5 text-[0.85em]">
          {m[7]}
        </code>
      )
    }
    last = INLINE.lastIndex
  }
  if (last < text.length) nodes.push(<Text key={key++}>{text.slice(last)}</Text>)
  return <>{nodes}</>
}

/** Render intra-block newlines as line breaks. */
function Text({ children }: { children: string }) {
  const parts = children.split('\n')
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {p}
        </Fragment>
      ))}
    </>
  )
}

function Anchor({
  href,
  label,
  onNavigate,
}: {
  href: string
  label: string
  onNavigate: (href: string) => void
}) {
  const internal = href.startsWith('/')
  if (internal) {
    return (
      <button
        onClick={() => onNavigate(href)}
        className="font-medium text-brand underline underline-offset-2 hover:text-brand-dark"
      >
        {label}
      </button>
    )
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-brand underline underline-offset-2 hover:text-brand-dark"
    >
      {label}
    </a>
  )
}
