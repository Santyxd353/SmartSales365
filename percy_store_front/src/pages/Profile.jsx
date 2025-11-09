import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getMe, updateMe } from '../api/user'

export default function Profile(){
  const [data, setData] = useState(null)
  const [form, setForm] = useState({ first_name:'', last_name:'', phone:'', birthdate:'', avatar_url:'' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  useEffect(()=>{
    (async()=>{
      try{
        setLoading(true)
        const me = await getMe()
        setData(me)
        setForm({
          first_name: me?.full_name?.split(' ')[0] || '',
          last_name: (me?.full_name?.split(' ').slice(1).join(' ')) || '',
          phone: me?.phone || '',
          birthdate: me?.birthdate || '',
          avatar_url: me?.avatar_url || ''
        })
        setError('')
      }catch(e){ setError(e?.message || 'No se pudo cargar el perfil') }
      finally{ setLoading(false) }
    })()
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true); setOk(''); setError('')
    try{
      const res = await updateMe(form)
      setOk('Perfil actualizado')
      setData(res)
    }catch(e){ setError(e?.message || 'Error al actualizar') }
    finally{ setSaving(false) }
  }

  if(loading) return <div className="container-edge py-10">Cargando perfil…</div>
  if(error) return <div className="container-edge py-10 text-red-600">{error}</div>

  return (
    <section className="container-edge py-10">
      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.25}} className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Mi cuenta</h1>
        <p className="opacity-80 mb-6">Personaliza tus datos para una experiencia ágil.</p>
        <div className="card p-6">
          <form onSubmit={onSubmit} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Nombre</label>
              <input className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" value={form.first_name} onChange={e=>setForm(f=>({...f, first_name:e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm mb-1">Apellidos</label>
              <input className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" value={form.last_name} onChange={e=>setForm(f=>({...f, last_name:e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm mb-1">Teléfono</label>
              <input className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" value={form.phone} onChange={e=>setForm(f=>({...f, phone:e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm mb-1">Fecha de nacimiento</label>
              <input type="date" className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" value={form.birthdate||''} onChange={e=>setForm(f=>({...f, birthdate:e.target.value}))} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Avatar (URL)</label>
              <input className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" value={form.avatar_url} onChange={e=>setForm(f=>({...f, avatar_url:e.target.value}))} />
            </div>
            {ok && <div className="sm:col-span-2 text-sm text-green-600">{ok}</div>}
            {error && <div className="sm:col-span-2 text-sm text-red-600">{error}</div>}
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <button disabled={saving} className="btn btn-primary">{saving ? 'Guardando…' : 'Guardar cambios'}</button>
            </div>
          </form>
        </div>
      </motion.div>
    </section>
  )
}

