PercyStore — Verificación por Email / SMS / WhatsApp

Requisitos

- Python 3.12 + virtualenv
- Node 18+
- Cuenta Twilio (para SMS/WhatsApp) y/o SMTP (SendGrid/Gmail) para email

Backend (Django)

1) Instalar deps

- `py -m venv .venv && .\.venv\Scripts\activate`
- `pip install -r smartsales_uc1_uc4/requirements.txt`

2) Configurar .env

- Copia `smartsales_uc1_uc4/.env.example` a `smartsales_uc1_uc4/.env` y completa:
  - Email (SMTP) — opcional si prefieres email
  - Twilio — recomendado para SMS/WhatsApp

3) Migrar y ejecutar

- `python smartsales_uc1_uc4/manage.py migrate`
- `python smartsales_uc1_uc4/manage.py runserver`



Frontend

1) `cd percy_store_front && npm install`
2) (opcional) copia `.env.example` → `.env` y ajusta:
   - `VITE_API_BASE=http://127.0.0.1:8000/api`
   - `VITE_DEFAULT_VERIFY_CHANNEL=whatsapp` (whatsapp|sms|email)
3) `npm run dev`
3) Registro:
   - Paso 3: elige canal (Email/SMS/WhatsApp) y pulsa “Enviar código”
   - Si no hay proveedor configurado, verás “Código de prueba (DEV): xxxxxx” (puedes usar ese código)
   - Con Twilio/SMTP configurados, llega el código real

Notas

- Login acepta correo o teléfono (además de usuario) + contraseña
- Si un correo ya existe, el flujo ofrece iniciar sesión con ese correo
