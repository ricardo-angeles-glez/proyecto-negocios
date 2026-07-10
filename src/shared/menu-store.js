const MENU_STORAGE_KEY = 'admin_menu_custom';
const SETTINGS_STORAGE_KEY = 'admin_settings';

export const DEFAULT_MENU_DATA = {
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
                { id: 1, nombre: 'Sopa de tortilla', descripcion: 'Caldo de jitomate con tortilla crujiente, aguacate, crema y queso fresco', precio: 95, imagen: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400', etiquetas: ['popular'], disponible: true },
                { id: 2, nombre: 'Guacamole de la casa', descripcion: 'Aguacate fresco con cebolla, cilantro, chile serrano y limón. Servido con totopos', precio: 120, imagen: 'https://images.unsplash.com/photo-1600335895229-6e75511892c8?w=400', etiquetas: ['vegetariano', 'popular'], disponible: true },
                { id: 3, nombre: 'Quesadillas de flor de calabaza', descripcion: 'Tortillas de maíz hechas a mano con queso Oaxaca y flor de calabaza', precio: 110, imagen: 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=400', etiquetas: ['vegetariano'], disponible: true }
            ]
        },
        {
            id: 'principales',
            nombre: 'Platos principales',
            items: [
                { id: 4, nombre: 'Mole poblano', descripcion: 'Pollo bañado en mole de 28 ingredientes, acompañado de arroz rojo y tortillas', precio: 195, imagen: 'https://images.unsplash.com/photo-1534352956036-cd81e27dd615?w=400', etiquetas: ['chef recomienda', 'popular'], disponible: true },
                { id: 5, nombre: 'Tacos de arrachera', descripcion: 'Tres tacos de arrachera a la parrilla con guacamole, cebolla asada y salsa verde', precio: 175, imagen: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400', etiquetas: ['popular'], disponible: true },
                { id: 6, nombre: 'Enchiladas suizas', descripcion: 'Tortillas rellenas de pollo con salsa verde cremosa, gratinadas con queso', precio: 165, imagen: 'https://images.unsplash.com/photo-1534352956036-cd81e27dd615?w=400', etiquetas: [], disponible: true },
                { id: 7, nombre: 'Chile en nogada', descripcion: 'Chile poblano relleno de picadillo, bañado en nogada y granada (temporada)', precio: 225, imagen: 'https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=400', etiquetas: ['chef recomienda'], disponible: true }
            ]
        },
        {
            id: 'bebidas',
            nombre: 'Bebidas',
            items: [
                { id: 8, nombre: 'Agua de horchata', descripcion: 'Bebida tradicional de arroz con canela y un toque de vainilla', precio: 55, imagen: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400', etiquetas: ['refrescante'], disponible: true },
                { id: 9, nombre: 'Jamaica', descripcion: 'Infusión fría de flor de jamaica con un toque de limón', precio: 50, imagen: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400', etiquetas: ['refrescante'], disponible: true },
                { id: 10, nombre: 'Café de olla', descripcion: 'Café preparado con piloncillo, canela y clavo en olla de barro', precio: 45, imagen: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400', etiquetas: [], disponible: true }
            ]
        },
        {
            id: 'postres',
            nombre: 'Postres',
            items: [
                { id: 11, nombre: 'Flan napolitano', descripcion: 'Flan casero con caramelo, preparado con la receta de la abuela', precio: 85, imagen: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400', etiquetas: ['popular'], disponible: true },
                { id: 12, nombre: 'Churros con chocolate', descripcion: 'Churros recién hechos con chocolate caliente para dipping', precio: 95, imagen: 'https://images.unsplash.com/photo-1624371414361-e670246e6832?w=400', etiquetas: ['chef recomienda'], disponible: true }
            ]
        }
    ]
};

export function getSettings() {
    return {
        negocio: 'La Casona',
        descripcion: 'Cocina mexicana tradicional',
        whatsapp: '1234567890',
        moneda: '$',
        capacidad: 40,
        intervaloReservas: 30,
        autoConfirmar: true,
        emailConfirmacion: false,
        calendarioCliente: true,
        adminPin: '1234',
        ...readJSON(SETTINGS_STORAGE_KEY, {})
    };
}

export function saveSettings(settings) {
    const next = { ...getSettings(), ...settings };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    return next;
}

export function getMenuData() {
    const custom = readJSON(MENU_STORAGE_KEY, null);
    const settings = getSettings();
    const data = custom || structuredClone(DEFAULT_MENU_DATA);

    data.restaurante = {
        ...data.restaurante,
        nombre: settings.negocio || data.restaurante.nombre,
        descripcion: settings.descripcion || data.restaurante.descripcion,
        moneda: settings.moneda || data.restaurante.moneda,
        whatsapp: settings.whatsapp || data.restaurante.whatsapp
    };

    return data;
}

export function saveMenuData(data) {
    localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(data));
    return data;
}

export function upsertMenuItem(item) {
    const data = getMenuData();
    let category = data.categorias.find((cat) => cat.id === item.categoria);

    if (!category) {
        category = {
            id: slugify(item.categoria || item.categoriaNombre || 'nueva-categoria'),
            nombre: item.categoriaNombre || item.categoria || 'Nueva categoria',
            items: []
        };
        data.categorias.push(category);
    }

    const normalized = {
        id: item.id || Date.now(),
        nombre: item.nombre,
        descripcion: item.descripcion || '',
        precio: Number(item.precio || 0),
        imagen: item.imagen || '',
        etiquetas: normalizeTags(item.etiquetas),
        disponible: Boolean(item.disponible)
    };

    const index = category.items.findIndex((actual) => String(actual.id) === String(normalized.id));
    if (index === -1) category.items.push(normalized);
    else category.items[index] = { ...category.items[index], ...normalized };

    saveMenuData(data);
    return normalized;
}

export function updateMenuItemAvailability(id, disponible) {
    const data = getMenuData();
    data.categorias.forEach((category) => {
        category.items = category.items.map((item) => (
            String(item.id) === String(id) ? { ...item, disponible } : item
        ));
    });
    saveMenuData(data);
}

export function getMenuItems() {
    return getMenuData().categorias.flatMap((categoria) => (
        categoria.items.map((item) => ({ ...item, categoria: categoria.id, categoriaNombre: categoria.nombre }))
    ));
}

function normalizeTags(value) {
    if (Array.isArray(value)) return value.map((tag) => String(tag).trim()).filter(Boolean);
    return String(value || '').split(',').map((tag) => tag.trim()).filter(Boolean);
}

function slugify(value) {
    return String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'categoria';
}

function readJSON(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch {
        return fallback;
    }
}
