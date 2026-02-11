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
        const appLink = link.getAttribute('data-ios-app');
        const iosStore = link.getAttribute('data-ios-store');
        const androidStore = link.getAttribute('data-android-store');
        if (!isMobileDevice()) {
            e.preventDefault();
            const lines = ['This feature is available on mobile only.'];
            if (iosStore) {
                lines.push('iOS: ' + iosStore);
            }
            if (androidStore) {
                lines.push('Android: ' + androidStore);
            }
            alert(lines.join('\n'));
            return;
        }
        if (!appLink) {
            return;
        }
        e.preventDefault();
        let didHide = false;
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        const storeUrl = isIOS ? iosStore : androidStore;
        const timeoutId = storeUrl
            ? window.setTimeout(() => {
                  if (!didHide) {
                      window.location.href = storeUrl;
                  }
              }, 1500)
            : null;

        window.location.href = appLink;
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
