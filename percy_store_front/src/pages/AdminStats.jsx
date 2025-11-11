import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAdmin } from '../utils/auth'
import {
  adminMLPredict,
  adminMLTrain,
  adminHistorical,
  adminPromptReport,
  listCategories,
  adminAIAdvisor
} from '../api/api'

const monthFormatter = (period) => {
  if (!period) return ''
  const d = new Date(period)
  if (Number.isNaN(d.getTime())) return period
  return d.toLocaleDateString('es-BO', { month: 'long', year: 'numeric' })
}

const describeRange = (promptText = '') => {
  const normalized = promptText.toLowerCase()
  if (normalized.includes('hoy')) return 'Hoy'
  if (normalized.includes('ayer')) return 'Ayer'
  if (normalized.includes('semana pasada') || normalized.includes('ultima semana')) return 'En la semana pasada'
  if (normalized.includes('esta semana')) return 'Esta semana'
  if (normalized.includes('mes pasado') || normalized.includes('ultimo mes')) return 'En el ultimo mes'
  if (normalized.includes('este mes')) return 'Este mes'
  if (normalized.includes('trimestre')) return 'En el periodo trimestral'
  return 'En el periodo consultado'
}

const formatMoney = (value = 0) => `Bs. ${Number(value || 0).toFixed(2)}`

const buildReportNarrative = (rows = [], promptText = '') => {
  if (!rows.length) {
    return { text: 'No encontre datos para ese criterio.', bullets: [] }
  }
  const rangeText = describeRange(promptText)
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.total ?? row.predicted_total ?? 0), 0)
  const wantAir = promptText.toLowerCase().includes('aire')
  const wantGaming = /consol|juego|tv|tele/.test(promptText.toLowerCase())

  if (rows[0].product__name) {
    const top = rows.slice(0, 3)
    const totalUnits = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0)
    const leader = top[0]
    const qtyText = totalUnits ? ` con ${totalUnits} unidades` : ''
    const leaderText = leader ? ` Destaco ${leader.product__name} con ${formatMoney(leader.total)}.` : ''
    return {
      text: `${rangeText} registramos ${formatMoney(totalAmount)}${qtyText} en ventas por producto.${leaderText}`,
      bullets: top.map((row, idx) => `${idx + 1}. ${row.product__name}: ${row.quantity || 0} u. · ${formatMoney(row.total)}`)
    }
  }

  if (rows[0].order__user__first_name !== undefined) {
    const topClients = rows.slice(0, 3).map(row => {
      const name = [row.order__user__first_name, row.order__user__last_name].filter(Boolean).join(' ') || `Cliente #${row.order__user_id}`
      return { name, total: Number(row.total || 0), orders: Number(row.orders || 0) }
    })
    const lead = topClients[0]
    const text = lead
      ? `${rangeText} ${lead.name} lidero el ticket con ${formatMoney(lead.total)} en ${lead.orders} compras.`
      : `${rangeText} no hubo clientes destacados.`
    return {
      text,
      bullets: topClients.map(c => `${c.name}: ${c.orders} compras · ${formatMoney(c.total)}`)
    }
  }

  const periodRows = rows.filter(r => r.period)
  if (periodRows.length) {
    const chronologic = periodRows.map(row => ({
      label: monthFormatter(row.period),
      value: Number(row.predicted_total ?? row.total ?? 0)
    }))
    const latest = chronologic[chronologic.length - 1]
    let qualifier = 'La tendencia reciente se mantiene estable.'
    if (wantAir) qualifier = 'El calor proyectado aumenta la demanda de aires acondicionados.'
    else if (wantGaming) qualifier = 'Las campanas navidenas impulsan los productos gamer y TV.'
    const text = `${rangeText} cerramos en ${formatMoney(latest?.value || 0)}. ${qualifier}`
    return {
      text,
      bullets: chronologic.slice(-3).map(item => `${item.label}: ${formatMoney(item.value)}`)
    }
  }

  return {
    text: `${rangeText} genere el resumen solicitado.`,
    bullets: []
  }
}

const buildFallbackPredictions = (histRows = [], months = 6) => {
  if (!histRows.length) return []
  const last = histRows[histRows.length - 1]
  const basePeriod = last.period || `${new Date().getFullYear()}-01-01`
  const [y, m] = basePeriod.split('-').map(n => parseInt(n || '1', 10))
  let value = Number(last.total || 0) || 1200
  const results = []
  for (let i = 1; i <= months; i += 1) {
    const future = new Date(Date.UTC(y, (m - 1) + i, 1))
    value = value * 1.04 + 50 * Math.sin(i / 2)
    results.push({
      period: future.toISOString().slice(0, 10),
      predicted_total: Math.round(value)
    })
  }
  return results
}

export default function AdminStats() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hist, setHist] = useState([])
  const [pred, setPred] = useState([])
  const [tab, setTab] = useState('total')
  const [categories, setCategories] = useState([])
  const [catId, setCatId] = useState('')
  const canvasRef = useRef(null)
  const chartRef = useRef(null)
  const categoryCanvasRef = useRef(null)
  const categoryChartRef = useRef(null)
  const topCanvasRef = useRef(null)
  const topChartRef = useRef(null)
  const [categoryShare, setCategoryShare] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [reportPrompt, setReportPrompt] = useState('')
  const [reportMessages, setReportMessages] = useState([
    { role: 'assistant', content: 'Hola, describe el reporte que necesitas (formato, filtros, etc).' }
  ])
  const [qaPrompt, setQaPrompt] = useState('')
  const [qaMessages, setQaMessages] = useState([
    { role: 'assistant', content: 'Soy SmartSales AI. Preguntame sobre temporadas o recomendaciones.' }
  ])
  const [qaLoading, setQaLoading] = useState(false)

  useEffect(() => { if (!isAdmin()) nav('/') }, [])

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        await adminMLTrain('total').catch(() => {})
        const [histRes, predRes, catAgg, prodAgg, cats] = await Promise.all([
          adminHistorical('monthly').catch(() => ({ results: [] })),
          adminMLPredict({ scope: 'total', months: 6 }).catch(() => ({ results: [] })),
          adminHistorical('category').catch(() => ({ results: [] })),
          adminHistorical('product').catch(() => ({ results: [] })),
          listCategories().catch(() => [])
        ])
        const histData = Array.isArray(histRes?.results) ? histRes.results : []
        const predData = Array.isArray(predRes?.results) ? predRes.results : []
        setHist(histData)
        setPred(predData.length ? predData : buildFallbackPredictions(histData))
        setCategoryShare(Array.isArray(catAgg?.results) ? catAgg.results : [])
        setTopProducts(Array.isArray(prodAgg?.results) ? prodAgg.results.slice(0, 5) : [])
        setCategories(Array.isArray(cats) ? cats : [])
      } catch (e) {
        setError(e?.message || 'No se pudo cargar estadisticas')
      } finally {
        setLoading(false)
      }
    })()
  }, [nav])

  const refreshTotals = async () => {
    try {
      setLoading(true)
      await adminMLTrain('total').catch(() => {})
      const [histRes, predRes] = await Promise.all([
        adminHistorical('monthly'),
        adminMLPredict({ scope: 'total', months: 6 })
      ])
      const histData = Array.isArray(histRes?.results) ? histRes.results : []
      const predData = Array.isArray(predRes?.results) ? predRes.results : []
      setHist(histData)
      setPred(predData.length ? predData : buildFallbackPredictions(histData))
    } finally {
      setLoading(false)
    }
  }

  const loadCategory = async (id) => {
    if (!id) {
      refreshTotals()
      return
    }
    setLoading(true); setError('')
    try {
      await adminMLTrain('category').catch(() => {})
      const h = await adminHistorical('monthly', '', '', { category_id: id })
      const histData = Array.isArray(h?.results) ? h.results : []
      setHist(histData)
      const p = await adminMLPredict({ scope: 'category', months: 6, category_id: id })
      const predData = Array.isArray(p?.results) ? p.results : []
      setPred(predData.length ? predData : buildFallbackPredictions(histData))
    } catch (e) {
      setError(e?.message || 'No se pudo cargar categoria')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    import('chart.js/auto').then(({ default: Chart }) => {
      const histLabels = hist.map(r => r.period?.slice(0, 7))
      const predLabels = pred.map(r => r.period?.slice(0, 7))
      const labels = [...histLabels, ...predLabels]
      const histValues = hist.map(r => Number(r.total || 0)).concat(new Array(pred.length).fill(null))
      const predValues = new Array(hist.length).fill(null).concat(pred.map(x => Number(x.predicted_total || 0)))
      if (chartRef.current) chartRef.current.destroy()
      chartRef.current = new Chart(el.getContext('2d'), {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'Historico', data: histValues, borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.2)', tension: .3 },
            { label: 'Prediccion', data: predValues, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.2)', borderDash: [6, 6], tension: .3 },
          ]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
      })
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [hist, pred])

  useEffect(() => {
    const el = categoryCanvasRef.current
    if (!el || !categoryShare.length) return
    import('chart.js/auto').then(({ default: Chart }) => {
      const labels = categoryShare.map(r => r['product__category__name'] || 'Sin categoria')
      const data = categoryShare.map(r => Number(r.total || 0))
      if (categoryChartRef.current) categoryChartRef.current.destroy()
      categoryChartRef.current = new Chart(el.getContext('2d'), {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: ['#0ea5e9', '#a855f7', '#16a34a', '#f97316', '#e11d48'] }] },
        options: { plugins: { legend: { position: 'bottom' } } }
      })
    })
    return () => { if (categoryChartRef.current) categoryChartRef.current.destroy() }
  }, [categoryShare])

  useEffect(() => {
    const el = topCanvasRef.current
    if (!el || !topProducts.length) return
    import('chart.js/auto').then(({ default: Chart }) => {
      const labels = topProducts.map(r => r['product__name'] || 'Producto')
      const data = topProducts.map(r => Number(r.total || 0))
      if (topChartRef.current) topChartRef.current.destroy()
      topChartRef.current = new Chart(el.getContext('2d'), {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Ventas (Bs.)', data, backgroundColor: '#2563eb' }] },
        options: { indexAxis: 'y', plugins: { legend: { display: false } } }
      })
    })
    return () => { if (topChartRef.current) topChartRef.current.destroy() }
  }, [topProducts])

  const runReportPrompt = async () => {
    if (!reportPrompt.trim()) return
    const text = reportPrompt.trim()
    setReportMessages(msgs => [...msgs, { role: 'user', content: text }])
    setReportPrompt('')
    try {
      const wantsPdf = /pdf/i.test(text)
      const wantsExcel = /(excel|xlsx)/i.test(text)
      const format = wantsPdf ? 'pdf' : wantsExcel ? 'excel' : undefined
      const res = await adminPromptReport(text, { format })
      if (res && Array.isArray(res.results)) {
        const narrative = buildReportNarrative(res.results, text)
        setReportMessages(msgs => [...msgs, { role: 'assistant', content: narrative.text, bullets: narrative.bullets }])
      } else {
        const note = wantsPdf
          ? 'Descargue el PDF con el reporte solicitado.'
          : wantsExcel
            ? 'Descargue el Excel generado con los datos.'
            : 'Genere y descargue el archivo solicitado.'
        setReportMessages(msgs => [...msgs, { role: 'assistant', content: note }])
      }
    } catch (e) {
      setReportMessages(msgs => [...msgs, { role: 'assistant', content: e?.message || 'No pude generar el reporte.' }])
    }
  }

  const askAdvisor = async () => {
    if (!qaPrompt.trim()) return
    const text = qaPrompt.trim()
    setQaMessages(msgs => [...msgs, { role: 'user', content: text }])
    setQaPrompt('')
    setQaLoading(true)
    try {
      const res = await adminAIAdvisor(text)
      setQaMessages(msgs => [...msgs, { role: 'assistant', content: res.summary, insights: res.insights, recommendations: res.recommendations }])
    } catch (e) {
      setQaMessages(msgs => [...msgs, { role: 'assistant', content: e?.message || 'No pude responder esa consulta.' }])
    } finally {
      setQaLoading(false)
    }
  }

  const renderMessages = (messages) => (
    <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-1">
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`max-w-[90%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'user' ? 'self-end bg-green-600 text-white' : 'self-start bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'}`}
        >
          <p>{msg.content}</p>
          {msg.bullets?.length ? (
            <ul className="list-disc ml-4 mt-2 text-xs opacity-80 space-y-1">
              {msg.bullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          ) : null}
          {msg.insights?.length ? (
            <ul className="list-disc ml-4 mt-2 text-xs opacity-80 space-y-1">
              {msg.insights.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          ) : null}
          {msg.recommendations?.length ? (
            <div className="mt-3 space-y-2">
              {msg.recommendations.map(rec => (
                <div key={rec.id || rec.name} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-2 text-xs">
                  <div className="font-semibold text-sm">{rec.name}</div>
                  <div className="opacity-70">{rec.category || 'General'} - Bs. {Number(rec.price || 0).toFixed(2)}</div>
                  <div className="mt-1">{rec.reason}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )

  return (
    <section className="container-edge py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Estadisticas con IA</h2>
        <button className="btn" onClick={()=>window.print()}>Imprimir reporte</button>
      </div>
      {loading && <div className="text-sm">Cargando...</div>}
      {error && <div className="text-red-600">{error}</div>}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Ventas historicas y prediccion</h3>
            <div className="flex gap-2">
              <button className={`btn ${tab==='total'?'btn-primary':''}`} onClick={()=>{ setTab('total'); setCatId(''); refreshTotals() }}>Total</button>
              <button className={`btn ${tab==='category'?'btn-primary':''}`} onClick={()=> setTab('category')}>Por categoria</button>
            </div>
          </div>
          {tab==='category' && (
            <div className="flex items-center gap-2 mb-3">
              <select value={catId} onChange={e=>{ setCatId(e.target.value); loadCategory(e.target.value) }} className="rounded-lg border dark:border-neutral-700 px-3 py-2 text-sm">
                <option value="">Selecciona una categoria</option>
                {categories.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <canvas ref={canvasRef} height={140} />
        </div>

        <div className="card p-4 flex flex-col gap-4">
          <h3 className="font-semibold">Reportes (chat)</h3>
          {renderMessages(reportMessages)}
          <div className="flex gap-2 items-center border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2">
            <textarea
              rows={2}
              value={reportPrompt}
              onChange={e=>setReportPrompt(e.target.value)}
              placeholder="Escribe tu solicitud..."
              className="flex-1 bg-transparent focus:outline-none text-sm resize-none"
            />
            <button className="btn btn-primary" onClick={runReportPrompt}>Enviar</button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Participacion por categoria</h3>
          {categoryShare.length ? (
            <canvas ref={categoryCanvasRef} height={200} />
          ) : (
            <p className="text-sm opacity-70">Aun no hay datos reales; mostrando escenarios de entrenamiento.</p>
          )}
        </div>
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Top productos (importe)</h3>
          {topProducts.length ? (
            <canvas ref={topCanvasRef} height={200} />
          ) : (
            <p className="text-sm opacity-70">Sin ventas registradas para construir el ranking.</p>
          )}
        </div>
        <div className="card p-4 flex flex-col gap-4">
          <h3 className="font-semibold">Asistente IA</h3>
          {renderMessages(qaMessages)}
          <div className="flex gap-2 items-center border border-neutral-200 dark:border-neutral-700 rounded-2xl px-3 py-2">
            <textarea
              rows={2}
              value={qaPrompt}
              onChange={e=>setQaPrompt(e.target.value)}
              placeholder="Haz tu consulta..."
              className="flex-1 bg-transparent focus:outline-none text-sm resize-none"
            />
            <button className="btn btn-primary" onClick={askAdvisor} disabled={qaLoading}>{qaLoading ? '...' : 'Enviar'}</button>
          </div>
        </div>
      </div>
    </section>
  )
}
