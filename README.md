# ◆ Proyecto Negocios

> Sistema completo de **Landing Pages**, **Menús Digitales** y **Sistema de Reservas**  
> Costo de infraestructura: **$0** · Desplegado en Vercel + Supabase

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ricardo-angeles-glez/proyecto-negocios)

---

## 🚀 Demo en vivo

| Módulo | URL |
|--------|-----|
| 🏠 Inicio | `https://tu-proyecto.vercel.app` |
| 🌐 Landing Page | `https://tu-proyecto.vercel.app/src/landing/` |
| 🍽️ Menú Digital | `https://tu-proyecto.vercel.app/src/menu-digital/` |
| 📅 Reservas | `https://tu-proyecto.vercel.app/src/reservas/` |
| ⚙️ Admin Panel | `https://tu-proyecto.vercel.app/src/admin/dashboard.html` |

---

## 📁 Estructura del Proyecto
proyecto-negocios/
│
├── 📄 index.html → Página de inicio / selector
├── 📄 vercel.json → Configuración de Vercel
├── 📄 package.json → Dependencias del proyecto
├── 📄 .gitignore → Archivos ignorados por Git
│
├── 📂 assets/
│ ├── fonts/ → Fuentes personalizadas
│ ├── icons/ → Iconos SVG
│ └── images/ → Imágenes del proyecto
│
└── 📂 src/
├── 📂 landing/
│ ├── index.html → Landing page principal
│ ├── styles.css → Estilos de la landing
│ └── script.js → Lógica de la landing
│
├── 📂 menu-digital/
│ ├── index.html → Menú digital con QR
│ ├── menu.css → Estilos del menú
│ ├── menu.js → Lógica del menú
│ └── data/
│ └── menu-data.json → Datos del menú (backup local)
│
├── 📂 reservas/
│ ├── index.html → Sistema de reservas
│ ├── reservas.css → Estilos de reservas
│ └── reservas.js → Lógica de reservas
│
├── 📂 admin/
│ ├── dashboard.html → Panel de administración
│ ├── admin.css → Estilos del admin
│ └── admin.js → Lógica del admin
│
└── 📂 shared/
├── supabase-config.js → Configuración de Supabase
├── utils.js → Utilidades compartidas
├── components.js → Componentes reutilizables

---

## 🛠️ Stack Tecnológico

| Tecnología | Uso | Costo |
|------------|-----|-------|
| HTML/CSS/JS | Frontend | **$0** |
| [Vercel](https://vercel.com) | Hosting | **$0** |
| [Supabase](https://supabase.com) | Base de datos | **$0** |
| [Font Awesome](https://fontawesome.com) | Iconos | **$0** |
| [Google Fonts](https://fonts.google.com) | Tipografías | **$0** |
| QR Server API | Generación de QR | **$0** |
| WhatsApp API | Notificaciones | **$0** |

---

## ⚡ Instalación y Uso

### Prerrequisitos
- Cuenta en [GitHub](https://github.com)
- Cuenta en [Vercel](https://vercel.com)
- Cuenta en [Supabase](https://supabase.com)
- Node.js >= 18 (solo para desarrollo local)

### 1. Clonar el repositorio

```bash
git clone https://github.com/ricardo-angeles-glez/proyecto-negocios.git
cd proyecto-negocios