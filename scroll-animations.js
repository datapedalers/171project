/**
 * Scroll-based animations and interactions
 * Handles sidebar navigation, scroll reveals, and image morphing
 */

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initScrollAnimations();
    initSidebarNavigation();
    initImageMorphing();
});

// ===== SCROLL REVEAL ANIMATIONS =====
function initScrollAnimations() {
    const revealElements = document.querySelectorAll('.scroll-reveal, .scroll-fade-up, .scroll-fade-in');
    const sectionTitles = document.querySelectorAll('.section-title');
    const sectionIntros = document.querySelectorAll('.section-intro');
    const insightHeaders = document.querySelectorAll('.insight-block h3');
    const insightTexts = document.querySelectorAll('.insight-text');
    const visualizationContainers = document.querySelectorAll('.visualization-container');
    const vizControls = document.querySelectorAll('.viz-controls');
    const mainInsight = document.querySelector('.main-insight');
    const conclusionText = document.querySelector('.conclusion-text');
    const attribution = document.querySelector('.attribution');
    const reflectionPrompt = document.querySelector('.reflection-prompt');
    const introDescription = document.querySelector('.intro-description');
    
    // Combine all elements to animate
    const allAnimatedElements = [
        ...revealElements,
        ...sectionTitles,
        ...sectionIntros,
        ...insightHeaders,
        ...insightTexts,
        ...visualizationContainers,
        ...vizControls
    ];
    
    if (introDescription) {
        allAnimatedElements.push(introDescription);
    }
    if (mainInsight) {
        allAnimatedElements.push(mainInsight);
    }
    if (conclusionText) {
        allAnimatedElements.push(conclusionText);
    }
    if (attribution) {
        allAnimatedElements.push(attribution);
    }
    if (reflectionPrompt) {
        allAnimatedElements.push(reflectionPrompt);
    }
    
    const revealOnScroll = () => {
        const windowHeight = window.innerHeight;
        
        allAnimatedElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const revealPoint = windowHeight * 0.80;
            
            if (elementTop < revealPoint) {
                element.classList.add('visible');
            }
        });
    };
    
    // Initial check
    revealOnScroll();
    
    // Listen to scroll events with throttling
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        if (scrollTimeout) {
            window.cancelAnimationFrame(scrollTimeout);
        }
        scrollTimeout = window.requestAnimationFrame(revealOnScroll);
    });
}

// ===== SIDEBAR NAVIGATION =====
function initSidebarNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');
    
    // Update active nav item based on scroll position
    const updateActiveNav = () => {
        let currentSection = '';
        const scrollPosition = window.scrollY + window.innerHeight / 2;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                currentSection = section.id;
            }
        });
        
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === currentSection) {
                item.classList.add('active');
            }
        });
    };
    
    // Initial update
    updateActiveNav();
    
    // Listen to scroll events
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        if (scrollTimeout) {
            window.cancelAnimationFrame(scrollTimeout);
        }
        scrollTimeout = window.requestAnimationFrame(updateActiveNav);
    });
    
    // Click navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetSection = document.getElementById(item.dataset.section);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// ===== IMAGE MORPHING ANIMATION =====
function initImageMorphing() {
    const photoFrames = document.querySelectorAll('.photo-frame');
    const morphingContainer = document.getElementById('morphing-images');
    
    if (!morphingContainer || photoFrames.length === 0) return;
    
    let currentPhotoIndex = 0;
    
    // Show first photo initially
    photoFrames[0].classList.add('active');
    
    // Function to switch to next photo
    const switchPhoto = () => {
        photoFrames[currentPhotoIndex].classList.remove('active');
        currentPhotoIndex = (currentPhotoIndex + 1) % photoFrames.length;
        photoFrames[currentPhotoIndex].classList.add('active');
    };
    
    // Scroll-based photo switching
    const handlePhotoScroll = () => {
        const containerRect = morphingContainer.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        // Calculate scroll progress through the intro section
        const scrollProgress = 1 - (containerRect.top / windowHeight);
        
        if (scrollProgress > 0 && scrollProgress < 1) {
            // Determine which photo should be visible based on scroll
            const targetIndex = Math.min(
                Math.floor(scrollProgress * photoFrames.length),
                photoFrames.length - 1
            );
            
            if (targetIndex !== currentPhotoIndex) {
                photoFrames[currentPhotoIndex].classList.remove('active');
                currentPhotoIndex = targetIndex;
                photoFrames[currentPhotoIndex].classList.add('active');
            }
        }
    };
    
    // Listen to scroll for photo morphing
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        if (scrollTimeout) {
            window.cancelAnimationFrame(scrollTimeout);
        }
        scrollTimeout = window.requestAnimationFrame(handlePhotoScroll);
    });
    
    // Also auto-cycle photos every 3 seconds when not scrolling
    let autoPlayInterval = setInterval(switchPhoto, 3000);
    
    // Pause auto-play when user is actively scrolling
    let scrollTimer;
    window.addEventListener('scroll', () => {
        clearInterval(autoPlayInterval);
        clearTimeout(scrollTimer);
        
        scrollTimer = setTimeout(() => {
            autoPlayInterval = setInterval(switchPhoto, 3000);
        }, 1000);
    });
}

// ===== FILTER BUTTON INTERACTIONS =====
document.addEventListener('DOMContentLoaded', function() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Get filter value
            const filter = this.dataset.filter;
            
            // Emit custom event for visualizations to listen to
            const filterEvent = new CustomEvent('filterChange', {
                detail: { filter: filter }
            });
            document.dispatchEvent(filterEvent);
            
            console.log('Filter changed to:', filter);
        });
    });
});

// ===== PARALLAX EFFECTS (Optional Enhancement) =====
function initParallax() {
    const parallaxElements = document.querySelectorAll('.parallax');
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        
        parallaxElements.forEach(element => {
            const speed = element.dataset.speed || 0.5;
            const yPos = -(scrolled * speed);
            element.style.transform = `translateY(${yPos}px)`;
        });
    });
}

// ===== SMOOTH SCROLL POLYFILL FOR OLDER BROWSERS =====
function smoothScrollPolyfill() {
    if (!('scrollBehavior' in document.documentElement.style)) {
        const links = document.querySelectorAll('a[href^="#"]');
        
        links.forEach(link => {
            link.addEventListener('click', function(e) {
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
    }
}

// Initialize polyfill
document.addEventListener('DOMContentLoaded', smoothScrollPolyfill);

// ===== UTILITY: THROTTLE FUNCTION =====
function throttle(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== EXPORT FOR USE IN OTHER SCRIPTS =====
window.scrollAnimations = {
    initScrollAnimations,
    initSidebarNavigation,
    initImageMorphing,
    throttle
};
