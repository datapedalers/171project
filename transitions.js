// Transition text configurations
const transitions = {
    1: {
        element: document.getElementById('transition-text-1'),
        container: document.getElementById('transition-text-1')?.closest('.transition-text-container'),
        texts: [
            'You\'ve seen some individual photographs and explored some objects.',
            'Now we\'re ready to take a step back, and see what patterns emerge over time.',
            'Notice what types of objects appear the most.'
        ]
    },
    2: {
        element: document.getElementById('transition-text-2'),
        container: document.getElementById('transition-text-2')?.closest('.transition-text-container'),
        texts: [
            'Unsurprisingly, people appear frequently in photographs.',
            'Perhaps more surprisingly, so does the environment -- greenery, buildings, roads.',
            'But photographs are more than isolated objects. Let\'s take a second and explore what tends to appear together.',
        ]
    },
    3: {
        element: document.getElementById('transition-text-3'),
        container: document.getElementById('transition-text-3')?.closest('.transition-text-container'),
        texts: [
            'Up to now, we\'ve explored what was captured and how. We\'ve found that a lot of it is about the space of our everyday surroundings.',
            'Now we turn to a deeper question: who?',
            'Different places and periods have different ways of seeing the world. Let\'s compare!',
        ]
    }
};

function initTransitions() {
    // Get all transition sections and their positions
    const transitionData = [];
    
    for (let i = 1; i <= 3; i++) {
        const section = document.getElementById(`transition-${i}`);
        if (section && transitions[i].element) {
            transitionData.push({
                id: i,
                section: section
            });
        }
    }
    
    // Handle scroll events
    function handleTransitionScroll() {
        const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        
        transitionData.forEach(data => {
            const { id, section } = data;
            const config = transitions[id];
            
            // Get section position dynamically
            const rect = section.getBoundingClientRect();
            const sectionTop = scrollPosition + rect.top;
            const sectionHeight = rect.height;
            
            // Calculate scroll position relative to section start
            const scrollIntoSection = scrollPosition - sectionTop;
            
            // Define zones (each text gets 1vh of scroll space)
            const fadeInZone = windowHeight * 0.5; // Fade in during first 0.5vh
            const textChangeZone = windowHeight * 1; // 1vh per text change
            const totalTextZone = textChangeZone * config.texts.length;
            const fadeOutStart = totalTextZone;
            const fadeOutZone = windowHeight * 0.5;
            
            // Check if we're in the transition section
            if (scrollIntoSection >= -windowHeight && scrollIntoSection < sectionHeight) {
                // Show/hide the container
                if (scrollIntoSection >= 0 && scrollIntoSection < fadeOutStart + fadeOutZone) {
                    config.container.style.display = 'flex';
                    
                    // Calculate opacity
                    let opacity = 1;
                    if (scrollIntoSection < fadeInZone) {
                        // Fade in
                        opacity = scrollIntoSection / fadeInZone;
                    } else if (scrollIntoSection >= fadeOutStart) {
                        // Fade out
                        opacity = Math.max(0, 1 - (scrollIntoSection - fadeOutStart) / fadeOutZone);
                    }
                    
                    config.element.style.opacity = Math.max(0, Math.min(1, opacity));
                    
                    // Calculate which text to show
                    const textProgress = Math.max(0, scrollIntoSection - fadeInZone);
                    const textIndex = Math.min(
                        config.texts.length - 1,
                        Math.floor(textProgress / textChangeZone)
                    );
                    
                    config.element.textContent = config.texts[textIndex];
                } else {
                    config.container.style.display = 'none';
                }
            } else {
                config.container.style.display = 'none';
            }
        });
    }
    
    // Attach scroll listener
    window.addEventListener('scroll', handleTransitionScroll);
    window.addEventListener('resize', handleTransitionScroll);
    
    // Initial call
    handleTransitionScroll();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTransitions);
} else {
    initTransitions();
}
