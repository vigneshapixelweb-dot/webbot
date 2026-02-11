// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Secure Trading link: open in same tab on mobile, new tab on desktop.
const isMobileDevice = () => /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

document.querySelectorAll('.secure-trading-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const url = link.getAttribute('href');
        if (!url) {
            return;
        }
        if (isMobileDevice()) {
            window.location.href = url;
        } else {
            window.open(url, '_blank', 'noopener');
        }
    });
});

// "Why Choose Bitlon?" link: attempt to open the iOS app via deep link.
const iosAppLink = document.querySelector('.ios-app-link');
if (iosAppLink) {
    iosAppLink.addEventListener('click', (e) => {
        const url = iosAppLink.getAttribute('href');
        if (!url) {
            return;
        }
        e.preventDefault();
        const fallback = iosAppLink.getAttribute('data-ios-fallback');
        let didHide = false;
        const timeoutId = fallback
            ? window.setTimeout(() => {
                  if (!didHide) {
                      window.location.href = fallback;
                  }
              }, 1500)
            : null;

        window.location.href = url;
        window.addEventListener(
            'pagehide',
            () => {
                didHide = true;
                if (timeoutId) {
                    window.clearTimeout(timeoutId);
                }
            },
            { once: true }
        );
    });
}

// Form submission
document.querySelector('.contact-form form').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Thank you for your message! We\'ll get back to you soon.');
    this.reset();
});

// Add animation on scroll
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

document.querySelectorAll('.feature-card, .stat').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s, transform 0.6s';
    observer.observe(el);
});
