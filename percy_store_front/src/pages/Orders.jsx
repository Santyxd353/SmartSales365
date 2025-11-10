import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getMyOrders, receiptUrl, getAccess } from '../api/api'

export default function Orders(){
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(()=>{
    (async ()=>{
      try {
        setLoading(true)
        const data = await getMyOrders()
        const list = Array.isArray(data) ? data : (Array.isArray(data.results) ? data.results : [])
        setItems(list)
        setError('')
      } catch(e){
        setError(e?.message || 'Error al cargar pedidos')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const openReceipt = async (id) => {
    try {
      const res = await fetch(receiptUrl(id), {
        headers: { 'Authorization': `Bearer ${getAccess()}` }
      })
      if(!res.ok) throw new Error('No se pudo abrir el comprobante')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch(e){
      alert(e.message)
    }
  }

  if(loading) return <div className="container-edge py-10">Cargando pedidos…</div>
  if(error) return <div className="container-edge py-10 text-red-600">{error}</div>

  return (
    <section className="container-edge py-8">
      <h2 className="text-2xl font-bold mb-4">Mis pedidos</h2>
      {!items.length && <div className="opacity-70">Aún no tienes pedidos.</div>}
      <div className="space-y-3">
        {items.map((o, i)=> (
          <motion.div
            key={o.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.03 * i }}
            className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
          >
            <div>
              <div className="font-semibold">TRX {o.transaction_number}</div>
              <div className="text-sm opacity-75">{new Date(o.created_at).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-sm">{o.status}</span>
              <span className="px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-sm">{o.transaction_status}</span>
              <span className="font-bold">Bs. {Number(o.grand_total || 0).toFixed(2)}</span>
              <button className="btn" onClick={()=>openReceipt(o.id)}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M6 2h7l5 5v15H6z"/></svg> Ver comprobante PDF</button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

