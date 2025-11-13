/* =====================================================
   PROFESSIONAL PHOTOGRAPHER PORTFOLIO JAVASCRIPT
   ===================================================== */

// Mobile Menu Toggle
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const nav = document.getElementById('nav');

if (mobileMenuBtn && nav) {
    mobileMenuBtn.addEventListener('click', () => {
        nav.classList.toggle('active');
        mobileMenuBtn.textContent = nav.classList.contains('active') ? '✕' : '☰';
    });
    
    // Close menu when clicking a link
    const navLinks = nav.querySelectorAll('a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('active');
            mobileMenuBtn.textContent = '☰';
        });
    });
}

// Header Scroll Effect
const header = document.getElementById('header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
});

// Smooth Scroll for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerHeight = header.offsetHeight;
            const targetPosition = target.offsetTop - headerHeight;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Scroll Reveal Animation
const revealElements = document.querySelectorAll('.reveal');

const revealOnScroll = () => {
    const windowHeight = window.innerHeight;
    
    revealElements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const revealPoint = 100;
        
        if (elementTop < windowHeight - revealPoint) {
            element.classList.add('active');
        }
    });
};

// Initial check
revealOnScroll();

// Check on scroll
window.addEventListener('scroll', revealOnScroll);

// Portfolio Gallery Lightbox Effect
const portfolioItems = document.querySelectorAll('.portfolio-item');

portfolioItems.forEach(item => {
    item.addEventListener('click', () => {
        // Add a simple click effect
        item.style.transform = 'scale(0.95)';
        setTimeout(() => {
            item.style.transform = '';
        }, 150);
    });
});

// Form Submission Handler
const contactForm = document.querySelector('.contact-form');

if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get form values
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const service = document.getElementById('service').value;
        const date = document.getElementById('date').value;
        const message = document.getElementById('message').value;
        
        // Here you would typically send the data to your backend
        console.log('Photography inquiry submitted:', { 
            name, email, phone, service, date, message 
        });
        
        // Show success message
        alert('Thank you for your photography inquiry! I will get back to you within 24 hours to discuss your session details.');
        
        // Reset form
        contactForm.reset();
    });
}

// Add loading animation to CTA buttons
document.querySelectorAll('.cta-button, .submit-btn').forEach(button => {
    button.addEventListener('click', function() {
        if (!this.classList.contains('loading')) {
            this.classList.add('loading');
            setTimeout(() => {
                this.classList.remove('loading');
            }, 2000);
        }
    });
});

// Parallax effect for hero section
const hero = document.querySelector('.hero');

if (hero) {
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallax = scrolled * 0.5;
        hero.style.transform = `translateY(${parallax}px)`;
    });
}

// Add fade-in animation to cards on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe all cards
document.querySelectorAll('.service-card, .testimonial-card, .portfolio-item').forEach(card => {
    observer.observe(card);
});

// Service card hover effects
document.querySelectorAll('.service-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-10px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0) scale(1)';
    });
});

// Portfolio item click handler for potential lightbox
document.querySelectorAll('.portfolio-item').forEach(item => {
    item.addEventListener('click', () => {
        // Get the image source for potential lightbox
        const img = item.querySelector('img');
        const title = item.querySelector('.portfolio-overlay h3').textContent;
        const description = item.querySelector('.portfolio-overlay p').textContent;
        
        // For now, just log the details
        // In a full implementation, you might open a lightbox modal
        console.log('Portfolio item clicked:', {
            image: img.src,
            title: title,
            description: description
        });
        
        // You could implement a lightbox here
        // openLightbox(img.src, title, description);
    });
});

// Smooth reveal animation for service cards
document.querySelectorAll('.service-card').forEach((card, index) => {
    card.style.animationDelay = `${index * 0.1}s`;
});

// Add scroll progress indicator (optional)
const createScrollProgress = () => {
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0%;
        height: 3px;
        background: linear-gradient(90deg, #d97706, #f59e0b);
        z-index: 9999;
        transition: width 0.1s ease;
    `;
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset;
        const docHeight = document.body.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        progressBar.style.width = scrollPercent + '%';
    });
};

// Initialize scroll progress
createScrollProgress();

// Add keyboard navigation support
document.addEventListener('keydown', (e) => {
    // ESC key closes mobile menu
    if (e.key === 'Escape' && nav.classList.contains('active')) {
        nav.classList.remove('active');
        mobileMenuBtn.textContent = '☰';
    }
});

// Add touch support for mobile
let touchStartY = 0;
let touchEndY = 0;

document.addEventListener('touchstart', (e) => {
    touchStartY = e.changedTouches[0].screenY;
});

document.addEventListener('touchend', (e) => {
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
});

const handleSwipe = () => {
    const swipeThreshold = 50;
    const diff = touchStartY - touchEndY;
    
    // Swipe up to close mobile menu
    if (Math.abs(diff) > swipeThreshold && nav.classList.contains('active')) {
        if (diff > 0) {
            nav.classList.remove('active');
            mobileMenuBtn.textContent = '☰';
        }
    }
};

// Performance optimization: Debounce scroll events
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Apply debouncing to scroll events
const debouncedRevealOnScroll = debounce(revealOnScroll, 10);
window.addEventListener('scroll', debouncedRevealOnScroll);

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Photographer Portfolio loaded successfully!');
    console.log('🎨 All elements are editable:');
    console.log('   - Click any text to edit');
    console.log('   - Click any image to replace');
    console.log('   - Ctrl+Click any section to edit background');
    console.log('📸 Photography template ready for customization!');
    
    // Add loading class removal
    document.body.classList.add('loaded');
});

// Export functions for potential external use
window.PhotographerPortfolio = {
    openLightbox: (imageSrc, title, description) => {
        // Placeholder for lightbox functionality
        console.log('Lightbox would open for:', { imageSrc, title, description });
    },
    
    scrollToSection: (sectionId) => {
        const target = document.querySelector(sectionId);
        if (target) {
            const headerHeight = header.offsetHeight;
            const targetPosition = target.offsetTop - headerHeight;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    },
    
    toggleMobileMenu: () => {
        if (nav) {
            nav.classList.toggle('active');
            mobileMenuBtn.textContent = nav.classList.contains('active') ? '✕' : '☰';
        }
    }
};
