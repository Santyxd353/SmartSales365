// src/api/user.js
// Endpoints de usuario: registro y perfil
import { getAccess } from './api'

const BASE = 'http://127.0.0.1:8000/api'

function authHeaders(extra={}){
  const t = getAccess()
  return {
    'Content-Type':'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...extra,
  }
}

export async function register({ email, password, full_name, username }){
  const body = { email, password, full_name, ...(username ? { username } : {}) }
  const r = await fetch(`${BASE}/auth/register`, {
    method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body)
  })
  if(!r.ok){
    let msg = 'Registro inválido'
    try { msg = await r.text() } catch {}
    throw new Error(msg)
  }
  return r.json()
}

export async function getMe(){
  const r = await fetch(`${BASE}/me`, { headers: authHeaders({'Accept':'application/json'}) })
  if(r.status === 401) throw new Error('Necesitás iniciar sesión')
  if(!r.ok) throw new Error('No se pudo cargar el perfil')
  return r.json()
}

export async function updateMe(payload){
  const r = await fetch(`${BASE}/me`, { method:'PUT', headers: authHeaders(), body: JSON.stringify(payload) })
  if(r.status === 401) throw new Error('Necesitás iniciar sesión')
  if(!r.ok) throw new Error('No se pudo actualizar el perfil')
  return r.json()
}

