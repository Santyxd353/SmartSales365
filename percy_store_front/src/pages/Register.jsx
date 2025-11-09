import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { register as apiRegister, updateMe } from '../api/user'
import { login as doLogin } from '../utils/auth'

export default function Register(){
  const nav = useNavigate()
  const [step, setStep] = useState(0)

  // Paso 0: credenciales
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  // Paso 1: perfil
  const [phone, setPhone] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [avatar, setAvatar] = useState('')
  const [omitAvatar, setOmitAvatar] = useState(false)

  // Paso 2: verificación
  const [via, setVia] = useState('email')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canNextStep0 = fullName.trim().length>1 && /@/.test(email) && password.length>=6 && password===confirm
  const canNextStep1 = phone.trim().length>=6 && !!birthdate
  const canSubmit = sent && code.trim().length===6

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiRegister({ email: email.trim(), password, full_name: fullName.trim(), username: email.trim() })
      await doLogin(email.trim(), password)
      const parts = fullName.trim().split(' ')
      const first_name = parts[0] || ''
      const last_name = parts.slice(1).join(' ')
      await updateMe({ first_name, last_name, phone: phone.trim(), birthdate, avatar_url: omitAvatar ? '' : avatar.trim() })
      nav('/')
    } catch (e){
      setError(e?.message || 'No se pudo crear la cuenta')
    } finally { setLoading(false) }
  }

  return (
    <section className="container-edge py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="max-w-md mx-auto card p-6">
        <h1 className="text-2xl font-bold mb-2">Crear cuenta</h1>
        <p className="opacity-80 mb-6">Enciende tu hogar, estilo cruceño profesional.</p>

        <div className="flex items-center gap-2 mb-4 text-sm">
          <span className={`px-2 py-1 rounded ${step===0?'bg-green-700 text-white':'bg-neutral-100 dark:bg-neutral-800'}`}>1. Cuenta</span>
          <span className={`px-2 py-1 rounded ${step===1?'bg-green-700 text-white':'bg-neutral-100 dark:bg-neutral-800'}`}>2. Perfil</span>
          <span className={`px-2 py-1 rounded ${step===2?'bg-green-700 text-white':'bg-neutral-100 dark:bg-neutral-800'}`}>3. Verificación</span>
        </div>

        {step===0 && (
          <form onSubmit={(e)=>{e.preventDefault(); if(canNextStep0) setStep(1)}} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Nombre completo</label>
              <input value={fullName} onChange={e=>setFullName(e.target.value)} className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" placeholder="María Fernanda" required />
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" placeholder="tucorreo@dominio.com" required />
            </div>
            <div>
              <label className="block text-sm mb-1">Contraseña</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" placeholder="••••••••" required aria-invalid={password.length>0 && password.length<6} />
              <div className={`text-xs mt-1 ${password.length>0 && password.length<6 ? 'text-red-600' : 'opacity-70'}`}>Mínimo 6 caracteres</div>
            </div>
            <div>
              <label className="block text-sm mb-1">Confirmar contraseña</label>
              <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" placeholder="••••••••" required aria-invalid={confirm.length>0 && confirm!==password} />
              {confirm.length>0 && confirm!==password && <div className="text-xs mt-1 text-red-600">Las contraseñas no coinciden</div>}
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="submit" disabled={!canNextStep0} className="btn btn-primary">Continuar</button>
            </div>
          </form>
        )}

        {step===1 && (
          <form onSubmit={(e)=>{e.preventDefault(); if(canNextStep1) setStep(2)}} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Teléfono</label>
              <input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" placeholder="70000000" required />
            </div>
            <div>
              <label className="block text-sm mb-1">Fecha de nacimiento</label>
              <input type="date" value={birthdate} onChange={e=>setBirthdate(e.target.value)} className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" required />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm mb-1">Foto de perfil (URL)</label>
                <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={omitAvatar} onChange={e=>setOmitAvatar(e.target.checked)} /> Omitir</label>
              </div>
              <input value={avatar} onChange={e=>setAvatar(e.target.value)} className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" placeholder="https://…" disabled={omitAvatar} />
            </div>
            <div className="flex justify-between pt-2">
              <button type="button" onClick={()=>setStep(0)} className="btn">Atrás</button>
              <button type="submit" disabled={!canNextStep1} className="btn btn-primary">Continuar</button>
            </div>
          </form>
        )}

        {step===2 && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Verificar por</label>
              <div className="flex gap-3 text-sm">
                <label className="inline-flex items-center gap-2"><input type="radio" name="via" checked={via==='email'} onChange={()=>setVia('email')} /> Email</label>
                <label className="inline-flex items-center gap-2"><input type="radio" name="via" checked={via==='tel'} onChange={()=>setVia('tel')} /> Teléfono</label>
              </div>
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-sm mb-1">Código de verificación</label>
                <input value={code} onChange={e=>setCode(e.target.value)} maxLength={6} className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 tracking-widest" placeholder="123456" required />
                {!sent && <div className="text-xs opacity-70 mt-1">Pulsa “Enviar código” para simular el envío.</div>}
              </div>
              <button type="button" className="btn" onClick={()=>setSent(true)}>Enviar código</button>
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex justify-between pt-2">
              <button type="button" onClick={()=>setStep(1)} className="btn">Atrás</button>
              <button type="submit" disabled={!canSubmit || loading} className="btn btn-primary">{loading ? 'Creando…' : 'Crear cuenta'}</button>
            </div>
          </form>
        )}

        <div className="text-sm mt-6 opacity-80">¿Ya tienes cuenta? <Link to="/login" className="text-green-700 font-semibold">Inicia sesión</Link></div>
      </motion.div>
    </section>
  )
}
