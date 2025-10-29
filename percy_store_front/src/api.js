const BASE_URL = localStorage.getItem('API_BASE') || 'http://127.0.0.1:8000/api';

export function setApiBase(url){
  localStorage.setItem('API_BASE', url);
  window.location.reload();
}

function token(){ return localStorage.getItem('token') || ''; }

async function request(path, {method='GET', body, auth=false} = {}){
  const headers = {'Content-Type':'application/json'};
  if(auth && token()){ headers['Authorization'] = 'Bearer ' + token(); }
  const res = await fetch(BASE_URL + path, {
    method, headers, body: body ? JSON.stringify(body) : undefined
  });
  if(!res.ok){
    let msg = await res.text();
    try { msg = JSON.parse(msg); } catch {}
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

// public
export const listProducts = (q) => request(`/products${q?`?q=${encodeURIComponent(q)}`:''}`);
// eslint-disable-next-line camelcase
export const productDetail = (id) => request(`/products/${id}`);

// auth & cart (bootstrap)
export const login = (username, password) => request('/auth/login', {method:'POST', body:{username, password}});
export const getCart = () => request('/cart', {auth:true});
export const addToCart = (product_id, qty) => request('/cart/add', {method:'POST', auth:true, body:{product_id, qty}});