// src/api/user.js
// Endpoints de usuario: registro y perfil
import { BASE, getAccess } from './api'

function authHeaders(extra={}){
  const t = getAccess()
  return {
    'Content-Type':'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...extra,
  }
}

export async function sendCode({ channel = 'email', email, phone }){
  const body = { channel }
  if(channel === 'email') body.email = email
  else body.phone = phone
  const r = await fetch(`${BASE}/auth/send-code`, { method:'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) })
  if(!r.ok) throw new Error('No se pudo enviar el código')
  return r.json()
}

export async function verifyCode({ channel = 'email', email, phone, code }){
  const payload = { channel, email, phone, code }
  const r = await fetch(`${BASE}/auth/verify-code`, { method:'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
  if(!r.ok) throw new Error('Código inválido')
  return r.json()
}

export async function changeEmail({ email, code }){
  const r = await fetch(`${BASE}/me/change-email`, { method:'POST', headers: authHeaders(), body: JSON.stringify({ email, code }) })
  if(r.status === 401) throw new Error('Necesitás iniciar sesión')
  if(!r.ok) throw new Error('No se pudo cambiar el correo')
  return r.json()
}

export async function changePhone({ phone, code }){
  const r = await fetch(`${BASE}/me/change-phone`, { method:'POST', headers: authHeaders(), body: JSON.stringify({ phone, code }) })
  if(r.status === 401) throw new Error('Necesitás iniciar sesión')
  if(!r.ok) throw new Error('No se pudo cambiar el teléfono')
  return r.json()
}

export async function register({ email, password, full_name, username }){
  const body = { email, password, full_name, ...(username ? { username } : {}) }
  const r = await fetch(`${BASE}/auth/register`, {
    method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body)
  })
  if(!r.ok){
    let raw = ''
    try { raw = await r.text() } catch {}
    let data = null
    try { data = JSON.parse(raw) } catch {}
    if (data && typeof data === 'object'){
      const parts = []
      const pushField = (label, v) => {
        if(!v) return; const arr = Array.isArray(v) ? v : [String(v)]
        parts.push(`${label}: ${arr.join(' ')}`)
      }
      pushField('Correo', data.email)
      pushField('Usuario', data.username)
      pushField('Contraseña', data.password)
      const err = new Error(parts.join(' | ') || 'Registro inválido')
      err.code = 'VALIDATION'
      err.fields = data
      throw err
    }
    const err = new Error(raw || 'Registro inválido')
    err.code = 'HTTP_ERROR'
    throw err
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

// Subida de avatar (opcional):
// Si se define VITE_UPLOAD_URL, envía el archivo con FormData y espera un JSON {url: "https://..."}
// De lo contrario, devuelve un Object URL para previsualización local.
export async function uploadAvatarFile(file){
  const endpoint = import.meta.env?.VITE_UPLOAD_URL || `${BASE}/auth/upload-avatar`
  const fd = new FormData()
  fd.append('file', file)
  try{
    const r = await fetch(endpoint, { method: 'POST', body: fd })
    if(!r.ok) throw new Error('No se pudo subir la imagen')
    const data = await r.json().catch(()=> ({}))
    const url = data.url || data.location || data.secure_url || ''
    if(!url) throw new Error('Respuesta de carga inválida')
    return url
  } catch (e){
    // fallback a Object URL para previsualización si el endpoint no existe
    return new Promise((resolve)=>{
      const url = URL.createObjectURL(file)
      resolve(url)
    })
  }
}

// ---- Direcciones del usuario
export async function listAddresses(){
  const r = await fetch(`${BASE}/me/addresses`, { headers: authHeaders({ 'Accept':'application/json' }) })
  if(r.status === 401) throw new Error('Necesitás iniciar sesión')
  if(!r.ok) throw new Error('No se pudieron cargar tus direcciones')
  return r.json()
}

export async function createAddress(payload){
  const r = await fetch(`${BASE}/me/addresses`, { method:'POST', headers: authHeaders(), body: JSON.stringify(payload) })
  if(r.status === 401) throw new Error('Necesitás iniciar sesión')
  if(!r.ok) throw new Error('No se pudo crear la dirección')
  return r.json()
}

export async function updateAddress(id, payload){
  const r = await fetch(`${BASE}/me/addresses/${id}`, { method:'PUT', headers: authHeaders(), body: JSON.stringify(payload) })
  if(r.status === 401) throw new Error('Necesitás iniciar sesión')
  if(!r.ok) throw new Error('No se pudo actualizar la dirección')
  return r.json()
}

export async function deleteAddress(id){
  const r = await fetch(`${BASE}/me/addresses/${id}`, { method:'DELETE', headers: authHeaders() })
  if(r.status === 401) throw new Error('Necesitás iniciar sesión')
  if(!r.ok) throw new Error('No se pudo eliminar la dirección')
  return r.text().catch(()=> '')
}
