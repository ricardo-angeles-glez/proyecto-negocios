// ============================================
// MENU.JS ACTUALIZADO CON SUPABASE/SHEETS
// ============================================

import { db } from '../shared/database.js';
import config from '../shared/config.js';

// ── Estado ───────────────────────────────────
let menuData = { restaurante: {}, categorias: [] };
let activeCategory = 'all';
let activeTag = 'all';
let searchQuery = '';

// ── Inicialización ────────────────────────────
async function init() {
    mostrarSkeletonMenu();
    await cargarDatosMenu();
    renderHeader();
    renderCategories();
    renderTagFilters();
    renderMenu();
    setupEventListeners();
    generateQR();

    // Registrar visita
    db.registrarVisita('menu');
}

// ── Cargar datos del menú ─────────────────────
async function cargarDatosMenu() {
    try {
        // Intentar cargar desde Google Sheets
        const params = new URLSearchParams({
            action: 'getMenu',
            token: config.secretToken
        });
        const response = await db.getGoogle(params);

        if (response.status === 'success' && response.categorias) {
            menuData = response;
            // Guardar en cache
            localStorage.setItem('menu_cache', JSON.stringify(menuData));
            localStorage.setItem('menu_cache_time', Date.now().toString());
            return;
        }
    } catch (error) {
        console.warn('⚠️ Google Sheets no disponible, usando datos locales');
    }

    // Fallback 1: Cache local reciente (menos de 1 hora)
    const cacheTime = parseInt(localStorage.getItem('menu_cache_time') || '0');
    const unaHora = 60 * 60 * 1000;
    if (Date.now() - cacheTime < unaHora) {
        const cache = localStorage.getItem('menu_cache');
        if (cache) {
            menuData = JSON.parse(cache);
            console.log('📦 Usando cache del menú');
            return;
        }
    }

    // Fallback 2: JSON estático local
    try {
        const response = await fetch('../menu-digital/data/menu-data.json');
        const data = await response.json();
        menuData = data;
        console.log('📄 Usando menú estático local');
    } catch (e) {
        console.error('❌ No se pudo cargar el menú');
        menuData = getDatosDemo();
    }
}

// ── Datos demo para cuando todo falla ────────
function getDatosDemo() {
    return {
        restaurante: {
            nombre: config.nombreNegocio || 'Tu Restaurante',
            logo: '🍽️',
            descripcion: 'Bienvenido a nuestro menú',
            moneda: config.moneda || '$',
            whatsapp: config.whatsapp
        },
        categorias: [
            {
                id: 'principales',
                nombre: '🥩 Platos Principales',
                items: [
                    {
                        id: 1,
                        nombre: 'Plato del Día',
                        descripcion: 'Consulta con nuestro equipo',
                        precio: 15.00,
                        imagen: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400',
                        etiquetas: ['popular'],
                        disponible: true
                    }
                ]
            }
        ]
    };
}

// ── Skeleton loading ──────────────────────────
function mostrarSkeletonMenu() {
    const content = document.getElementById('menuContent');
    if (!content) return;

    content.innerHTML = `
        <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
            ${Array(4).fill(0).map(() => `
                <div style="
                    display:flex;gap:16px;padding:16px;
                    background:white;border-radius:10px;
                    box-shadow:0 2px 8px rgba(0,0,0,0.06)
                ">
                    <div style="
                        width:90px;height:90px;border-radius:10px;flex-shrink:0;
                        background:linear-gradient(90deg,#f0f2f5 25%,#e9ecef 50%,#f0f2f5 75%);
                        background-size:200% 100%;
                        animation:shimmer 1.5s infinite
                    "></div>
                    <div style="flex:1;display:flex;flex-direction:column;gap:8px;justify-content:center">
                        <div style="
                            height:16px;width:60%;border-radius:6px;
                            background:linear-gradient(90deg,#f0f2f5 25%,#e9ecef 50%,#f0f2f5 75%);
                            background-size:200% 100%;animation:shimmer 1.5s infinite
                        "></div>
                        <div style="
                            height:12px;width:90%;border-radius:6px;
                            background:linear-gradient(90deg,#f0f2f5 25%,#e9ecef 50%,#f0f2f5 75%);
                            background-size:200% 100%;animation:shimmer 1.5s infinite
                        "></div>
                        <div style="
                            height:12px;width:40%;border-radius:6px;
                            background:linear-gradient(90deg,#f0f2f5 25%,#e9ecef 50%,#f0f2f5 75%);
                            background-size:200% 100%;animation:shimmer 1.5s infinite
                        "></div>
                    </div>
                </div>
            `).join('')}
        </div>
        <style>
            @keyframes shimmer {
                from { background-position: 200% 0; }
                to { background-position: -200% 0; }
            }
        </style>
    `;
}

// ── Render Header ─────────────────────────────
function renderHeader() {
    const logo = document.getElementById('restaurantLogo');
    const nombre = document.getElementById('restaurantName');
    const desc = document.getElementById('restaurantDesc');

    if (logo) logo.textContent = menuData.restaurante?.logo || '🍽️';
    if (nombre) nombre.textContent = menuData.restaurante?.nombre || 'Nuestro Menú';
    if (desc) desc.textContent = menuData.restaurante?.descripcion || '';

    document.title = menuData.restaurante?.nombre || 'Menú Digital';
}

// ── Render Categorías ─────────────────────────
function renderCategories() {
    const nav = document.getElementById('categoryNav');
    if (!nav) return;

    // Mantener el botón "Todos"
    const todosBtn = nav.querySelector('[data-category="all"]');
    nav.innerHTML = '';
    if (todosBtn) nav.appendChild(todosBtn);

    menuData.categorias?.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.dataset.category = cat.id;
        btn.textContent = cat.nombre;
        nav.appendChild(btn);
    });
}

// ── Render Tag Filters ────────────────────────
function renderTagFilters() {
    // Recopilar todas las etiquetas únicas del menú
    const todasEtiquetas = new Set();
    menuData.categorias?.forEach(cat => {
        cat.items?.forEach(item => {
            item.etiquetas?.forEach(tag => todasEtiquetas.add(tag));
        });
    });

    const container = document.getElementById('tagFilters');
    if (!container) return;

    const todosBtn = container.querySelector('[data-tag="all"]');
    container.innerHTML = '';
    if (todosBtn) container.appendChild(todosBtn);

    const emojis = {
        vegetariano: '🌱',
        popular: '⭐',
        'chef recomienda': '👨‍🍳',
        saludable: '💚',
        picante: '🌶️',
        nuevo: '✨',
        oferta: '🏷️'
    };

    todasEtiquetas.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'tag-btn';
        btn.dataset.tag = tag;
        btn.textContent = `${emojis[tag] || '•'} ${tag}`;
        container.appendChild(btn);
    });
}

// ── Render Menú ───────────────────────────────
function renderMenu() {
    const content = document.getElementById('menuContent');
    if (!content) return;

    content.innerHTML = '';
    let totalItems = 0;

    menuData.categorias?.forEach(cat => {
        if (activeCategory !== 'all' && cat.id !== activeCategory) return;

        const filteredItems = (cat.items || []).filter(item => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchName = item.nombre.toLowerCase().includes(q);
                const matchDesc = (item.descripcion || '').toLowerCase().includes(q);
                if (!matchName && !matchDesc) return false;
            }
            if (activeTag !== 'all') {
                if (!(item.etiquetas || []).includes(activeTag)) return false;
            }
            return true;
        });

        if (filteredItems.length === 0) return;
        totalItems += filteredItems.length;

        const section = document.createElement('div');
        section.className = 'category-section';
        section.innerHTML = `<h3 class="category-title">${cat.nombre}</h3>`;
        filteredItems.forEach(item => section.appendChild(createMenuItem(item)));
        content.appendChild(section);
    });

    if (totalItems === 0) {
        content.innerHTML = `
            <div class="no-results">
                <div style="font-size:3rem;margin-bottom:12px">🔍</div>
                <h3>Sin resultados</h3>
                <p>Intenta con otra búsqueda o categoría</p>
            </div>
        `;
    }
}

// ── Crear Item ────────────────────────────────
function createMenuItem(item) {
    const div = document.createElement('div');
    div.className = `menu-item ${!item.disponible ? 'unavailable' : ''}`;

    if (item.disponible) {
        div.onclick = () => openModal(item);
    }

    const moneda = menuData.restaurante?.moneda || '$';
    const tagsHtml = (item.etiquetas || []).map(tag =>
        `<span class="item-tag ${tag === 'popular' ? 'popular' : ''}">${tag}</span>`
    ).join('');

    div.innerHTML = `
        <img class="menu-item-image"
             src="${item.imagen || 'https://via.placeholder.com/90x90?text=🍽️'}"
             alt="${item.nombre}"
             onerror="this.src='https://via.placeholder.com/90x90?text=🍽️'"
             loading="lazy">
        <div class="menu-item-info">
            <div>
                <div class="menu-item-name">${item.nombre}</div>
                <div class="menu-item-desc">${item.descripcion || ''}</div>
            </div>
            <div class="menu-item-bottom">
                <span class="menu-item-price">${moneda}${parseFloat(item.precio).toFixed(2)}</span>
                <div class="menu-item-tags">${tagsHtml}</div>
            </div>
        </div>
        ${!item.disponible ? '<span class="unavailable-badge">Agotado</span>' : ''}
    `;

    return div;
}

// ── Modal ─────────────────────────────────────
function openModal(item) {
    const overlay = document.getElementById('modalOverlay');
    if (!overlay) return;

    const moneda = menuData.restaurante?.moneda || '$';
    const whatsapp = menuData.restaurante?.whatsapp || config.whatsapp;

    document.getElementById('modalImage').style.backgroundImage = `url(${item.imagen})`;
    document.getElementById('modalName').textContent = item.nombre;
    document.getElementById('modalDesc').textContent = item.descripcion || '';
    document.getElementById('modalPrice').textContent =
        `${moneda}${parseFloat(item.precio).toFixed(2)}`;

    const tagsContainer = document.getElementById('modalTags');
    if (tagsContainer) {
        tagsContainer.innerHTML = (item.etiquetas || []).map(tag =>
            `<span class="item-tag ${tag === 'popular' ? 'popular' : ''}">${tag}</span>`
        ).join('');
    }

    const mensaje = `Hola! Me gustaría pedir: *${item.nombre}* (${moneda}${parseFloat(item.precio).toFixed(2)})`;
    const whatsappBtn = document.getElementById('modalWhatsapp');
    if (whatsappBtn) {
        whatsappBtn.href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`;
    }

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ── QR Code ───────────────────────────────────
function generateQR() {
    const currentURL = window.location.href;
    const qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentURL)}&color=6C63FF&bgcolor=FFFFFF`;
    const qrImg = document.getElementById('qrImage');
    if (qrImg) qrImg.src = qrURL;
}

// ── Event Listeners ───────────────────────────
function setupEventListeners() {
    // Categorías
    document.getElementById('categoryNav')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.category-btn');
        if (!btn) return;
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.dataset.category;
        renderMenu();
    });

    // Tags
    document.getElementById('tagFilters')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.tag-btn');
        if (!btn) return;
        document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTag = btn.dataset.tag;
        renderMenu();
    });

    // Búsqueda con debounce
    let searchTimer;
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            searchQuery = e.target.value.trim();
            renderMenu();
        }, 300);
    });

    // Modal
    document.getElementById('modalClose')?.addEventListener('click', closeModal);
    document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    // QR
    document.getElementById('fabQR')?.addEventListener('click', () => {
        document.getElementById('qrModal')?.classList.add('active');
    });
    document.getElementById('closeQR')?.addEventListener('click', () => {
        document.getElementById('qrModal')?.classList.remove('active');
    });

    // Cerrar modal con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

// ── Iniciar ───────────────────────────────────
document.addEventListener('DOMContentLoaded', init);