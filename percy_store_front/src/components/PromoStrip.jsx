import React from 'react'
import { motion } from 'framer-motion'

export default function PromoStrip(){
  const items = [
    { label: 'Garantía oficial', icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-4z"/></svg>
    )},
    { label: 'Envío rápido', icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 7h11v10H3z"/><path d="M14 10h4l3 3v4h-7V10z"/></svg>
    )},
    { label: 'Pago seguro', icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a6 6 0 00-6 6v3H4a2 2 0 00-2 2v7h20v-7a2 2 0 00-2-2h-2V8a6 6 0 00-6-6z"/></svg>
    )},
  ]
  return (
    <section className="container-edge mt-4">
      <motion.div initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}} transition={{duration:.3}} className="grid sm:grid-cols-3 gap-3">
        {items.map((it,i)=> (
          <div key={i} className="card p-3 flex items-center gap-2">
            <span className="text-green-700">{it.icon}</span>
            <span className="text-sm font-medium">{it.label}</span>
          </div>
        ))}
      </motion.div>
    </section>
  )
}

