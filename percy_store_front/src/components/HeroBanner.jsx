import React from 'react'
import { motion } from 'framer-motion'
import bannerImg from '../img/santa-cruz-portada-536cf1b2.webp'

export default function HeroBanner(){
  return (
    <section className="container-edge mt-4">
      <div className="relative card overflow-hidden">
        <img src={bannerImg} alt="Banner PercyStore" className="w-full h-56 sm:h-72 object-cover" />
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent flex items-center"
        >
          <div className="p-6 sm:p-10">
            <h2 className="text-white text-2xl sm:text-4xl font-extrabold drop-shadow">
              A Santa Cruz no la para nadie
            </h2>
            <p className="text-white/90 mt-2 max-w-xl">
              Ofertas en electrodomésticos, climatización, TV y audio. Calidad y garantía.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

