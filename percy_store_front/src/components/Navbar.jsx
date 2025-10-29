import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toggleTheme, loadTheme } from '../utils/theme';

export default function Navbar(){
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState('light');

  useEffect(()=>{ setTheme(loadTheme()) }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-neutral-950/80 backdrop-blur border-b border-cruceño-green">
      <div className="container-edge h-[var(--header-h)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={()=>setOpen(!open)} className="md:hidden p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Abrir menú">
            <span className="block w-6 h-0.5 bg-cruceño-green mb-1"></span>
            <span className="block w-6 h-0.5 bg-cruceño-green mb-1"></span>
            <span className="block w-6 h-0.5 bg-cruceño-green"></span>
          </button>
          <Link to="/" className="text-2xl font-extrabold tracking-tight">
            <span className="text-cruceño-green">SmartSales</span><span className="text-cruceño-red">365</span>
          </Link>
        </div>
        <div className="hidden md:flex flex-1 max-w-xl mx-6">
          <input placeholder="Buscar productos" className="w-full rounded-lg border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setTheme(toggleTheme())} className="btn border border-neutral-300 dark:border-neutral-700">{theme === 'dark' ? '☀️' : '🌙'}</button>
          <Link to="/login" className="btn">Iniciar sesión</Link>
          <Link to="/cart" className="btn btn-primary">Carrito</Link>
        </div>
      </div>
      <div className="md:hidden px-4 pb-2">
        <input placeholder="Buscar productos" className="w-full rounded-lg border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900" />
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="md:hidden overflow-hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
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