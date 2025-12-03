// Transition and insight text configurations
const transitions = {
    // Insight 1: After Database Explorer
    'insight-1': {
        element: document.getElementById('insight-text-1'),
        container: document.getElementById('insight-text-1')?.closest('.transition-text-container'),
        texts: [
            'Given the majority of images are from 1840-1870, you might have expected photographs of industrial progress: factories, machines, railroads.',
            'But that\'s not what dominates this archive.',
            'What kinds of things appear again and again?',
        ]
    },
    // Transition 1 (not sure where this should go)
    1: {
        element: document.getElementById('transition-text-1'),
        container: document.getElementById('transition-text-1')?.closest('.transition-text-container'),
        texts: [
            'From 1840-1920, CO₂ levels rose from 280 to 305 ppm—the first uptick after 10,000 years of stability.',
            'Human population doubled. Coal consumption increased 20-fold. Earth lost 15% of its forests.',
            'History books call this "progress." But photographers were creating a different kind of record.',
        ]
    },
    // Insight 2
    'insight-2': {
        element: document.getElementById('insight-text-2'),
        container: document.getElementById('insight-text-2')?.closest('.transition-text-container'),
        texts: [
            'Even as industrialization accelerated, photographers didn\'t primarily document machines. They documented place.',
            'Greenery appears in over 37% of all gphotographs. Water in 13%. Mountains in 20%. Buildings almost always appear WITH natural elements, not alone.',
            'As these elements disappeared from daily life during industrialization, their presence in photographs INCREASED.',
            'We photograph what we\'re afraid of losing. Photographers in the 1800s couldn\'t articulate climate science—but their cameras knew.'
        ]
    },
    // Transition 2
    2: {
        element: document.getElementById('transition-text-2'),
        container: document.getElementById('transition-text-2')?.closest('.transition-text-container'),
        texts: [
            'But these photos aren\'t just random snapshots. There\'s a deeper pattern.',
            'Photographers didn\'t capture "tree" or "building" or "water" as separate subjects.',
            'They photographed relationships. Ecosystems—though they didn\'t have that word yet. Let\'s look at the interconnectedness of the elements.',
        ]
    },
    // Insight 3: After Co-occurrence
    'insight-3': {
        element: document.getElementById('insight-text-3'),
        container: document.getElementById('insight-text-3')?.closest('.transition-text-container'),
        texts: [
            'Tree + Water appear together in 1,847 photographs. Building + Tree: 2,103 photographs. These aren\'t just aesthetic choices.',
            'They\'re documentation of functional relationships. Trees need water. Buildings exist within landscapes. Everything is connected.',
            'Today we use this same analysis—tracking which elements appear together—to monitor ecosystem health from satellites.',
            'These 19th-century photographers intuited what we now prove with data: we exist in relation to our environment, not apart from it.',
            'So far, we\'ve seen WHAT was photographed and HOW elements connect. Now for the deeper question: WHO? Was this pattern universal, or did different cultures see the world differently?'
        ]
    },
    // Insight 4: After Timeline
    'insight-4': {
        element: document.getElementById('insight-text-4'),
        container: document.getElementById('insight-text-4')?.closest('.transition-text-container'),
        texts: [
            'Despite cultural differences, the universal pattern holds: across ALL nationalities, environmental elements dominate (63% of photographs).',
            'British photographers emphasized trees as their countryside emptied. Americans documented wilderness as their frontier closed.',
            'Every culture, when given the tool to preserve memory, chose to preserve the environment.',
            'Environmental consciousness isn\'t a modern invention. It\'s not Western or Eastern. It\'s human. We\'ve always valued nature.',
            'The question isn\'t whether humans value nature. These photographs prove we always have. The question is: why did we stop acting like it?'
        ]
    }
};

function initTransitions() {
    // Get all transition and insight sections
    const transitionData = [];
    
    // Add insight sections
    ['insight-1', 'insight-2', 'insight-3', 'insight-4'].forEach(id => {
        const section = document.getElementById(id);
        if (section && transitions[id]?.element) {
            transitionData.push({
                id: id,
                section: section
            });
        }
    });
    
    // Add regular transition sections
    for (let i = 1; i <= 3; i++) {
        const section = document.getElementById(`transition-${i}`);
        if (section && transitions[i]?.element) {
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
