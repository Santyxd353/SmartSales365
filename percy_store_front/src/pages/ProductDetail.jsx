import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProduct, addToCart } from '../api/api';

export default function ProductDetail(){
  const { id } = useParams();
  const nav = useNavigate();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [qty, setQty] = useState(1);

  useEffect(()=>{
    (async ()=>{
      try{
        const data = await getProduct(id);
        setP(data); setErr(null);
      }catch(e){ setErr(e.message); }
      finally{ setLoading(false); }
    })();
  }, [id]);

  if(loading) return <div className="container-edge py-10">Cargando…</div>;
  if(err) return <div className="container-edge py-10 text-red-600">{err}</div>;
  if(!p) return null;

  return (
    <section className="container-edge py-8 grid md:grid-cols-2 gap-8">
      <img src={p.image_url} alt={p.name} className="w-full rounded-xl object-cover" />
      <div>
        <h1 className="text-3xl font-bold mb-2">{p.name}</h1>
        <p className="opacity-80 mb-4">{p.description || 'Sin descripción.'}</p>
        <div className="text-2xl font-extrabold mb-4">Bs. {Number(p.price).toFixed(2)}</div>
        <div className="flex items-center gap-3 mb-6">
          <input
            type="number" min="1" max={p.stock}
            value={qty} onChange={e=>setQty(Number(e.target.value))}
            className="w-24 text-center rounded border dark:border-neutral-700 bg-white dark:bg-neutral-900"
          />
          <button
            className="btn btn-primary"
            onClick={async ()=>{
              try{
                await addToCart(p.id, qty);
                alert('Agregado al carrito ✅');
                nav('/cart');
              }catch(e){
                if(String(e.message).includes('iniciar sesión')) {
                  alert('Iniciá sesión primero (pegá el token en localStorage).');
                } else {
                  alert('❌ ' + e.message);
                }
              }
            }}
          >
            Agregar al carrito
          </button>
        </div>
        <div className="text-sm opacity-80">Stock: {p.stock} • Garantía: {p.warranty_months} meses</div>
      </div>
    </section>
  );
}
