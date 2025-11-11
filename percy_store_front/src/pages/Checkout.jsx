import React, { useEffect, useState } from 'react'
import { getCart } from '../api/api'
import { checkout, startQrPayment, getOrder, receiptUrl, downloadWithAuth } from '../api/api'

export default function Checkout(){
  const [cart, setCart] = useState(null)
  const [method, setMethod] = useState('QR')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [order, setOrder] = useState(null)
  const [checkoutUrl, setCheckoutUrl] = useState('')
  const [qrData, setQrData] = useState('')
  const [paid, setPaid] = useState(false)

  useEffect(()=>{
    (async()=>{
      try{ setLoading(true); const c = await getCart(); setCart(c) } catch(e){ setError(e.message) } finally{ setLoading(false) }
    })()
  }, [])

  useEffect(()=>{
    let t
    if(order && method==='QR' && !paid){
      t = setInterval(async()=>{
        try{ const o = await getOrder(order.order_id); if(o.status === 'PAID'){ setPaid(true) } } catch{}
      }, 4000)
    }
    return ()=> t && clearInterval(t)
  }, [order, method, paid])

  const total = cart?.items?.reduce((a,i)=> a + i.qty * Number(i.price_snapshot), 0) || 0
  if(loading) return <div className="container-edge py-10">Cargando…</div>
  if(error) return <div className="container-edge py-10 text-red-600">{error}</div>
  if(!cart || !cart.items?.length) return <div className="container-edge py-10">Tu carrito está vacío.</div>

  return (
    <section className="container-edge py-8">
      <h2 className="text-2xl font-bold mb-4">Checkout</h2>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-2">
          {cart.items.map(it=> (
            <div key={it.id} className="card p-3 flex items-center gap-3">
              <img src={it.image_url || it.product?.image_url} className="w-12 h-12 object-cover rounded" />
              <div className="flex-1">
                <div className="font-medium">{it.product_name || it.product?.name}</div>
                <div className="text-sm opacity-70">{it.qty} x Bs. {Number(it.price_snapshot).toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="card p-4 h-fit">
          <div className="flex justify-between mb-3"><span>Total</span><span className="font-bold">Bs. {total.toFixed(2)}</span></div>
          {!order && (
            <>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm"><input type="radio" name="pm" checked={method==='QR'} onChange={()=>setMethod('QR')} /> Pagar con QR</label>
                <label className="flex items-center gap-2 text-sm"><input type="radio" name="pm" checked={method==='CASH'} onChange={()=>setMethod('CASH')} /> Pagar en efectivo (en local)</label>
              </div>
              <button className="btn btn-primary w-full mt-3" onClick={async()=>{
                try{
                  setError('')
                  const o = await checkout({ payment_method: method })
                  setOrder(o)
                  if(method==='QR'){
                    const s = await startQrPayment(o.order_id)
                    setCheckoutUrl(s.checkout_url || '')
                    setQrData(s.qr_data || '')
                  }
                }catch(e){ setError(e.message || 'Error en checkout') }
              }}>Confirmar y continuar</button>
              {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
            </>
          )}
          {order && method==='QR' && (
            <div className="mt-2 space-y-2">
              <div className="text-sm">Escanea el QR para pagar. Se confirmará automáticamente.</div>
              {(qrData || checkoutUrl) && (
                <img alt="QR de pago" className="w-48 h-48 mx-auto"
                     src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData || checkoutUrl)}`} />
              )}
              {checkoutUrl && <a className="btn w-full" target="_blank" href={checkoutUrl}>Abrir pago</a>}
              {!checkoutUrl && qrData && <div className="text-xs opacity-70 text-center">Escanea con tu app de pago para completar</div>}
              {paid && <button className="btn btn-primary w-full" onClick={async()=>{
                try{ await downloadWithAuth(receiptUrl(order.order_id), 'nota_venta.pdf', 'application/pdf') } catch(e){ alert(e.message) }
              }}>Descargar Nota de Venta (PDF)</button>}
            </div>
          )}
          {order && method==='CASH' && (
            <div className="mt-2 space-y-2">
              <div className="text-sm">Tu pedido está pendiente de pago en efectivo. Presenta esta nota en el local.</div>
              <button className="btn btn-primary w-full" onClick={async()=>{
                try{ await downloadWithAuth(receiptUrl(order.order_id), 'nota_venta.pdf', 'application/pdf') } catch(e){ alert(e.message) }
              }}>Descargar Nota de Venta (PDF)</button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
