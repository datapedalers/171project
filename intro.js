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
        'The Metropolitan Museum of Art contains more than 2000 photographs.',
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
        delay = Math.max(delay * 0.9, 75);
        setTimeout(setRandomImage, delay);
    };

    const setGradient = () => {
        opStep = Math.min(opStep * 1.02, 1);
        overlay.style('opacity', opStep);
        if (opStep < 1) {
            setTimeout(setGradient, 50);
        } else {
            rotating = false;
            introText.style('transition', 'opacity 2s').style('opacity', '1').style('cursor', 'pointer');
            introText.on('click', () => {
                textIndex = Math.min((textIndex + 1), texts.length - 1);
                introText.text(texts[textIndex]);
            });
        }
    };

    setRandomImage();
    setTimeout(setGradient, 500);
}


