// Conclusion section handler
function initConclusion() {
    const conclusionSection = document.getElementById('conclusion');
    if (!conclusionSection) return;

    const screens = [
        {
            id: 'conclusion-screen-1',
            element: document.getElementById('conclusion-screen-1'),
            textElement: document.querySelector('#conclusion-screen-1 .conclusion-text')

        },
        {
            id: 'conclusion-screen-2',
            element: document.getElementById('conclusion-screen-2'),
            textElement: document.querySelector('#conclusion-screen-2 .conclusion-text')
        },
        {
            id: 'conclusion-screen-3',
            element: document.getElementById('conclusion-screen-3'),
            textElement: document.querySelector('#conclusion-screen-3 .conclusion-text')
        },
        {
            id: 'conclusion-screen-4',
            element: document.getElementById('conclusion-screen-4'),
            textElement: document.querySelector('#conclusion-screen-4 .conclusion-text')
        }
    ];

    // Image randomizer for screen 1
    const imageRandomizer = document.getElementById('conclusion-randomizer');
    let randomizerInterval = null;
    let isRandomizerActive = false;

    function startImageRandomizer() {
        if (isRandomizerActive || !ALL_MET_IMAGES) return;
        isRandomizerActive = true;

        // Set initial image
        const randomImage = ALL_MET_IMAGES[Math.floor(Math.random() * ALL_MET_IMAGES.length)];
        imageRandomizer.style.backgroundImage = `url('${randomImage}')`;

        // Change image every 2 seconds
        randomizerInterval = setInterval(() => {
            const randomImage = ALL_MET_IMAGES[Math.floor(Math.random() * ALL_MET_IMAGES.length)];
            imageRandomizer.style.backgroundImage = `url('${randomImage}')`;
        }, 2000);
    }

    function stopImageRandomizer() {
        if (randomizerInterval) {
            clearInterval(randomizerInterval);
            randomizerInterval = null;
        }
        isRandomizerActive = false;
    }

    // Handle scroll events
    function handleConclusionScroll() {
        const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;

        // Get section position dynamically
        const rect = conclusionSection.getBoundingClientRect();
        const sectionTop = scrollPosition + rect.top;
        const sectionHeight = rect.height;

        // Calculate scroll position relative to section start
        const scrollIntoSection = scrollPosition - sectionTop;

        // Define zones for each screen
        const fadeInZone = windowHeight * 0.5;
        const screenDuration = windowHeight * 1.2; // Each screen gets 2vh
        const fadeOutZone = windowHeight * 0.5;
        const finalFadeOutStart = (screens.length * (screenDuration -1 ));
        const finalFadeOutDuration = windowHeight * 1;
``
        // Check if we're in the conclusion section (use calculated final range
        // so the animation runs for the full duration even if the DOM-measured
        // section height is shorter).
        if (scrollIntoSection >= -windowHeight && scrollIntoSection < finalFadeOutStart + finalFadeOutDuration) {
            screens.forEach((screen, index) => {
                const screenStart = index * screenDuration;
                const screenEnd = screenStart + screenDuration + fadeOutZone;
                const relativeScroll = scrollIntoSection - screenStart;
                const isLastScreen = index === screens.length - 1;

                if (relativeScroll >= 0 && relativeScroll < screenEnd) {
                    screen.element.style.display = 'flex';

                    // Reset transform for non-last screens
                    if (!isLastScreen) {
                        screen.element.style.transform = 'translateY(0)';
                    }

                    // Calculate opacity
                    let opacity = 1;
                    if (relativeScroll < fadeInZone) {
                        // Fade in
                        opacity = relativeScroll / fadeInZone;
                    } else if (!isLastScreen && relativeScroll >= screenDuration) {
                        // Fade out (for non-last screens)
                        opacity = Math.max(0, 1 - (relativeScroll) / fadeOutZone);
                    } else if (isLastScreen) {
                        // Last screen: stay visible, then scroll upward
                        if (scrollIntoSection >= finalFadeOutStart) {
                            const scrollProgress = (scrollIntoSection - finalFadeOutStart) / finalFadeOutDuration;
                            const translateY = scrollProgress * windowHeight;
                            screen.element.style.transform = `translateY(-${translateY}px)`;
                        } else {
                            screen.element.style.transform = 'translateY(0)';
                        }
                    }

                    screen.textElement.style.opacity = Math.max(0, Math.min(1, opacity));

                    if (index == 0) {
                         imageRandomizer.style.opacity = Math.max(0, Math.min(1, opacity));
                    }

                    // Start/stop image randomizer for screen 1
                    if (index === 0) {
                        if (opacity > 0) {
                            startImageRandomizer();
                        } else {
                            stopImageRandomizer();
                        }
                    }
                } else if (isLastScreen && scrollIntoSection >= screenStart && scrollIntoSection < finalFadeOutStart + finalFadeOutDuration) {
                    // Keep last screen visible during final scroll up
                    screen.element.style.display = 'flex';
                    const scrollProgress = (scrollIntoSection - finalFadeOutStart) / finalFadeOutDuration;
                    const translateY = scrollProgress * windowHeight;
                    screen.element.style.transform = `translateY(-${translateY}px)`;
                    screen.textElement.style.opacity = 1;
                } else {
                    screen.element.style.display = 'none';
                    screen.element.style.transform = 'translateY(0)';
                    if (index === 0) {
                        stopImageRandomizer();
                    }
                }
            });
        } else {
            // Hide all screens when not in section
            screens.forEach((screen, index) => {
                screen.element.style.display = 'none';
                screen.element.style.transform = 'translateY(0)';
                if (index === 0) {
                    stopImageRandomizer();
                }
            });
        }
    }

    // Attach scroll listener
    window.addEventListener('scroll', handleConclusionScroll);

    // Initial call
    handleConclusionScroll();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConclusion);
} else {
    initConclusion();
}
