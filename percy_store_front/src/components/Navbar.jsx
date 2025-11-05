import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toggleTheme, loadTheme } from '../utils/theme'
import { getCart } from '../api/api'

export default function Navbar(){
  const [open, setOpen]   = useState(false)
  const [theme, setTheme] = useState('light')
  const [count, setCount] = useState(0)

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

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-neutral-950/80 backdrop-blur border-b border-cruceño-green">
      <div className="container-edge h-[var(--header-h)] flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={()=>setOpen(!open)}
            className="md:hidden p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Abrir menú"
          >
            <span className="block w-6 h-0.5 bg-cruceño-green mb-1"></span>
            <span className="block w-6 h-0.5 bg-cruceño-green mb-1"></span>
            <span className="block w-6 h-0.5 bg-cruceño-green"></span>
          </button>

          <Link to="/" className="text-2xl font-extrabold tracking-tight leading-none">
            <span className="text-cruceño-green">Percy</span>
            <span className="text-cruceño-red">Store</span>
          </Link>

          <span className="hidden sm:inline text-[11px] sm:text-xs ml-2 px-2 py-1 rounded-full bg-cruceño-green/10 text-cruceño-green font-semibold">
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
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <Link to="/login" className="btn">Iniciar sesión</Link>

          <Link to="/cart" className="btn btn-primary relative">
            Carrito
            {count > 0 && (
              <span
                className="absolute -top-2 -right-2 bg-cruceño-red text-white text-xs rounded-full px-2 py-0.5"
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
              <Link to="/" className="block py-2">Inicio</Link>
              <Link to="/profile" className="block py-2">Mi cuenta</Link>
              <Link to="/cart" className="block py-2">Carrito</Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
