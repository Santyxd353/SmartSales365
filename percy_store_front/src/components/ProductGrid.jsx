// src/components/ProductGrid.jsx
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { listProducts } from '../api/api'   // <-- usar listProducts
import ProductCard from './ProductCard'

export default function ProductGrid({ q }) {
  const [loading, setLoading] = useState(true)
  const [items, setItems]     = useState([])
  const [error, setError]     = useState(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        setLoading(true)
        const list = await listProducts(q || '')
        if (!alive) return
        // la API devuelve {results:[...]} cuando hay paginación;
        // si viene array plano, lo usamos tal cual.
        const data = Array.isArray(list) ? list : (Array.isArray(list.results) ? list.results : [])
        setItems(data)
        setError(null)
      } catch (e) {
        if (alive) setError(e.message || 'Error')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [q])

  if (loading) return <div className="py-10 text-center opacity-70">Cargando catálogo…</div>
  if (error)   return <div className="py-10 text-center text-red-600">Error: {error}</div>
  if (!items.length) return <div className="py-10 text-center opacity-70">Sin resultados.</div>

  return (
    <motion.div
      layout
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      {items.map((p, i) => (
        <motion.div
          key={p.id}
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.03 * i, duration: 0.25 }}
        >
          <ProductCard p={p} />
        </motion.div>
      ))}
    </motion.div>
  )
}
