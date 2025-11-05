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
      className="card overflow-hidden hover:shadow-lg transition-shadow"
    >
      <img src={p.image_url} alt={p.name} className="w-full h-40 object-cover" />
      <div className="p-3">
        <h3 className="font-semibold line-clamp-2">{p.name}</h3>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-bold">Bs. {Number(p.price).toFixed(2)}</span>
          <span className="text-xs opacity-70">Stock: {p.stock}</span>
        </div>
        <button onClick={onAdd} className="btn btn-primary w-full mt-3">
          Agregar al carrito
        </button>
      </div>
    </motion.div>
  );
}
