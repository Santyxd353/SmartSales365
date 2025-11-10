import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAdmin } from '../utils/auth'
import { adminListUsers, adminCreateUser, adminUpdateUser, adminDeleteUser } from '../api/api'

export default function AdminUsers(){
  const nav = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(()=>{ if(!isAdmin()) nav('/') }, [])

  const load = async () => {
    setLoading(true); setError('')
    try{ const list = await adminListUsers(); setItems(Array.isArray(list)?list:[]) }
    catch(e){ setError(e?.message || 'No se pudo cargar usuarios') }
    finally{ setLoading(false) }
  }
  useEffect(()=>{ load() }, [])

  const openNew = () => setEditing({ username:'', email:'', first_name:'', last_name:'', is_staff:true, is_admin:true, password:'' })

  const save = async () => {
    if(!editing) return
    setSaving(true)
    try{
      const payload = {
        username: editing.username,
        email: editing.email,
        first_name: editing.first_name,
        last_name: editing.last_name,
        is_staff: !!editing.is_staff,
        is_admin: !!editing.is_admin,
        ...(editing.password ? { password: editing.password } : {})
      }
      if(editing.id) await adminUpdateUser(editing.id, payload)
      else await adminCreateUser(payload)
      await load(); setEditing(null)
    }catch(e){ alert(e?.message || 'No se pudo guardar') }
    finally{ setSaving(false) }
  }

  return (
    <section className="container-edge py-8">
      <h2 className="text-2xl font-bold mb-4">Administración de Usuarios</h2>
      <div className="mb-4 flex justify-end"><button className="btn btn-primary" onClick={openNew}>Nuevo usuario</button></div>
      {loading && <div className="py-6">Cargando…</div>}
      {error && <div className="py-6 text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-neutral-200 dark:border-neutral-800"><th className="py-2 pr-2">Usuario</th><th className="py-2 pr-2">Nombre</th><th className="py-2 pr-2">Rol</th><th className="py-2 pr-2 text-right">Acciones</th></tr></thead>
            <tbody>
              {items.map(u=> (
                <tr key={u.id} className="border-b border-neutral-100 dark:border-neutral-800">
                  <td className="py-2 pr-2">{u.username}<div className="text-xs opacity-70">{u.email}</div></td>
                  <td className="py-2 pr-2">{u.full_name}</td>
                  <td className="py-2 pr-2">{u.is_staff ? 'Admin' : 'Buyer'}</td>
                  <td className="py-2 pr-2">
                    <div className="flex gap-2 justify-end">
                      <button className="btn" onClick={()=> setEditing({ ...u, is_admin: u.is_admin, password:'' })}>Editar</button>
                      <button className="btn border-red-600 text-red-600" onClick={async()=>{ if(confirm('¿Eliminar?')) { try{ await adminDeleteUser(u.id); await load() } catch(e){ alert(e.message) } } }}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="card p-4 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-2">{editing.id?'Editar usuario':'Nuevo usuario'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm mb-1">Usuario</label>
                <input className="w-full rounded-lg border dark:border-neutral-700 px-3 py-2" value={editing.username} onChange={e=>setEditing({...editing, username:e.target.value})} disabled={!!editing.id} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm mb-1">Correo</label>
                <input type="email" className="w-full rounded-lg border dark:border-neutral-700 px-3 py-2" value={editing.email} onChange={e=>setEditing({...editing, email:e.target.value})} />
              </div>
              <div>
                <label className="block text-sm mb-1">Nombre</label>
                <input className="w-full rounded-lg border dark:border-neutral-700 px-3 py-2" value={editing.first_name} onChange={e=>setEditing({...editing, first_name:e.target.value})} />
              </div>
              <div>
                <label className="block text-sm mb-1">Apellidos</label>
                <input className="w-full rounded-lg border dark:border-neutral-700 px-3 py-2" value={editing.last_name} onChange={e=>setEditing({...editing, last_name:e.target.value})} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm mb-1">Contraseña {editing.id? '(opcional)':''}</label>
                <input type="password" className="w-full rounded-lg border dark:border-neutral-700 px-3 py-2" value={editing.password} onChange={e=>setEditing({...editing, password:e.target.value})} />
              </div>
              <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editing.is_staff} onChange={e=>setEditing({...editing, is_staff:e.target.checked})} /> Con acceso de administrador</label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn" onClick={()=>setEditing(null)} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Guardando…':'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
