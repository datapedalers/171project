const camera = document.querySelector('.camera');
const lensOuter = document.getElementById('lens-outer');
const lensInner = document.getElementById('lens-inner');
const introcamDesc = document.getElementById('introcam-desc');
let scrollThreshold = false;

const ANIMSTART = 4000;

function initIntroCam() {
  camera.style.animation = "fadeIn 2s ease-out";
}

function initIntro() {
    const introImage = d3.select('#intro-image');
    const overlay = d3.select('#overlay');
    const introText = d3.select('#intro-text');
    const introSection = document.getElementById('intro');
    if (!introImage.node()) return;

    // Set smooth opacity transition but remove any other transitions
    introText.style('transition', 'opacity 0.5s ease');

    // progress fill element (white bar that grows with scroll)
    const progressFill = document.getElementById('intro-progress-fill');

    let delay = 600;
    let opStep = 0.1;
    let textIndex = 0;
    let rotating = true;

    const texts = [
        'The Metropolitan Museum of Art contains thousands of photographs.',
        'These photographs span from 1839 to the 2020s.',
        'Together, they offer a vast record of what photographers chose to capture.',
        'What kinds of things appear again and again?',
    ];

    const setRandomImage = () => {
        const randomImage = ALL_MET_IMAGES[Math.floor(Math.random() * ALL_MET_IMAGES.length)];
        const img = new Image();
        img.onload = () => {
            introImage.style('background-image', `url('${randomImage}')`)
                     .style('background-size', 'cover')
                     .style('background-position', 'center');
        }
        img.src = randomImage;

        if (scrollThreshold) {
            delay = Math.max(delay * 0.9, 75);
            setTimeout(setRandomImage, delay);
        }
        
    };

    let lastRun = 0;
    const throttledSetRandomImage = () => {
        const now = Date.now();
        if (now - lastRun >= 100) {
            lastRun = now;
            setRandomImage();
        }
    };

    document.addEventListener('scroll', () => {

        throttledSetRandomImage();

        const scrollPosition = window.scrollY;
        if (scrollPosition > ANIMSTART) {
            scrollThreshold = true;
            rotating = false;
        } else {
            scrollThreshold = false;
            rotating = true;
        }

        overlay.style('opacity', Math.min(1, Math.max((scrollPosition - ANIMSTART - 500) / 1000, 0)));
        
        const textOpacity = Math.min(1, Math.max((scrollPosition - ANIMSTART - 1500) / 1000, 0));
        introText.style('opacity', textOpacity);
        
        // Update text based on scroll position
        if (scrollPosition > ANIMSTART + 1500) {
            const scrollAfterThreshold = scrollPosition - ANIMSTART - 1500;
            const newTextIndex = Math.max(0, Math.min(Math.floor(scrollAfterThreshold / 1000), texts.length - 1));
            
            textIndex = newTextIndex;
            introText.text(texts[textIndex]);
        } else {
            // Clear text when scrolled back up
            introText.text('');
        }
            
        
        introcamDesc.style.opacity = Math.max(1 - scrollPosition / 300, 0);
        introcamDesc.style.transform = `translateY(${scrollPosition / 15}px)`;
        
        if (progressFill) {
            const p = Math.max(0, Math.min(1, scrollPosition / (ANIMSTART*2)));
            progressFill.style.height = (p * 100) + '%';
        }

        let scale = 1 + (scrollPosition / 400); 

        if (scale > 9) scale = 9;

        camera.style.transform = `scale(${scale})`;
        lensOuter.style.transform = `scale(${1 + scrollPosition / 1200})`;
        lensInner.style.transform = `scale(${(1-(Math.atan(0.0005*scrollPosition)/4))})`;
    });
}


