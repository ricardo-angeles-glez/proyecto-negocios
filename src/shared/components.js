// ============================================
// COMPONENTES REUTILIZABLES
// ============================================

// ── Navbar ────────────────────────────────────
export function crearNavbar({
    logo = '◆',
    nombre = 'Mi Negocio',
    links = [],
    ctaTexto = 'Reservar',
    ctaHref = '#reservas'
} = {}) {
    const nav = document.createElement('nav');
    nav.className = 'navbar';
    nav.id = 'navbar';
    nav.innerHTML = `
        <div class="nav-container">
            <a href="#" class="logo">
                <span class="logo-icon">${logo}</span>
                <span class="logo-text">${nombre}</span>
            </a>
            <ul class="nav-links" id="navLinks">
                ${links.map(l => `<li><a href="${l.href}">${l.texto}</a></li>`).join('')}
            </ul>
            <div class="nav-actions">
                <a href="${ctaHref}" class="btn-nav">${ctaTexto}</a>
                <button class="menu-toggle" id="menuToggle" aria-label="Menú">
                    <span></span><span></span><span></span>
                </button>
            </div>
        </div>
    `;

    // Scroll behavior
    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 50);
    });

    // Mobile toggle
    nav.querySelector('#menuToggle')?.addEventListener('click', () => {
        nav.querySelector('#navLinks')?.classList.toggle('active');
    });

    return nav;
}

// ── Footer ────────────────────────────────────
export function crearFooter({
    nombre = 'Mi Negocio',
    año = new Date().getFullYear(),
    redes = {}
} = {}) {
    const footer = document.createElement('footer');
    footer.className = 'footer';
    footer.innerHTML = `
        <div class="container">
            <p>&copy; ${año} ${nombre}. Todos los derechos reservados.</p>
            <div class="social-links">
                ${redes.instagram ? `<a href="${redes.instagram}" target="_blank" aria-label="Instagram"><i class="fab fa-instagram"></i></a>` : ''}
                ${redes.facebook ? `<a href="${redes.facebook}" target="_blank" aria-label="Facebook"><i class="fab fa-facebook"></i></a>` : ''}
                ${redes.whatsapp ? `<a href="https://wa.me/${redes.whatsapp}" target="_blank" aria-label="WhatsApp"><i class="fab fa-whatsapp"></i></a>` : ''}
                ${redes.tiktok ? `<a href="${redes.tiktok}" target="_blank" aria-label="TikTok"><i class="fab fa-tiktok"></i></a>` : ''}
            </div>
        </div>
    `;
    return footer;
}

// ── Card de Estadística ───────────────────────
export function crearStatCard({ icono, label, valor, color = '#6C63FF' }) {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `
        <div class="stat-card-header">
            <span class="stat-card-label">${label}</span>
            <div class="stat-card-icon" style="background:${color}20; color:${color}">
                <i class="${icono}"></i>
            </div>
        </div>
        <div class="stat-card-value">${valor}</div>
    `;
    return card;
}

// ── Badge de Estado ───────────────────────────
export function crearBadgeEstado(estado) {
    const configs = {
        confirmada: { color: '#00D4AA', texto: '✓ Confirmada' },
        pendiente:  { color: '#FFC107', texto: '⏳ Pendiente' },
        cancelada:  { color: '#FF6B6B', texto: '✗ Cancelada' },
        completada: { color: '#6C63FF', texto: '★ Completada' }
    };
    const { color, texto } = configs[estado] || configs.pendiente;
    return `<span style="
        padding: 4px 12px;
        background: ${color}20;
        color: ${color};
        border-radius: 50px;
        font-size: 0.75rem;
        font-weight: 600;
    ">${texto}</span>`;
}

// ── Modal Genérico ────────────────────────────
export function crearModal({ id, titulo, contenido, onConfirm, textoConfirmar = 'Confirmar' }) {
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = id;
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 9000;
        display: flex; align-items: center; justify-content: center;
        padding: 20px; backdrop-filter: blur(4px);
    `;
    modal.innerHTML = `
        <div style="
            background: white; border-radius: 20px; padding: 32px;
            max-width: 480px; width: 100%; animation: fadeIn 0.3s ease;
        ">
            <h3 style="margin-bottom: 16px; font-size: 1.2rem;">${titulo}</h3>
            <div style="margin-bottom: 24px; color: #6c757d;">${contenido}</div>
            <div style="display: flex; gap: 12px;">
                <button id="${id}-cancel" style="
                    flex: 1; padding: 12px; border: 2px solid #e9ecef;
                    border-radius: 50px; background: white; cursor: pointer;
                    font-family: inherit; font-weight: 600;
                ">Cancelar</button>
                <button id="${id}-confirm" style="
                    flex: 1; padding: 12px; border: none;
                    border-radius: 50px; background: #6C63FF; color: white;
                    cursor: pointer; font-family: inherit; font-weight: 600;
                ">${textoConfirmar}</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector(`#${id}-cancel`).onclick = () => modal.remove();
    modal.querySelector(`#${id}-confirm`).onclick = () => {
        onConfirm?.();
        modal.remove();
    };
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    return modal;
}

// ── Skeleton Loading ──────────────────────────
export function crearSkeleton(lineas = 3) {
    const style = `
        background: linear-gradient(90deg, #f0f2f5 25%, #e9ecef 50%, #f0f2f5 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 8px;
    `;
    if (!document.getElementById('skeleton-style')) {
        const s = document.createElement('style');
        s.id = 'skeleton-style';
        s.textContent = `@keyframes shimmer { from{background-position:200% 0} to{background-position:-200% 0} }`;
        document.head.appendChild(s);
    }

    return `
        <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
            ${Array(lineas).fill(0).map((_, i) => `
                <div style="${style} height: ${i === 0 ? '20px' : '14px'}; width: ${i === 0 ? '60%' : '100%'};"></div>
            `).join('')}
        </div>
    `;
}

// ── Empty State ───────────────────────────────
export function crearEmptyState({ icono = '📭', titulo = 'Sin datos', descripcion = '', accion = null }) {
    return `
        <div style="
            text-align: center; padding: 60px 20px;
            color: #6c757d;
        ">
            <div style="font-size: 3rem; margin-bottom: 16px;">${icono}</div>
            <h3 style="font-size: 1.1rem; margin-bottom: 8px; color: #495057;">${titulo}</h3>
            ${descripcion ? `<p style="font-size: 0.9rem;">${descripcion}</p>` : ''}
            ${accion ? `
                <button onclick="${accion.fn}" style="
                    margin-top: 20px; padding: 10px 24px;
                    background: #6C63FF; color: white; border: none;
                    border-radius: 50px; cursor: pointer;
                    font-family: inherit; font-weight: 600;
                ">${accion.texto}</button>
            ` : ''}
        </div>
    `;
}