import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { isAdmin } from '../utils/auth'
import {
  adminListProducts, adminCreateProduct, adminUpdateProduct, adminDeleteProduct, adminAdjustStock,
  listBrands, listCategories
} from '../api/api'

export default function AdminProducts(){
  const nav = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [active, setActive] = useState('')
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [editing, setEditing] = useState(null) // null | { ...product }
  const [saving, setSaving] = useState(false)

  useEffect(()=>{ if(!isAdmin()) nav('/') }, [])

  const load = async () => {
    setLoading(true); setError('')
    try{
      const res = await adminListProducts({ q, brand, category, active })
      const list = Array.isArray(res) ? res : (res.results || [])
      setItems(list)
    }catch(e){ setError(e?.message || 'No se pudo cargar productos') }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ (async()=>{
    try{
      const [b, c] = await Promise.all([listBrands(), listCategories()])
      setBrands(Array.isArray(b)?b:[])
      setCategories(Array.isArray(c)?c:[])
    }catch{}
    await load()
  })() }, [])

  const openNew = () => setEditing({
    name:'', description:'', price:0, stock:0, image_url:'', warranty_months:0,
    brand_id:null, category_id:null, is_active:true, color:'', size:'',
    is_featured:false, sale_price:null, discount_percent:null
  })

  const save = async () => {
    if(!editing) return
    setSaving(true)
    try{
      const payload = {
        name: editing.name,
        description: editing.description,
        price: Number(editing.price||0),
        stock: Number(editing.stock||0),
        image_url: editing.image_url,
        warranty_months: Number(editing.warranty_months||0),
        color: editing.color || '',
        size: editing.size || '',
        is_active: !!editing.is_active,
        is_featured: !!editing.is_featured,
        sale_price: editing.sale_price === null || editing.sale_price === '' ? null : Number(editing.sale_price||0),
        discount_percent: editing.discount_percent === null || editing.discount_percent === '' ? null : Number(editing.discount_percent||0),
        brand_id: editing.brand_id || null,
        category_id: editing.category_id || null,
      }
      if(editing.id){ await adminUpdateProduct(editing.id, payload) }
      else { await adminCreateProduct(payload) }
      await load(); setEditing(null)
    }catch(e){ alert(e?.message || 'Error al guardar') }
    finally{ setSaving(false) }
  }

  return (
    <section className="container-edge py-8">
      <h2 className="text-2xl font-bold mb-4">Administración de Productos</h2>

      <div className="card p-4 mb-4 grid md:grid-cols-5 gap-2">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por nombre o descripción" className="md:col-span-2 rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm" />
        <select value={brand} onChange={e=>setBrand(e.target.value)} className="rounded-lg border dark:border-neutral-700 px-3 py-2 text-sm">
          <option value="">Todas marcas</option>
          {brands.map(b=> <option key={b.id} value={b.name}>{b.name}</option>)}
        </select>
        <select value={category} onChange={e=>setCategory(e.target.value)} className="rounded-lg border dark:border-neutral-700 px-3 py-2 text-sm">
          <option value="">Todas categorías</option>
          {categories.map(c=> <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select value={active} onChange={e=>setActive(e.target.value)} className="rounded-lg border dark:border-neutral-700 px-3 py-2 text-sm">
          <option value="">Activos e inactivos</option>
          <option value="1">Solo activos</option>
          <option value="0">Solo inactivos</option>
        </select>
        <div className="flex gap-2 md:col-span-5 justify-end">
          <button onClick={load} className="btn">Aplicar filtros</button>
          <button onClick={openNew} className="btn btn-primary">Nuevo producto</button>
        </div>
      </div>

      {loading && <div className="py-6">Cargando…</div>}
      {error && <div className="py-6 text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="py-2 pr-2">Producto</th>
                <th className="py-2 pr-2">Marca</th>
                <th className="py-2 pr-2">Categoría</th>
                <th className="py-2 pr-2">Precio</th>
                <th className="py-2 pr-2">Destacado</th>
                <th className="py-2 pr-2">Oferta</th>
                <th className="py-2 pr-2">Stock</th>
                <th className="py-2 pr-2">Estado</th>
                <th className="py-2 pr-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p, i)=> (
                <tr key={p.id} className="border-b border-neutral-100 dark:border-neutral-800">
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-2">
                      <img src={p.image_url} alt={p.name} className="w-12 h-12 object-cover rounded" />
                      <div className="font-medium">{p.name}</div>
                    </div>
                  </td>
                  <td className="py-2 pr-2">{p.brand?.name || '-'}</td>
                  <td className="py-2 pr-2">{p.category?.name || '-'}</td>
                  <td className="py-2 pr-2">Bs. {Number(p.price).toFixed(2)}</td>
                  <td className="py-2 pr-2">{p.is_featured ? '✓' : '-'}</td>
                  <td className="py-2 pr-2">{p.sale_price ? `Bs. ${Number(p.sale_price).toFixed(2)}` : (p.discount_percent ? `${Number(p.discount_percent)}%` : '-')}</td>
                  <td className="py-2 pr-2">{p.stock}</td>
                  <td className="py-2 pr-2">{p.is_active ? 'Activo' : 'Inactivo'}</td>
                  <td className="py-2 pr-2">
                    <div className="flex gap-2 justify-end">
                      <button className="btn" onClick={()=>setEditing(p)}>Editar</button>
                      <button className="btn" onClick={async()=>{ const n = prompt('Aumentar en…', '1'); if(n===null) return; try{ await adminAdjustStock(p.id, parseInt(n)); await load() } catch(e){ alert(e.message) } }}>+ Stock</button>
                      <button className="btn" onClick={async()=>{ const n = prompt('Disminuir en…', '1'); if(n===null) return; try{ await adminAdjustStock(p.id, -parseInt(n)); await load() } catch(e){ alert(e.message) } }}>- Stock</button>
                      <button className="btn border-red-600 text-red-600" onClick={async()=>{ if(confirm('¿Eliminar?')){ try{ await adminDeleteProduct(p.id); await load() } catch(e){ alert(e.message) } } }}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="card w-full max-w-2xl p-4 bg-white dark:bg-neutral-900">
            <h3 className="text-lg font-bold mb-3">{editing.id ? 'Editar producto' : 'Nuevo producto'}</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Nombre</label>
                <input className="w-full rounded-lg border dark:border-neutral-700 px-3 py-2" value={editing.name} onChange={e=>setEditing({...editing, name:e.target.value})} />
              </div>
              <div>
                <label className="block text-sm mb-1">Imagen (URL)</label>
                <input className="w-full rounded-lg border dark:border-neutral-700 px-3 py-2" value={editing.image_url||''} onChange={e=>setEditing({...editing, image_url:e.target.value})} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm mb-1">Descripción</label>
                <textarea rows={3} className="w-full rounded-lg border dark:border-neutral-700 px-3 py-2" value={editing.description||''} onChange={e=>setEditing({...editing, description:e.target.value})} />
              </div>
              <div>
                <label className="block text-sm mb-1">Precio</label>
                <input type="number" min="0" className="w-full rounded-lg border dark:border-neutral-700 px-3 py-2" value={editing.price} onChange={e=>setEditing({...editing, price:e.target.value})} />
              </div>
              <div>
                <label className="block text-sm mb-1">Precio de oferta (opcional)</label>
                <input type="number" min="0" step="0.01" className="w-full rounded-lg border dark:border-neutral-700 px-3 py-2" value={editing.sale_price ?? ''} onChange={e=>setEditing({...editing, sale_price: e.target.value===''? null : e.target.value})} />
              </div>
              <div>
                <label className="block text-sm mb-1">% Descuento (opcional)</label>
                <input type="number" min="0" max="99" step="0.01" className="w-full rounded-lg border dark:border-neutral-700 px-3 py-2" value={editing.discount_percent ?? ''} onChange={e=>setEditing({...editing, discount_percent: e.target.value===''? null : e.target.value})} />
                <p className="text-xs opacity-70 mt-1">Si defines precio de oferta, se ignora el %.</p>
              </div>
              <div>
                <label className="block text-sm mb-1">Stock</label>
                <input type="number" min="0" className="w-full rounded-lg border dark:border-neutral-700 px-3 py-2" value={editing.stock} onChange={e=>setEditing({...editing, stock:e.target.value})} />
              </div>
              <div>
                <label className="block text-sm mb-1">Garantía (meses)</label>
                <input type="number" min="0" className="w-full rounded-lg border dark:border-neutral-700 px-3 py-2" value={editing.warranty_months} onChange={e=>setEditing({...editing, warranty_months:e.target.value})} />
              </div>
              <div>
                <label className="block text-sm mb-1">Color</label>
                <input className="w-full rounded-lg border dark:border-neutral-700 px-3 py-2" value={editing.color||''} onChange={e=>setEditing({...editing, color:e.target.value})} />
              </div>
              <div>
                <label className="block text-sm mb-1">Tamaño</label>
                <input className="w-full rounded-lg border dark:border-neutral-700 px-3 py-2" value={editing.size||''} onChange={e=>setEditing({...editing, size:e.target.value})} />
              </div>
              <div>
                <label className="block text-sm mb-1">Marca</label>
                <select className="w-full rounded-lg border dark:border-neutral-700 px-3 py-2" value={editing.brand_id||''} onChange={e=>setEditing({...editing, brand_id: e.target.value? Number(e.target.value): null})}>
                  <option value="">Sin marca</option>
                  {brands.map(b=> <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Categoría</label>
                <select className="w-full rounded-lg border dark:border-neutral-700 px-3 py-2" value={editing.category_id||''} onChange={e=>setEditing({...editing, category_id: e.target.value? Number(e.target.value): null})}>
                  <option value="">Sin categoría</option>
                  {categories.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editing.is_active} onChange={e=>setEditing({...editing, is_active: e.target.checked})} /> Activo</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editing.is_featured} onChange={e=>setEditing({...editing, is_featured: e.target.checked})} /> Destacado</label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn" onClick={()=>setEditing(null)} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Guardando…':'Guardar'}</button>
            </div>
          </div>
        </motion.div>
      )}
    </section>
  )
}
