// src/components/FeaturedCarousel.jsx
import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { listProducts } from '../api/api'
import ProductCard from './ProductCard'

function Row({ title, items, scrollRef, accent='from-green-600/10 to-transparent' }){
  const scroll = (dir) => {
    const el = scrollRef.current
    if(!el) return
    const delta = Math.min(800, Math.max(280, Math.floor(el.clientWidth * 0.9)))
    el.scrollBy({ left: dir * delta, behavior: 'smooth' })
  }
  if(!items?.length) return null
  return (
    <section className="relative mt-6 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-r ${accent} pointer-events-none`} />
      <div className="relative p-4 flex items-center justify-between">
        <h3 className="text-xl font-extrabold tracking-tight">{title}</h3>
        <div className="flex gap-2">
          <button onClick={()=>scroll(-1)} className="btn" aria-label="Anterior">◀</button>
          <button onClick={()=>scroll(1)} className="btn" aria-label="Siguiente">▶</button>
        </div>
      </div>
      <motion.div
        ref={scrollRef}
        className="relative px-4 pb-4 flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth"
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: .25 }}
      >
        {items.map((p)=> (
          <div key={p.id} className="snap-start min-w-[240px] max-w-[260px]">
            <ProductCard p={p} />
          </div>
        ))}
      </motion.div>
    </section>
  )
}

export default function FeaturedCarousel(){
  const [featured, setFeatured] = useState([])
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const refFeat = useRef(null)
  const refDeals = useRef(null)

  useEffect(()=>{
    let alive = true
    ;(async()=>{
      try{
        setLoading(true)
        const [f, d] = await Promise.all([
          listProducts({ featured:'1', sort:'newest' }).catch(()=>({results:[]})),
          listProducts({ on_sale:'1', sort:'newest' }).catch(()=>({results:[]})),
        ])
        if(!alive) return
        const F = Array.isArray(f)? f : (Array.isArray(f.results)? f.results : [])
        const D = Array.isArray(d)? d : (Array.isArray(d.results)? d.results : [])
        setFeatured(F)
        setDeals(D)
        setError('')
      }catch(e){ if(alive) setError(e?.message || 'No se pudo cargar destacados/ofertas') }
      finally{ if(alive) setLoading(false) }
    })()
    return ()=>{ alive = false }
  }, [])

  if(loading) return <div className="container-edge py-6 opacity-70">Cargando destacados y ofertas…</div>
  if(error) return <div className="container-edge py-6 text-red-600">{error}</div>
  if(!featured.length && !deals.length) return null

  return (
    <div className="container-edge mt-6">
      <Row title="Destacados" items={featured} scrollRef={refFeat} accent="from-green-600/10 to-transparent" />
      <Row title="Ofertas" items={deals} scrollRef={refDeals} accent="from-red-600/10 to-transparent" />
    </div>
  )
}

