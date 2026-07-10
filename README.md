# Proyecto Negocios

> Sistema completo de **Landing Pages**, **Menús Digitales** y **Sistema de Reservas**  
> Costo de infraestructura: **$0** · Desplegado en Vercel + Google Sheets + Apps Script

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ricardo-angeles-glez/proyecto-negocios)

---

## Demo en vivo

| Módulo | URL |
|--------|-----|
| Inicio | `https://tu-proyecto.vercel.app` |
| Landing Page | `https://tu-proyecto.vercel.app/src/landing/` |
| Menú Digital | `https://tu-proyecto.vercel.app/src/menu-digital/` |
| Reservas | `https://tu-proyecto.vercel.app/src/reservas/` |
| Admin Panel | `https://tu-proyecto.vercel.app/src/admin/dashboard.html` |

---

## Estructura del Proyecto
proyecto-negocios/
│
├── index.html → Página de inicio / selector
├── vercel.json → Configuración de Vercel
├── package.json → Dependencias del proyecto
├── .gitignore → Archivos ignorados por Git
│
├── assets/
│ ├── fonts/ → Fuentes personalizadas
│ ├── icons/ → Iconos SVG
│ └── images/ → Imágenes del proyecto
│
└── src/
├── landing/
│ ├── index.html → Landing page principal
│ ├── styles.css → Estilos de la landing
│ └── script.js → Lógica de la landing
│
├── menu-digital/
│ ├── index.html → Menú digital con QR
│ ├── menu.css → Estilos del menú
│ ├── menu.js → Lógica del menú
│ └── data/
│ └── menu-data.json → Datos del menú (backup local)
│
├── reservas/
│ ├── index.html → Sistema de reservas
│ ├── reservas.css → Estilos de reservas
│ └── reservas.js → Lógica de reservas
│
├── admin/
│ ├── dashboard.html → Panel de administración
│ ├── admin.css → Estilos del admin
│ └── admin.js → Lógica del admin
│
└── shared/
├── database.js → Conexión con Google Sheets y respaldo local
├── utils.js → Utilidades compartidas
├── components.js → Componentes reutilizables

---

## Stack Tecnológico

| Tecnología | Uso | Costo |
|------------|-----|-------|
| HTML/CSS/JS | Frontend | **$0** |
| [Vercel](https://vercel.com) | Hosting | **$0** |
| Google Sheets + Apps Script | Base de datos | **$0** |
| [Phosphor Icons](https://phosphoricons.com) | Iconos | **$0** |
| [Google Fonts](https://fonts.google.com) | Tipografías | **$0** |
| QR Server API | Generación de QR | **$0** |
| WhatsApp API | Notificaciones | **$0** |

---

## Instalación y Uso

### Prerrequisitos
- Cuenta en [GitHub](https://github.com)
- Cuenta en [Vercel](https://vercel.com)
- Cuenta de Google para Sheets y Apps Script
- Cuenta de [Resend](https://resend.com) si quieres enviar correos transaccionales
- Node.js >= 18 (solo para desarrollo local)

### Variables de entorno recomendadas en Vercel

| Variable | Uso |
|----------|-----|
| `GOOGLE_SCRIPT_URL` | URL pública del Web App de Apps Script |
| `SECRET_TOKEN` | Token compartido con Apps Script |
| `WHATSAPP` | Número del negocio para mensajes |
| `NOMBRE_NEGOCIO` | Nombre que aparece en confirmaciones |
| `RESEND_API_KEY` | Activa el envío de correos por Resend |
| `RESEND_FROM` | Remitente verificado, por ejemplo `Reservas <reservas@tudominio.com>` |

El build genera `public/env.js` con estas variables. Después de cambiar variables en Vercel, haz un redeploy para que el archivo público se actualice.

### 1. Clonar el repositorio

```bash
git clone https://github.com/ricardo-angeles-glez/proyecto-negocios.git
cd proyecto-negocios
