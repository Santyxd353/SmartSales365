import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { register as apiRegister, updateMe, uploadAvatarFile, sendCode, verifyCode } from '../api/user'
import { login as doLogin } from '../utils/auth'

export default function Register(){
  const nav = useNavigate()
  const [step, setStep] = useState(0)

  // Paso 0: credenciales
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  // Paso 1: perfil (sin teléfono)
  const [birthdate, setBirthdate] = useState('')

  // Paso 2: foto (opcional)
  const [avatar, setAvatar] = useState('')
  const [skipAvatar, setSkipAvatar] = useState(false)

  // Paso 3: verificación por email
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [offerLogin, setOfferLogin] = useState(false)

  // Validaciones
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const isEmailValid = emailRe.test(email.trim())
  const nameError = fullName && fullName.trim().length<=1 ? 'Ingresa tu nombre completo' : ''
  const emailError = email && !isEmailValid ? 'Ingresa un correo válido' : ''
  const pwdError = password && password.length<6 ? 'Mínimo 6 caracteres' : ''
  const confirmError = confirm && confirm!==password ? 'Las contraseñas no coinciden' : ''
  const canNext0 = !nameError && !emailError && !pwdError && !confirmError && fullName && email && password && confirm
  const canNext1 = true
  const canSubmit = sent && code.trim().length===6

  async function finishSignup(){
    setLoading(true); setError('')
    try{
      // Verificar código primero (email)
      const vres = await verifyCode({ email: email.trim(), code, channel: 'email' })
      if(!vres?.ok) throw new Error('Código inválido')

      // Crear cuenta y completar perfil
      await apiRegister({ email: email.trim(), password, full_name: fullName.trim(), username: email.trim() })
      await doLogin(email.trim(), password)
      const parts = fullName.trim().split(' ')
      const first_name = parts[0] || ''
      const last_name = parts.slice(1).join(' ')
      await updateMe({ first_name, last_name, birthdate, avatar_url: skipAvatar ? '' : avatar.trim() })
      nav('/')
    }catch(e){
      const msg = e?.message || 'No se pudo crear la cuenta'
      const fields = e?.fields || {}
      const emailTaken = (fields.email || fields.username)
      if(emailTaken){
        setError('El correo ya está en uso. ¿Deseas iniciar sesión?')
        setOfferLogin(true)
      } else {
        setError(msg)
      }
    }
    finally{ setLoading(false) }
  }

  return (
    <section className="container-edge py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="max-w-md mx-auto card p-6">
        <h1 className="text-2xl font-bold mb-2">Crear cuenta</h1>
        <p className="opacity-80 mb-6">Enciende tu hogar, estilo cruceño profesional.</p>

        <div className="flex items-center gap-2 mb-4 text-sm">
          <span className={`px-2 py-1 rounded ${step===0?'bg-green-700 text-white':'bg-neutral-100 dark:bg-neutral-800'}`}>1. Cuenta</span>
          <span className={`px-2 py-1 rounded ${step===1?'bg-green-700 text-white':'bg-neutral-100 dark:bg-neutral-800'}`}>2. Perfil</span>
          <span className={`px-2 py-1 rounded ${step===2?'bg-green-700 text-white':'bg-neutral-100 dark:bg-neutral-800'}`}>3. Foto</span>
          <span className={`px-2 py-1 rounded ${step===3?'bg-green-700 text-white':'bg-neutral-100 dark:bg-neutral-800'}`}>4. Verificación</span>
        </div>

        {step===0 && (
          <form onSubmit={(e)=>{ e.preventDefault(); if(canNext0) setStep(1) }} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Nombre completo</label>
              <input value={fullName} onChange={e=>setFullName(e.target.value)} className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" placeholder="María Fernanda" required />
              {nameError && <div className="text-xs mt-1 text-red-600">{nameError}</div>}
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" placeholder="tucorreo@dominio.com" required aria-invalid={!!email && !isEmailValid} />
              {emailError && <div className="text-xs mt-1 text-red-600">{emailError}</div>}
            </div>
            <div>
              <label className="block text-sm mb-1">Contraseña</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" placeholder="••••••••" required aria-invalid={password.length>0 && password.length<6} />
              <div className={`text-xs mt-1 ${password.length>0 && password.length<6 ? 'text-red-600' : 'opacity-70'}`}>Mínimo 6 caracteres</div>
            </div>
            <div>
              <label className="block text-sm mb-1">Confirmar contraseña</label>
              <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" placeholder="••••••••" required aria-invalid={confirm.length>0 && confirm!==password} />
              {confirmError && <div className="text-xs mt-1 text-red-600">{confirmError}</div>}
            </div>
            <div className="flex gap-2 justify-between pt-2">
              <div className="text-sm opacity-75">Al continuar aceptas los Términos y la Política de privacidad.</div>
              <button disabled={!canNext0} className="btn btn-primary">Continuar</button>
            </div>
          </form>
        )}

        {step===1 && (
          <form onSubmit={(e)=>{ e.preventDefault(); if(canNext1) setStep(2) }} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Fecha de nacimiento (opcional)</label>
              <input type="date" value={birthdate} onChange={e=>setBirthdate(e.target.value)} className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" className="btn" onClick={()=>setStep(0)}>Atrás</button>
              <button className="btn btn-primary">Continuar</button>
            </div>
          </form>
        )}

        {step===2 && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Foto de perfil (opcional)</label>
              <input type="file" accept="image/*" onChange={async(e)=>{
                const f = e.target.files?.[0]; if(!f) return;
                const url = await uploadAvatarFile(f); setAvatar(url)
              }} />
              {avatar && <img alt="preview" src={avatar} className="mt-2 w-24 h-24 object-cover rounded-full" />}
            </div>
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={skipAvatar} onChange={e=>setSkipAvatar(e.target.checked)} /> Omitir foto</label>
            <div className="flex gap-2 justify-end pt-2">
              <button className="btn" onClick={()=>setStep(1)}>Atrás</button>
              <button className="btn btn-primary" onClick={()=>setStep(3)}>Continuar</button>
            </div>
          </div>
        )}

        {step===3 && (
          <div className="space-y-3">
            <p className="opacity-80">Te enviaremos un código a tu correo.</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn"
                onClick={async()=>{
                  try{
                    setError('')
                    const res = await sendCode({ channel:'email', email: email.trim() })
                    setSent(true)
                    if(res?.dev_only_code){ setError(`Código de prueba (DEV): ${res.dev_only_code}`) }
                  }catch(e){ setError(e?.message || 'No se pudo enviar el código') }
                }}
              >Enviar código</button>
            </div>
            {sent && (
              <div>
                <label className="block text-sm mb-1">Código</label>
                <input value={code} onChange={e=>setCode(e.target.value)} className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" placeholder="123456" />
              </div>
            )}
            {error && (
              <div className="text-sm text-red-600">
                {error}
                {offerLogin && (
                  <span className="block mt-2">
                    <button className="btn btn-primary" onClick={()=>nav('/login', { state:{ prefill: email.trim() } })}>Iniciar sesión</button>
                    <button className="btn ml-2" onClick={()=>{ setOfferLogin(false); setError('') }}>Usar otro correo</button>
                  </span>
                )}
              </div>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <button className="btn" onClick={()=>setStep(2)}>Atrás</button>
              <button disabled={!canSubmit || loading} onClick={finishSignup} className="btn btn-primary">{loading?'Creando…':'Crear cuenta'}</button>
            </div>
          </div>
        )}

        <div className="text-sm mt-6 opacity-80">¿Ya tienes cuenta? <Link to="/login" className="text-green-700 font-semibold">Inicia sesión</Link></div>
      </motion.div>
    </section>
  )
}

