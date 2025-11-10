import React from 'react'
import { motion } from 'framer-motion'

const CATS = ['Electrodomésticos','Climatización','Refrigeración','TV & audio','Tecnología','Lavado & secado','Consolas'];

export default function CategoryBar({onPick}){
  return (
    <section className="container-edge mt-6">
      <div className="flex flex-wrap gap-2">
        {CATS.map((c)=> (
          <motion.button key={c} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} onClick={()=>onPick?.(c)} className="badge border-green-700 text-green-700 hover:bg-green-700 hover:text-white transition">
            {c}
          </motion.button>
        ))}
      </div>
    </section>
  )
}

