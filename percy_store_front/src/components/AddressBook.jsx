import React, { useEffect, useState } from 'react'
import { listAddresses, createAddress, updateAddress, deleteAddress } from '../api/user'

export default function AddressBook(){
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // null | form object
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true); setError('')
    try{ const data = await listAddresses(); setItems(Array.isArray(data)?data:[]) }
    catch(e){ setError(e?.message || 'No se pudieron cargar direcciones') }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ load() }, [])

  const startNew = () => setEditing({
    label:'Casa', department:'Santa Cruz', city:'Santa Cruz de la Sierra', address_line:'', reference:'', lat:'', lng:'', is_default: items.length === 0
  })

  const save = async () => {
    if(!editing) return
    setSaving(true)
    try{
      const payload = {
        label: editing.label, department: editing.department, city: editing.city,
        address_line: editing.address_line, reference: editing.reference || '',
        lat: editing.lat || null, lng: editing.lng || null, is_default: !!editing.is_default,
      }
      if(editing.id) await updateAddress(editing.id, payload)
      else await createAddress(payload)
      await load(); setEditing(null)
    }catch(e){ alert(e?.message || 'No se pudo guardar') }
    finally{ setSaving(false) }
  }

  const useMyLocation = () => {
    if(!navigator.geolocation){ alert('Geolocalización no disponible'); return }
    navigator.geolocation.getCurrentPosition(
      (pos)=>{
        const { latitude, longitude } = pos.coords
        setEditing(e=>({...e, lat: latitude.toFixed(6), lng: longitude.toFixed(6) }))
      },
      ()=> alert('No se pudo obtener la ubicación')
    )
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Direcciones de envío</h3>
        <button className="btn" onClick={startNew}>Agregar dirección</button>
      </div>
      {loading && <div className="py-4">Cargando direcciones…</div>}
      {error && <div className="py-4 text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="space-y-3">
          {items.map(addr => (
            <div key={addr.id} className="card p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{addr.label} {addr.is_default && <span className="text-xs px-2 py-0.5 rounded bg-green-700/10 text-green-700">Principal</span>}</div>
                  <div className="text-sm opacity-80">{addr.address_line} {' — '} {addr.city}, {addr.department}</div>
                  {addr.reference && <div className="text-xs opacity-60">Ref: {addr.reference}</div>}
                  {(addr.lat && addr.lng) && (
                    <div className="mt-2">
                      <iframe
                        title={`map-${addr.id}`}
                        className="w-full h-40 rounded"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${addr.lng-0.01},${addr.lat-0.01},${addr.lng+0.01},${addr.lat+0.01}&layer=mapnik&marker=${addr.lat},${addr.lng}`}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button className="btn" onClick={()=>setEditing(addr)}>Editar</button>
                  <button className="btn border-red-600 text-red-600" onClick={async()=>{ if(confirm('¿Eliminar dirección?')) { try{ await deleteAddress(addr.id); await load() } catch(e){ alert(e.message) } } }}>Eliminar</button>
                </div>
              </div>
            </div>
          ))}
          {!items.length && <div className="opacity-70 text-sm">Aún no registraste direcciones.</div>}
        </div>
      )}

      {editing && (
        <div className="card p-4 mt-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs">Etiqueta</span>
              <input value={editing.label} onChange={e=>setEditing(v=>({...v, label:e.target.value}))} className="mt-1 w-full rounded border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs">Departamento</span>
              <input value={editing.department} onChange={e=>setEditing(v=>({...v, department:e.target.value}))} className="mt-1 w-full rounded border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs">Ciudad</span>
              <input value={editing.city} onChange={e=>setEditing(v=>({...v, city:e.target.value}))} className="mt-1 w-full rounded border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-2 text-sm" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs">Dirección</span>
              <input value={editing.address_line} onChange={e=>setEditing(v=>({...v, address_line:e.target.value}))} className="mt-1 w-full rounded border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-2 text-sm" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs">Referencia</span>
              <input value={editing.reference} onChange={e=>setEditing(v=>({...v, reference:e.target.value}))} className="mt-1 w-full rounded border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-2 text-sm" />
            </label>
            <div className="sm:col-span-2 flex items-center gap-2">
              <label className="block">
                <span className="text-xs">Lat</span>
                <input value={editing.lat} onChange={e=>setEditing(v=>({...v, lat:e.target.value}))} className="mt-1 w-full rounded border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs">Lng</span>
                <input value={editing.lng} onChange={e=>setEditing(v=>({...v, lng:e.target.value}))} className="mt-1 w-full rounded border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-2 text-sm" />
              </label>
              <button onClick={useMyLocation} className="btn">Usar mi ubicación</button>
            </div>
            <label className="sm:col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editing.is_default} onChange={e=>setEditing(v=>({...v, is_default:e.target.checked}))} /> Marcar como principal</label>
            <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
              <button className="btn" onClick={()=>setEditing(null)} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
          {(editing.lat && editing.lng) && (
            <div className="mt-3">
              <iframe
                title="map-preview"
                className="w-full h-48 rounded"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${editing.lng-0.01},${editing.lat-0.01},${editing.lng+0.01},${editing.lat+0.01}&layer=mapnik&marker=${editing.lat},${editing.lng}`}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

