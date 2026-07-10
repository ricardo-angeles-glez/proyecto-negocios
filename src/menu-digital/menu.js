import { db } from '../shared/database.js';
import { getMenuData } from '../shared/menu-store.js';

// ============================================
// MENÚ DIGITAL - SIN IMPORTS (compatibilidad)
// ============================================

// ── Imagen de fallback (sin peticiones externas) ──
var FALLBACK_IMG = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">' +
    '<rect width="80" height="80" fill="#F5ECD7" rx="10"/>' +
    '<text x="40" y="50" text-anchor="middle" font-size="32" ' +
    'font-family="serif" fill="#8B7355">?</text>' +
    '</svg>'
);

// ── Datos del menú ───────────────────────────
var menuData = {
    restaurante: {
        nombre: 'La Casona',
        descripcion: 'Cocina mexicana tradicional',
        moneda: '$',
        whatsapp: '1234567890'
    },
    categorias: [
        {
            id: 'entradas',
            nombre: 'Entradas',
            items: [
                {
                    id: 1,
                    nombre: 'Sopa de tortilla',
                    descripcion: 'Caldo de jitomate con tortilla crujiente, aguacate, crema y queso fresco',
                    precio: 95,
                    imagen: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400',
                    etiquetas: ['popular'],
                    disponible: true
                },
                {
                    id: 2,
                    nombre: 'Guacamole de la casa',
                    descripcion: 'Aguacate fresco con cebolla, cilantro, chile serrano y limón. Servido con totopos',
                    precio: 120,
                    imagen: 'https://images.unsplash.com/photo-1600335895229-6e75511892c8?w=400',
                    etiquetas: ['vegetariano', 'popular'],
                    disponible: true
                },
                {
                    id: 3,
                    nombre: 'Quesadillas de flor de calabaza',
                    descripcion: 'Tortillas de maíz hechas a mano con queso Oaxaca y flor de calabaza',
                    precio: 110,
                    imagen: 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=400',
                    etiquetas: ['vegetariano'],
                    disponible: true
                }
            ]
        },
        {
            id: 'principales',
            nombre: 'Platos principales',
            items: [
                {
                    id: 4,
                    nombre: 'Mole poblano',
                    descripcion: 'Pollo bañado en mole de 28 ingredientes, acompañado de arroz rojo y tortillas',
                    precio: 195,
                    imagen: 'https://images.unsplash.com/photo-1534352956036-cd81e27dd615?w=400',
                    etiquetas: ['chef recomienda', 'popular'],
                    disponible: true
                },
                {
                    id: 5,
                    nombre: 'Tacos de arrachera',
                    descripcion: 'Tres tacos de arrachera a la parrilla con guacamole, cebolla asada y salsa verde',
                    precio: 175,
                    imagen: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400',
                    etiquetas: ['popular'],
                    disponible: true
                },
                {
                    id: 6,
                    nombre: 'Enchiladas suizas',
                    descripcion: 'Tortillas rellenas de pollo con salsa verde cremosa, gratinadas con queso',
                    precio: 165,
                    imagen: 'https://images.unsplash.com/photo-1534352956036-cd81e27dd615?w=400',
                    etiquetas: [],
                    disponible: true
                },
                {
                    id: 7,
                    nombre: 'Chile en nogada',
                    descripcion: 'Chile poblano relleno de picadillo, bañado en nogada y granada (temporada)',
                    precio: 225,
                    imagen: 'https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=400',
                    etiquetas: ['chef recomienda'],
                    disponible: true
                }
            ]
        },
        {
            id: 'bebidas',
            nombre: 'Bebidas',
            items: [
                {
                    id: 8,
                    nombre: 'Agua de horchata',
                    descripcion: 'Bebida tradicional de arroz con canela y un toque de vainilla',
                    precio: 55,
                    imagen: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400',
                    etiquetas: ['refrescante'],
                    disponible: true
                },
                {
                    id: 9,
                    nombre: 'Jamaica',
                    descripcion: 'Infusión fría de flor de jamaica con un toque de limón',
                    precio: 50,
                    imagen: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400',
                    etiquetas: ['refrescante'],
                    disponible: true
                },
                {
                    id: 10,
                    nombre: 'Café de olla',
                    descripcion: 'Café preparado con piloncillo, canela y clavo en olla de barro',
                    precio: 45,
                    imagen: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
                    etiquetas: [],
                    disponible: true
                }
            ]
        },
        {
            id: 'postres',
            nombre: 'Postres',
            items: [
                {
                    id: 11,
                    nombre: 'Flan napolitano',
                    descripcion: 'Flan casero con caramelo, preparado con la receta de la abuela',
                    precio: 85,
                    imagen: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400',
                    etiquetas: ['popular'],
                    disponible: true
                },
                {
                    id: 12,
                    nombre: 'Churros con chocolate',
                    descripcion: 'Churros recién hechos con chocolate caliente para dipping',
                    precio: 95,
                    imagen: 'https://images.unsplash.com/photo-1624371414361-e670246e6832?w=400',
                    etiquetas: ['chef recomienda'],
                    disponible: true
                }
            ]
        }
    ]
};

// ── Estado ─────────────────────────────────
var activeCategory = 'all';
var activeTag = 'all';
var searchQuery = '';

// ── Init ───────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    menuData = getMenuData();
    db.registrarVisita('menu-digital');
    renderHeader();
    renderCategories();
    renderTagFilters();
    renderMenu();
    setupEventListeners();
    generateQR();
});

function renderHeader() {
    var name = document.getElementById('restaurantName');
    var desc = document.getElementById('restaurantDesc');
    if (name) name.textContent = menuData.restaurante.nombre;
    if (desc) desc.textContent = menuData.restaurante.descripcion;
}

function renderCategories() {
    var nav = document.getElementById('categoryNav');
    if (!nav) return;

    menuData.categorias.forEach(function(cat) {
        var btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.setAttribute('data-category', cat.id);
        btn.textContent = cat.nombre;
        nav.appendChild(btn);
    });
}

function renderTagFilters() {
    var allTags = {};
    menuData.categorias.forEach(function(cat) {
        cat.items.forEach(function(item) {
            (item.etiquetas || []).forEach(function(tag) {
                allTags[tag] = true;
            });
        });
    });

    var container = document.getElementById('tagFilters');
    if (!container) return;

    var iconMap = {
        'vegetariano':      'ph-leaf',
        'popular':          'ph-star',
        'chef recomienda':  'ph-chef-hat',
        'saludable':        'ph-heart',
        'refrescante':      'ph-drop'
    };

    Object.keys(allTags).forEach(function(tag) {
        var btn = document.createElement('button');
        btn.className = 'tag-btn';
        btn.setAttribute('data-tag', tag);
        var iconClass = iconMap[tag] || 'ph-circle';
        btn.innerHTML = '<i class="ph ' + iconClass + '"></i> ' + tag;
        container.appendChild(btn);
    });
}

function renderMenu() {
    var content = document.getElementById('menuContent');
    if (!content) return;
    content.innerHTML = '';

    var hasResults = false;

    menuData.categorias.forEach(function(cat) {
        if (activeCategory !== 'all' && cat.id !== activeCategory) return;

        var filtered = cat.items.filter(function(item) {
            if (searchQuery) {
                var q = searchQuery.toLowerCase();
                var matchName = item.nombre.toLowerCase().indexOf(q) !== -1;
                var matchDesc = (item.descripcion || '').toLowerCase().indexOf(q) !== -1;
                if (!matchName && !matchDesc) return false;
            }
            if (activeTag !== 'all') {
                if ((item.etiquetas || []).indexOf(activeTag) === -1) return false;
            }
            return true;
        });

        if (filtered.length === 0) return;
        hasResults = true;

        var section = document.createElement('div');
        section.className = 'category-section';
        section.innerHTML = '<h3 class="category-title">' + cat.nombre + '</h3>';

        filtered.forEach(function(item) {
            section.appendChild(createMenuItem(item));
        });

        content.appendChild(section);
    });

    if (!hasResults) {
        content.innerHTML =
            '<div class="no-results">' +
            '<i class="ph ph-magnifying-glass"></i>' +
            '<h3>Sin resultados</h3>' +
            '<p>Intenta con otra búsqueda</p>' +
            '</div>';
    }
}

// ── FUNCIÓN CORREGIDA - sin via.placeholder.com ──
function createMenuItem(item) {
    var div = document.createElement('div');
    div.className = 'menu-item' + (!item.disponible ? ' unavailable' : '');

    if (item.disponible) {
        div.onclick = function() { openModal(item); };
    }

    var moneda = menuData.restaurante.moneda;
    var imgSrc = item.imagen || FALLBACK_IMG;

    var tags = (item.etiquetas || []).map(function(tag) {
        return '<span class="item-tag' +
            (tag === 'popular' ? ' popular' : '') +
            '">' + tag + '</span>';
    }).join('');

    // ── La clave está en el onerror: usa FALLBACK_IMG ──
    var img = document.createElement('img');
    img.className = 'menu-item-image';
    img.src = imgSrc;
    img.alt = item.nombre;
    img.loading = 'lazy';
    img.onerror = function() {
        // Al fallar, usa el SVG inline (sin petición externa)
        this.onerror = null; // Evitar loop infinito
        this.src = FALLBACK_IMG;
    };

    var info = document.createElement('div');
    info.className = 'menu-item-info';
    info.innerHTML =
        '<div>' +
            '<div class="menu-item-name">' + item.nombre + '</div>' +
            '<div class="menu-item-desc">' + (item.descripcion || '') + '</div>' +
        '</div>' +
        '<div class="menu-item-bottom">' +
            '<span class="menu-item-price">' +
                moneda + item.precio.toFixed(2) +
            '</span>' +
            '<div class="menu-item-tags">' + tags + '</div>' +
        '</div>';

    div.appendChild(img);
    div.appendChild(info);

    if (!item.disponible) {
        var badge = document.createElement('span');
        badge.className = 'unavailable-badge';
        badge.textContent = 'Agotado';
        div.appendChild(badge);
    }

    return div;
}

function openModal(item) {
    var overlay = document.getElementById('modalOverlay');
    if (!overlay) return;

    var moneda = menuData.restaurante.moneda;
    var wp = menuData.restaurante.whatsapp;

    // ── Imagen del modal también con fallback ──
    var modalImageEl = document.getElementById('modalImage');
    if (modalImageEl) {
        var testImg = new Image();
        testImg.onload = function() {
            modalImageEl.style.backgroundImage = 'url(' + item.imagen + ')';
        };
        testImg.onerror = function() {
            modalImageEl.style.backgroundImage = 'none';
            modalImageEl.style.background = '#F5ECD7';
            modalImageEl.innerHTML =
                '<div style="display:flex;align-items:center;justify-content:center;' +
                'height:100%;font-size:3rem;color:#8B7355;">?</div>';
        };
        testImg.src = item.imagen || '';
    }

    document.getElementById('modalName').textContent = item.nombre;
    document.getElementById('modalDesc').textContent = item.descripcion || '';
    document.getElementById('modalPrice').textContent =
        moneda + item.precio.toFixed(2);

    var tagsEl = document.getElementById('modalTags');
    if (tagsEl) {
        tagsEl.innerHTML = (item.etiquetas || []).map(function(tag) {
            return '<span class="item-tag' +
                (tag === 'popular' ? ' popular' : '') +
                '">' + tag + '</span>';
        }).join('');
    }

    var msg = 'Hola! Me gustaria pedir: *' + item.nombre +
        '* (' + moneda + item.precio.toFixed(2) + ')';
    var wpBtn = document.getElementById('modalWhatsapp');
    if (wpBtn) {
        wpBtn.href = 'https://wa.me/' + wp +
            '?text=' + encodeURIComponent(msg);
    }

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    var overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

function generateQR() {
    var url = window.location.href;
    var qrURL = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' +
        encodeURIComponent(url) + '&color=D4738C&bgcolor=FFFFFF';
    var img = document.getElementById('qrImage');
    if (img) img.src = qrURL;
}

function setupEventListeners() {
    // Categories
    var catNav = document.getElementById('categoryNav');
    if (catNav) {
        catNav.addEventListener('click', function(e) {
            var btn = e.target.closest('.category-btn');
            if (!btn) return;
            document.querySelectorAll('.category-btn').forEach(function(b) {
                b.classList.remove('active');
            });
            btn.classList.add('active');
            activeCategory = btn.getAttribute('data-category');
            renderMenu();
        });
    }

    // Tags
    var tagContainer = document.getElementById('tagFilters');
    if (tagContainer) {
        tagContainer.addEventListener('click', function(e) {
            var btn = e.target.closest('.tag-btn');
            if (!btn) return;
            document.querySelectorAll('.tag-btn').forEach(function(b) {
                b.classList.remove('active');
            });
            btn.classList.add('active');
            activeTag = btn.getAttribute('data-tag');
            renderMenu();
        });
    }

    // Search
    var searchInput = document.getElementById('searchInput');
    var searchTimer;
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(function() {
                searchQuery = e.target.value.trim();
                renderMenu();
            }, 300);
        });
    }

    // Modal close button
    var closeBtn = document.getElementById('modalClose');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    // Modal overlay click
    var overlay = document.getElementById('modalOverlay');
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === e.currentTarget) closeModal();
        });
    }

    // QR open
    var qrBtn = document.getElementById('fabQR');
    if (qrBtn) {
        qrBtn.addEventListener('click', function() {
            var qrModal = document.getElementById('qrModal');
            if (qrModal) qrModal.classList.add('active');
        });
    }

    // QR close
    var closeQR = document.getElementById('closeQR');
    if (closeQR) {
        closeQR.addEventListener('click', function() {
            var qrModal = document.getElementById('qrModal');
            if (qrModal) qrModal.classList.remove('active');
        });
    }

    // Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeModal();
    });
}
