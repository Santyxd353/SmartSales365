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

          {!auth && (\n            <Link to="/login" className="btn">\n              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"/><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 2.137.666 4.115 1.8 5.743a.75.75 0 0 0 .494.303C6.57 18.39 8.863 18 12 18s5.43.39 7.706.046a.75.75 0 0 0 .494-.303A9.958 9.958 0 0 0 22 12c0-5.523-4.477-10-10-10Z" clip-rule="evenodd"/></svg> Iniciar sesión\n            </Link>\n          )}
          {auth && (
            <>
              <Link to="/orders" className="btn"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M4.5 6.75A.75.75 0 0 1 5.25 6h13.5a.75.75 0 0 1 0 1.5H5.25A.75.75 0 0 1 4.5 6.75Zm0 5.25a.75.75 0 0 1 .75-.75h13.5a.75.75 0 0 1 0 1.5H5.25a.75.75 0 0 1-.75-.75Zm0 5.25a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1-.75-.75Z"/></svg> Mis pedidos</Link>
              <Link to="/profile" className="btn"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm-9 18a9 9 0 1 1 18 0v1H3v-1Z"/></svg> Mi cuenta</Link>
              {admin && (<Link to="/admin/orders" className="btn"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M11.49 3.17a.75.75 0 0 1 1.02 0l1.997 1.874 2.66-.797a.75.75 0 0 1 .926.926l-.798 2.66 1.875 1.997a.75.75 0 0 1 0 1.02l-1.875 1.997.798 2.66a.75.75 0 0 1-.926.926l-2.66-.798-1.997 1.875a.75.75 0 0 1-1.02 0l-1.997-1.875-2.66.798a.75.75 0 0 1-.926-.926l.798-2.66L4.63 12.77a.75.75 0 0 1 0-1.02l1.875-1.997-.798-2.66a.75.75 0 0 1 .926-.926l2.66.798 1.997-1.875Z"/></svg> Admin</Link>)}
              <button
                onClick={()=>{ if(confirm('¿Cerrar sesión?')) { logout(); setAuth(false); setAdmin(false); nav('/') } }}
                className="btn border border-neutral-300 dark:border-neutral-700"
              >Cerrar sesión</button>
            </>
          )}

          <Link to="/cart" className="btn btn-primary relative">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M2.25 3a.75.75 0 0 0 0 1.5h1.386c.183 0 .343.124.387.302l2.41 9.64a1.125 1.125 0 0 0 1.09.858h9.615a1.125 1.125 0 0 0 1.09-.858l1.5-6A1.125 1.125 0 0 0 20.61 6H6.511l-.3-1.204A2.25 2.25 0 0 0 3.636 3H2.25Z"/><path d="M8.25 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm9-1.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"/></svg>
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
              {auth && <Link to="/orders" className="block py-2" onClick={()=>setOpen(false)}><span className="inline-flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M4.5 6.75A.75.75 0 0 1 5.25 6h13.5a.75.75 0 0 1 0 1.5H5.25A.75.75 0 0 1 4.5 6.75Zm0 5.25a.75.75 0 0 1 .75-.75h13.5a.75.75 0 0 1 0 1.5H5.25a.75.75 0 0 1-.75-.75Zm0 5.25a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1-.75-.75Z"/></svg> Mis pedidos</span></Link>}
              {auth && <Link to="/profile" className="block py-2" onClick={()=>setOpen(false)}><span className="inline-flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm-9 18a9 9 0 1 1 18 0v1H3v-1Z"/></svg> Mi cuenta</span></Link>}
              {admin && <Link to="/admin/orders" className="block py-2" onClick={()=>setOpen(false)}><span className="inline-flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M11.49 3.17a.75.75 0 0 1 1.02 0l1.997 1.874 2.66-.797a.75.75 0 0 1 .926.926l-.798 2.66 1.875 1.997a.75.75 0 0 1 0 1.02l-1.875 1.997.798 2.66a.75.75 0 0 1-.926.926l-2.66-.798-1.997 1.875a.75.75 0 0 1-1.02 0l-1.997-1.875-2.66.798a.75.75 0 0 1-.926-.926l.798-2.66L4.63 12.77a.75.75 0 0 1 0-1.02l1.875-1.997-.798-2.66a.75.75 0 0 1 .926-.926l2.66.798 1.997-1.875Z"/></svg> Admin</span></Link>}
              <Link to="/cart" className="block py-2" onClick={()=>setOpen(false)}>Carrito</Link>
              {!auth && <Link to="/login" className="block py-2" onClick={()=>setOpen(false)}><span className="inline-flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"/><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 2.137.666 4.115 1.8 5.743a.75.75 0 0 0 .494.303C6.57 18.39 8.863 18 12 18s5.43.39 7.706.046a.75.75 0 0 0 .494-.303A9.958 9.958 0 0 0 22 12c0-5.523-4.477-10-10-10Z" clip-rule="evenodd"/></svg> Iniciar sesión</span></Link>}
              {auth && <button onClick={()=>{ if(confirm('¿Cerrar sesión?')) { logout(); setAuth(false); setAdmin(false); setOpen(false); nav('/') } }} className="block py-2">Cerrar sesión</button>}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
