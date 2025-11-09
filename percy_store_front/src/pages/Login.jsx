import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { login as doLogin, isLoggedIn } from '../utils/auth'

export default function Login(){
  const nav = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(()=>{
    if(isLoggedIn()) nav('/')
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await doLogin(username.trim(), password)
      nav('/')
    } catch (e) {
      setError(e?.message || 'No se pudo iniciar sesión')
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
        <h1 className="text-2xl font-bold mb-2">Bienvenido a PercyStore</h1>
        <p className="opacity-80 mb-6">Inicia sesión para continuar. Verde esperanza, fuerza cruceña.</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Usuario o email</label>
            <input
              value={username}
              onChange={e=>setUsername(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2"
              placeholder="tu_usuario"
              required
            />
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
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button disabled={loading} className="btn btn-primary w-full">
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>
        <div className="text-sm mt-4 opacity-80">¿No tienes cuenta? <a href="/register" className="text-cruce��o-green font-semibold">Crear cuenta</a></div>
      </motion.div>
    </section>
  )
}
