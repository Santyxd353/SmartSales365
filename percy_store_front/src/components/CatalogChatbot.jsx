import React, { useEffect, useRef, useState } from 'react'
import { askCatalogAI } from '../api/api'

export default function CatalogChatbot(){
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hola, soy SmartSales AI. Preguntame por productos o recomendaciones.' }
  ])
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollerRef = useRef(null)

  useEffect(() => {
    if (open && scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight
    }
  }, [messages, open])

  const toggle = () => setOpen(prev => !prev)

  const sendPrompt = async () => {
    const text = prompt.trim()
    if (!text || loading) return
    setMessages(msgs => [...msgs, { role: 'user', content: text }])
    setPrompt('')
    setLoading(true)
    try {
      const res = await askCatalogAI(text)
      setMessages(msgs => [...msgs, {
        role: 'assistant',
        content: res.summary || 'Aqui tienes la informacion solicitada.',
        insights: res.insights || [],
        recommendations: res.recommendations || []
      }])
    } catch (err) {
      setMessages(msgs => [...msgs, { role: 'assistant', content: err?.message || 'No pude responder esa consulta.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 w-80 sm:w-96 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-green-200 dark:border-green-800 z-40 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-green-100 dark:border-green-900">
            <div>
              <p className="font-semibold text-green-700 dark:text-green-300 text-sm">SmartSales IA</p>
              <p className="text-xs opacity-70">Preguntame por productos, usos y recomendaciones.</p>
            </div>
            <button className="text-sm text-green-700 dark:text-green-300" onClick={toggle}>Cerrar</button>
          </div>
          <div ref={scrollerRef} className="p-3 space-y-3 max-h-80 overflow-y-auto">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`rounded-2xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-green-600 text-white ml-auto max-w-[85%]' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 mr-auto max-w-[90%]'}`}
              >
                <p>{msg.content}</p>
                {msg.insights?.length ? (
                  <ul className="list-disc ml-4 mt-2 text-xs opacity-80 space-y-1">
                    {msg.insights.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                ) : null}
                {msg.recommendations?.length ? (
                  <div className="mt-2 space-y-2">
                    {msg.recommendations.map(rec => (
                      <div key={rec.id || rec.name} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-2 text-xs">
                        <div className="font-semibold">{rec.name}</div>
                        <div className="opacity-70">{rec.brand || 'General'} - Bs. {Number(rec.price || 0).toFixed(2)}</div>
                        <div className="mt-1">{rec.reason || 'Producto recomendado por disponibilidad y prestaciones.'}</div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="border-t border-green-100 dark:border-green-900 p-3 flex flex-col gap-2">
            <textarea
              rows={2}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendPrompt()
                }
              }}
              placeholder="Pregunta por ejemplo: 'Que aire me recomiendas para 20m2?'"
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm p-2 resize-none focus:outline-none"
            />
            <button className="btn btn-primary text-sm" onClick={sendPrompt} disabled={loading}>
              {loading ? 'Consultando...' : 'Preguntar'}
            </button>
          </div>
        </div>
      )}

      <button
        className="fixed bottom-4 right-4 z-30 rounded-full bg-green-600 text-white shadow-lg w-14 h-14 flex items-center justify-center text-lg font-semibold hover:bg-green-500 transition"
        onClick={() => setOpen(true)}
      >
        IA
      </button>
    </>
  )
}
