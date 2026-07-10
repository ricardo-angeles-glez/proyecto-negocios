import { db } from '../shared/database.js';

// ============================================
// LANDING PAGE - SCRIPT
// ============================================

// ── Navbar scroll ──────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// ── Mobile menu ────────────────────────────
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');

if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        const isOpen = navLinks.classList.contains('active');
        menuToggle.innerHTML = isOpen
            ? '<i class="ph ph-x"></i>'
            : '<i class="ph ph-list"></i>';
    });

    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            menuToggle.innerHTML = '<i class="ph ph-list"></i>';
        });
    });
}

// ── Animated counters ──────────────────────
function animateCounters() {
    document.querySelectorAll('[data-count]').forEach(counter => {
        const target = parseInt(counter.dataset.count);
        const duration = 1500;
        const step = target / (duration / 16);
        let current = 0;

        const update = () => {
            current += step;
            if (current < target) {
                counter.textContent = Math.floor(current);
                requestAnimationFrame(update);
            } else {
                counter.textContent = target;
            }
        };
        update();
    });
}

const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCounters();
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const statsBar = document.querySelector('.stats-bar');
if (statsBar) statsObserver.observe(statsBar);

// ── Scroll animations ──────────────────────
const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll(
    '.feature-card, .service-card, .section-header, .cta-card'
).forEach(el => scrollObserver.observe(el));

// ── Contact form ───────────────────────────
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        const btn = e.target.querySelector('button[type="submit"]');
        const originalHTML = btn.innerHTML;

        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-circle-notch"></i> Enviando';

        await db.crearContacto({
            nombre: data.nombre,
            email: data.email,
            mensaje: data.mensaje,
            origen: 'landing'
        });

        btn.innerHTML = '<i class="ph ph-check"></i> Enviado';
        btn.style.background = 'var(--olive)';
        e.target.reset();

        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = '';
            btn.disabled = false;
        }, 3000);
    });
}

// ── Smooth scroll ──────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});
