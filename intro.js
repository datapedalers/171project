const camera = document.querySelector('.camera');
const lensOuter = document.getElementById('lens-outer');
const lensInner = document.getElementById('lens-inner');
const introcamDesc = document.getElementById('introcam-desc');
let scrollThreshold = false;

function initIntroCam() {
  camera.style.animation = "fadeIn 2s ease-out";
}

function initIntro() {
    const introImage = d3.select('#intro-image');
    const overlay = d3.select('#overlay');
    const introText = d3.select('#intro-text');
    if (!introImage.node()) return;

    let delay = 600;
    let opStep = 0.1;
    let textIndex = 0;
    let rotating = true;

    const texts = [
        'The Metropolitan Museum of Art contains thousands of photographs.',
        'These photographs span from 1839 to the 2020s.',
        'Each photograph tells a story about our evolving identity.',
        'What do these images reveal about how we see ourselves?'
    ];

    const setRandomImage = () => {
        if (!rotating) return;
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
        if (now - lastRun >= 120) {
            lastRun = now;
            setRandomImage();
        }
    };

    const setGradient = () => {
        // Trigger overlay fade-in animation by adding CSS class
        overlay.classed('fade-out', false);
        overlay.classed('fade-in', true);
        
        setTimeout(function () {
            rotating = false;
            introText.style('transition', 'opacity 2s').style('opacity', '1');
        }, 2000);
    };

    
    document.addEventListener('scroll', () => {

        throttledSetRandomImage();

        const scrollPosition = window.scrollY;
        if (scrollPosition > 12000) {
            scrollThreshold = true;
            setTimeout(setGradient, 1000);
            
            // Calculate text index based on scroll position with adjusted transitions
            // Text 1->2: 800px, Text 2->3: 200px, Text 3->4: 300px
            const scrollAfterThreshold = scrollPosition - 12000;
            let newTextIndex;
            
            if (scrollAfterThreshold < 800) {
                newTextIndex = 0;
            } else if (scrollAfterThreshold < 1000) {  // 800 + 200
                newTextIndex = 1;
            } else if (scrollAfterThreshold < 1300) {  // 800 + 200 + 300
                newTextIndex = 2;
            } else {
                newTextIndex = 3;
            }
            
            if (newTextIndex !== textIndex && !rotating) {
                textIndex = newTextIndex;
                introText.text(texts[textIndex])
                         .style('transition', 'font-size 0.3s ease-out');
            }
            
            // Smooth font size animation based on scroll position within each text segment
            let fontSize;
            if (newTextIndex === 0) {
                const progress = Math.min(scrollAfterThreshold / 800, 1);
                fontSize = 0.02 + (progress * 1.48); // grows from 0.02rem to 1.5rem
            } else if (newTextIndex === 1) {
                const progress = Math.min((scrollAfterThreshold - 800) / 200, 1);
                fontSize = 0.02 + (progress * 1.48);
            } else if (newTextIndex === 2) {
                const progress = Math.min((scrollAfterThreshold - 1000) / 300, 1);
                fontSize = 0.02 + (progress * 1.48);
            } else {
                const progress = Math.min((scrollAfterThreshold - 1300) / 300, 1);
                fontSize = 0.02 + (progress * 1.48);
            }
            
            introText.style('font-size', `${fontSize}rem`);
        } else {
            overlay.classed('fade-in', false);
        
            overlay.classed('fade-out', true);
        }

        introcamDesc.style.opacity = Math.max(1 - scrollPosition / 300, 0);

        let scale = 1 + (scrollPosition / 400); 

        if (scale > 9) scale = 9;

        camera.style.transform = `scale(${scale})`;
        lensOuter.style.transform = `scale(${1 + scrollPosition / 1200})`;
        lensInner.style.transform = `scale(${(1-(Math.atan(0.0005*scrollPosition)/4))})`;
    });
}


