// src/api/api.js
export const BASE = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://127.0.0.1:8000/api';

export const getAccess = () => localStorage.getItem('access') || '';
export const setAccess = (t) => localStorage.setItem('access', t);
export const clearAccess = () => localStorage.removeItem('access');

// ---- Auth (para pruebas rÃ¡pidas desde el front si querÃ©s)
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

// ---- CatÃ¡logo
export async function listProducts(params=''){
  let url = `${BASE}/products`;
  if (typeof params === 'string') {
    const q = params.trim();
    if (q) url += `?q=${encodeURIComponent(q)}`;
  } else if (params && typeof params === 'object') {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.brand) qs.set('brand', params.brand);
    if (params.category && params.category !== 'Todas') qs.set('category', params.category);
    if (params.min) qs.set('min', params.min);
    if (params.max) qs.set('max', params.max);
    if (params.in_stock) qs.set('in_stock', params.in_stock);
    if (params.sort) qs.set('sort', params.sort);
    const s = qs.toString();
    if (s) url += `?${s}`;
  }
  const r = await fetch(url, {headers: {'Accept':'application/json'}});
  if(!r.ok) throw new Error('No se pudo cargar catÃ¡logo');
  return r.json();
}

// CatÃ¡logos estÃ¡ticos
export async function listBrands(){
  const r = await fetch(`${BASE}/brands`, { headers: { 'Accept':'application/json' } })
  if(!r.ok) throw new Error('No se pudo cargar marcas')
  const data = await r.json()
  return Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
}

export async function listCategories(){
  const r = await fetch(`${BASE}/categories`, { headers: { 'Accept':'application/json' } })
  if(!r.ok) throw new Error('No se pudo cargar categorÃ­as')
  const data = await r.json()
  return Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
}

// ---- Ã“rdenes (UC7, UC11, UC12)
export async function getMyOrders(){
  const r = await fetch(`${BASE}/orders/mine/`, { headers: authHeaders({'Accept':'application/json'}) })
  if(r.status === 401) throw new Error('NecesitÃ¡s iniciar sesiÃ³n')
  if(!r.ok) throw new Error('No se pudieron cargar tus Ã³rdenes')
  return r.json()
}

export async function getOrderByTransaction(trx){
  if(!trx) throw new Error('Ingresa un nÃºmero de transacciÃ³n')
  const r = await fetch(`${BASE}/orders/by-transaction/${encodeURIComponent(trx)}/`, { headers: authHeaders({'Accept':'application/json'}) })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se encontrÃ³ la orden')
  return r.json()
}

export async function markOrderPaid(id, method = 'manual'){
  const r = await fetch(`${BASE}/orders/${id}/mark-paid/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ method })
  })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo marcar como pagada')
  return r.json()
}

export async function voidOrder(id, reason = 'AnulaciÃ³n por administraciÃ³n'){
  const r = await fetch(`${BASE}/orders/${id}/void/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ reason })
  })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo anular la transacciÃ³n')
  return r.json()
}

export function receiptUrl(id){
  return `${BASE}/orders/${id}/receipt.pdf`
}
export async function getProduct(id){
  const r = await fetch(`${BASE}/products/${id}`, {headers: {'Accept':'application/json'}});
  if(!r.ok) throw new Error('Producto no encontrado');
  return r.json();
}

// ---- Carrito (requiere JWT)
export async function getCart(){
  const r = await fetch(`${BASE}/cart`, {headers: authHeaders()});
  if(r.status === 401) throw new Error('NecesitÃ¡s iniciar sesiÃ³n');
  if(!r.ok) throw new Error('No se pudo cargar el carrito');
  return r.json();
}
export async function addToCart(product_id, qty=1){
  const r = await fetch(`${BASE}/cart/add`, {
    method:'POST',
    headers: authHeaders(),
    body: JSON.stringify({product_id, qty})
  });
  if(r.status === 401) throw new Error('NecesitÃ¡s iniciar sesiÃ³n');
  if(!r.ok) throw new Error('No se pudo agregar al carrito');
  return r.json();
}
export async function updateCartItem(item_id, qty){
  const r = await fetch(`${BASE}/cart/items/${item_id}`, {
    method:'PUT',
    headers: authHeaders(),
    body: JSON.stringify({qty})
  });
  if(r.status === 401) throw new Error('NecesitÃ¡s iniciar sesiÃ³n');
  if(!r.ok) throw new Error('No se pudo actualizar el carrito');
  return r.json();
}
export async function deleteCartItem(item_id){
  const r = await fetch(`${BASE}/cart/items/${item_id}`, {
    method:'DELETE',
    headers: authHeaders()
  });
  if(r.status === 401) throw new Error('NecesitÃ¡s iniciar sesiÃ³n');
  if(!r.ok) throw new Error('No se pudo quitar el item');
  return r.json();
}

// --- Admin productos ---
export async function adminListProducts(params={}){
  const qs = new URLSearchParams()
  if(params.q) qs.set('q', params.q)
  if(params.brand) qs.set('brand', params.brand)
  if(params.category) qs.set('category', params.category)
  if(typeof params.active !== 'undefined') qs.set('active', params.active)
  const url = `${BASE}/admin/products${qs.toString()?`?${qs.toString()}`:''}`
  const r = await fetch(url, { headers: authHeaders({ 'Accept':'application/json' }) })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo listar productos')
  return r.json()
}

// --- Admin usuarios ---
export async function adminListUsers(){
  const r = await fetch(`${BASE}/admin/users`, { headers: authHeaders({ 'Accept':'application/json' }) })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo listar usuarios')
  return r.json()
}

export async function adminCreateUser(payload){
  const r = await fetch(`${BASE}/admin/users`, { method:'POST', headers: authHeaders(), body: JSON.stringify(payload) })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo crear usuario')
  return r.json()
}

export async function adminUpdateUser(id, payload){
  const r = await fetch(`${BASE}/admin/users/${id}`, { method:'PUT', headers: authHeaders(), body: JSON.stringify(payload) })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo actualizar usuario')
  return r.json()
}

export async function adminDeleteUser(id){
  const r = await fetch(`${BASE}/admin/users/${id}`, { method:'DELETE', headers: authHeaders() })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo eliminar usuario')
  return r.text().catch(()=> '')
}

// --- Reportes ---
export async function listSalesReports(){
  const r = await fetch(`${BASE}/admin/reports/sales`, { headers: authHeaders({ 'Accept':'application/json' }) })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo listar reportes')
  return r.json()
}

export async function generateSalesReport(filters){
  const r = await fetch(`${BASE}/admin/reports/sales/generate`, { method:'POST', headers: authHeaders(), body: JSON.stringify(filters || {}) })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo generar el reporte')
  return r.json()
}

export function downloadSalesReportUrl(id){
  return `${BASE}/admin/reports/sales/${id}/download`
}

export async function exportSalesReportCSV(filters){
  const r = await fetch(`${BASE}/admin/reports/sales/export-csv`, { method:'POST', headers: authHeaders({ 'Accept':'text/csv' }), body: JSON.stringify(filters || {}) })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo exportar CSV')
  return r.blob()
}

export async function downloadSalesReportBlob(id){
  const r = await fetch(`${BASE}/admin/reports/sales/${id}/download`, { headers: authHeaders({ 'Accept':'application/pdf' }) })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo descargar el PDF')
  return r.blob()
}

export async function listAuditReports(){
  const r = await fetch(`${BASE}/admin/reports/audit`, { headers: authHeaders({ 'Accept':'application/json' }) })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo listar reportes')
  return r.json()
}

export async function generateAuditReport(filters){
  const r = await fetch(`${BASE}/admin/reports/audit/generate`, { method:'POST', headers: authHeaders(), body: JSON.stringify(filters || {}) })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo generar el reporte')
  return r.json()
}

export function downloadAuditReportUrl(id){
  return `${BASE}/admin/reports/audit/${id}/download`
}

export async function downloadAuditReportBlob(id){
  const r = await fetch(`${BASE}/admin/reports/audit/${id}/download`, { headers: authHeaders({ 'Accept':'application/pdf' }) })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo descargar el PDF')
  return r.blob()
}

export async function adminCreateProduct(payload){
  const r = await fetch(`${BASE}/admin/products`, {
    method:'POST', headers: authHeaders(), body: JSON.stringify(payload)
  })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo crear el producto')
  return r.json()
}

export async function adminUpdateProduct(id, payload){
  const r = await fetch(`${BASE}/admin/products/${id}`, {
    method:'PUT', headers: authHeaders(), body: JSON.stringify(payload)
  })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo actualizar el producto')
  return r.json()
}

export async function adminDeleteProduct(id){
  const r = await fetch(`${BASE}/admin/products/${id}`, {
    method:'DELETE', headers: authHeaders()
  })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo eliminar el producto')
  return r.text().catch(()=> '')
}

export async function adminAdjustStock(id, amount){
  const r = await fetch(`${BASE}/admin/products/${id}/adjust-stock`, {
    method:'POST', headers: authHeaders(), body: JSON.stringify({ amount })
  })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo ajustar el stock')
  return r.json()
}

