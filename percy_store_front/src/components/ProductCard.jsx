import React from 'react'
import { motion } from 'framer-motion'

export default function ProductCard({p, onAdd}){
  return (
    <motion.div layout className="card p-3 flex flex-col" whileHover={{ y:-2 }}>
      <div className="aspect-[4/3] rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800">
        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
      </div>
      <div className="mt-3">
        <h3 className="font-semibold line-clamp-2">{p.name}</h3>
        <p className="text-cruceño-green font-bold mt-1">Bs. {Number(p.price).toFixed(2)}</p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Garantía: {p.warranty_months} meses</p>
      </div>
      <button onClick={()=>onAdd?.(p)} className="btn btn-primary mt-auto">Agregar al carrito</button>
    </motion.div>
  )
}