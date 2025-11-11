import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toggleTheme, loadTheme } from '../utils/theme'
import { getCart, listBrands, listCategories } from '../api/api'
import { isLoggedIn, logout, isAdmin } from '../utils/auth'

export default function Navbar(){
  const nav = useNavigate()
  const loc = useLocation()
  const isAdminRoute = String(loc.pathname || '').startsWith('/admin')

  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState('light')
  const [count, setCount] = useState(0)
  const [auth, setAuth] = useState(isLoggedIn())
  const [admin, setAdmin] = useState(isAdmin())
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [q, setQ] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ brand:"", category:"", min:"", max:"", in_stock:false })

  useEffect(()=>{ setTheme(loadTheme()) }, [])

  useEffect(()=>{
    const load = async () => {
      try {
        const c = await getCart()
        setCount(c?.items?.length || 0)
      } catch {
        setCount(0)
      }
    }
    load()
    const h = ()=> load()
    window.addEventListener('cart:updated', h)
    return ()=> window.removeEventListener('cart:updated', h)
  }, [])

  useEffect(()=>{
    const sync = () => { setAuth(isLoggedIn()); setAdmin(isAdmin()) }
    sync()
    const h = () => sync()
    window.addEventListener('auth:changed', h)
    return () => window.removeEventListener('auth:changed', h)
  }, [])

  useEffect(()=>{
    (async()=>{
      try{
        const [b, c] = await Promise.all([
          listBrands().catch(()=>[]),
          listCategories().catch(()=>[]),
        ])
        setBrands(Array.isArray(b)?b:[])
        setCategories(Array.isArray(c)?c:[])
      }catch{}
    })()
  }, [])

  const applySearch = () => {
    const qs = new URLSearchParams()
    const qv = q.trim()
    if(qv) qs.set('q', qv)
    if(filters.brand) qs.set('brand', filters.brand)
    if(filters.category) qs.set('category', filters.category)
    if(filters.min) qs.set('min', filters.min)
    if(filters.max) qs.set('max', filters.max)
    if(filters.in_stock) qs.set('in_stock', '1')
    nav(`/${qs.toString()?`?${qs.toString()}`:''}`)
    setShowFilters(false)
  }

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-neutral-950/80 backdrop-blur border-b border-green-700">
      <div className="container-edge h-[var(--header-h)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={()=>setOpen(!open)} className="md:hidden p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Abrir menú">
            <span className="block w-6 h-0.5 bg-green-700 mb-1"></span>
            <span className="block w-6 h-0.5 bg-green-700 mb-1"></span>
            <span className="block w-6 h-0.5 bg-green-700"></span>
          </button>

          <Link to="/" className="text-2xl font-extrabold tracking-tight leading-none inline-flex items-center gap-1">
            <motion.span whileHover={{ y:-1, scale:1.02 }} className="text-green-700">Smart</motion.span>
            <motion.span whileHover={{ y:-1, scale:1.02 }} className="text-red-600">Sales365</motion.span>
          </Link>

          <span className="hidden sm:inline text-[11px] sm:text-xs ml-2 px-2 py-1 rounded-full bg-green-700/10 text-green-700 font-semibold">
            A Santa Cruz no la para nadie
          </span>
        </div>

        {!admin && (
        <div className="hidden md:flex flex-1 max-w-2xl mx-6 items-center gap-2">
          <input
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); applySearch() } }}
            placeholder="Buscar productos"
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none"
          />
          <div className="relative">
            <button onClick={()=>setShowFilters(v=>!v)} className="btn border border-neutral-300 dark:border-neutral-700" title="Filtros de búsqueda">
              Filtros
            </button>
            {showFilters && (
              <div className="absolute right-0 mt-2 w-[28rem] max-w-[90vw] card p-4 z-50">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1">Marca</label>
                    <select value={filters.brand} onChange={e=>setFilters(f=>({...f, brand:e.target.value}))} className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-2 text-sm">
                      <option value="">Todas</option>
                      {brands.map(b=> <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Categoría</label>
                    <select value={filters.category} onChange={e=>setFilters(f=>({...f, category:e.target.value}))} className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-2 text-sm">
                      <option value="">Todas</option>
                      {categories.map(c=> <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Precio mínimo</label>
                    <input type="number" min="0" value={filters.min} onChange={e=>setFilters(f=>({...f, min:e.target.value}))} className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Precio máximo</label>
                    <input type="number" min="0" value={filters.max} onChange={e=>setFilters(f=>({...f, max:e.target.value}))} className="w-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-2 text-sm" />
                  </div>
                  <div className="col-span-2 flex items-center justify-between mt-1">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filters.in_stock} onChange={e=>setFilters(f=>({...f, in_stock:e.target.checked}))} /> Solo en stock</label>
                    <div className="flex gap-2">
                      <button className="btn" onClick={()=>{ setFilters({brand:'',category:'',min:'',max:'',in_stock:false}); setQ('') }}>Limpiar</button>
                      <button className="btn btn-primary" onClick={applySearch}>Aplicar</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        <div className={`flex items-center ${isAdminRoute ? 'gap-4 md:gap-6 flex-wrap' : 'gap-2 sm:gap-3'}`}>
          <button onClick={()=>setTheme(toggleTheme())} className="btn border border-neutral-300 dark:border-neutral-700" title="Cambiar tema">
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>

          {!auth && (
            <Link to="/login" className="btn">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"/><path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 2.137.666 4.115 1.8 5.743a.75.75 0 0 0 .494.303C6.57 18.39 8.863 18 12 18s5.43.39 7.706.046a.75.75 0 0 0 .494-.303A9.958 9.958 0 0 0 22 12c0-5.523-4.477-10-10-10Z" clipRule="evenodd"/></svg>
              Iniciar sesión
            </Link>
          )}
          {auth && (
            <>
              {!admin && (
                <Link to="/orders" className="btn">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M4.5 6.75A.75.75 0 0 1 5.25 6h13.5a.75.75 0 0 1 0 1.5H5.25A.75.75 0 0 1 4.5 6.75Zm0 5.25a.75.75 0 0 1 .75-.75h13.5a.75.75 0 0 1 0 1.5H5.25a.75.75 0 0 1-.75-.75Zm0 5.25a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1-.75-.75Z"/></svg>
                  Mis pedidos
                </Link>
              )}
              {!admin && (
                <Link to="/profile" className="btn">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm-9 18a9 9 0 1 1 18 0v1H3v-1Z"/></svg>
                  Mi cuenta
                </Link>
              )}
              {admin && (
                <Link to="/admin/orders" className="btn">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M11.49 3.17a.75.75 0 0 1 1.02 0l1.997 1.874 2.66-.797a.75.75 0 0 1 .926.926l-.798 2.66 1.875 1.997a.75.75 0 0 1 0 1.02l-1.875 1.997.798 2.66a.75.75 0 0 1-.926.926l-2.66-.798-1.997 1.875a.75.75 0 0 1-1.02 0l-1.997-1.875-2.66.798a.75.75 0 0 1-.926-.926l.798-2.66L4.63 12.77a.75.75 0 0 1 0-1.02l1.875-1.997-.798-2.66a.75.75 0 0 1 .926-.926l2.66.798 1.997-1.875Z"/></svg>
                  Admin
                </Link>
              )}
              {admin && (
                <Link to="/admin/products" className="btn">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
                  Productos
                </Link>
              )}
              {admin && (
                <Link to="/admin/users" className="btn">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 14a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm-9 7a9 9 0 1 1 18 0Z"/></svg>
                  Usuarios
                </Link>
              )}
              {admin && (
                <Link to="/admin/reports" className="btn">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M6 2h7l5 5v15H6z"/></svg>
                  Reportes
                </Link>
              )}
              <button onClick={()=>{ if(confirm('¿Cerrar sesión?')) { logout(); setAuth(false); setAdmin(false); nav('/') } }} className="btn border border-neutral-300 dark:border-neutral-700">
                Cerrar sesión
              </button>
            </>
          )}

          {!admin && (
            <Link to="/cart" className="btn btn-primary relative">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M2.25 3a.75.75 0 0 0 0 1.5h1.386c.183 0 .343.124.387.302l2.41 9.64a1.125 1.125 0 0 0 1.09.858h9.615a1.125 1.125 0 0 0 1.09-.858l1.5-6A1.125 1.125 0 0 0 20.61 6H6.511l-.3-1.204A2.25 2.25 0 0 0 3.636 3H2.25Z"/><path d="M8.25 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm9-1.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"/></svg>
              Carrito
              {count > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full px-2 py-0.5" aria-label={"Productos en carrito: " + count}>
                  {count}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>

      {!admin && (<div className="md:hidden px-4 pb-2">
        <div className="flex gap-2">
          <input value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); applySearch() } }} placeholder="Buscar productos" className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none" />
          <button onClick={()=>setShowFilters(v=>!v)} className="btn border border-neutral-300 dark:border-neutral-700">Filtros</button>
        </div>
        {showFilters && (
          <div className="mt-2 card p-3">
            <div className="grid grid-cols-2 gap-3">
              <select value={filters.brand} onChange={e=>setFilters(f=>({...f, brand:e.target.value}))} className="rounded-lg border dark:border-neutral-700 px-2 py-2 text-sm">
                <option value="">Todas marcas</option>
                {brands.map(b=> <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
              <select value={filters.category} onChange={e=>setFilters(f=>({...f, category:e.target.value}))} className="rounded-lg border dark:border-neutral-700 px-2 py-2 text-sm">
                <option value="">Todas categorías</option>
                {categories.map(c=> <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <input type="number" min="0" value={filters.min} onChange={e=>setFilters(f=>({...f, min:e.target.value}))} placeholder="Mín" className="rounded-lg border dark:border-neutral-700 px-2 py-2 text-sm" />
              <input type="number" min="0" value={filters.max} onChange={e=>setFilters(f=>({...f, max:e.target.value}))} placeholder="Máx" className="rounded-lg border dark:border-neutral-700 px-2 py-2 text-sm" />
              <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={filters.in_stock} onChange={e=>setFilters(f=>({...f, in_stock:e.target.checked}))} /> Solo en stock</label>
              <div className="col-span-2 flex gap-2 justify-end">
                <button className="btn" onClick={()=>{ setFilters({brand:'',category:'',min:'',max:'',in_stock:false}); setQ('') }}>Limpiar</button>
                <button className="btn btn-primary" onClick={applySearch}>Aplicar</button>
              </div>
            </div>
          </div>
        )}
      </div>)}

      <AnimatePresence initial={false}>
        {open && (
          <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="md:hidden overflow-hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <div className="px-4 py-3 space-y-2">
              <Link to="/" className="block py-2 transition-transform hover:translate-x-0.5" onClick={()=>setOpen(false)}>Inicio</Link>
              {auth && !admin && <Link to="/orders" className="block py-2 transition-transform hover:translate-x-0.5" onClick={()=>setOpen(false)}>Mis pedidos</Link>}
              {auth && !admin && <Link to="/profile" className="block py-2 transition-transform hover:translate-x-0.5" onClick={()=>setOpen(false)}>Mi cuenta</Link>}
              {admin && <Link to="/admin/orders" className="block py-2 transition-transform hover:translate-x-0.5" onClick={()=>setOpen(false)}>Admin</Link>}
              {admin && <Link to="/admin/products" className="block py-2 transition-transform hover:translate-x-0.5" onClick={()=>setOpen(false)}>Admin Productos</Link>}
              {admin && <Link to="/admin/payments" className="block py-2 transition-transform hover:translate-x-0.5" onClick={()=>setOpen(false)}>Pagos</Link>}
              {admin && <Link to="/admin/sell" className="block py-2 transition-transform hover:translate-x-0.5" onClick={()=>setOpen(false)}>Venta</Link>}
              {admin && <Link to="/admin/stats" className="block py-2 transition-transform hover:translate-x-0.5" onClick={()=>setOpen(false)}>Estadísticas</Link>}
              {admin && <Link to="/admin/users" className="block py-2 transition-transform hover:translate-x-0.5" onClick={()=>setOpen(false)}>Admin Usuarios</Link>}
              {admin && <Link to="/admin/reports" className="block py-2 transition-transform hover:translate-x-0.5" onClick={()=>setOpen(false)}>Admin Reportes</Link>}
              {!admin && <Link to="/cart" className="block py-2 transition-transform hover:translate-x-0.5" onClick={()=>setOpen(false)}>Carrito</Link>}
              {!auth && <Link to="/login" className="block py-2" onClick={()=>setOpen(false)}>Iniciar sesión</Link>}
              {auth && <button onClick={()=>{ if(confirm('¿Cerrar sesión?')) { logout(); setAuth(false); setAdmin(false); setOpen(false); nav('/') } }} className="block py-2">Cerrar sesión</button>}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
      {admin && (
        <div className="hidden md:block border-t border-green-700/20 bg-white/80 dark:bg-neutral-950/70">
          <div className="container-edge py-2 text-sm flex flex-wrap items-center gap-4">
            <Link to="/admin/orders" className="hover:underline">Admin</Link>
            <Link to="/admin/products" className="hover:underline">Productos</Link>
            <Link to="/admin/users" className="hover:underline">Usuarios</Link>
            <Link to="/admin/reports" className="hover:underline">Reportes</Link>
            <Link to="/admin/payments" className="hover:underline">Pagos</Link>
            <Link to="/admin/sell" className="hover:underline">Venta</Link>
            <Link to="/admin/stats" className="font-semibold text-green-700 hover:underline">Estadísticas</Link>
          </div>
        </div>
      )}
    </header>
  )
}
