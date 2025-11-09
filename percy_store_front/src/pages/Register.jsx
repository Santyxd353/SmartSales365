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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiRegister({ email: email.trim(), password, full_name: fullName.trim(), username: email.trim() })
      await doLogin(email.trim(), password)
      nav('/')
    } catch (e){
      setError(e?.message || 'No se pudo crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="container-edge py-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="max-w-md mx-auto card p-6"
      >
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
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" placeholder="••••••••" required />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button disabled={loading} className="btn btn-primary w-full">{loading ? 'Creando…' : 'Crear cuenta'}</button>
        </form>
        <div className="text-sm mt-4 opacity-80">¿Ya tienes cuenta? <Link to="/login" className="text-cruce��o-green font-semibold">Inicia sesión</Link></div>
      </motion.div>
    </section>
  )
}

