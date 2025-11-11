// src/api/api.js
export const BASE = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://127.0.0.1:8000/api';

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
    if (params.featured) qs.set('featured', params.featured);
    if (params.on_sale) qs.set('on_sale', params.on_sale);
    if (params.sort) qs.set('sort', params.sort);
    const s = qs.toString();
    if (s) url += `?${s}`;
  }
  const r = await fetch(url, {headers: {'Accept':'application/json'}});
  if(!r.ok) throw new Error('No se pudo cargar catálogo');
  return r.json();
}

// Catálogos estáticos
export async function listBrands(){
  const r = await fetch(`${BASE}/brands`, { headers: { 'Accept':'application/json' } })
  if(!r.ok) throw new Error('No se pudo cargar marcas')
  const data = await r.json()
  return Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
}

export async function listCategories(){
  const r = await fetch(`${BASE}/categories`, { headers: { 'Accept':'application/json' } })
  if(!r.ok) throw new Error('No se pudo cargar categorías')
  const data = await r.json()
  return Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
}

// ---- Órdenes (UC7, UC11, UC12)
export async function getMyOrders(){
  const r = await fetch(`${BASE}/orders/mine/`, { headers: authHeaders({'Accept':'application/json'}) })
  if(r.status === 401) throw new Error('Necesitás iniciar sesión')
  if(!r.ok) throw new Error('No se pudieron cargar tus órdenes')
  return r.json()
}

export async function getOrderByTransaction(trx){
  if(!trx) throw new Error('Ingresa un número de transacción')
  const r = await fetch(`${BASE}/orders/by-transaction/${encodeURIComponent(trx)}/`, { headers: authHeaders({'Accept':'application/json'}) })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se encontró la orden')
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

export async function voidOrder(id, reason = 'Anulación por administración'){
  const r = await fetch(`${BASE}/orders/${id}/void/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ reason })
  })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo anular la transacción')
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

// Utilidad: descarga con Authorization
export async function downloadWithAuth(url, filename='archivo', accept='*/*'){
  const t = getAccess()
  const headers = {}
  if (t) headers['Authorization'] = `Bearer ${t}`
  if (accept) headers['Accept'] = accept
  const r = await fetch(url, { headers })
  if(!r.ok){
    try{
      const ct = r.headers.get('Content-Type') || ''
      if(ct.includes('application/json')){
        const j = await r.json()
        throw new Error(`${r.status}: ${j?.detail || 'No se pudo descargar'}`)
      } else {
        throw new Error(`${r.status}: No se pudo descargar`)
      }
    }catch(e){
      throw new Error(e?.message || 'No se pudo descargar')
    }
  }
  const blob = await r.blob(); const link = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = link; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(link)
}

// ---- Checkout & pagos
export async function checkout(payload={}){
  const r = await fetch(`${BASE}/checkout`, { method:'POST', headers: authHeaders(), body: JSON.stringify(payload) })
  if(r.status === 401) throw new Error('Necesits iniciar sesin')
  if(!r.ok) throw new Error('No se pudo iniciar el checkout')
  return r.json()
}

export async function startQrPayment(order_id){
  const r = await fetch(`${BASE}/payments/qr/start`, {
    method:'POST',
    headers: authHeaders({ 'Accept':'application/json' }),
    body: JSON.stringify({ order_id })
  })
  if(r.status === 401) throw new Error('Necesits iniciar sesin')
  if(!r.ok){
    let msg = 'No se pudo iniciar el pago con QR'
    const raw = await r.text().catch(()=> '')
    if(raw){
      try{
        const data = JSON.parse(raw)
        msg = data?.detail || JSON.stringify(data)
      }catch{
        msg = raw
      }
    }
    throw new Error(msg)
  }
  const payload = await r.text().catch(()=> '')
  try{
    return JSON.parse(payload)
  }catch{
    throw new Error(payload || 'Respuesta de pago invalida')
  }
}

export async function getOrder(id){
  const r = await fetch(`${BASE}/orders/${id}`, { headers: authHeaders({ 'Accept':'application/json' }) })
  if(r.status === 401) throw new Error('No autorizado')
  if(!r.ok) throw new Error('No se pudo obtener la orden')
  return r.json()
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
  const r = await fetch(`${BASE}/admin/reports/sales/${id}/download`, { headers: authHeaders({ 'Accept':'*/*' }) })
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
  const r = await fetch(`${BASE}/admin/reports/audit/${id}/download`, { headers: authHeaders({ 'Accept':'*/*' }) })
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

// --- Admin ML / Estadsticas ---
export async function adminMLTrain(scope='total'){
  const r = await fetch(`${BASE}/admin/ml/train`, { method:'POST', headers: authHeaders(), body: JSON.stringify({ scope }) })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo entrenar el modelo')
  return r.json()
}

export async function adminMLPredict({ scope='total', months=6, category_id=null }={}){
  const qs = new URLSearchParams()
  if(scope) qs.set('scope', scope)
  if(months) qs.set('months', String(months))
  if(category_id) qs.set('category_id', String(category_id))
  const r = await fetch(`${BASE}/admin/ml/predict?${qs.toString()}`, { headers: authHeaders({ 'Accept':'application/json' }) })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo predecir')
  return r.json()
}

export async function adminHistorical(group='monthly', start='', end='', extra={}){
  const qs = new URLSearchParams()
  if(group) qs.set('group', group)
  if(start) qs.set('start', start)
  if(end) qs.set('end', end)
  if(extra && extra.category_id) qs.set('category_id', String(extra.category_id))
  const r = await fetch(`${BASE}/admin/ml/historical?${qs.toString()}`, { headers: authHeaders({ 'Accept':'application/json' }) })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo cargar histricos')
  return r.json()
}

export async function adminPromptReport(prompt, options = {}){
  const payload = { prompt }
  if(options.format && ['pdf','excel','screen'].includes(options.format)){
    payload.format = options.format
  }
  const r = await fetch(`${BASE}/admin/reports/prompt`, { method:'POST', headers: authHeaders(), body: JSON.stringify(payload) })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  const ct = r.headers.get('Content-Type') || ''
  if(!r.ok){
    if(ct.includes('application/json')){
      const data = await r.json().catch(()=> ({}))
      throw new Error(data?.detail || 'No se pudo generar el reporte')
    }
    throw new Error('No se pudo generar el reporte')
  }
  if(ct.includes('application/json')){
    return r.json()
  } else {
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const isPdf = ct.includes('pdf')
    a.download = isPdf ? 'reporte.pdf' : 'reporte.xlsx'
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
    return null
  }
}

// --- Admin pagos pendientes
export async function adminListPendingPayments(){
  const r = await fetch(`${BASE}/admin/payments/pending`, { headers: authHeaders({ 'Accept':'application/json' }) })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo cargar pagos pendientes')
  return r.json()
}

export async function adminCreateLocalSale(items, payment_method='CASH'){
  const r = await fetch(`${BASE}/admin/sales/create-local`, { method:'POST', headers: authHeaders(), body: JSON.stringify({ items, payment_method }) })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok){
    const ct = r.headers.get('Content-Type') || ''
    if(ct.includes('application/json')){
      const data = await r.json().catch(()=> ({}))
      throw new Error(data?.detail || 'No se pudo registrar la venta')
    }
    const text = await r.text().catch(()=> '')
    throw new Error(text || 'No se pudo registrar la venta')
  }
  return r.json()
}

export async function adminSaveOrderCustomerInfo(order_id, payload = {}){
  const r = await fetch(`${BASE}/admin/orders/${order_id}/customer-info`, {
    method:'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok){
    let msg = 'No se pudieron guardar los datos'
    try{
      const data = await r.clone().json()
      msg = data?.detail || msg
    }catch{
      msg = await r.text().catch(()=> msg)
    }
    throw new Error(msg)
  }
  return r.json()
}


export async function adminAIAdvisor(prompt){
  const r = await fetch(`${BASE}/admin/ai/advisor`, { method:'POST', headers: authHeaders(), body: JSON.stringify({ prompt }) })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok){
    try{
      const data = await r.clone().json()
      throw new Error(data?.detail || 'No se pudo obtener recomendacion')
    }catch(err){
      throw new Error(err?.message || 'No se pudo obtener recomendacion')
    }
  }
  return r.json()
}

export async function askCatalogAI(prompt){
  const r = await fetch(`${BASE}/ai/catalog`, {
    method:'POST',
    headers: { 'Content-Type':'application/json', 'Accept':'application/json' },
    body: JSON.stringify({ prompt })
  })
  if(!r.ok){
    let msg = 'No pude obtener una respuesta'
    try{
      const data = await r.clone().json()
      msg = data?.detail || msg
    }catch{
      msg = await r.text()
    }
    throw new Error(msg || 'No pude obtener una respuesta')
  }
  return r.json()
}
