import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { register as apiRegister } from '../api/user'
import { login as doLogin } from '../utils/auth'

export default function Register(){
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres')
      if (password !== confirm) throw new Error('Las contraseñas no coinciden')
      await apiRegister({ email: email.trim(), password, full_name: fullName.trim(), username: email.trim() })
      await doLogin(email.trim(), password)
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
        <form onSubmit={onSubmit} className="space-y-3">
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
            <input
              type="password"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2"
              placeholder="••••••••"
              required
              aria-invalid={password.length>0 && password.length<6}
            />
            <div className={`text-xs mt-1 ${password.length>0 && password.length<6 ? 'text-red-600' : 'opacity-70'}`}>
              Mínimo 6 caracteres
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Confirmar contraseña</label>
            <input
              type="password"
              value={confirm}
              onChange={e=>setConfirm(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2"
              placeholder="••••••••"
              required
              aria-invalid={confirm.length>0 && confirm !== password}
            />
            {confirm.length>0 && confirm !== password && (
              <div className="text-xs mt-1 text-red-600">Las contraseñas no coinciden</div>
            )}
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button disabled={loading || password.length<6 || password!==confirm} className="btn btn-primary w-full">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/><path d="M3 22a9 9 0 1 1 18 0v1H3v-1Z"/></svg>
            {loading ? 'Creando…' : 'Crear cuenta'}
          </button>
        </form>
        <div className="text-sm mt-4 opacity-80">¿Ya tienes cuenta? <Link to="/login" className="text-green-700 font-semibold">Inicia sesión</Link></div>
      </motion.div>
    </section>
  )
}
