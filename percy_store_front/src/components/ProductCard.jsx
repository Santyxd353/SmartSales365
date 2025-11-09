import React from 'react';
import { motion } from 'framer-motion';
import { addToCart } from '../api/api';

export default function ProductCard({ p }) {
  const onAdd = async () => {
    try{
      await addToCart(p.id, 1);
      // avisar a la app que cambió el carrito
      window.dispatchEvent(new CustomEvent('cart:updated'));
      alert('✅ Agregado al carrito');
    }catch(e){
      if(String(e).includes('401')) alert('⚠️ Inicia sesión para agregar al carrito');
      else alert('❌ ' + (e.message || 'Error al agregar'));
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: .25 }}
      className="card overflow-hidden group hover:shadow-lg transition-all"
    >
      <div className="overflow-hidden">
        <img src={p.image_url} alt={p.name} className="w-full h-40 object-cover group-hover:scale-[1.02] transition-transform" />
      </div>
      <div className="p-3">
        <h3 className="font-semibold line-clamp-2 min-h-[2.5rem]">{p.name}</h3>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-bold">Bs. {Number(p.price).toFixed(2)}</span>
          <span className="text-xs opacity-70">{p.warranty_months ? `${p.warranty_months}m garantía` : `Stock: ${p.stock}`}</span>
        </div>
        <button onClick={onAdd} className="btn btn-primary w-full mt-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M2.25 3a.75.75 0 0 0 0 1.5h1.386c.183 0 .343.124.387.302l2.41 9.64a1.125 1.125 0 0 0 1.09.858h9.615a1.125 1.125 0 0 0 1.09-.858l1.5-6A1.125 1.125 0 0 0 20.61 6H6.511l-.3-1.204A2.25 2.25 0 0 0 3.636 3H2.25Z"/><path d="M8.25 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm9-1.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"/></svg>
          Agregar al carrito
        </button>
      </div>
    </motion.div>
  );
}
