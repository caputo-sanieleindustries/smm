// ===== Extract URL Parameters =====
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// ===== Populate Thank You Page =====
window.addEventListener('DOMContentLoaded', () => {
    // Get user data from URL parameters
    const name = getUrlParameter('name') || 'Amico';
    const phone = getUrlParameter('phone') || 'il tuo numero';
    const email = getUrlParameter('email') || 'la tua email';

    // Update the page with user data
    document.getElementById('userName').textContent = name;
    document.getElementById('userPhone').textContent = phone;
    document.getElementById('userEmail').textContent = email;

    // Update page title
    document.title = `Grazie ${name} - SocialBoost`;

    // Trigger animations
    setTimeout(() => {
        document.querySelector('.thankyou-content').classList.add('visible');
    }, 100);
});

// ===== Navbar Scroll Effect =====
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ===== Parallax Effect for Gradient Orbs =====
document.addEventListener('mousemove', (e) => {
    const orbs = document.querySelectorAll('.gradient-orb');
    const mouseX = e.clientX / window.innerWidth;
    const mouseY = e.clientY / window.innerHeight;

    orbs.forEach((orb, index) => {
        const speed = (index + 1) * 20;
        const x = (mouseX - 0.5) * speed;
        const y = (mouseY - 0.5) * speed;

        orb.style.transform = `translate(${x}px, ${y}px)`;
    });
});

// ===== Confetti Effect (Optional) =====
// You can add a confetti library or animation here for extra celebration effect
console.log('%c🎉 Grazie per esserti registrato!', 'color: #667eea; font-size: 20px; font-weight: bold;');
console.log('%cTi contatteremo a breve! 🚀', 'color: #a8b3ff; font-size: 14px;');
