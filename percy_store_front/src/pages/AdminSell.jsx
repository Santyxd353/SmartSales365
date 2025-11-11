import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAdmin } from '../utils/auth'
import { listProducts, adminCreateLocalSale, startQrPayment, receiptUrl, downloadWithAuth, adminSaveOrderCustomerInfo } from '../api/api'

export default function AdminSell(){
  const nav = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [lines, setLines] = useState([])
  const [method, setMethod] = useState('CASH')
  const [order, setOrder] = useState(null)
  const [checkoutUrl, setCheckoutUrl] = useState('')
  const [qrData, setQrData] = useState('')
  const [qrInstructions, setQrInstructions] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [customerForm, setCustomerForm] = useState({ name:'', document:'', phone:'', warranty:'' })
  const [customerSaved, setCustomerSaved] = useState(false)
  const [savingCustomer, setSavingCustomer] = useState(false)

  useEffect(()=>{
    if(!isAdmin()){
      nav('/')
      return
    }
    loadProducts()
  }, [])

  const loadProducts = async (params = {}) => {
    setLoading(true); setError('')
    try{
      const r = await listProducts(params)
      const list = Array.isArray(r) ? r : (r.results || [])
      setResults(list)
    }catch(e){
      setError(e?.message || 'No se pudo cargar el catálogo')
    }finally{
      setLoading(false)
    }
  }

  const search = async () => {
    const trimmed = query.trim()
    if(trimmed){
      await loadProducts({ q: trimmed })
    }else{
      await loadProducts()
    }
  }

  const add = (p) => {
    setLines(prev => {
      const ex = prev.find(x => x.id===p.id)
      if(ex){ return prev.map(x => x.id===p.id? { ...x, qty: x.qty+1 } : x) }
      return [...prev, { id:p.id, name:p.name, price: Number(p.final_price ?? p.price), qty:1 }]
    })
  }

  const total = lines.reduce((a,l)=> a + l.qty * Number(l.price), 0)

  const saveCustomerInfo = async () => {
    if(!order) return
    if(!customerForm.name.trim()){
      alert('Ingresa el nombre del cliente.')
      return
    }
    setSavingCustomer(true)
    try{
      await adminSaveOrderCustomerInfo(order.order_id, {
        customer_name: customerForm.name,
        customer_document: customerForm.document,
        customer_phone: customerForm.phone,
        customer_warranty_note: customerForm.warranty,
      })
      setCustomerSaved(true)
    }catch(e){
      alert(e?.message || 'No se pudieron guardar los datos')
    }finally{
      setSavingCustomer(false)
    }
  }

  return (
    <section className="container-edge py-8">
      <h2 className="text-2xl font-bold mb-4">Venta en local</h2>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="flex gap-2 mb-3">
            <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'){ search() } }} placeholder="Buscar producto" className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm" />
            <button className="btn" onClick={search}>Buscar</button>
          </div>
          {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
          {loading && <div className="text-sm mb-3">Cargando catálogo...</div>}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map(p => (
              <div key={p.id} className="card overflow-hidden flex flex-col">
                <div className="h-36 bg-neutral-100 dark:bg-neutral-900 overflow-hidden flex items-center justify-center">
                  <img src={p.image_url} alt={p.name} className="h-full object-cover w-full" />
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <div className="font-semibold line-clamp-2 min-h-[3rem]">{p.name}</div>
                  <div className="text-sm opacity-70 mt-1">{p.brand?.name || 'Sin marca'} • Stock: {p.stock}</div>
                  <div className="mt-2 text-lg font-bold">Bs. {Number(p.final_price ?? p.price).toFixed(2)}</div>
                  <button className="btn btn-primary mt-auto" onClick={()=>add(p)}>Agregar a la venta</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-4 h-fit">
          <div className="space-y-2">
            {lines.map((l,i)=> (
              <div key={l.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="font-medium line-clamp-1">{l.name}</div>
                  <div className="text-xs opacity-70">Bs. {Number(l.price).toFixed(2)}</div>
                </div>
                <input
                  type="number"
                  min="1"
                  value={l.qty}
                  onChange={e=>{
                    const val = parseInt(e.target.value, 10)
                    const qty = Number.isNaN(val) ? 1 : Math.max(1, val)
                    setLines(prev => prev.map((x,ix)=> ix===i? { ...x, qty } : x))
                  }}
                  className="w-20 text-center rounded border dark:border-neutral-700 bg-white dark:bg-neutral-900"
                />
                <button className="btn" onClick={()=> setLines(prev => prev.filter((_,ix)=> ix!==i))}>Quitar</button>
              </div>
            ))}
          </div>
          <div className="flex justify-between my-3"><span>Total</span><span className="font-bold">Bs. {total.toFixed(2)}</span></div>
          {success && <div className="text-green-600 text-sm mb-2">{success}</div>}
          {!order && (
            <>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm"><input type="radio" name="pm" checked={method==='CASH'} onChange={()=>setMethod('CASH')} /> Efectivo</label>
                <label className="flex items-center gap-2 text-sm"><input type="radio" name="pm" checked={method==='QR'} onChange={()=>setMethod('QR')} /> QR</label>
              </div>
              <div className="mt-4 space-y-3 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3">
                <h4 className="font-semibold text-sm">Datos para el comprobante</h4>
                <input
                  className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
                  placeholder="Nombre completo del cliente"
                  value={customerForm.name}
                  onChange={e=>{ setCustomerSaved(false); setCustomerForm(prev=>({...prev, name:e.target.value})) }}
                />
                <input
                  className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
                  placeholder="Carnet o documento"
                  value={customerForm.document}
                  onChange={e=>{ setCustomerSaved(false); setCustomerForm(prev=>({...prev, document:e.target.value})) }}
                />
                <input
                  className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
                  placeholder="Teléfono de contacto"
                  value={customerForm.phone}
                  onChange={e=>{ setCustomerSaved(false); setCustomerForm(prev=>({...prev, phone:e.target.value})) }}
                />
                <input
                  className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
                  placeholder="Tiempo de garantía (ej. 12 meses)"
                  value={customerForm.warranty}
                  onChange={e=>{ setCustomerSaved(false); setCustomerForm(prev=>({...prev, warranty:e.target.value})) }}
                />
              </div>
              <button className="btn btn-primary w-full mt-3" onClick={async()=>{
                if(!lines.length){
                  alert('Agrega al menos un producto a la venta.')
                  return
                }
                if(!customerForm.name.trim()){
                  alert('Ingresa los datos del cliente antes de registrar la venta.')
                  return
                }
                try{
                  const items = lines.filter(l=> l.qty>0).map(l=> ({ product_id: l.id, qty: l.qty }))
                  if(!items.length){
                    alert('Todas las cantidades deben ser mayores a 0')
                    return
                  }
                  setError(''); setSuccess('')
                  const o = await adminCreateLocalSale(items, method)
                  setOrder(o)
                  try{
                    await adminSaveOrderCustomerInfo(o.order_id, {
                      customer_name: customerForm.name,
                      customer_document: customerForm.document,
                      customer_phone: customerForm.phone,
                      customer_warranty_note: customerForm.warranty,
                    })
                    setCustomerSaved(true)
                  }catch(e){
                    alert(e?.message || 'Venta creada, pero no se guardaron los datos del cliente.')
                  }
                  setSuccess(method==='CASH' ? 'Venta registrada correctamente.' : 'Venta creada. Completa el pago QR.')
                  setLines([])
                  setCheckoutUrl('')
                  setQrData('')
                  setQrInstructions('')
                  if(method==='QR'){
                    try{
                      const s = await startQrPayment(o.order_id)
                      setCheckoutUrl(s.checkout_url || '')
                      setQrData(s.qr_data || '')
                      setQrInstructions(s.instructions || '')
                    }catch(e){
                      alert(e?.message || 'No se pudo generar el QR')
                    }
                  }
                }catch(e){
                  alert(e?.message || 'No se pudo registrar la venta')
                }
              }}>Registrar venta</button>
            </>
          )}
          {order && method==='CASH' && (
            <button className="btn btn-primary w-full" onClick={async()=>{ try{ await downloadWithAuth(receiptUrl(order.order_id), `nota_${order.transaction_number||'venta'}.pdf`) } catch(e){ alert(e.message) }}}>Imprimir Nota (PDF)</button>
          )}
          {order && method==='QR' && (
            <>
              {(qrData || checkoutUrl) && (
                <div className="mt-2 flex flex-col items-center gap-2">
                  <img
                    alt="QR de pago"
                    className="w-44 h-44 rounded border border-neutral-200 dark:border-neutral-700"
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData || checkoutUrl)}`}
                  />
                  {qrInstructions && <p className="text-xs text-center opacity-70">{qrInstructions}</p>}
                </div>
              )}
              {checkoutUrl && <a className="btn w-full mt-2" target="_blank" href={checkoutUrl}>Abrir pago</a>}
              <button className="btn btn-primary w-full mt-2" onClick={async()=>{ try{ await downloadWithAuth(receiptUrl(order.order_id), `nota_${order.transaction_number||'venta'}.pdf`) } catch(e){ alert(e.message) }}}>Nota de Venta (PDF)</button>
            </>
          )}
          {order && (
            <div className="mt-4 border-t border-neutral-200 dark:border-neutral-800 pt-4 space-y-3">
              <h4 className="font-semibold text-sm">Editar datos del comprobante</h4>
              <input
                className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
                placeholder="Nombre completo del cliente"
                value={customerForm.name}
                onChange={e=>{ setCustomerSaved(false); setCustomerForm(prev=>({...prev, name:e.target.value})) }}
              />
              <input
                className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
                placeholder="Carnet o documento"
                value={customerForm.document}
                onChange={e=>{ setCustomerSaved(false); setCustomerForm(prev=>({...prev, document:e.target.value})) }}
              />
              <input
                className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
                placeholder="Teléfono de contacto"
                value={customerForm.phone}
                onChange={e=>{ setCustomerSaved(false); setCustomerForm(prev=>({...prev, phone:e.target.value})) }}
              />
              <input
                className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
                placeholder="Tiempo de garantía (ej. 12 meses)"
                value={customerForm.warranty}
                onChange={e=>{ setCustomerSaved(false); setCustomerForm(prev=>({...prev, warranty:e.target.value})) }}
              />
              <button className="btn btn-primary w-full" onClick={saveCustomerInfo} disabled={savingCustomer}>
                {savingCustomer ? 'Guardando...' : 'Actualizar datos'}
              </button>
              {customerSaved && <p className="text-xs text-green-600">Datos guardados correctamente.</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
