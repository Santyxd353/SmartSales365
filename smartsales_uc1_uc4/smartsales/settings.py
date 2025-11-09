from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = 'dev-secret-key-change-me'
DEBUG = True
ALLOWED_HOSTS = ['*']

# ============================================================
# APLICACIONES INSTALADAS
# ============================================================
INSTALLED_APPS = [
    # Django apps
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

   
    'corsheaders',          
    'rest_framework',       
    'rest_framework.authtoken',

   
    'sales',
]

# ============================================================
# MIDDLEWARE
# ============================================================
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',           
    'django.middleware.common.CommonMiddleware',

    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'smartsales.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'smartsales.wsgi.application'

# ============================================================
# BASE DE DATOS
# ============================================================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# ============================================================
# VALIDADORES DE CONTRASEÃ‘A
# ============================================================
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 6}},
]

# ============================================================
# CONFIGURACIÃ“N DE IDIOMA Y ZONA HORARIA
# ============================================================
LANGUAGE_CODE = 'es'
TIME_ZONE = 'America/La_Paz'
USE_I18N = True
USE_TZ = True

# ============================================================
# CONFIGURACIÃ“N DE ARCHIVOS ESTÃTICOS
# ============================================================
STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ============================================================
# DJANGO REST FRAMEWORK Y JWT
# ============================================================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 12,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=12),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# ============================================================
# CONFIGURACIÃ“N CORS (para el front en Vite)
# ============================================================
CORS_ALLOW_ALL_ORIGINS = True
# CORS_ALLOWED_ORIGINS = [
#     "http://localhost:5173",
#     "http://127.0.0.1:5173",
# ]
APPEND_SLASH = False
\n\n# Email backend (dev)\nif DEBUG:\n    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'\n