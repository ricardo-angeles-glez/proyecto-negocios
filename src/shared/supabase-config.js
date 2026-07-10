// ============================================
// CONFIGURACIÓN DE SUPABASE
// ============================================
// 1. Ve a https://supabase.com y crea cuenta gratis
// 2. Crea un nuevo proyecto
// 3. Ve a Settings > API
// 4. Copia tu URL y anon key aquí abajo
// ============================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 🔑 CAMBIAR ESTOS VALORES CON TUS CREDENCIALES
const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU_ANON_KEY_AQUI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// SQL PARA CREAR LAS TABLAS EN SUPABASE
// Ve a Supabase > SQL Editor y ejecuta esto:
// ============================================
/*

-- TABLA DE RESERVAS
CREATE TABLE IF NOT EXISTS reservas (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    fecha DATE NOT NULL,
    hora VARCHAR(10) NOT NULL,
    personas INTEGER NOT NULL DEFAULT 1,
    notas TEXT,
    estado VARCHAR(20) DEFAULT 'confirmada',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA DE CATEGORÍAS DEL MENÚ
CREATE TABLE IF NOT EXISTS menu_categorias (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    emoji VARCHAR(10),
    orden INTEGER DEFAULT 0,
    activa BOOLEAN DEFAULT true
);

-- TABLA DE ITEMS DEL MENÚ
CREATE TABLE IF NOT EXISTS menu_items (
    id BIGSERIAL PRIMARY KEY,
    categoria_id BIGINT REFERENCES menu_categorias(id),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    imagen TEXT,
    etiquetas TEXT[] DEFAULT '{}',
    disponible BOOLEAN DEFAULT true,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA DE CONTACTOS
CREATE TABLE IF NOT EXISTS contactos (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    mensaje TEXT NOT NULL,
    leido BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA DE CONFIGURACIÓN DEL NEGOCIO
CREATE TABLE IF NOT EXISTS configuracion (
    id BIGSERIAL PRIMARY KEY,
    clave VARCHAR(50) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descripcion TEXT
);

-- DATOS INICIALES DE CONFIGURACIÓN
INSERT INTO configuracion (clave, valor, descripcion) VALUES
    ('nombre_negocio', 'Tu Restaurante', 'Nombre del negocio'),
    ('whatsapp', '1234567890', 'Número de WhatsApp'),
    ('moneda', '$', 'Símbolo de moneda'),
    ('logo_emoji', '🍽️', 'Emoji del logo'),
    ('descripcion', 'Cocina con pasión', 'Descripción corta')
ON CONFLICT (clave) DO NOTHING;

-- DATOS INICIALES DEL MENÚ
INSERT INTO menu_categorias (nombre, emoji, orden) VALUES
    ('Entradas', '🥗', 1),
    ('Platos Principales', '🥩', 2),
    ('Bebidas', '🍷', 3),
    ('Postres', '🍰', 4);

-- Habilitar Row Level Security (RLS)
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

-- Políticas: lectura pública para menú y configuración
CREATE POLICY "Menú público de lectura" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Categorías públicas" ON menu_categorias FOR SELECT USING (true);
CREATE POLICY "Config pública" ON configuracion FOR SELECT USING (true);

-- Políticas: inserción pública para reservas y contactos
CREATE POLICY "Insertar reservas" ON reservas FOR INSERT WITH CHECK (true);
CREATE POLICY "Insertar contactos" ON contactos FOR INSERT WITH CHECK (true);

-- Política: lectura de reservas solo para admins (authenticated)
CREATE POLICY "Leer reservas - admin" ON reservas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Actualizar reservas - admin" ON reservas FOR UPDATE USING (auth.role() = 'authenticated');

*/