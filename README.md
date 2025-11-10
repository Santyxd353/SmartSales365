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

Twilio — WhatsApp Sandbox (pasos)

1) Crea cuenta en https://www.twilio.com/ (trial funciona)
2) En consola Twilio: Messaging → Try it out → WhatsApp Sandbox
3) Sigue las instrucciones en pantalla para unirte al sandbox:
   - Envía por WhatsApp el mensaje “join <palabras>” al número de sandbox (ej. +1 415 523 8886)
   - Twilio confirmará que tu número está unido al sandbox
4) En `.env` coloca:
   - `TWILIO_ACCOUNT_SID=...`
   - `TWILIO_AUTH_TOKEN=...`
   - `TWILIO_FROM_WHATSAPP=whatsapp:+14155238886` (o el número de tu sandbox)
5) Prueba envío de código por WhatsApp:
   - `python smartsales_uc1_uc4/manage.py send_test_code --channel whatsapp --to +<código_pais><número>`
   - Si estás en sandbox, Twilio solo entregará al número que se unió con el código “join ...”

Twilio — SMS (pasos)

1) Compra o habilita un número SMS en Twilio
2) Coloca en `.env`:
   - `TWILIO_FROM_SMS=+1XXXXXXXXXX`
3) Prueba:
   - `python smartsales_uc1_uc4/manage.py send_test_code --channel sms --to +<código_pais><número>`

Email (SMTP)

1) SendGrid (recom.) o Gmail (con App Password)
2) `.env` (ejemplo SendGrid):
   - `EMAIL_HOST=smtp.sendgrid.net`
   - `EMAIL_PORT=587`
   - `EMAIL_HOST_USER=apikey`
   - `EMAIL_HOST_PASSWORD=SG.xxxxxx`
   - `EMAIL_USE_TLS=1`
   - `DEFAULT_FROM_EMAIL=no-reply@tudominio.com`

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
