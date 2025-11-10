// src/utils/auth.js
// Helpers de autenticaciÃ³n para PercyStore
import { login as apiLogin, getAccess, clearAccess } from '../api/api'

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

export async function login(username, password) {
  const data = await apiLogin(username, password)
  // Notificar a la app que cambiÃ³ el estado de auth
  window.dispatchEvent(new CustomEvent('auth:changed'))
  return data
}

export function logout() {
  clearAccess()
  window.dispatchEvent(new CustomEvent('auth:changed'))
}

export function getToken() {
  return getAccess()
}

export function isLoggedIn() {
  const t = getAccess()
  if (!t) return false
  const payload = parseJwt(t)
  if (!payload || !payload.exp) return !!t
  const nowSec = Math.floor(Date.now() / 1000)
  return payload.exp > nowSec
}

export function getRoles() {
  const t = getAccess()
  const payload = t ? parseJwt(t) : null
  const roles = Array.isArray(payload?.roles) ? payload.roles : []
  return roles
}

export function isAdmin() {
  return getRoles().includes('admin')
}


