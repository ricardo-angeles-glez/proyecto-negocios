// landing/script.js

// ============ NAVBAR SCROLL ============
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ============ MOBILE MENU ============
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');

menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

// Cerrar menú al hacer click en un link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
    });
});

// ============ CONTADOR ANIMADO ============
function animateCounters() {
    const counters = document.querySelectorAll('[data-count]');
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-count'));
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;

        const updateCounter = () => {
            current += step;
            if (current < target) {
                counter.textContent = Math.floor(current);
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target;
            }
        };
        updateCounter();
    });
}

// Observer para activar contadores cuando son visibles
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCounters();
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) observer.observe(heroStats);

// ============ SCROLL ANIMATIONS ============
const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.servicio-card, .section-header, .contact-form')
    .forEach(el => scrollObserver.observe(el));

// ============ FORMULARIO DE CONTACTO ============
document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    // Opción 1: Enviar a WhatsApp
    const mensaje = `Hola! Soy ${data.nombre}. ${data.mensaje}. Mi email: ${data.email}`;
    const whatsappURL = `https://wa.me/TUNUMERO?text=${encodeURIComponent(mensaje)}`;

    // Opción 2: Usar Formspree (gratuito)
    // const response = await fetch('https://formspree.io/f/TU_FORM_ID', {
    //     method: 'POST',
    //     body: formData,
    //     headers: { 'Accept': 'application/json' }
    // });

    window.open(whatsappURL, '_blank');

    // Feedback visual
    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerHTML = '<i class="fas fa-check"></i> ¡Enviado!';
    btn.style.background = 'var(--accent)';

    setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Mensaje';
        btn.style.background = '';
        e.target.reset();
    }, 3000);
});

// ============ SMOOTH SCROLL ============
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});