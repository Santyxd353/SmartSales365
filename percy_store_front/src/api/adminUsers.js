// Dedicated Admin Users API helpers (UTF-8 safe)
import { BASE } from './api'

const getAccess = () => localStorage.getItem('access') || ''
const authHeaders = (extra={}) => {
  const t = getAccess()
  return { 'Content-Type':'application/json', ...(t?{Authorization:`Bearer ${t}`}:{}) , ...extra }
}

export async function adminListUsers(){
  const r = await fetch(`${BASE}/admin/users`, { headers: authHeaders({ 'Accept':'application/json' }) })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo listar usuarios')
  const data = await r.json()
  return Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
}

export async function adminCreateUser(payload){
  const r = await fetch(`${BASE}/admin/users`, { method:'POST', headers: authHeaders(), body: JSON.stringify(payload) })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok){
    try{
      const ct = r.headers.get('Content-Type') || ''
      if(ct.includes('application/json')){
        const j = await r.json()
        let msg = j?.detail || 'No se pudo crear usuario'
        if(j && typeof j === 'object'){
          const parts = []
          for(const [k,v] of Object.entries(j)){
            if(k === 'detail') continue
            const arr = Array.isArray(v) ? v : [String(v)]
            arr.forEach(t => parts.push(`${k}: ${t}`))
          }
          if(parts.length) msg = parts.join('; ')
        }
        throw new Error(msg)
      }
    }catch(e){
      throw new Error(e?.message || 'No se pudo crear usuario')
    }
    throw new Error('No se pudo crear usuario')
  }
  return r.json()
}

export async function adminUpdateUser(id, payload){
  const r = await fetch(`${BASE}/admin/users/${id}`, { method:'PUT', headers: authHeaders(), body: JSON.stringify(payload) })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok){
    try{
      const j = await r.json()
      throw new Error(j?.detail || 'No se pudo actualizar usuario')
    }catch(e){ throw new Error(e?.message || 'No se pudo actualizar usuario') }
  }
  return r.json()
}

export async function adminDeleteUser(id){
  const r = await fetch(`${BASE}/admin/users/${id}`, { method:'DELETE', headers: authHeaders() })
  if(r.status === 401) throw new Error('No autorizado')
  if(r.status === 403) throw new Error('Solo administradores')
  if(!r.ok) throw new Error('No se pudo eliminar usuario')
  return r.text().catch(()=> '')
}
