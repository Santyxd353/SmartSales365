// Helper with clearer error messages for sending verification code
import { BASE } from './api'

export async function sendCodeDetailed({ channel = 'email', email, phone }) {
  const body = { channel }
  if (channel === 'email') body.email = email
  else body.phone = phone
  const r = await fetch(`${BASE}/auth/send-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    let data = null
    try { data = await r.json() } catch {}
    const msg = (data && (data.detail || data.error)) || 'No se pudo enviar el código'
    throw new Error(msg)
  }
  return r.json()
}

