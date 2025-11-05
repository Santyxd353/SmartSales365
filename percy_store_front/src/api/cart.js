// src/api/cart.js  (versión JS sin tipos)
const BASE = 'http://127.0.0.1:8000/api';

export async function getCart(jwt) {
  const res = await fetch(`${BASE}/cart`, {
    headers: { Authorization: `Bearer ${jwt}` }
  });
  if (!res.ok) throw new Error('Error al obtener carrito');
  return res.json();
}

export async function addToCart(jwt, product_id, qty = 1) {
  const res = await fetch(`${BASE}/cart/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ product_id, qty })
  });
  if (!res.ok) throw new Error('Error al agregar al carrito');
  return res.json();
}

export async function updateItem(jwt, item_id, qty) {
  const res = await fetch(`${BASE}/cart/items/${item_id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ qty })
  });
  if (!res.ok) throw new Error('Error al actualizar item');
  return res.json();
}

export async function removeItem(jwt, item_id) {
  const res = await fetch(`${BASE}/cart/items/${item_id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${jwt}` }
  });
  if (!res.ok) throw new Error('Error al eliminar item');
  return res.json();
}
