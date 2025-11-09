import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toggleTheme, loadTheme } from '../utils/theme'
import { getCart } from '../api/api'
import { isLoggedIn, logout, isAdmin } from '../utils/auth'

export default function Navbar(){
  const nav = useNavigate()
  const [open, setOpen]   = useState(false)
  const [theme, setTheme] = useState('light')
  const [count, setCount] = useState(0)
  const [auth, setAuth]   = useState(isLoggedIn())
  const [admin, setAdmin] = useState(isAdmin())

  // tema
  useEffect(()=>{ setTheme(loadTheme()) }, [])

  // contador carrito + escucha de eventos globales
  useEffect(()=>{
    const load = async () => {
      try {
        const c = await getCart()
        setCount(c?.items?.length || 0)
      } catch {
        setCount(0) // no logueado o carrito vacío
      }
    }
    load()
    const h = ()=> load()
    window.addEventListener('cart:updated', h)
    return ()=> window.removeEventListener('cart:updated', h)
  }, [])

  // sesión
  useEffect(()=>{
    const sync = () => {
      setAuth(isLoggedIn())
      setAdmin(isAdmin())
    }
    sync()
    const h = () => sync()
    window.addEventListener('auth:changed', h)
    return () => window.removeEventListener('auth:changed', h)
  }, [])

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-neutral-950/80 backdrop-blur border-b border-cruce��o-green">
      <div className="container-edge h-[var(--header-h)] flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={()=>setOpen(!open)}
            className="md:hidden p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Abrir menú"
          >
            <span className="block w-6 h-0.5 bg-cruce��o-green mb-1"></span>
            <span className="block w-6 h-0.5 bg-cruce��o-green mb-1"></span>
            <span className="block w-6 h-0.5 bg-cruce��o-green"></span>
          </button>

          <Link to="/" className="text-2xl font-extrabold tracking-tight leading-none">
            <span className="text-cruce��o-green">Percy</span>
            <span className="text-cruce��o-red">Store</span>
          </Link>

          <span className="hidden sm:inline text-[11px] sm:text-xs ml-2 px-2 py-1 rounded-full bg-cruce��o-green/10 text-cruce��o-green font-semibold">
            A Santa Cruz no la para nadie
          </span>
        </div>

        {/* Search (desktop) */}
        <div className="hidden md:flex flex-1 max-w-xl mx-6">
          <input
            placeholder="Buscar productos"
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={()=>setTheme(toggleTheme())}
            className="btn border border-neutral-300 dark:border-neutral-700"
            title="Cambiar tema"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>

          {!auth && <Link to="/login" className="btn">Iniciar sesión</Link>}
          {auth && (
            <>
              <Link to="/orders" className="btn">Mis pedidos</Link>
              <Link to="/profile" className="btn">Mi cuenta</Link>
              {admin && <Link to="/admin/orders" className="btn">Admin</Link>}
              <button
                onClick={()=>{ if(confirm('¿Cerrar sesión?')) { logout(); setAuth(false); setAdmin(false); nav('/') } }}
                className="btn border border-neutral-300 dark:border-neutral-700"
              >Cerrar sesión</button>
            </>
          )}

          <Link to="/cart" className="btn btn-primary relative">
            Carrito
            {count > 0 && (
              <span
                className="absolute -top-2 -right-2 bg-cruce��o-red text-white text-xs rounded-full px-2 py-0.5"
                aria-label={`Productos en carrito: ${count}`}
              >
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Search (mobile) */}
      <div className="md:hidden px-4 pb-2">
        <input
          placeholder="Buscar productos"
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none"
        />
      </div>

      {/* Mobile menu */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="md:hidden overflow-hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
          >
            <div className="px-4 py-3 space-y-2">
              <Link to="/" className="block py-2" onClick={()=>setOpen(false)}>Inicio</Link>
              {auth && <Link to="/orders" className="block py-2" onClick={()=>setOpen(false)}>Mis pedidos</Link>}
              {auth && <Link to="/profile" className="block py-2" onClick={()=>setOpen(false)}>Mi cuenta</Link>}
              {admin && <Link to="/admin/orders" className="block py-2" onClick={()=>setOpen(false)}>Admin</Link>}
              <Link to="/cart" className="block py-2" onClick={()=>setOpen(false)}>Carrito</Link>
              {!auth && <Link to="/login" className="block py-2" onClick={()=>setOpen(false)}>Iniciar sesión</Link>}
              {auth && <button onClick={()=>{ if(confirm('¿Cerrar sesión?')) { logout(); setAuth(false); setAdmin(false); setOpen(false); nav('/') } }} className="block py-2">Cerrar sesión</button>}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
