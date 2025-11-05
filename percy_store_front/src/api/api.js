// src/api/api.js
const BASE = 'http://127.0.0.1:8000/api';

export const getAccess = () => localStorage.getItem('access') || '';
export const setAccess = (t) => localStorage.setItem('access', t);
export const clearAccess = () => localStorage.removeItem('access');

// ---- Auth (para pruebas rápidas desde el front si querés)
export async function login(username, password){
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({username, password})
  });
  if(!r.ok) throw new Error('Login failed');
  const data = await r.json();
  setAccess(data.access);
  return data;
}

// Helper con Authorization
function authHeaders(extra={}){
  const t = getAccess();
  return {
    'Content-Type':'application/json',
    ...(t ? {Authorization: `Bearer ${t}`} : {}),
    ...extra
  };
}

// ---- Catálogo
export async function listProducts(q=''){
  const url = q ? `${BASE}/products?q=${encodeURIComponent(q)}` : `${BASE}/products`;
  const r = await fetch(url, {headers: {'Accept':'application/json'}});
  if(!r.ok) throw new Error('No se pudo cargar catálogo');
  return r.json();
}
export async function getProduct(id){
  const r = await fetch(`${BASE}/products/${id}`, {headers: {'Accept':'application/json'}});
  if(!r.ok) throw new Error('Producto no encontrado');
  return r.json();
}

// ---- Carrito (requiere JWT)
export async function getCart(){
  const r = await fetch(`${BASE}/cart`, {headers: authHeaders()});
  if(r.status === 401) throw new Error('Necesitás iniciar sesión');
  if(!r.ok) throw new Error('No se pudo cargar el carrito');
  return r.json();
}
export async function addToCart(product_id, qty=1){
  const r = await fetch(`${BASE}/cart/add`, {
    method:'POST',
    headers: authHeaders(),
    body: JSON.stringify({product_id, qty})
  });
  if(r.status === 401) throw new Error('Necesitás iniciar sesión');
  if(!r.ok) throw new Error('No se pudo agregar al carrito');
  return r.json();
}
export async function updateCartItem(item_id, qty){
  const r = await fetch(`${BASE}/cart/items/${item_id}`, {
    method:'PUT',
    headers: authHeaders(),
    body: JSON.stringify({qty})
  });
  if(r.status === 401) throw new Error('Necesitás iniciar sesión');
  if(!r.ok) throw new Error('No se pudo actualizar el carrito');
  return r.json();
}
export async function deleteCartItem(item_id){
  const r = await fetch(`${BASE}/cart/items/${item_id}`, {
    method:'DELETE',
    headers: authHeaders()
  });
  if(r.status === 401) throw new Error('Necesitás iniciar sesión');
  if(!r.ok) throw new Error('No se pudo quitar el item');
  return r.json();
}
