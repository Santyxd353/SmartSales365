import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getMe, updateMe, uploadAvatarFile, sendCode, changeEmail, changePhone } from '../api/user'
import AddressBook from '../components/AddressBook'

export default function Profile(){
  const nav = useNavigate()
  const [data, setData] = useState(null)
  const [form, setForm] = useState({ first_name:'', last_name:'', phone:'', birthdate:'', avatar_url:'' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [edit, setEdit] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [emailFlow, setEmailFlow] = useState({ value:'', sent:false, code:'' })
  const [phoneFlow, setPhoneFlow] = useState({ value:'', sent:false, code:'' })

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
        setAvatarPreview(me?.avatar_url || '')
        setEmailFlow({ value: me?.email || '', sent:false, code:'' })
        setPhoneFlow({ value: me?.phone || '', sent:false, code:'' })
        setError('')
      }catch(e){
        const msg = e?.message || 'No se pudo cargar el perfil'
        setError(msg)
        if (String(msg).toLowerCase().includes('iniciar ses')) nav('/login')
      }
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
      setEdit(false)
    }catch(e){ setError(e?.message || 'Error al actualizar') }
    finally{ setSaving(false) }
  }

  if(loading) return <div className="container-edge py-10">Cargando perfil…</div>
  if(error) return <div className="container-edge py-10 text-red-600">{error}</div>

  const silhouette = (
    <svg viewBox="0 0 24 24" className="w-24 h-24 text-neutral-300"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 20a8 8 0 0 1 16 0" fill="currentColor"/></svg>
  )

  return (
    <section className="container-edge py-10">
      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.25}} className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-white flex items-center justify-center ring-2 ring-neutral-200 dark:ring-neutral-800">
            {avatarPreview ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover"/> : silhouette}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{data?.full_name || 'Mi cuenta'}</h1>
            <p className="opacity-80 text-sm">{emailFlow.value}</p>
          </div>
          <div className="ml-auto">
            {!edit && <button className="btn" onClick={()=>setEdit(true)}>Editar perfil</button>}
            {edit && <button className="btn" onClick={()=>setEdit(false)}>Cancelar</button>}
          </div>
        </div>

        <div className="card p-6">
          <form onSubmit={onSubmit} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Nombre</label>
              <input disabled={!edit} className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" value={form.first_name} onChange={e=>setForm(f=>({...f, first_name:e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm mb-1">Apellidos</label>
              <input disabled={!edit} className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" value={form.last_name} onChange={e=>setForm(f=>({...f, last_name:e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm mb-1">TelÃ©fono</label>
              <div className="flex gap-2">
                <input disabled={!edit} className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" value={phoneFlow.value} onChange={e=>setPhoneFlow(f=>({...f, value:e.target.value}))} />
                {edit && !phoneFlow.sent && <button type="button" className="btn" onClick={async()=>{ try{ await sendCode({ channel:'sms', phone: phoneFlow.value }); setPhoneFlow(f=>({...f, sent:true })) } catch(e){ alert(e.message) } }}>Verificar</button>}
              </div>
              {edit && phoneFlow.sent && (
                <div className="mt-2 flex gap-2">
                  <input className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" placeholder="CÃ³digo" value={phoneFlow.code} onChange={e=>setPhoneFlow(f=>({...f, code:e.target.value}))} />
                  <button type="button" className="btn btn-primary" onClick={async()=>{ try{ await changePhone({ phone: phoneFlow.value, code: phoneFlow.code }); alert('TelÃ©fono verificado'); setForm(f=>({...f, phone: phoneFlow.value })); setPhoneFlow(f=>({...f, sent:false, code:'' })) } catch(e){ alert(e.message) } }}>Confirmar</button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm mb-1">Fecha de nacimiento</label>
              <input disabled={!edit} type="date" className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" value={form.birthdate||''} onChange={e=>setForm(f=>({...f, birthdate:e.target.value}))} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Correo</label>
              <div className="flex gap-2">
                <input disabled={!edit} type="email" className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" value={emailFlow.value} onChange={e=>setEmailFlow(f=>({...f, value:e.target.value}))} />
                {edit && !emailFlow.sent && <button type="button" className="btn" onClick={async()=>{ try{ await sendCode({ channel:'email', email: emailFlow.value }); setEmailFlow(f=>({...f, sent:true })) } catch(e){ alert(e.message) } }}>Verificar</button>}
              </div>
              {edit && emailFlow.sent && (
                <div className="mt-2 flex gap-2">
                  <input className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" placeholder="CÃ³digo" value={emailFlow.code} onChange={e=>setEmailFlow(f=>({...f, code:e.target.value}))} />
                  <button type="button" className="btn btn-primary" onClick={async()=>{ try{ await changeEmail({ email: emailFlow.value, code: emailFlow.code }); alert('Correo verificado'); setEmailFlow({ value: emailFlow.value, sent:false, code:'' }) } catch(e){ alert(e.message) } }}>Confirmar</button>
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Foto de perfil</label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-white flex items-center justify-center ring-1 ring-neutral-200 dark:ring-neutral-800">
                  {avatarPreview ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover"/> : (
                    <svg viewBox="0 0 24 24" className="w-10 h-10 text-neutral-300"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 20a8 8 0 0 1 16 0" fill="currentColor"/></svg>
                  )}
                </div>
                {edit && (
                  <input type="file" accept="image/*" onChange={async(e)=>{
                    const file = e.target.files?.[0]; if(!file) return;
                    const url = await uploadAvatarFile(file); setAvatarPreview(url); setForm(f=>({...f, avatar_url: url }))
                  }} />
                )}
              </div>
            </div>
            {ok && <div className="sm:col-span-2 text-sm text-green-600">{ok}</div>}
            {error && <div className="sm:col-span-2 text-sm text-red-600">{error}</div>}
            {edit && (
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <button disabled={saving} className="btn btn-primary"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17 3H7a2 2 0 0 0-2 2v14l7-3 7 3V5a2 2 0 0 0-2-2Z"/></svg> {saving ? 'Guardando…' : 'Guardar cambios'}</button>
              </div>
            )}
          </form>
        </div>
        <AddressBook />
      </motion.div>
    </section>
  )
}


