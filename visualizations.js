/**
 * D3.js Visualizations
 * Contains placeholder structures for the two required visualizations
 * and the main interactive timeline visualization
 */

// ===== GLOBAL VARIABLES =====
let photographData = [];
let currentFilter = 'all';
let currentViewType = 'streamgraph';
let selectedObjects = ['person', 'building', 'tree', 'water', 'mountain'];
const MAX_OBJECTS = 5;
let showAllObjects = true; // Toggle between all objects and top 10
let selectedNationality1 = 'all'; // Nationality filter for graph 1
let selectedNationality2 = 'all'; // Nationality filter for graph 2
let availableNationalities = []; // List of all valid nationalities

// ===== DATA LOADING =====
document.addEventListener('DOMContentLoaded', function() {
    // Setup control listeners first (before data loads)
    setupControlListeners();
    
    // Load the dataset
    d3.csv('final_dataset.csv').then(data => {
        photographData = data;
        console.log('Loaded', photographData.length, 'photographs');
        
        // Populate nationality dropdown after data is loaded
        populateNationalityDropdown();
        
        initIntro();
        initVisualization1();
        initVisualization2();
        initMainVisualization();
    });
    
    // Listen for filter changes
    document.addEventListener('filterChange', function(e) {
        currentFilter = e.detail.filter;
        updateMainVisualization();
    });
});


// ===== VISUALIZATION 1: SUBJECT DISTRIBUTION TIMELINE =====

// New: Initialize visualization 1 with slider and treemap/mosaic that reflects a selected decade
function initVisualization1() {
    const svg = d3.select('#subject-timeline');
    // Larger size for better visibility and less white space
    const width = 1100;
    const height = 650; // overall svg height

    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);
    // create a root group once and reuse to allow transitions
    if (!svg.select('g.viz1-root').node()) {
        svg.append('g').attr('class', 'viz1-root');
    }

    // Default year
    const slider = document.getElementById('year-slider');
    const yearLabel = document.getElementById('year-label');
    const percentToggle = document.getElementById('percent-toggle');
    const cumulativeToggle = document.getElementById('cumulative-toggle');

    const vizHeight = 580; // drawing area height

    if (slider && yearLabel) {
        slider.min = 1840;
        slider.max = 1917; // Last year with photos
        slider.step = 1;
        slider.value = 1870;
        yearLabel.textContent = slider.value;

        const draw = () => {
            const year = +slider.value;
            const asPercent = percentToggle && percentToggle.checked;
            const cumulative = cumulativeToggle && cumulativeToggle.checked;
            yearLabel.textContent = year;
            drawSubjectTreemap(svg, width, vizHeight, year, asPercent, cumulative);
        };

        // initial draw
        draw();

        slider.addEventListener('input', draw);
        if (percentToggle) percentToggle.addEventListener('change', draw);
        if (cumulativeToggle) cumulativeToggle.addEventListener('change', draw);
    } else {
        drawSubjectTreemap(svg, width, vizHeight, 1870, false, false);
    }
}

// Helper: aggregate counts for chosen decade into display categories
function getCategoryCountsForYear(year, cumulative = false) {
    // Map of display categories to underlying dataset fields
    const categoryMap = {
        'Person': ['has_person'],
        'Animal': ['has_animal'],
        'Greenery': ['has_tree', 'has_grass', 'has_plant', 'has_field'],
        'Water': ['has_water', 'has_river', 'has_sea'],
        'Mountain': ['has_mountain', 'has_rock'],
        'Road': ['has_road', 'has_sidewalk', 'has_fence', 'has_bridge'],
        'Building': ['has_building', 'has_house', 'has_hovel'],
        'Vehicle': ['has_boat'],
        'Household Objects': ['has_chair', 'has_table', 'has_windowpane', 'has_curtain']
    };

    // Initialize counts
    const counts = {};
    Object.keys(categoryMap).forEach(k => counts[k] = 0);

    // Filter photos for the exact year or all years up to the selected year if cumulative
    const yearPhotos = photographData.filter(d => {
        const y = +d.creation_year;
        if (!y || isNaN(y)) return false;
        if (cumulative) {
            return Math.floor(y) <= Math.floor(year);
        }
        // compare integer year
        return Math.floor(y) === Math.floor(year);
    });

    // Sum occurrences
    yearPhotos.forEach(p => {
        Object.entries(categoryMap).forEach(([cat, fields]) => {
            for (const f of fields) {
                if (p[f] === '1.0') {
                    counts[cat] += 1;
                    break; // count once per photo per category
                }
            }
        });
    });

    const total = yearPhotos.length;
    // Return raw counts and the total so caller can normalize as needed
    return { counts, total };
}

// Helper: Get image IDs for a category and year
function getImagesForCategory(categoryName, year, cumulative = false) {
    // Map of display categories to underlying dataset fields
    const categoryMap = {
        'Person': ['has_person'],
        'Animal': ['has_animal'],
        'Greenery': ['has_tree', 'has_grass', 'has_plant', 'has_field'],
        'Water': ['has_water', 'has_river', 'has_sea'],
        'Mountain': ['has_mountain', 'has_rock'],
        'Road': ['has_road', 'has_sidewalk', 'has_fence', 'has_bridge'],
        'Building': ['has_building', 'has_house', 'has_hovel'],
        'Vehicle': ['has_boat'],
        'Household Objects': ['has_chair', 'has_table', 'has_windowpane', 'has_curtain']
    };

    const fields = categoryMap[categoryName] || [];
    
    // Filter photos for the year
    const yearPhotos = photographData.filter(d => {
        const y = +d.creation_year;
        if (!y || isNaN(y)) return false;
        if (cumulative) {
            return Math.floor(y) <= Math.floor(year);
        }
        return Math.floor(y) === Math.floor(year);
    });

    // Get photos that match the category
    const matchingPhotos = [];
    yearPhotos.forEach(p => {
        for (const f of fields) {
            if (p[f] === '1.0') {
                matchingPhotos.push(p.object_id);
                break; // only add once per photo
            }
        }
    });

    return matchingPhotos;
}

// Draws a treemap/mosaic for the provided year with image collages
function drawSubjectTreemap(svg, width, vizHeight, year, asPercent = false, cumulative = false) {
    // leave room on the right for legend by increasing right margin
    const margin = { top: 20, right: 180, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = vizHeight - margin.top - margin.bottom;

    // reuse a treemap group so updates can transition
    const rootG = svg.select('g.viz1-root');
    let g = rootG.select('g.treemap-group');
    if (!g.node()) {
        g = rootG.append('g').attr('class', 'treemap-group').attr('transform', `translate(${margin.left},${margin.top})`);
    } else {
        g.attr('transform', `translate(${margin.left},${margin.top})`);
    }

    // get raw counts and year total
    const dataObj = getCategoryCountsForYear(year, cumulative);
    const counts = dataObj.counts;
    const photosInYear = dataObj.total;

    // compute sum of category counts (could be > photosInYear because photos can contain multiple categories)
    const sumCounts = Object.values(counts).reduce((s, v) => s + v, 0);

    // If no photos in year, show placeholder and clear existing tiles
    if (photosInYear === 0 || sumCounts === 0) {
        // remove any existing tiles smoothly
        g.selectAll('.tile').transition().duration(150).style('opacity', 0).remove();
        // update caption
        const cap = rootG.selectAll('g.viz1-caption').data([1]);
        const capEnter = cap.enter().append('g').attr('class', 'viz1-caption');
        capEnter.merge(cap).selectAll('text').data([`No photographs in ${year}`]).join('text')
            .attr('x', 20)
            .attr('y', 16)
            .style('font-size', '13px')
            .style('fill', '#666')
            .style('font-weight', '600')
            .text(d => d);
        return;
    }

    // Build children with both raw count and value (value is used for treemap sizing)
    const children = Object.keys(counts).map(k => {
        const cnt = counts[k] || 0;
        const val = asPercent ? (sumCounts > 0 ? (cnt / sumCounts) * 100 : 0) : cnt;
        const imageIds = getImagesForCategory(k, year, cumulative);
        return { name: k, count: cnt, value: val, imageIds: imageIds };
    });

    const root = d3.hierarchy({ children: children })
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);

    d3.treemap()
        .size([innerWidth, innerHeight])
        .paddingInner(6)
        .paddingTop(6)
        (root);

    // Color mapping: group categories into broader families (fallback colors)
    const family = {
        'Person': 'animals',
        'Animal': 'animals',
        'Greenery': 'nature',
        'Water': 'nature',
        'Mountain': 'nature',
        'Road': 'infrastructure',
        'Building': 'infrastructure',
        'Vehicle': 'infrastructure',
        'Household Objects': 'object'
    };

    const familyColor = {
        'animals': '#3BA3FF',   // light blue
        'nature': '#9B7BFF',    // purple
        'infrastructure': '#FF7BB0', // pink
        'object': '#FF9A3B'     // orange
    };

    // Data join for tiles (enter/update/exit) keyed by name
    const leaves = root.leaves();
    const tiles = g.selectAll('g.tile').data(leaves, d => d.data.name);

    // EXIT
    tiles.exit().transition().duration(200).style('opacity', 0).remove();

    // ENTER
    const tilesEnter = tiles.enter()
        .append('g')
        .attr('class', 'tile')
        .attr('transform', d => `translate(${d.x0},${d.y0})`) // initial
        .style('opacity', 0);

    // Add a clipPath for each tile to contain images
    tilesEnter.append('clipPath')
        .attr('id', d => `clip-${d.data.name.replace(/\s+/g, '-')}`)
        .append('rect')
        .attr('class', 'tile-clip')
        .attr('width', 1)
        .attr('height', 1);

    // Add a group for the collage
    tilesEnter.append('g')
        .attr('class', 'tile-collage')
        .attr('clip-path', d => `url(#clip-${d.data.name.replace(/\s+/g, '-')})`);

    // Add border rectangle
    tilesEnter.append('rect')
        .attr('class', 'tile-border')
        .attr('width', 1)
        .attr('height', 1)
        .attr('fill', 'none')
        .style('stroke', '#fff')
        .style('stroke-width', 3);

    // Add semi-transparent overlay for text readability
    tilesEnter.append('rect')
        .attr('class', 'tile-overlay')
        .attr('width', 1)
        .attr('height', 1)
        .attr('fill', 'rgba(0, 0, 0, 0.4)')
        .style('pointer-events', 'none');

    tilesEnter.append('text')
        .attr('class', 'tile-name')
        .style('fill', '#fff')
        .style('font-weight', '700')
        .style('text-shadow', '2px 2px 4px rgba(0,0,0,0.8)')
        .style('pointer-events', 'none')
        .style('text-anchor', 'middle')
        .text(d => d.data.name);

    tilesEnter.append('text')
        .attr('class', 'tile-value')
        .style('fill', '#fff')
        .style('text-shadow', '2px 2px 4px rgba(0,0,0,0.8)')
        .style('pointer-events', 'none')
        .style('text-anchor', 'middle')
        .text(d => asPercent ? d.data.value.toFixed(1) + '%' : d.data.value + ' photos');

    // MERGE
    const tilesMerge = tilesEnter.merge(tiles);

    // Transition tiles to new positions/sizes
    cumulative ? tilesMerge.transition().duration(50).style('opacity', 1).attr('transform', d => `translate(${d.x0},${d.y0})`) :
                 tilesMerge.transition().duration(250).style('opacity', 1).attr('transform', d => `translate(${d.x0},${d.y0})`); 

    // Update clip paths
    tilesMerge.select('.tile-clip').transition().duration(250)
        .attr('width', d => Math.max(0, d.x1 - d.x0))
        .attr('height', d => Math.max(0, d.y1 - d.y0));

    tilesMerge.select('rect.tile-border').transition().duration(250)
        .attr('width', d => Math.max(0, d.x1 - d.x0))
        .attr('height', d => Math.max(0, d.y1 - d.y0));

    tilesMerge.select('rect.tile-overlay').transition().duration(250)
        .attr('width', d => Math.max(0, d.x1 - d.x0))
        .attr('height', d => Math.max(0, d.y1 - d.y0));

    // Update collages with images - fill all available space with better packing
    tilesMerge.each(function(d) {
        const tileWidth = d.x1 - d.x0;
        const tileHeight = d.y1 - d.y0;
        const imageIds = d.data.imageIds;
        
        if (imageIds.length === 0) return;
        
        // Calculate optimal grid that fills the space with ALL images
        const numImages = imageIds.length;
        const aspectRatio = tileWidth / tileHeight;
        
        // Start with a square-ish grid and adjust
        let cols = Math.ceil(Math.sqrt(numImages * aspectRatio));
        let rows = Math.ceil(numImages / cols);
        
        // Adjust to ensure we can fit all images
        while (cols * rows < numImages) {
            if (cols / rows < aspectRatio) {
                cols++;
            } else {
                rows++;
            }
        }
        
        const imgWidth = tileWidth / cols;
        const imgHeight = tileHeight / rows;
        
        // Create display array with better distribution across rows
        const displayData = [];
        const totalCells = cols * rows;
        const emptyCells = totalCells - numImages;
        
        if (emptyCells > 0 && emptyCells < cols) {
            // Distribute empty cells by expanding images in the last row
            const imagesInLastRow = numImages - (rows - 1) * cols;
            const extraWidthPerImage = (cols * imgWidth) / imagesInLastRow;
            
            let imageIndex = 0;
            
            // Add all rows except last
            for (let row = 0; row < rows - 1; row++) {
                for (let col = 0; col < cols; col++) {
                    if (imageIndex < numImages) {
                        displayData.push({
                            id: imageIds[imageIndex],
                            x: col * imgWidth,
                            y: row * imgHeight,
                            width: imgWidth,
                            height: imgHeight
                        });
                        imageIndex++;
                    }
                }
            }
            
            // Last row with expanded images
            for (let i = 0; i < imagesInLastRow; i++) {
                if (imageIndex < numImages) {
                    displayData.push({
                        id: imageIds[imageIndex],
                        x: i * extraWidthPerImage,
                        y: (rows - 1) * imgHeight,
                        width: extraWidthPerImage,
                        height: imgHeight
                    });
                    imageIndex++;
                }
            }
        } else {
            // Regular grid - no expansion needed
            let imageIndex = 0;
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    if (imageIndex < numImages) {
                        displayData.push({
                            id: imageIds[imageIndex],
                            x: col * imgWidth,
                            y: row * imgHeight,
                            width: imgWidth,
                            height: imgHeight
                        });
                        imageIndex++;
                    }
                }
            }
        }

        // Select collage group and bind image data
        const collageGroup = d3.select(this).select('.tile-collage');
        const images = collageGroup.selectAll('image')
            .data(displayData, d => d.id);

        // Remove old images
        images.exit().remove();

        // Add new images
        images.enter()
            .append('image')
            .attr('href', d => `images_met_resized/${d.id}.jpg`)
            .attr('preserveAspectRatio', 'xMidYMid slice')
            .merge(images)
            .attr('x', d => d.x)
            .attr('y', d => d.y)
            .attr('width', d => d.width)
            .attr('height', d => d.height)
            .style('opacity', 0.9);
    });

    // Update texts with responsive sizing and centering
    tilesMerge.select('text.tile-name')
        .text(d => d.data.name)
        .attr('x', d => (d.x1 - d.x0) / 2)
        .attr('y', d => (d.y1 - d.y0) / 2 - 8)
        .style('font-size', function(d) {
            const w = d.x1 - d.x0;
            const h = d.y1 - d.y0;
            const area = w * h;
            // Scale font size based on area
            const fontSize = Math.min(Math.sqrt(area) / 8, 20);
            return Math.max(fontSize, 10) + 'px';
        })
        .style('display', function(d) {
            const w = d.x1 - d.x0; const h = d.y1 - d.y0;
            return (w > 50 && h > 30) ? null : 'none';
        });

    tilesMerge.select('text.tile-value')
        .text(d => asPercent ? d.data.value.toFixed(1) + '%' : d.data.count + ' photos')
        .attr('x', d => (d.x1 - d.x0) / 2)
        .attr('y', d => (d.y1 - d.y0) / 2 + 10)
        .style('font-size', function(d) {
            const w = d.x1 - d.x0;
            const h = d.y1 - d.y0;
            const area = w * h;
            // Slightly smaller than the name
            const fontSize = Math.min(Math.sqrt(area) / 10, 16);
            return Math.max(fontSize, 9) + 'px';
        })
        .style('display', function(d) {
            const w = d.x1 - d.x0; const h = d.y1 - d.y0;
            return (w > 50 && h > 30) ? null : 'none';
        });

    // Tooltip: create once
    let tooltip = d3.select('body').select('#viz1-tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body').append('div')
            .attr('id', 'viz1-tooltip')
            .style('position', 'absolute')
            .style('pointer-events', 'none')
            .style('display', 'none')
            .style('background', 'rgba(0, 0, 0, 0.9)')
            .style('color', '#fff')
            .style('padding', '8px 12px')
            .style('border-radius', '4px')
            .style('font-size', '13px')
            .style('z-index', '10000');
    }

    // interaction handlers
    tilesMerge
        .style('cursor', 'pointer')
        .on('mousemove', (event, d) => {
            const raw = d.data.count;
            const normalized = sumCounts > 0 ? (d.data.count / sumCounts) * 100 : 0;
            const html = `<strong>${d.data.name}</strong><br>${raw} photos<br>${normalized.toFixed(1)}% of category appearances<br><em style="font-size:11px; opacity:0.8;">Click to view all photos</em>`;
            tooltip.html(html).style('left', (event.pageX + 12) + 'px').style('top', (event.pageY + 12) + 'px').style('display', 'block');
        })
        .on('mouseout', () => tooltip.style('display', 'none'))
        .on('click', function(event, d) {
            event.stopPropagation();
            tooltip.style('display', 'none');
            // Get the clicked element's position and center point in viewport coordinates
            const rect = this.getBoundingClientRect();
            const clickX = rect.left + rect.width / 2;
            const clickY = rect.top + rect.height / 2;
            showCategoryModal(d.data.name, d.data.imageIds, year, clickX, clickY);
        });

    // Update caption above mosaic (reuse group)
    const cap = rootG.selectAll('g.viz1-caption').data([1]);
    const capEnter = cap.enter().append('g').attr('class', 'viz1-caption');
    capEnter.merge(cap).selectAll('text').data([`Year: ${year} ${asPercent ? '(percentages)' : ''}`]).join('text')
        .attr('x', 20)
        .attr('y', 16)
        .style('font-size', '13px')
        .style('fill', '#333')
        .style('font-weight', '600')
        .text(d => d);

    // Legend removed as requested - colors are now just for visual appeal
}

// ===== MODAL FOR CATEGORY PHOTOS =====
function showCategoryModal(categoryName, imageIds, year, clickX, clickY) {
    // Remove existing modal if any
    d3.select('#category-modal').remove();
    
    // Get main content element to zoom
    const mainContent = d3.select('#main-content');
    
    // Calculate transform origin in viewport coordinates (accounts for scroll)
    const viewportX = clickX;
    const viewportY = clickY;
    
    // Calculate percentages for transform-origin
    const originX = (viewportX / window.innerWidth) * 100;
    const originY = (viewportY / window.innerHeight) * 100;
    
    // Create modal overlay - starts invisible
    const modal = d3.select('body')
        .append('div')
        .attr('id', 'category-modal')
        .style('position', 'fixed')
        .style('top', '0')
        .style('left', '0')
        .style('width', '100%')
        .style('height', '100%')
        .style('background', 'rgba(0, 0, 0, 0)')
        .style('z-index', '100000')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('overflow', 'hidden')
        .style('opacity', '0')
        .style('pointer-events', 'auto');
    
    // Direct click handler on modal background
    const modalElement = modal.node();
    modalElement.onclick = function(event) {
        // Only close if clicking directly on the modal background (not its children)
        if (event.target === modalElement) {
            closeCategoryModal();
        }
    };
    
    // Zoom the main content focused on the clicked spot with acceleration
    mainContent
        .style('transform-origin', `${originX}% ${originY}%`)
        .style('position', 'relative')
        .transition()
        .duration(1400)
        .ease(d3.easeExpIn) // Exponential easing: starts slow, accelerates dramatically
        .style('transform', 'scale(3.5)')
        .style('opacity', '0');
    
    // Fade in modal background
    modal.transition()
        .delay(700)
        .duration(700)
        .ease(d3.easeQuadOut)
        .style('opacity', '1')
        .style('background', 'rgba(0, 0, 0, 0.95)');
    
    // Create modal header
    const header = modal.append('div')
        .style('padding', '20px 40px')
        .style('background', 'rgba(0, 0, 0, 0.8)')
        .style('color', 'white')
        .style('display', 'flex')
        .style('justify-content', 'space-between')
        .style('align-items', 'center')
        .style('border-bottom', '2px solid rgba(255,255,255,0.1)');
    
    // Prevent clicks on header from closing modal
    header.node().onclick = function(event) {
        event.stopPropagation();
    };
    
    header.append('h2')
        .style('margin', '0')
        .style('font-size', '24px')
        .style('font-weight', '600')
        .text(`${categoryName} — ${year} (${imageIds.length} photos)`);
    
    // Create scrollable content area
    const content = modal.append('div')
        .style('flex', '1')
        .style('overflow-y', 'auto')
        .style('padding', '40px 20px')
        .style('display', 'flex')
        .style('justify-content', 'center');
    
    // Prevent clicks on content from closing modal
    content.node().onclick = function(event) {
        event.stopPropagation();
    };
    
    // Create centered container
    const gridContainer = content.append('div')
        .style('max-width', '1800px')
        .style('width', '100%');
    
    // Create grid of images - centered with full images
    const grid = gridContainer.append('div')
        .style('display', 'grid')
        .style('grid-template-columns', 'repeat(auto-fit, minmax(280px, 1fr))')
        .style('gap', '25px')
        .style('justify-items', 'center')
        .style('align-items', 'start');
    
    // Add each image with staggered animation
    imageIds.forEach((imageId, index) => {
        const imageCard = grid.append('div')
            .style('background', 'rgba(255,255,255,0.05)')
            .style('border-radius', '8px')
            .style('overflow', 'hidden')
            .style('cursor', 'pointer')
            .style('transition', 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s')
            .style('opacity', '0')
            .style('transform', 'translateY(20px)')
            .style('width', '100%')
            .style('display', 'flex')
            .style('flex-direction', 'column')
            .style('align-items', 'center')
            .on('click', function(event) {
                event.stopPropagation();
                showPhotoDetail(imageId);
            })
            .on('mouseover', function() {
                d3.select(this)
                    .style('transform', 'scale(1.05) translateY(0)')
                    .style('box-shadow', '0 8px 24px rgba(255,255,255,0.2)');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .style('transform', 'scale(1) translateY(0)')
                    .style('box-shadow', 'none');
            });
        
        // Animate card entrance with stagger - faster loading
        d3.select(imageCard.node())
            .transition()
            .delay(800 + index * 8) // Reduced delay for faster loading
            .duration(300)
            .ease(d3.easeCubicOut)
            .style('opacity', '1')
            .style('transform', 'translateY(0)');
        
        // Full image with original aspect ratio - not cropped, with lazy loading
        imageCard.append('img')
            .attr('src', `images_met_resized/${imageId}.jpg`)
            .attr('loading', 'lazy') // Lazy load for better performance
            .style('width', '100%')
            .style('height', 'auto')
            .style('object-fit', 'contain')
            .style('display', 'block')
            .style('max-height', '450px');
    });
}

function closeCategoryModal() {
    const modal = d3.select('#category-modal');
    const mainContent = d3.select('#main-content');
    
    // Fade out modal
    modal.transition()
        .duration(500)
        .ease(d3.easeCubicIn)
        .style('opacity', '0')
        .on('end', function() {
            modal.remove();
        });
    
    // Zoom main content back in with deceleration
    mainContent
        .transition()
        .duration(900)
        .ease(d3.easeExpOut)
        .style('transform', 'scale(1)')
        .style('opacity', '1');
}

function showPhotoDetail(imageId) {
    // Find photo data
    const photo = photographData.find(p => p.object_id === imageId);
    if (!photo) return;
    
    // Remove existing detail modal
    d3.select('#photo-detail-modal').remove();
    
    // Create detail modal with zoom animation
    const detailModal = d3.select('body')
        .append('div')
        .attr('id', 'photo-detail-modal')
        .style('position', 'fixed')
        .style('top', '0')
        .style('left', '0')
        .style('width', '100%')
        .style('height', '100%')
        .style('background', 'rgba(0, 0, 0, 0)')
        .style('z-index', '100001')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('justify-content', 'center')
        .style('padding', '40px')
        .style('opacity', '0');
    
    // Direct click handler on modal background
    const detailModalElement = detailModal.node();
    detailModalElement.onclick = function(event) {
        // Only close if clicking directly on the modal background
        if (event.target === detailModalElement) {
            closePhotoDetail();
        }
    };
    
    // Animate modal entrance
    detailModal.transition()
        .duration(400)
        .ease(d3.easeCubicOut)
        .style('opacity', '1')
        .style('background', 'rgba(0, 0, 0, 0.98)');
    
    // Create content container with zoom animation
    const container = detailModal.append('div')
        .style('max-width', '1200px')
        .style('width', '100%')
        .style('display', 'flex')
        .style('gap', '40px')
        .style('background', 'rgba(20, 20, 20, 0.95)')
        .style('border-radius', '12px')
        .style('padding', '40px')
        .style('max-height', '90vh')
        .style('overflow-y', 'auto')
        .style('transform', 'scale(0.7)')
        .style('opacity', '0');
    
    // Prevent clicks on container from closing modal
    container.node().onclick = function(event) {
        event.stopPropagation();
    };
    
    // Animate container zoom-in
    container.transition()
        .duration(500)
        .ease(d3.easeCubicOut)
        .style('transform', 'scale(1)')
        .style('opacity', '1');
    
    // Image side
    const imageContainer = container.append('div')
        .style('flex', '1')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('align-items', 'center');
    
    // Add image with zoom animation
    const detailImage = imageContainer.append('img')
        .attr('src', `images_met_resized/${imageId}.jpg`)
        .style('max-width', '100%')
        .style('max-height', '600px')
        .style('object-fit', 'contain')
        .style('border-radius', '8px')
        .style('box-shadow', '0 8px 32px rgba(0,0,0,0.5)')
        .style('transform', 'scale(0.8)')
        .style('opacity', '0');
    
    // Animate image zoom
    detailImage.transition()
        .delay(200)
        .duration(500)
        .ease(d3.easeCubicOut)
        .style('transform', 'scale(1)')
        .style('opacity', '1');
    
    // Info side
    const infoContainer = container.append('div')
        .style('flex', '0 0 350px')
        .style('color', 'white');
    
    // X button removed - click on background to close
    
    infoContainer.append('h3')
        .style('margin', '0 0 20px 0')
        .style('font-size', '20px')
        .style('border-bottom', '2px solid rgba(255,255,255,0.2)')
        .style('padding-bottom', '10px')
        .text('Photograph Details');
    
    const infoItem = (label, value) => {
        const item = infoContainer.append('div')
            .style('margin-bottom', '15px');
        item.append('div')
            .style('font-size', '12px')
            .style('color', 'rgba(255,255,255,0.6)')
            .style('margin-bottom', '4px')
            .text(label);
        item.append('div')
            .style('font-size', '16px')
            .style('font-weight', '500')
            .text(value || 'Unknown');
    };
    
    infoItem('Artist', photo.artist_name);
    infoItem('Nationality', photo.origin);
    infoItem('Creation Year', photo.creation_year);
    infoItem('Work Type', photo.work_type);
    infoItem('Works in Museum', photo.works_in_museum);
    
    // Detected objects section
    infoContainer.append('h4')
        .style('margin', '30px 0 10px 0')
        .style('font-size', '16px')
        .style('color', 'rgba(255,255,255,0.8)')
        .text('Detected Objects');
    
    const objectsList = infoContainer.append('div')
        .style('display', 'flex')
        .style('flex-wrap', 'wrap')
        .style('gap', '8px');
    
    const allObjects = ['person', 'building', 'tree', 'water', 'mountain', 'grass', 'animal', 
                        'house', 'road', 'boat', 'rock', 'sidewalk', 'fence', 'sea', 'river', 
                        'plant', 'curtain', 'windowpane', 'chair', 'field', 'table', 'hovel', 
                        'tent', 'bridge', 'bench', 'pier', 'column'];
    
    allObjects.forEach(obj => {
        const hasField = `has_${obj}`;
        if (photo[hasField] === '1.0') {
            objectsList.append('span')
                .style('background', 'rgba(255,255,255,0.15)')
                .style('padding', '6px 12px')
                .style('border-radius', '4px')
                .style('font-size', '13px')
                .text(obj.charAt(0).toUpperCase() + obj.slice(1));
        }
    });
}

function closePhotoDetail() {
    const modal = d3.select('#photo-detail-modal');
    modal.transition()
        .duration(300)
        .ease(d3.easeCubicIn)
        .style('opacity', '0')
        .on('end', function() {
            modal.remove();
        });
}

function createSubjectTimeline(svg, width, height) {
    const margin = { top: 60, right: 120, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Process data: aggregate by decade
    const subjectCategories = ['person', 'building', 'tree', 'water'];
    const decades = d3.groups(photographData, d => Math.floor(+d.creation_year / 10) * 10)
        .filter(([decade]) => decade >= 1840 && decade <= 2020)
        .sort((a, b) => a[0] - b[0]);
    
    const timelineData = decades.map(([decade, photos]) => {
        const counts = {
            decade: decade,
            total: photos.length
        };
        
        subjectCategories.forEach(subject => {
            const hasField = `has_${subject}`;
            counts[subject] = photos.filter(p => p[hasField] === '1.0').length / photos.length * 100;
        });
        
        return counts;
    });
    
    // Scales
    const xScale = d3.scaleLinear()
        .domain(d3.extent(timelineData, d => d.decade))
        .range([0, innerWidth]);
    
    const yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([innerHeight, 0]);
    
    const colorScale = d3.scaleOrdinal()
        .domain(subjectCategories)
        .range(['#a89078', '#c4a882', '#8a857f', '#6b6560']);
    
    // Axes
    const xAxis = d3.axisBottom(xScale).tickFormat(d => d);
    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(d => d + '%');
    
    g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis)
        .style('font-size', '12px');
    
    g.append('g')
        .call(yAxis)
        .style('font-size', '12px');
    
    // Line generator
    const line = d3.line()
        .x(d => xScale(d.decade))
        .y(d => d.value)
        .curve(d3.curveMonotoneX);
    
    // Draw lines for each subject
    subjectCategories.forEach(subject => {
        const lineData = timelineData.map(d => ({
            decade: d.decade,
            value: yScale(d[subject])
        }));
        
        g.append('path')
            .datum(lineData)
            .attr('fill', 'none')
            .attr('stroke', colorScale(subject))
            .attr('stroke-width', 2.5)
            .attr('d', line)
            .style('opacity', 0.8);
        
        // Add dots
        g.selectAll(`.dot-${subject}`)
            .data(timelineData)
            .enter()
            .append('circle')
            .attr('class', `dot-${subject}`)
            .attr('cx', d => xScale(d.decade))
            .attr('cy', d => yScale(d[subject]))
            .attr('r', 4)
            .attr('fill', colorScale(subject))
            .style('opacity', 0.9);
    });
    
    // Legend
    const legend = g.append('g')
        .attr('transform', `translate(${innerWidth + 10}, 0)`);
    
    subjectCategories.forEach((subject, i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 25})`);
        
        legendRow.append('rect')
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', colorScale(subject));
        
        legendRow.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .style('font-size', '12px')
            .text(subject.charAt(0).toUpperCase() + subject.slice(1));
    });
    
    // Axis labels
    g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 45)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .text('Year');
    
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -45)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .text('Percentage of Photos');
}

// ===== VISUALIZATION 2: CO-OCCURRENCE NETWORK =====
function initVisualization2() {
    const container = d3.select('#cooccurrence-network');
    const width = 900;
    const height = 500;
    
    // Clear any existing content
    container.selectAll('*').remove();
    
    // Set up SVG
    container
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('background', 'white');
    
    // Setup toggle button
    const toggleBtn = document.getElementById('toggle-detail');
    const toggleText = document.getElementById('toggle-text');
    
    if (toggleBtn && toggleText) {
        toggleBtn.onclick = function() {
            showAllObjects = !showAllObjects;
            toggleText.textContent = showAllObjects ? 'Show Top 10 Only' : 'Show All Objects';
            
            // Redraw the visualization
            container.selectAll('*').remove();
            if (photographData.length > 0) {
                createCooccurrenceNetwork(container, width, height);
            }
        };
    }
    
    if (photographData.length > 0) {
        createCooccurrenceNetwork(container, width, height);
    }
}

function createCooccurrenceNetwork(svg, width, height) {
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Define ALL object categories from the dataset
    const objects = ['person', 'building', 'tree', 'water', 'mountain', 'grass', 'animal', 'house', 
                     'road', 'boat', 'rock', 'sidewalk', 'fence', 'sea', 'column', 'river', 'plant',
                     'curtain', 'windowpane', 'chair', 'field', 'table', 'hovel', 'tent', 'bridge', 'bench', 'pier'];
    
    // Calculate frequency for each object
    const frequencies = {};
    objects.forEach(obj => {
        const hasField = `has_${obj}`;
        frequencies[obj] = photographData.filter(p => p[hasField] === '1.0').length;
    });
    
    // Calculate co-occurrence matrix
    const cooccurrence = {};
    objects.forEach(obj1 => {
        cooccurrence[obj1] = {};
        objects.forEach(obj2 => {
            if (obj1 !== obj2) {
                const hasField1 = `has_${obj1}`;
                const hasField2 = `has_${obj2}`;
                // Count photos that have both objects
                const count = photographData.filter(p => 
                    p[hasField1] === '1.0' && p[hasField2] === '1.0'
                ).length;
                cooccurrence[obj1][obj2] = count;
            }
        });
    });
    
    // Create all nodes (only include objects with frequency > 0)
    let allNodes = objects
        .filter(obj => frequencies[obj] > 0)
        .map(obj => ({
            id: obj,
            frequency: frequencies[obj],
            label: obj.charAt(0).toUpperCase() + obj.slice(1)
        }));
    
    // Filter to top 10 if needed
    let nodes = allNodes;
    if (!showAllObjects) {
        nodes = allNodes
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 10);
    }
    
    // Create set of node IDs for quick lookup
    const nodeIds = new Set(nodes.map(n => n.id));
    
    // Create links (only include pairs with co-occurrence > threshold and both nodes present)
    const links = [];
    const minCooccurrence = 5; // Minimum co-occurrence to show a link
    
    nodes.forEach(node1 => {
        nodes.forEach(node2 => {
            if (node1.id < node2.id) { // Avoid duplicates
                const cooccurCount = cooccurrence[node1.id][node2.id];
                if (cooccurCount >= minCooccurrence) {
                    links.push({
                        source: node1.id,
                        target: node2.id,
                        value: cooccurCount
                    });
                }
            }
        });
    });
    
    // Paul Tol's Bright color scheme (extended for more colors)
    const paulTolBright = [
        '#4477AA', '#EE6677', '#228833', '#CCBB44', '#66CCEE', '#AA3377', '#BBBBBB',
        '#77AADD', '#EE8866', '#EEDD88', '#FFAABB', '#99DDFF', '#44BB99', '#AAAA00',
        '#88CCAA', '#DDCC77', '#CC6677', '#AA4499', '#882255', '#6699CC', '#997700',
        '#EECC66', '#994455', '#004488', '#117733', '#999933', '#661100'
    ];
    
    // Color scale using Paul Tol's Bright scheme
    const colorScale = d3.scaleOrdinal()
        .domain(objects)
        .range(paulTolBright);
    
    // Radius scale based on frequency
    const radiusScale = d3.scaleSqrt()
        .domain([0, d3.max(nodes, d => d.frequency)])
        .range([15, 50]);
    
    // Line width scale based on co-occurrence (wider range for better distinction)
    const lineWidthScale = d3.scaleLinear()
        .domain([0, d3.max(links, d => d.value)])
        .range([0.5, 15]);
    
    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(120))
        .force('charge', d3.forceManyBody().strength(-500))
        .force('center', d3.forceCenter(innerWidth / 2, innerHeight / 2))
        .force('collision', d3.forceCollide().radius(d => radiusScale(d.frequency) + 5));
    
    // Create gradients for links (one for each link)
    // Store the source/target IDs before D3 converts them to object references
    const defs = svg.append('defs');
    
    links.forEach((link, i) => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        
        const gradient = defs.append('linearGradient')
            .attr('id', `gradient-${i}`)
            .attr('gradientUnits', 'userSpaceOnUse');
        
        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', colorScale(sourceId));
        
        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', colorScale(targetId));
    });
    
    // Create links with gradients
    const linkGroup = g.append('g').attr('class', 'links');
    
    const link = linkGroup.selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', (d, i) => `url(#gradient-${i})`)
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', d => lineWidthScale(d.value))
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            // Highlight the link
            d3.select(this)
                .attr('stroke-opacity', 1)
                .attr('stroke-width', lineWidthScale(d.value) * 1.5);
            
            // Show tooltip
            showLinkTooltip(event, d);
        })
        .on('mouseout', function(event, d) {
            // Reset link
            d3.select(this)
                .attr('stroke-opacity', 0.6)
                .attr('stroke-width', lineWidthScale(d.value));
            
            // Hide tooltip
            hideLinkTooltip();
        })
        .on('click', function(event, d) {
            // Show detailed info on click
            alert(`Co-occurrence: ${d.source.id} + ${d.target.id}\nAppear together in ${d.value} photographs`);
        });
    
    // Create nodes
    const node = g.append('g')
        .selectAll('g')
        .data(nodes)
        .enter()
        .append('g')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));
    
    // Add circles
    node.append('circle')
        .attr('r', d => radiusScale(d.frequency))
        .attr('fill', d => colorScale(d.id))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2.5)
        .style('cursor', 'pointer');
    
    // Add labels
    node.append('text')
        .text(d => d.label)
        .attr('text-anchor', 'middle')
        .attr('dy', '.35em')
        .style('font-size', d => Math.min(radiusScale(d.frequency) / 3, 14) + 'px')
        .style('font-weight', '600')
        .style('fill', '#fff')
        .style('pointer-events', 'none')
        .style('text-shadow', '0px 1px 3px rgba(0,0,0,0.3)');
    
    // Add tooltips for nodes
    node.append('title')
        .text(d => `${d.label}\nAppears in ${d.frequency} photos`);
    
    // Create custom tooltip for links
    let linkTooltip = d3.select('body').select('#link-tooltip');
    if (linkTooltip.empty()) {
        linkTooltip = d3.select('body')
            .append('div')
            .attr('id', 'link-tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.85)')
            .style('color', '#fff')
            .style('padding', '10px 14px')
            .style('border-radius', '6px')
            .style('font-size', '13px')
            .style('font-weight', '600')
            .style('pointer-events', 'none')
            .style('display', 'none')
            .style('z-index', '10000')
            .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)');
    }
    
    function showLinkTooltip(event, d) {
        const sourceLabel = d.source.id.charAt(0).toUpperCase() + d.source.id.slice(1);
        const targetLabel = d.target.id.charAt(0).toUpperCase() + d.target.id.slice(1);
        linkTooltip
            .html(`<strong>${sourceLabel} + ${targetLabel}</strong><br/>Co-occur in ${d.value} photographs`)
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY + 15) + 'px')
            .style('display', 'block');
    }
    
    function hideLinkTooltip() {
        linkTooltip.style('display', 'none');
    }
    
    // Update positions on simulation tick (also update gradient positions)
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        // Update gradient positions to match link positions
        links.forEach((linkData, i) => {
            defs.select(`#gradient-${i}`)
                .attr('x1', linkData.source.x)
                .attr('y1', linkData.source.y)
                .attr('x2', linkData.target.x)
                .attr('y2', linkData.target.y);
        });
        
        node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
    
    // Drag functions
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }
    
    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
    
    // Add legend at bottom right
    const legend = g.append('g')
        .attr('transform', `translate(${innerWidth - 180}, ${innerHeight - 45})`);
    
    legend.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .style('font-size', '13px')
        .style('font-weight', '600')
        .style('fill', '#666')
        .text('Circle size = Frequency');
    
    legend.append('text')
        .attr('x', 0)
        .attr('y', 20)
        .style('font-size', '13px')
        .style('font-weight', '600')
        .style('fill', '#666')
        .text('Line thickness = Co-occurrence');
}

// ===== CONTROL LISTENERS =====
function setupControlListeners() {
    // View type toggle
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentViewType = this.dataset.view;
            updateMainVisualization();
        });
    });
    
    // Populate object checkboxes
    populateObjectCheckboxes();
}

function populateObjectCheckboxes() {
    const container = document.getElementById('object-checkboxes');
    if (!container) return;
    
    const allObjects = ['person', 'building', 'tree', 'water', 'mountain', 'grass', 'house', 'road', 'animal', 'sea', 'river', 'plant', 'rock', 'fence', 'boat'];
    
    container.innerHTML = '';
    
    allObjects.forEach(obj => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = obj;
        checkbox.checked = selectedObjects.includes(obj);
        
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                if (selectedObjects.length < MAX_OBJECTS) {
                    selectedObjects.push(obj);
                } else {
                    this.checked = false;
                    alert(`You can only select up to ${MAX_OBJECTS} objects`);
                    return;
                }
            } else {
                selectedObjects = selectedObjects.filter(o => o !== obj);
            }
            updateMainVisualization();
        });
        
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(' ' + obj.charAt(0).toUpperCase() + obj.slice(1)));
        container.appendChild(label);
    });
}

// Parse nationality string to extract base nationalities
function parseNationality(nationalityStr) {
    if (!nationalityStr || nationalityStr === '') return [];
    
    const allNationalities = [];
    
    // First split by pipe (|) to handle multiple artists
    const artistNationalities = nationalityStr.split('|');
    
    artistNationalities.forEach(artistNat => {
        // Remove ", born {country}", ", active {country}", and any trailing " ?"
        let cleaned = artistNat
            .replace(/,\s*born\s+[^,]+/gi, '')
            .replace(/,\s*active\s+[^,]+/gi, '')
            .replace(/\s+\?$/g, '')
            .trim();
        
        // Replace "English" with "British"
        cleaned = cleaned.replace(/\bEnglish\b/gi, 'British');
        
        // Skip if empty after cleaning
        if (!cleaned) return;
        
        // Split by common delimiters: " and ", "-", ", "
        // First split by " and "
        const andParts = cleaned.split(/\s+and\s+/i);
        
        andParts.forEach(part => {
            // Then split by "-" or ", "
            const subParts = part.split(/[-,]\s*/);
            subParts.forEach(nat => {
                const trimmed = nat.trim();
                if (trimmed && trimmed !== '') {
                    allNationalities.push(trimmed);
                }
            });
        });
    });
    
    return allNationalities;
}

// Populate nationality dropdowns with nationalities that have 10+ data points
function populateNationalityDropdown() {
    const dropdown1 = document.getElementById('nationality-filter-1');
    const dropdown2 = document.getElementById('nationality-filter-2');
    
    if (!dropdown1 || !dropdown2 || photographData.length === 0) {
        console.log('Exiting early - dropdowns or data missing');
        return;
    }
    
    // Count occurrences of each nationality
    const nationalityCounts = {};
    
    photographData.forEach(photo => {
        const nationalities = parseNationality(photo.origin);
        nationalities.forEach(nat => {
            nationalityCounts[nat] = (nationalityCounts[nat] || 0) + 1;
        });
    });
        
    // Filter nationalities with 10+ occurrences and sort by count
    availableNationalities = Object.entries(nationalityCounts)
        .filter(([nat, count]) => count >= 10)
        .sort((a, b) => b[1] - a[1])
        .map(([nat, count]) => ({ name: nat, count: nationalityCounts[nat] }));
    
    
    // Populate both dropdowns
    populateDropdown(dropdown1, 1);
    populateDropdown(dropdown2, 2);
    
    // Add change listeners
    dropdown1.addEventListener('change', function() {
        selectedNationality1 = this.value;
        populateDropdown(dropdown2, 2); // Update dropdown2 to gray out selected
        updateMainVisualization();
    });
    
    dropdown2.addEventListener('change', function() {
        selectedNationality2 = this.value;
        populateDropdown(dropdown1, 1); // Update dropdown1 to gray out selected
        updateMainVisualization();
    });
}

// Helper function to populate a single dropdown
function populateDropdown(dropdown, graphNumber) {
    const otherSelected = graphNumber === 1 ? selectedNationality2 : selectedNationality1;
    const currentSelected = graphNumber === 1 ? selectedNationality1 : selectedNationality2;
    
    // Clear existing options
    dropdown.innerHTML = '';
    
    // Add "All Nationalities" option
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All Nationalities';
    allOption.selected = currentSelected === 'all';
    dropdown.appendChild(allOption);
    
    // Add nationality options
    availableNationalities.forEach(({ name, count }) => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = `${name} (${count})`;
        option.selected = currentSelected === name;
        
        // Disable if selected in other dropdown
        if (otherSelected === name) {
            option.disabled = true;
            option.style.color = '#ccc';
        }
        
        dropdown.appendChild(option);
    });
}

// Filter data by selected nationality
function getFilteredData(graphNumber) {
    const selectedNationality = graphNumber === 1 ? selectedNationality1 : selectedNationality2;
    
    if (selectedNationality === 'all') {
        return photographData;
    }
    
    return photographData.filter(photo => {
        const nationalities = parseNationality(photo.origin);
        return nationalities.includes(selectedNationality);
    });
}

// ===== MAIN VISUALIZATION: INTERACTIVE TIMELINE =====
function initMainVisualization() {
    // Create both graphs
    createGraph(1);
    createGraph(2);
}

function createGraph(graphNumber) {
    const container = d3.select(`#timeline-viz-${graphNumber}`);
    const width = 1100;
    const height = 500;
    
    // Clear any existing content
    container.selectAll('*').remove();
    
    // Set up SVG
    const svg = container
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('background', 'white');
    
    // If we have data, create the visualization
    if (photographData.length > 0) {
        if (currentViewType === 'streamgraph') {
            createStreamgraph(svg, width, height, graphNumber);
        } else if (currentViewType === 'line') {
            createLineGraph(svg, width, height, graphNumber);
        } else if (currentViewType === 'percentage-stream') {
            createStreamgraphPercentage(svg, width, height, graphNumber);
        } else if (currentViewType === 'percentage-line') {
            createLineGraphPercentage(svg, width, height, graphNumber);
        }
    } else {
        // Placeholder
        createPlaceholderMainViz(svg, width, height);
    }
}

function createStreamgraph(svg, width, height, graphNumber) {
    const margin = { top: 40, right: 150, bottom: 60, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Get filtered data
    const filteredData = getFilteredData(graphNumber);
    
    // Process data by decade
    const decades = d3.groups(filteredData, d => Math.floor(+d.creation_year / 10) * 10)
        .filter(([decade]) => decade >= 1840 && decade <= 2020)
        .sort((a, b) => a[0] - b[0]);
    
    const timelineData = decades.map(([decade, photos]) => {
        const result = { decade: decade };
        
        selectedObjects.forEach(subject => {
            const hasField = `has_${subject}`;
            result[subject] = photos.filter(p => p[hasField] === '1.0').length;
        });
        
        return result;
    });
    
    // Scales
    const xScale = d3.scaleLinear()
        .domain(d3.extent(timelineData, d => d.decade))
        .range([0, innerWidth]);
    
    // Stack data for streamgraph
    const stack = d3.stack()
        .keys(selectedObjects)
        .order(d3.stackOrderInsideOut)
        .offset(d3.stackOffsetWiggle);
    
    const series = stack(timelineData);
    
    const yScale = d3.scaleLinear()
        .domain([d3.min(series, s => d3.min(s, d => d[0])), d3.max(series, s => d3.max(s, d => d[1]))])
        .range([innerHeight, 0]);
    
    const colorScale = d3.scaleOrdinal()
        .domain(selectedObjects)
        .range(d3.schemeCategory10);
    
    // Area generator
    const area = d3.area()
        .x(d => xScale(d.data.decade))
        .y0(d => yScale(d[0]))
        .y1(d => yScale(d[1]))
        .curve(d3.curveBasis);
    
    // Create tooltip
    const tooltip = d3.select('body').selectAll(`.tooltip-graph-${graphNumber}`).data([null]);
    const tooltipEnter = tooltip.enter().append('div')
        .attr('class', `tooltip-graph-${graphNumber} viz-tooltip`)
        .style('position', 'absolute')
        .style('background', 'rgba(0, 0, 0, 0.85)')
        .style('color', '#fff')
        .style('padding', '10px 12px')
        .style('border-radius', '6px')
        .style('font-size', '13px')
        .style('pointer-events', 'none')
        .style('display', 'none')
        .style('z-index', '10000')
        .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)');
    const tooltipDiv = tooltipEnter.merge(tooltip);
    
    // Draw streams
    g.selectAll('.stream')
        .data(series)
        .enter()
        .append('path')
        .attr('class', 'stream')
        .attr('d', area)
        .attr('fill', d => colorScale(d.key))
        .style('opacity', 0.8)
        .on('mousemove', function(event, d) {
            d3.select(this).style('opacity', 1).style('stroke', '#333').style('stroke-width', 2);
            
            // Find closest decade to mouse position
            const [mouseX] = d3.pointer(event, g.node());
            const decade = Math.round(xScale.invert(mouseX) / 10) * 10;
            const dataPoint = timelineData.find(dp => dp.decade === decade);
            
            if (dataPoint) {
                const count = dataPoint[d.key] || 0;
                const objectName = d.key.charAt(0).toUpperCase() + d.key.slice(1);
                
                tooltipDiv
                    .html(`<strong>${objectName}</strong><br/>Year: ${decade}<br/>Count: ${count}`)
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY + 15) + 'px')
                    .style('display', 'block');
            }
        })
        .on('mouseout', function() {
            d3.select(this).style('opacity', 0.8).style('stroke', 'none');
            tooltipDiv.style('display', 'none');
        });
    
    // Axes
    g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format('d')))
        .style('font-size', '12px');
    
    // Legend
    const legend = g.append('g')
        .attr('transform', `translate(${innerWidth + 20}, 0)`);
    
    selectedObjects.forEach((subject, i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 25})`);
        
        legendRow.append('rect')
            .attr('width', 18)
            .attr('height', 18)
            .attr('fill', colorScale(subject))
            .style('opacity', 0.8);
        
        legendRow.append('text')
            .attr('x', 25)
            .attr('y', 14)
            .style('font-size', '12px')
            .text(subject.charAt(0).toUpperCase() + subject.slice(1));
    });
    
    // Axis labels
    g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 45)
        .attr('text-anchor', 'middle')
        .style('font-size', '13px')
        .style('font-weight', 'bold')
        .text('Year');
}

function createLineGraph(svg, width, height, graphNumber) {
    const margin = { top: 40, right: 150, bottom: 60, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Get filtered data
    const filteredData = getFilteredData(graphNumber);
    
    // Process data by decade
    const decades = d3.groups(filteredData, d => Math.floor(+d.creation_year / 10) * 10)
        .filter(([decade]) => decade >= 1840 && decade <= 2020)
        .sort((a, b) => a[0] - b[0]);
    
    const timelineData = decades.map(([decade, photos]) => {
        const result = { decade: decade };
        
        selectedObjects.forEach(subject => {
            const hasField = `has_${subject}`;
            result[subject] = photos.filter(p => p[hasField] === '1.0').length;
        });
        
        return result;
    });
    
    // Scales
    const xScale = d3.scaleLinear()
        .domain(d3.extent(timelineData, d => d.decade))
        .range([0, innerWidth]);
    
    const maxCount = d3.max(timelineData, d => d3.max(selectedObjects.map(obj => d[obj])));
    const yScale = d3.scaleLinear()
        .domain([0, maxCount])
        .range([innerHeight, 0]);
    
    const colorScale = d3.scaleOrdinal()
        .domain(selectedObjects)
        .range(d3.schemeCategory10);
    
    // Create tooltip
    const tooltip = d3.select('body').selectAll(`.tooltip-line-graph-${graphNumber}`).data([null]);
    const tooltipEnter = tooltip.enter().append('div')
        .attr('class', `tooltip-line-graph-${graphNumber} viz-tooltip`)
        .style('position', 'absolute')
        .style('background', 'rgba(0, 0, 0, 0.85)')
        .style('color', '#fff')
        .style('padding', '10px 12px')
        .style('border-radius', '6px')
        .style('font-size', '13px')
        .style('pointer-events', 'none')
        .style('display', 'none')
        .style('z-index', '10000')
        .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)');
    const tooltipDiv = tooltipEnter.merge(tooltip);
    
    // Line generator
    const line = d3.line()
        .x(d => xScale(d.decade))
        .y(d => d.value)
        .curve(d3.curveMonotoneX);
    
    // Draw lines for each object
    selectedObjects.forEach(subject => {
        const lineData = timelineData.map(d => ({
            decade: d.decade,
            value: yScale(d[subject])
        }));
        
        g.append('path')
            .datum(lineData)
            .attr('fill', 'none')
            .attr('stroke', colorScale(subject))
            .attr('stroke-width', 3)
            .attr('d', line)
            .style('opacity', 0.8);
        
        // Add dots
        g.selectAll(`.dot-${subject}`)
            .data(timelineData)
            .enter()
            .append('circle')
            .attr('class', `dot-${subject}`)
            .attr('cx', d => xScale(d.decade))
            .attr('cy', d => yScale(d[subject]))
            .attr('r', 5)
            .attr('fill', colorScale(subject))
            .style('opacity', 0.9)
            .on('mouseover', function(event, d) {
                d3.select(this).attr('r', 7);
                
                const count = d[subject] || 0;
                const objectName = subject.charAt(0).toUpperCase() + subject.slice(1);
                
                tooltipDiv
                    .html(`<strong>${objectName}</strong><br/>Year: ${d.decade}<br/>Count: ${count}`)
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY + 15) + 'px')
                    .style('display', 'block');
            })
            .on('mouseout', function() {
                d3.select(this).attr('r', 5);
                tooltipDiv.style('display', 'none');
            });
    });
    
    // Axes
    g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format('d')))
        .style('font-size', '12px');
    
    g.append('g')
        .call(d3.axisLeft(yScale))
        .style('font-size', '12px');
    
    // Legend
    const legend = g.append('g')
        .attr('transform', `translate(${innerWidth + 20}, 0)`);
    
    selectedObjects.forEach((subject, i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 25})`);
        
        legendRow.append('line')
            .attr('x1', 0)
            .attr('y1', 9)
            .attr('x2', 20)
            .attr('y2', 9)
            .attr('stroke', colorScale(subject))
            .attr('stroke-width', 3);
        
        legendRow.append('text')
            .attr('x', 25)
            .attr('y', 14)
            .style('font-size', '12px')
            .text(subject.charAt(0).toUpperCase() + subject.slice(1));
    });
    
    // Axis labels
    g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 45)
        .attr('text-anchor', 'middle')
        .style('font-size', '13px')
        .style('font-weight', 'bold')
        .text('Year');
    
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -50)
        .attr('text-anchor', 'middle')
        .style('font-size', '13px')
        .style('font-weight', 'bold')
        .text('# of Works');
}

function createStreamgraphPercentage(svg, width, height, graphNumber) {
    const margin = { top: 40, right: 150, bottom: 60, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Get filtered data
    const filteredData = getFilteredData(graphNumber);
    
    // Process data by decade
    const decades = d3.groups(filteredData, d => Math.floor(+d.creation_year / 10) * 10)
        .filter(([decade]) => decade >= 1840 && decade <= 2020)
        .sort((a, b) => a[0] - b[0]);
    
    const timelineData = decades.map(([decade, photos]) => {
        const result = { decade: decade };
        const total = photos.length;
        
        selectedObjects.forEach(subject => {
            const hasField = `has_${subject}`;
            const count = photos.filter(p => p[hasField] === '1.0').length;
            result[subject] = (count / total) * 100; // Convert to percentage
        });
        
        return result;
    });
    
    // Scales
    const xScale = d3.scaleLinear()
        .domain(d3.extent(timelineData, d => d.decade))
        .range([0, innerWidth]);
    
    // Stack data for streamgraph (using wiggle offset for centered flow)
    const stack = d3.stack()
        .keys(selectedObjects)
        .order(d3.stackOrderInsideOut)
        .offset(d3.stackOffsetWiggle);
    
    const series = stack(timelineData);
    
    const yScale = d3.scaleLinear()
        .domain([d3.min(series, s => d3.min(s, d => d[0])), d3.max(series, s => d3.max(s, d => d[1]))])
        .range([innerHeight, 0]);
    
    const colorScale = d3.scaleOrdinal()
        .domain(selectedObjects)
        .range(d3.schemeCategory10);
    
    // Create tooltip
    const tooltip = d3.select('body').selectAll(`.tooltip-pct-stream-${graphNumber}`).data([null]);
    const tooltipEnter = tooltip.enter().append('div')
        .attr('class', `tooltip-pct-stream-${graphNumber} viz-tooltip`)
        .style('position', 'absolute')
        .style('background', 'rgba(0, 0, 0, 0.85)')
        .style('color', '#fff')
        .style('padding', '10px 12px')
        .style('border-radius', '6px')
        .style('font-size', '13px')
        .style('pointer-events', 'none')
        .style('display', 'none')
        .style('z-index', '10000')
        .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)');
    const tooltipDiv = tooltipEnter.merge(tooltip);
    
    // Area generator
    const area = d3.area()
        .x(d => xScale(d.data.decade))
        .y0(d => yScale(d[0]))
        .y1(d => yScale(d[1]))
        .curve(d3.curveBasis);
    
    // Draw streamgraph
    g.selectAll('.stream')
        .data(series)
        .enter()
        .append('path')
        .attr('class', 'stream')
        .attr('d', area)
        .attr('fill', d => colorScale(d.key))
        .style('opacity', 0.8)
        .on('mousemove', function(event, d) {
            d3.select(this).style('opacity', 1).style('stroke', '#333').style('stroke-width', 2);
            
            // Find closest decade to mouse position
            const [mouseX] = d3.pointer(event, g.node());
            const decade = Math.round(xScale.invert(mouseX) / 10) * 10;
            const dataPoint = timelineData.find(dp => dp.decade === decade);
            
            if (dataPoint) {
                const percentage = dataPoint[d.key] || 0;
                const objectName = d.key.charAt(0).toUpperCase() + d.key.slice(1);
                
                tooltipDiv
                    .html(`<strong>${objectName}</strong><br/>Year: ${decade}<br/>Percentage: ${percentage.toFixed(1)}%`)
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY + 15) + 'px')
                    .style('display', 'block');
            }
        })
        .on('mouseout', function() {
            d3.select(this).style('opacity', 0.8).style('stroke', 'none');
            tooltipDiv.style('display', 'none');
        });
    
    // Axes (only x-axis for streamgraph)
    g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format('d')))
        .style('font-size', '12px');
    
    // Legend
    const legend = g.append('g')
        .attr('transform', `translate(${innerWidth + 20}, 0)`);
    
    selectedObjects.forEach((subject, i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 25})`);
        
        legendRow.append('rect')
            .attr('width', 18)
            .attr('height', 18)
            .attr('fill', colorScale(subject))
            .style('opacity', 0.8);
        
        legendRow.append('text')
            .attr('x', 25)
            .attr('y', 14)
            .style('font-size', '12px')
            .text(subject.charAt(0).toUpperCase() + subject.slice(1));
    });
    
    // Axis labels
    g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 45)
        .attr('text-anchor', 'middle')
        .style('font-size', '13px')
        .style('font-weight', 'bold')
        .text('Year');
}

function createLineGraphPercentage(svg, width, height, graphNumber) {
    const margin = { top: 40, right: 150, bottom: 60, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Get filtered data
    const filteredData = getFilteredData(graphNumber);
    
    // Process data by decade
    const decades = d3.groups(filteredData, d => Math.floor(+d.creation_year / 10) * 10)
        .filter(([decade]) => decade >= 1840 && decade <= 2020)
        .sort((a, b) => a[0] - b[0]);
    
    const timelineData = decades.map(([decade, photos]) => {
        const result = { decade: decade };
        const total = photos.length;
        
        selectedObjects.forEach(subject => {
            const hasField = `has_${subject}`;
            const count = photos.filter(p => p[hasField] === '1.0').length;
            result[subject] = (count / total) * 100; // Convert to percentage
        });
        
        return result;
    });
    
    // Scales
    const xScale = d3.scaleLinear()
        .domain(d3.extent(timelineData, d => d.decade))
        .range([0, innerWidth]);
    
    const yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([innerHeight, 0]);
    
    const colorScale = d3.scaleOrdinal()
        .domain(selectedObjects)
        .range(d3.schemeCategory10);
    
    // Create tooltip
    const tooltip = d3.select('body').selectAll(`.tooltip-pct-line-${graphNumber}`).data([null]);
    const tooltipEnter = tooltip.enter().append('div')
        .attr('class', `tooltip-pct-line-${graphNumber} viz-tooltip`)
        .style('position', 'absolute')
        .style('background', 'rgba(0, 0, 0, 0.85)')
        .style('color', '#fff')
        .style('padding', '10px 12px')
        .style('border-radius', '6px')
        .style('font-size', '13px')
        .style('pointer-events', 'none')
        .style('display', 'none')
        .style('z-index', '10000')
        .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)');
    const tooltipDiv = tooltipEnter.merge(tooltip);
    
    // Line generator
    const line = d3.line()
        .x(d => xScale(d.decade))
        .y(d => d.value)
        .curve(d3.curveMonotoneX);
    
    // Draw lines for each object
    selectedObjects.forEach(subject => {
        const lineData = timelineData.map(d => ({
            decade: d.decade,
            value: yScale(d[subject])
        }));
        
        g.append('path')
            .datum(lineData)
            .attr('fill', 'none')
            .attr('stroke', colorScale(subject))
            .attr('stroke-width', 3)
            .attr('d', line)
            .style('opacity', 0.8);
        
        // Add dots
        g.selectAll(`.dot-${subject}`)
            .data(timelineData)
            .enter()
            .append('circle')
            .attr('class', `dot-${subject}`)
            .attr('cx', d => xScale(d.decade))
            .attr('cy', d => yScale(d[subject]))
            .attr('r', 5)
            .attr('fill', colorScale(subject))
            .style('opacity', 0.9)
            .on('mouseover', function(event, d) {
                d3.select(this).attr('r', 7);
                
                const percentage = d[subject] || 0;
                const objectName = subject.charAt(0).toUpperCase() + subject.slice(1);
                
                tooltipDiv
                    .html(`<strong>${objectName}</strong><br/>Year: ${d.decade}<br/>Percentage: ${percentage.toFixed(1)}%`)
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY + 15) + 'px')
                    .style('display', 'block');
            })
            .on('mouseout', function() {
                d3.select(this).attr('r', 5);
                tooltipDiv.style('display', 'none');
            });
    });
    
    // Axes
    g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format('d')))
        .style('font-size', '12px');
    
    g.append('g')
        .call(d3.axisLeft(yScale).tickFormat(d => d + '%'))
        .style('font-size', '12px');
    
    // Legend
    const legend = g.append('g')
        .attr('transform', `translate(${innerWidth + 20}, 0)`);
    
    selectedObjects.forEach((subject, i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 25})`);
        
        legendRow.append('line')
            .attr('x1', 0)
            .attr('y1', 9)
            .attr('x2', 20)
            .attr('y2', 9)
            .attr('stroke', colorScale(subject))
            .attr('stroke-width', 3);
        
        legendRow.append('text')
            .attr('x', 25)
            .attr('y', 14)
            .style('font-size', '12px')
            .text(subject.charAt(0).toUpperCase() + subject.slice(1));
    });
    
    // Axis labels
    g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 45)
        .attr('text-anchor', 'middle')
        .style('font-size', '13px')
        .style('font-weight', 'bold')
        .text('Year');
    
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -50)
        .attr('text-anchor', 'middle')
        .style('font-size', '13px')
        .style('font-weight', 'bold')
        .text('Percentage of Works');
}

function createPlaceholderMainViz(svg, width, height) {
    const margin = { top: 60, right: 60, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Create placeholder timeline with stacked bars
    const decades = d3.range(1850, 2020, 20);
    const barWidth = innerWidth / decades.length - 10;
    const colors = ['#a89078', '#c4a882', '#8a857f', '#6b6560'];
    
    decades.forEach((decade, i) => {
        const x = i * (innerWidth / decades.length);
        let currentY = innerHeight;
        
        colors.forEach(color => {
            const barHeight = Math.random() * 80 + 20;
            currentY -= barHeight;
            
            g.append('rect')
                .attr('x', x)
                .attr('y', currentY)
                .attr('width', barWidth)
                .attr('height', barHeight)
                .attr('fill', color)
                .style('opacity', 0.6);
        });
        
        if (i % 2 === 0) {
            g.append('text')
                .attr('x', x + barWidth / 2)
                .attr('y', innerHeight + 20)
                .attr('text-anchor', 'middle')
                .style('font-size', '11px')
                .text(decade);
        }
    });
    
    // Axes
    g.append('line')
        .attr('x1', 0)
        .attr('y1', innerHeight)
        .attr('x2', innerWidth)
        .attr('y2', innerHeight)
        .attr('stroke', '#ccc')
        .attr('stroke-width', 2);
    
    g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#ccc')
        .attr('stroke-width', 2);
}

function updateMainVisualization() {
    // Re-render main visualization with current filter
    console.log('Updating main visualization with filter:', currentFilter);
    initMainVisualization();
}

// ===== EXPORT FOR DEBUGGING =====
window.visualizations = {
    photographData,
    initVisualization1,
    initVisualization2,
    initMainVisualization,
    updateMainVisualization
};
