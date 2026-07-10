// menu-digital/menu.js

// ============ DATOS DEL MENÚ ============
const menuData = {
    restaurante: {
        nombre: "La Buena Mesa",
        logo: "🍽️",
        descripcion: "Cocina con pasión desde 2020",
        moneda: "$",
        whatsapp: "1234567890" // Cambiar por tu número
    },
    categorias: [
        {
            id: "entradas",
            nombre: "🥗 Entradas",
            items: [
                {
                    id: 1,
                    nombre: "Bruschetta Clásica",
                    descripcion: "Pan artesanal con tomate, albahaca fresca y aceite de oliva extra virgen",
                    precio: 8.50,
                    imagen: "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400",
                    etiquetas: ["vegetariano", "popular"],
                    disponible: true
                },
                {
                    id: 2,
                    nombre: "Carpaccio de Res",
                    descripcion: "Láminas finas de res con rúcula, parmesano y limón",
                    precio: 12.00,
                    imagen: "https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=400",
                    etiquetas: ["chef recomienda"],
                    disponible: true
                }
            ]
        },
        {
            id: "principales",
            nombre: "🥩 Platos Principales",
            items: [
                {
                    id: 3,
                    nombre: "Risotto de Hongos",
                    descripcion: "Arroz arborio cremoso con mix de hongos silvestres y trufa negra",
                    precio: 18.00,
                    imagen: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400",
                    etiquetas: ["vegetariano", "popular"],
                    disponible: true
                },
                {
                    id: 4,
                    nombre: "Salmón a la Parrilla",
                    descripcion: "Filete de salmón atlántico con vegetales asados y salsa de eneldo",
                    precio: 22.00,
                    imagen: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400",
                    etiquetas: ["saludable"],
                    disponible: true
                },
                {
                    id: 5,
                    nombre: "Pasta Carbonara",
                    descripcion: "Spaghetti al dente con salsa carbonara tradicional italiana",
                    precio: 15.00,
                    imagen: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400",
                    etiquetas: ["popular"],
                    disponible: true
                }
            ]
        },
        {
            id: "bebidas",
            nombre: "🍷 Bebidas",
            items: [
                {
                    id: 6,
                    nombre: "Limonada Natural",
                    descripcion: "Limonada fresca con menta y hierbabuena del huerto",
                    precio: 5.00,
                    imagen: "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400",
                    etiquetas: ["refrescante"],
                    disponible: true
                },
                {
                    id: 7,
                    nombre: "Café Especial de la Casa",
                    descripcion: "Café de origen single estate con arte latte personalizado",
                    precio: 4.50,
                    imagen: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400",
                    etiquetas: ["caliente"],
                    disponible: true
                }
            ]
        },
        {
            id: "postres",
            nombre: "🍰 Postres",
            items: [
                {
                    id: 8,
                    nombre: "Tiramisú Artesanal",
                    descripcion: "Clásico italiano con mascarpone importado y café espresso",
                    precio: 9.00,
                    imagen: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400",
                    etiquetas: ["chef recomienda", "popular"],
                    disponible: true
                }
            ]
        }
    ]
};

// ============ VARIABLES GLOBALES ============
let activeCategory = 'all';
let activeTag = 'all';
let searchQuery = '';

// ============ INICIALIZACIÓN ============
function init() {
    renderHeader();
    renderCategories();
    renderMenu();
    setupEventListeners();
    generateQR();
}

// ============ RENDER HEADER ============
function renderHeader() {
    document.getElementById('restaurantLogo').textContent = menuData.restaurante.logo;
    document.getElementById('restaurantName').textContent = menuData.restaurante.nombre;
    document.getElementById('restaurantDesc').textContent = menuData.restaurante.descripcion;
}

// ============ RENDER CATEGORÍAS ============
function renderCategories() {
    const nav = document.getElementById('categoryNav');
    menuData.categorias.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.dataset.category = cat.id;
        btn.textContent = cat.nombre;
        nav.appendChild(btn);
    });
}

// ============ RENDER MENÚ ============
function renderMenu() {
    const content = document.getElementById('menuContent');
    content.innerHTML = '';

    const filteredCategories = menuData.categorias.filter(cat => {
        if (activeCategory !== 'all' && cat.id !== activeCategory) return false;
        return true;
    });

    let hasResults = false;

    filteredCategories.forEach(cat => {
        const filteredItems = cat.items.filter(item => {
            // Filtro por búsqueda
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchName = item.nombre.toLowerCase().includes(query);
                const matchDesc = item.descripcion.toLowerCase().includes(query);
                if (!matchName && !matchDesc) return false;
            }
            // Filtro por tag
            if (activeTag !== 'all') {
                if (!item.etiquetas.includes(activeTag)) return false;
            }
            return true;
        });

        if (filteredItems.length === 0) return;
        hasResults = true;

        const section = document.createElement('div');
        section.className = 'category-section';
        section.innerHTML = `<h3 class="category-title">${cat.nombre}</h3>`;

        filteredItems.forEach(item => {
            section.appendChild(createMenuItem(item));
        });

        content.appendChild(section);
    });

    if (!hasResults) {
        content.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>No se encontraron resultados</h3>
                <p>Intenta con otra búsqueda o categoría</p>
            </div>
        `;
    }
}

// ============ CREAR ITEM DEL MENÚ ============
function createMenuItem(item) {
    const div = document.createElement('div');
    div.className = `menu-item ${!item.disponible ? 'unavailable' : ''}`;
    div.onclick = () => item.disponible && openModal(item);

    const tagsHtml = item.etiquetas.map(tag =>
        `<span class="item-tag ${tag === 'popular' ? 'popular' : ''}">${tag}</span>`
    ).join('');

    div.innerHTML = `
        <img class="menu-item-image" src="${item.imagen}" alt="${item.nombre}"
             onerror="this.src='https://via.placeholder.com/100x100?text=🍽️'" loading="lazy">
        <div class="menu-item-info">
            <div>
                <div class="menu-item-name">${item.nombre}</div>
                <div class="menu-item-desc">${item.descripcion}</div>
            </div>
            <div class="menu-item-bottom">
                <span class="menu-item-price">${menuData.restaurante.moneda}${item.precio.toFixed(2)}</span>
                <div class="menu-item-tags">${tagsHtml}</div>
            </div>
        </div>
        ${!item.disponible ? '<span class="unavailable-badge">Agotado</span>' : ''}
    `;

    return div;
}

// ============ MODAL ============
function openModal(item) {
    const overlay = document.getElementById('modalOverlay');
    document.getElementById('modalImage').style.backgroundImage = `url(${item.imagen})`;
    document.getElementById('modalName').textContent = item.nombre;
    document.getElementById('modalDesc').textContent = item.descripcion;
    document.getElementById('modalPrice').textContent =
        `${menuData.restaurante.moneda}${item.precio.toFixed(2)}`;

    const tagsContainer = document.getElementById('modalTags');
    tagsContainer.innerHTML = item.etiquetas.map(tag =>
        `<span class="item-tag ${tag === 'popular' ? 'popular' : ''}">${tag}</span>`
    ).join('');

    // WhatsApp link
    const mensaje = `Hola! Me gustaría ordenar: ${item.nombre} (${menuData.restaurante.moneda}${item.precio.toFixed(2)})`;
    document.getElementById('modalWhatsapp').href =
        `https://wa.me/${menuData.restaurante.whatsapp}?text=${encodeURIComponent(mensaje)}`;

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

// ============ QR CODE ============
function generateQR() {
    const currentURL = window.location.href;
    const qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentURL)}`;
    document.getElementById('qrImage').src = qrURL;
}

// ============ EVENT LISTENERS ============
function setupEventListeners() {
    // Categorías
    document.getElementById('categoryNav').addEventListener('click', (e) => {
        if (e.target.classList.contains('category-btn')) {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            activeCategory = e.target.dataset.category;
            renderMenu();
        }
    });

    // Tags
    document.getElementById('tagFilters').addEventListener('click', (e) => {
        if (e.target.classList.contains('tag-btn')) {
            document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            activeTag = e.target.dataset.tag;
            renderMenu();
        }
    });

    // Búsqueda
    document.getElementById('searchInput').addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderMenu();
    });

    // Modal
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    // QR Modal
    document.getElementById('fabQR').addEventListener('click', () => {
        document.getElementById('qrModal').classList.add('active');
    });
    document.getElementById('closeQR').addEventListener('click', () => {
        document.getElementById('qrModal').classList.remove('active');
    });
}

// ============ INICIAR ============
document.addEventListener('DOMContentLoaded', init);