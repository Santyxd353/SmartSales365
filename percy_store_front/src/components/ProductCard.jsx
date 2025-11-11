import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { addToCart } from '../api/api';

export default function ProductCard({ p }) {
  const base  = Number((p && p.price) || 0)
  const final = Number(((p && p.final_price) ?? (p && p.price)) || 0)
  const onSale = final < base || (p && p.is_on_sale)
  const onAdd = async () => {
    try{
      await addToCart(p.id, 1);
      window.dispatchEvent(new CustomEvent('cart:updated'));
      alert('¡Agregado al carrito!');
    }catch(e){
      if(String(e).includes('401')) alert('Inicia sesión para agregar al carrito');
      else alert('Error: ' + (e.message || 'No se pudo agregar'));
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
      <Link to={`/product/${p.id}`} className="overflow-hidden block relative">
        {onSale && (
          <span className="absolute top-2 left-2 z-10 text-[11px] px-2 py-1 rounded-full bg-red-600 text-white font-bold shadow">OFERTA</span>
        )}
        {p?.is_featured && (
          <span className="absolute top-2 right-2 z-10 text-[11px] px-2 py-1 rounded-full bg-green-700 text-white font-bold shadow">★ Destacado</span>
        )}
        <img src={p.image_url} alt={p.name} className="w-full h-40 object-cover group-hover:scale-[1.02] transition-transform" />
      </Link>
      <div className="p-3">
        <Link to={`/product/${p.id}`} className="font-semibold line-clamp-2 min-h-[2.5rem] hover:underline">
          {p.name}
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-bold">
            {onSale ? (
              <>
                <span className="text-red-600 mr-2">Bs. {final.toFixed(2)}</span>
                <span className="line-through opacity-60 text-sm">Bs. {base.toFixed(2)}</span>
              </>
            ) : (
              <>Bs. {base.toFixed(2)}</>
            )}
          </span>
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
