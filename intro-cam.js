const camera = document.querySelector('.camera');
const lensOuter = document.getElementById('lens-outer');
const lensInner = document.getElementById('lens-inner');
const introcamDesc = document.getElementById('introcam-desc');

function initIntroCam() {
  camera.style.animation = "fadeIn 2s ease-out";
}

document.addEventListener('scroll', () => {
    
    const scrollPosition = window.scrollY;

    introcamDesc.style.opacity = Math.max(1 - scrollPosition / 300, 0);

    let scale = 1 + (scrollPosition / 100); 
    let innerlensScale = 1 - (scrollPosition / 1000);

    if (scale > 3) {
        scale = 3;
    }

    camera.style.transform = `scale(${scale})`;
    lensOuter.style.transform = `scale(${1 + scrollPosition / 300})`;
    lensInner.style.transform = `scale(${(1-(Math.atan(0.005*scrollPosition)/4))})`;
});