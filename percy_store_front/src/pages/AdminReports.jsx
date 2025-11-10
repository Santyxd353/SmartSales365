import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAdmin } from '../utils/auth'
import { listBrands, listCategories, listSalesReports, generateSalesReport, listAuditReports, generateAuditReport, exportSalesReportCSV, downloadSalesReportBlob, downloadAuditReportBlob } from '../api/api'

export default function AdminReports(){
  const nav = useNavigate()
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [salesFilters, setSalesFilters] = useState({ date_from:'', date_to:'', brand:'', category:'', min_price:'', max_price:'' })
  const [salesReports, setSalesReports] = useState([])
  const [generatingSales, setGeneratingSales] = useState(false)
  const [auditFilters, setAuditFilters] = useState({ date_from:'', date_to:'', action:'', model:'' })
  const [auditReports, setAuditReports] = useState([])
  const [generatingAudit, setGeneratingAudit] = useState(false)
  const [exportingCSV, setExportingCSV] = useState(false)

  useEffect(()=>{ if(!isAdmin()) nav('/') }, [])

  useEffect(()=>{ (async()=>{
    try{
      const [b, c, s, a] = await Promise.all([
        listBrands().catch(()=>[]),
        listCategories().catch(()=>[]),
        listSalesReports().catch(()=>[]),
        listAuditReports().catch(()=>[]),
      ])
      setBrands(Array.isArray(b)?b:[])
      setCategories(Array.isArray(c)?c:[])
      setSalesReports(Array.isArray(s)?s:[])
      setAuditReports(Array.isArray(a)?a:[])
    }catch{}
  })() }, [])

  const genSales = async () => {
    setGeneratingSales(true)
    try{ const rep = await generateSalesReport(salesFilters); setSalesReports(r=>[rep, ...r]) } catch(e){ alert(e.message) }
    finally{ setGeneratingSales(false) }
  }
  const exportCSV = async () => {
    setExportingCSV(true)
    try{
      const blob = await exportSalesReportCSV(salesFilters)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'ventas.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    } catch(e){ alert(e.message) }
    finally{ setExportingCSV(false) }
  }
  const genAudit = async () => {
    setGeneratingAudit(true)
    try{ const rep = await generateAuditReport(auditFilters); setAuditReports(r=>[rep, ...r]) } catch(e){ alert(e.message) }
    finally{ setGeneratingAudit(false) }
  }

  return (
    <section className="container-edge py-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Reporte de Ventas</h2>
        <div className="card p-4 grid md:grid-cols-6 gap-3">
          <input type="date" value={salesFilters.date_from} onChange={e=>setSalesFilters(f=>({...f, date_from:e.target.value}))} className="rounded-lg border dark:border-neutral-700 px-3 py-2 text-sm" />
          <input type="date" value={salesFilters.date_to} onChange={e=>setSalesFilters(f=>({...f, date_to:e.target.value}))} className="rounded-lg border dark:border-neutral-700 px-3 py-2 text-sm" />
          <select value={salesFilters.brand} onChange={e=>setSalesFilters(f=>({...f, brand:e.target.value}))} className="rounded-lg border dark:border-neutral-700 px-3 py-2 text-sm"><option value="">Todas marcas</option>{brands.map(b=> <option key={b.id} value={b.name}>{b.name}</option>)}</select>
          <select value={salesFilters.category} onChange={e=>setSalesFilters(f=>({...f, category:e.target.value}))} className="rounded-lg border dark:border-neutral-700 px-3 py-2 text-sm"><option value="">Todas categorías</option>{categories.map(c=> <option key={c.id} value={c.name}>{c.name}</option>)}</select>
          <input type="number" placeholder="Min precio" value={salesFilters.min_price} onChange={e=>setSalesFilters(f=>({...f, min_price:e.target.value}))} className="rounded-lg border dark:border-neutral-700 px-3 py-2 text-sm" />
          <input type="number" placeholder="Max precio" value={salesFilters.max_price} onChange={e=>setSalesFilters(f=>({...f, max_price:e.target.value}))} className="rounded-lg border dark:border-neutral-700 px-3 py-2 text-sm" />
          <div className="md:col-span-6 flex justify-end gap-2">
            <button className="btn" disabled={exportingCSV} onClick={exportCSV}>{exportingCSV?'Exportando…':'Exportar CSV'}</button>
            <button className="btn btn-primary" disabled={generatingSales} onClick={genSales}>{generatingSales?'Generando…':'Generar PDF'}</button>
          </div>
        </div>
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Historial</h3>
          <ul className="space-y-2">
            {salesReports.map(r=> (
              <li key={r.id} className="flex items-center justify-between card p-3">
                <span>#{r.id} — {new Date(r.created_at).toLocaleString()}</span>
                <button className="btn" onClick={async()=>{ try{ const blob = await downloadSalesReportBlob(r.id); const url = URL.createObjectURL(blob); window.open(url, '_blank'); setTimeout(()=>URL.revokeObjectURL(url), 5000) } catch(e){ alert(e.message) } }}>Descargar</button>
              </li>
            ))}
            {!salesReports.length && <li className="opacity-70">Sin reportes aún.</li>}
          </ul>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Informe de Auditoría (cambios de admin)</h2>
        <div className="card p-4 grid md:grid-cols-5 gap-3">
          <input type="date" value={auditFilters.date_from} onChange={e=>setAuditFilters(f=>({...f, date_from:e.target.value}))} className="rounded-lg border dark:border-neutral-700 px-3 py-2 text-sm" />
          <input type="date" value={auditFilters.date_to} onChange={e=>setAuditFilters(f=>({...f, date_to:e.target.value}))} className="rounded-lg border dark:border-neutral-700 px-3 py-2 text-sm" />
          <input placeholder="Acción (p.ej. UPDATE)" value={auditFilters.action} onChange={e=>setAuditFilters(f=>({...f, action:e.target.value}))} className="rounded-lg border dark:border-neutral-700 px-3 py-2 text-sm" />
          <input placeholder="Modelo (p.ej. Product)" value={auditFilters.model} onChange={e=>setAuditFilters(f=>({...f, model:e.target.value}))} className="rounded-lg border dark:border-neutral-700 px-3 py-2 text-sm" />
          <div className="md:col-span-5 flex justify-end"><button className="btn btn-primary" disabled={generatingAudit} onClick={genAudit}>{generatingAudit?'Generando…':'Generar PDF'}</button></div>
        </div>
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Historial</h3>
          <ul className="space-y-2">
            {auditReports.map(r=> (
              <li key={r.id} className="flex items-center justify-between card p-3">
                <span>#{r.id} — {new Date(r.created_at).toLocaleString()}</span>
                <button className="btn" onClick={async()=>{ try{ const blob = await downloadAuditReportBlob(r.id); const url = URL.createObjectURL(blob); window.open(url, '_blank'); setTimeout(()=>URL.revokeObjectURL(url), 5000) } catch(e){ alert(e.message) } }}>Descargar</button>
              </li>
            ))}
            {!auditReports.length && <li className="opacity-70">Sin reportes aún.</li>}
          </ul>
        </div>
      </div>
    </section>
  )
}
