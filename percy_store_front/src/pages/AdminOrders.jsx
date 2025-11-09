import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { isAdmin } from '../utils/auth'
import { getOrderByTransaction, markOrderPaid, voidOrder, receiptUrl, getAccess } from '../api/api'

export default function AdminOrders(){
  const nav = useNavigate()
  const [trx, setTrx] = useState('')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(()=>{
    if(!isAdmin()) nav('/')
  }, [])

  const search = async (e) => {
    e?.preventDefault()
    setError('')
    setOrder(null)
    try {
      setLoading(true)
      const data = await getOrderByTransaction(trx.trim())
      setOrder(data)
    } catch(e){
      setError(e?.message || 'No se pudo buscar la orden')
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <section className="container-edge py-8">
      <h2 className="text-2xl font-bold mb-4">Administración de órdenes</h2>
      <p className="opacity-80 mb-4">Busca por número de transacción para gestionar pagos o anulaciones.</p>
      <form onSubmit={search} className="flex gap-2 mb-4">
        <input
          value={trx}
          onChange={e=>setTrx(e.target.value)}
          className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2"
          placeholder="TRX-YYYYMMDD-..."
        />
        <button className="btn btn-primary" disabled={loading || !trx.trim()}>
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
      </form>
      {error && <div className="text-red-600 mb-3">{error}</div>}

      {order && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="card p-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold">TRX {order.transaction_number}</div>
              <div className="text-sm opacity-75">{new Date(order.created_at).toLocaleString()} — Usuario #{order.user}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-sm">{order.status}</span>
              <span className="px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-sm">{order.transaction_status}</span>
              <span className="font-bold">Bs. {Number(order.grand_total || 0).toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={async()=>{
              try{
                const updated = await markOrderPaid(order.id, 'simulated')
                setOrder(updated)
                alert('Pago confirmado')
              }catch(e){ alert(e.message) }
            }}>Marcar como pagada</button>

            <button className="btn" onClick={async()=>{
              const reason = prompt('Motivo de anulación', 'Anulación por administración')
              if(reason === null) return
              try{
                const updated = await voidOrder(order.id, reason)
                setOrder(updated)
                alert('Transacción anulada')
              }catch(e){ alert(e.message) }
            }}>Anular transacción</button>

            <button className="btn" onClick={()=>openReceipt(order.id)}>Ver comprobante PDF</button>
          </div>
        </motion.div>
      )}
    </section>
  )
}

