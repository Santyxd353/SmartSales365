import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { login as doLogin, isLoggedIn } from '../utils/auth'

export default function Login(){
  const nav = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(()=>{ if(isLoggedIn()) nav('/') }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await doLogin(username.trim(), password)
      nav('/')
    } catch (e) {
      setError(e?.message || 'No se pudo iniciar sesión')
    } finally { setLoading(false) }
  }

  return (
    <section className="container-edge py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="max-w-md mx-auto card p-6">
        <h1 className="text-2xl font-bold mb-2">Bienvenido a PercyStore</h1>
        <p className="opacity-80 mb-6">Inicia sesión para continuar. Verde esperanza, fuerza cruceña.</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Usuario o email</label>
            <input value={username} onChange={e=>setUsername(e.target.value)} className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" placeholder="tu_usuario" required />
          </div>
          <div>
            <label className="block text-sm mb-1">Contraseña</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2" placeholder="••••••••" required />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button disabled={loading} className="btn btn-primary w-full">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M16.5 3.75a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-9a.75.75 0 0 1-.75-.75V4.5a.75.75 0 0 1 .75-.75h9ZM21 9.75a.75.75 0 0 1 .75.75v9a.75.75 0 0 1-.75.75H3a.75.75 0 0 1-.75-.75v-9a.75.75 0 0 1 .75-.75h18Z"/></svg>
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>
        <div className="text-sm mt-4 opacity-80">¿No tienes cuenta? <Link to="/register" className="text-green-700 font-semibold inline-flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 12a5 5 0 1 0 0-10 5 5 5 0 0 0 0 10Z"/><path d="M3 22a9 9 0 1 1 18 0v1H3v-1Z"/></svg>Crear cuenta</Link></div>
      </motion.div>
    </section>
  )
}

