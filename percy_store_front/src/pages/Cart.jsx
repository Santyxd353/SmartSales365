import React, { useEffect, useState } from 'react';
import { getCart, updateCartItem, deleteCartItem } from '../api/api';

export default function Cart(){
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = async() => {
    try{
      setLoading(true);
      const c = await getCart();
      setCart(c);
      setErr(null);
    }catch(e){ setErr(e.message || 'Error'); }
    finally{ setLoading(false); }
  };

  useEffect(()=>{ load(); }, []);
  useEffect(()=>{
    const h = ()=> load();
    window.addEventListener('cart:updated', h);
    return ()=> window.removeEventListener('cart:updated', h);
  }, []);

  if(loading) return <div className="container-edge py-10">Cargando carrito…</div>;
  if(err) return <div className="container-edge py-10 text-red-600">{err}</div>;
  if(!cart || !cart.items?.length) return <div className="container-edge py-10">Tu carrito está vacío.</div>;

  const total = cart.items.reduce((a,i)=> a + i.qty * Number(i.price_snapshot), 0);

  return (
    <section className="container-edge py-8">
      <h2 className="text-2xl font-bold mb-4">Tu carrito</h2>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {cart.items.map(it=>(
            <div key={it.id} className="card p-3 flex items-center gap-3">
              <img src={it.image_url || it.product?.image_url} className="w-16 h-16 object-cover rounded" />
              <div className="flex-1">
                <div className="font-medium">{it.product_name || it.product?.name}</div>
                <div className="text-sm opacity-70">Bs. {Number(it.price_snapshot).toFixed(2)}</div>
              </div>
              <input
                type="number" min="0" value={it.qty}
                onChange={async (e)=>{
                  const q = Number(e.target.value);
                  try{
                    const c = await updateCartItem(it.id, q);
                    setCart(c);
                    window.dispatchEvent(new CustomEvent('cart:updated'));
                  }catch(err){ alert('Error: ' + err.message); }
                }}
                className="w-20 text-center rounded border dark:border-neutral-700 bg-white dark:bg-neutral-900"
              />
              <button
                onClick={async()=>{
                  try{
                    const c = await deleteCartItem(it.id);
                    setCart(c);
                    window.dispatchEvent(new CustomEvent('cart:updated'));
                  }catch(err){ alert('Error: ' + err.message); }
                }}
                className="btn"
              >Quitar</button>
            </div>
          ))}
        </div>
        <div className="card p-4 h-fit">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-bold">Bs. {total.toFixed(2)}</span>
          </div>
          <button className="btn btn-primary w-full mt-4" onClick={()=>{ window.location.href = '/checkout' }}>
            Ir a pagar
          </button>
        </div>
      </div>
    </section>
  );
}
