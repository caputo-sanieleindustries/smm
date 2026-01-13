// ===== Navbar Scroll Effect =====
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ===== Smooth Scroll to Form =====
function scrollToForm() {
    const contactSection = document.getElementById('contact');
    contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== Form Handling =====
const leadForm = document.getElementById('leadForm');
const successMessage = document.getElementById('successMessage');
const API_URL = 'http://localhost:3000/api/leads';

leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get submit button
    const submitButton = leadForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;

    // Disable button and show loading
    submitButton.disabled = true;
    submitButton.innerHTML = '<span>Invio in corso...</span>';

    // Get form data
    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        company: document.getElementById('company').value,
        budget: document.getElementById('budget').value,
        message: document.getElementById('message').value,
        timestamp: new Date().toISOString()
    };

    try {
        // Send data to backend
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // Success - Data saved to database
            console.log('✅ Lead saved to database:', result);

            // Track conversion (analytics placeholder)
            if (typeof gtag !== 'undefined') {
                gtag('event', 'conversion', {
                    'send_to': 'AW-CONVERSION_ID/CONVERSION_LABEL',
                    'value': 1.0,
                    'currency': 'EUR'
                });
            }

            // Redirect to thank you page with user data
            const params = new URLSearchParams({
                name: formData.name,
                phone: formData.phone,
                email: formData.email
            });

            window.location.href = `thankyou.html?${params.toString()}`;

        } else {
            // Server returned an error
            throw new Error(result.error || 'Errore durante il salvataggio');
        }

    } catch (error) {
        console.error('Error submitting form:', error);

        // Fallback to localStorage if server is unavailable
        console.log('⚠️ Server unavailable, saving to localStorage...');
        const leads = JSON.parse(localStorage.getItem('socialboost_leads') || '[]');
        leads.push(formData);
        localStorage.setItem('socialboost_leads', JSON.stringify(leads));

        // Show user-friendly error with fallback message
        alert(`⚠️ ${error.message}\n\nI tuoi dati sono stati salvati localmente. Ti contatteremo appena possibile.`);

        // Re-enable button
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
});

// ===== Input Animations =====
const formInputs = document.querySelectorAll('.form-input');

formInputs.forEach(input => {
    input.addEventListener('focus', () => {
        input.parentElement.style.transform = 'scale(1.02)';
        input.parentElement.style.transition = 'transform 0.3s ease';
    });

    input.addEventListener('blur', () => {
        input.parentElement.style.transform = 'scale(1)';
    });
});

// ===== Intersection Observer for Animations =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe service cards
const serviceCards = document.querySelectorAll('.service-card');
serviceCards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = `all 0.6s ease ${index * 0.1}s`;
    observer.observe(card);
});

// Observe result items
const resultItems = document.querySelectorAll('.result-item');
resultItems.forEach((item, index) => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(30px)';
    item.style.transition = `all 0.6s ease ${index * 0.1}s`;
    observer.observe(item);
});

// ===== Phone Number Formatting =====
const phoneInput = document.getElementById('phone');

phoneInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');

    // Auto-format Italian phone numbers
    if (value.length > 0) {
        if (value.startsWith('39')) {
            value = '+' + value;
        } else if (value.startsWith('3')) {
            value = '+39 ' + value;
        }
    }

    e.target.value = value;
});

// ===== Email Validation =====
const emailInput = document.getElementById('email');

emailInput.addEventListener('blur', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailInput.value && !emailRegex.test(emailInput.value)) {
        emailInput.style.borderColor = '#f5576c';
        emailInput.style.boxShadow = '0 0 0 3px rgba(245, 87, 108, 0.1)';
    } else {
        emailInput.style.borderColor = '';
        emailInput.style.boxShadow = '';
    }
});

// ===== Counter Animation for Results =====
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    const isPercentage = target <= 100;
    const hasPlus = element.textContent.includes('+');
    const hasX = element.textContent.includes('x');

    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            start = target;
            clearInterval(timer);
        }

        let displayValue = Math.floor(start);

        if (isPercentage) {
            element.textContent = displayValue + '%';
        } else if (hasX) {
            element.textContent = (start / 10).toFixed(1) + 'x';
        } else if (target >= 1000000) {
            element.textContent = (start / 1000000).toFixed(1) + 'M+';
        } else if (target >= 1000) {
            element.textContent = (start / 1000).toFixed(0) + 'K+';
        } else {
            element.textContent = displayValue + (hasPlus ? '+' : '');
        }
    }, 16);
}

// Trigger counter animations when results section is visible
const resultsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const resultNumbers = entry.target.querySelectorAll('.result-number');
            resultNumbers.forEach(number => {
                const text = number.textContent;
                let target;

                if (text.includes('%')) {
                    target = parseInt(text);
                } else if (text.includes('M+')) {
                    target = parseFloat(text) * 1000000;
                } else if (text.includes('K+')) {
                    target = parseFloat(text) * 1000;
                } else if (text.includes('x')) {
                    target = parseFloat(text) * 10;
                } else {
                    target = parseInt(text);
                }

                animateCounter(number, target);
            });

            resultsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const resultsSection = document.querySelector('.results');
if (resultsSection) {
    resultsObserver.observe(resultsSection);
}

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

// ===== Console Welcome Message =====
console.log('%c🚀 SocialBoost - Landing Page', 'color: #667eea; font-size: 20px; font-weight: bold;');
console.log('%cGrazie per aver visitato la nostra landing page!', 'color: #a8b3ff; font-size: 14px;');
console.log('%cInteressato a lavorare con noi? Contattaci! 📧', 'color: #fff; font-size: 12px;');
