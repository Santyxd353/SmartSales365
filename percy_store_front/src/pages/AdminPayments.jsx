import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAdmin } from '../utils/auth'
import { adminListPendingPayments, markOrderPaid, receiptUrl, downloadWithAuth } from '../api/api'

export default function AdminPayments(){
  const nav = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(()=>{ if(!isAdmin()) nav('/') }, [])

  const load = async() => {
    setLoading(true); setError('')
    try{
      const res = await adminListPendingPayments()
      const list = Array.isArray(res) ? res : (res.results || [])
      setItems(list)
    }catch(e){ setError(e?.message || 'No se pudo cargar pagos pendientes') }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ load() }, [])

  return (
    <section className="container-edge py-8">
      <h2 className="text-2xl font-bold mb-4">Pagos pendientes</h2>
      {loading && <div>Cargando…</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">Cliente</th>
                <th className="py-2 pr-2">Total</th>
                <th className="py-2 pr-2">Método</th>
                <th className="py-2 pr-2">Creada</th>
                <th className="py-2 pr-2">Vence</th>
                <th className="py-2 pr-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(o => {
                const created = o.created_at?.replace('T',' ').slice(0,16)
                const due = o.payment_due_at?.replace('T',' ').slice(0,16)
                const expired = due && new Date(due) < new Date()
                return (
                  <tr key={o.id} className="border-b border-neutral-100 dark:border-neutral-800">
                    <td className="py-2 pr-2">{o.transaction_number}</td>
                    <td className="py-2 pr-2">{o.user}</td>
                    <td className="py-2 pr-2">Bs. {Number(o.grand_total).toFixed(2)}</td>
                    <td className="py-2 pr-2">{o.payment_method || '-'}</td>
                    <td className="py-2 pr-2">{created}</td>
                    <td className={`py-2 pr-2 ${expired?'text-red-600':''}`}>{due || '-'}</td>
                    <td className="py-2 pr-2">
                      <div className="flex gap-2 justify-end">
                        <button className="btn" onClick={async()=>{ try{ await downloadWithAuth(receiptUrl(o.id), `nota_${o.transaction_number}.pdf`) } catch(e){ alert(e.message) }}}>PDF</button>
                        <button className="btn btn-primary" onClick={async()=>{ try{ await markOrderPaid(o.id, 'manual'); await load() } catch(e){ alert(e.message) } }}>Marcar pagada</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
