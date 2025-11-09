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
    let msg = 'Registro invÃƒÆ’Ã‚Â¡lido'
    try { msg = await r.text() } catch {}
    throw new Error(msg)
  }
  return r.json()
}

export async function getMe(){
  const r = await fetch(`${BASE}/me`, { headers: authHeaders({'Accept':'application/json'}) })
  if(r.status === 401) throw new Error('NecesitÃƒÆ’Ã‚Â¡s iniciar sesiÃƒÆ’Ã‚Â³n')
  if(!r.ok) throw new Error('No se pudo cargar el perfil')
  return r.json()
}

export async function updateMe(payload){
  const r = await fetch(`${BASE}/me`, { method:'PUT', headers: authHeaders(), body: JSON.stringify(payload) })
  if(r.status === 401) throw new Error('NecesitÃƒÆ’Ã‚Â¡s iniciar sesiÃƒÆ’Ã‚Â³n')
  if(!r.ok) throw new Error('No se pudo actualizar el perfil')
  return r.json()
}

// Subida de avatar (opcional):
// Si se define VITE_UPLOAD_URL, envÃ­a el archivo con FormData y espera un JSON {url: "https://..."}
// De lo contrario, devuelve un Object URL para previsualizaciÃ³n local.
export async function uploadAvatarFile(file){
  const endpoint = import.meta.env?.VITE_UPLOAD_URL
  if (endpoint) {
    const fd = new FormData()
    fd.append('file', file)
    const r = await fetch(endpoint, { method: 'POST', body: fd })
    if(!r.ok) throw new Error('No se pudo subir la imagen')
    const data = await r.json().catch(()=> ({}))
    const url = data.url || data.location || data.secure_url || ''
    if(!url) throw new Error('Respuesta de carga invÃ¡lida')
    return url
  }
  return new Promise((resolve)=>{
    const url = URL.createObjectURL(file)
    resolve(url)
  })
}
