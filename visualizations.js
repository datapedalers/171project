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

// ===== DATA LOADING =====
document.addEventListener('DOMContentLoaded', function() {
    // Load the dataset
    d3.csv('final_dataset.csv').then(data => {
        photographData = data;
        console.log('Loaded', photographData.length, 'photographs');
        
        // Initialize visualizations
        initVisualization1();
        initVisualization2();
        initMainVisualization();
    }).catch(error => {
        console.error('Error loading data:', error);
        // Continue with placeholder visualizations even if data fails to load
        initVisualization1();
        initVisualization2();
        initMainVisualization();
    });
    
    // Listen for filter changes
    document.addEventListener('filterChange', function(e) {
        currentFilter = e.detail.filter;
        updateMainVisualization();
    });
    
    // Setup control listeners
    setupControlListeners();
});

// ===== VISUALIZATION 1: SUBJECT DISTRIBUTION TIMELINE =====
function initVisualization1() {
    const container = d3.select('#subject-timeline');
    const width = 900;
    const height = 400;
    
    // Clear any existing content
    container.selectAll('*').remove();
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

// ===== VISUALIZATION 2: ARTIST DEMOGRAPHICS & SUBJECT PREFERENCES =====
function initVisualization2() {
    const container = d3.select('#artist-patterns');
    const width = 900;
    const height = 400;
    
    // Clear any existing content
    container.selectAll('*').remove();
}

function createArtistPatterns(svg, width, height) {
    const margin = { top: 60, right: 60, bottom: 80, left: 100 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Process data: group by gender and calculate subject preferences
    const genderGroups = d3.groups(photographData, d => d.gender);
    const subjects = ['person', 'building', 'tree', 'water'];
    
    const chartData = genderGroups.map(([gender, photos]) => {
        const result = { gender: gender };
        subjects.forEach(subject => {
            const hasField = `has_${subject}`;
            result[subject] = photos.filter(p => p[hasField] === '1.0').length / photos.length * 100;
        });
        return result;
    });
    
    // Scales
    const x0 = d3.scaleBand()
        .domain(chartData.map(d => d.gender))
        .range([0, innerWidth])
        .padding(0.2);
    
    const x1 = d3.scaleBand()
        .domain(subjects)
        .range([0, x0.bandwidth()])
        .padding(0.05);
    
    const y = d3.scaleLinear()
        .domain([0, 100])
        .range([innerHeight, 0]);
    
    const color = d3.scaleOrdinal()
        .domain(subjects)
        .range(['#a89078', '#c4a882', '#8a857f', '#6b6560']);
    
    // Axes
    g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x0))
        .style('font-size', '14px');
    
    g.append('g')
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + '%'))
        .style('font-size', '12px');
    
    // Bars
    const genderGroup = g.selectAll('.gender-group')
        .data(chartData)
        .enter()
        .append('g')
        .attr('class', 'gender-group')
        .attr('transform', d => `translate(${x0(d.gender)},0)`);
    
    genderGroup.selectAll('rect')
        .data(d => subjects.map(subject => ({ subject: subject, value: d[subject], gender: d.gender })))
        .enter()
        .append('rect')
        .attr('x', d => x1(d.subject))
        .attr('y', d => y(d.value))
        .attr('width', x1.bandwidth())
        .attr('height', d => innerHeight - y(d.value))
        .attr('fill', d => color(d.subject))
        .style('opacity', 0.8);
    
    // Legend
    const legend = g.append('g')
        .attr('transform', `translate(0, ${innerHeight + 50})`);
    
    subjects.forEach((subject, i) => {
        const legendItem = legend.append('g')
            .attr('transform', `translate(${i * 150}, 0)`);
        
        legendItem.append('rect')
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', color(subject));
        
        legendItem.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .style('font-size', '12px')
            .text(subject.charAt(0).toUpperCase() + subject.slice(1));
    });
    
    // Axis labels
    g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 40)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .text('Artist Gender');
    
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -70)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .text('Percentage of Photos with Subject');
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

// ===== MAIN VISUALIZATION: INTERACTIVE TIMELINE =====
function initMainVisualization() {
    const container = d3.select('#timeline-viz');
    const width = 1100;
    const height = 600;
    
    // Clear any existing content
    container.selectAll('*').remove();
    
    // Set up SVG
    const svg = container
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('background', 'white');
    
    // If we have data, create the main visualization
    if (photographData.length > 0) {
        if (currentViewType === 'streamgraph') {
            createStreamgraph(svg, width, height);
        } else if (currentViewType === 'line') {
            createLineGraph(svg, width, height);
        } else if (currentViewType === 'percentage-stream') {
            createStreamgraphPercentage(svg, width, height);
        } else if (currentViewType === 'percentage-line') {
            createLineGraphPercentage(svg, width, height);
        }
    } else {
        // Placeholder
        createPlaceholderMainViz(svg, width, height);
    }
}

function createStreamgraph(svg, width, height) {
    const margin = { top: 40, right: 150, bottom: 80, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Process data by decade
    const decades = d3.groups(photographData, d => Math.floor(+d.creation_year / 10) * 10)
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
    
    // Draw streams
    g.selectAll('.stream')
        .data(series)
        .enter()
        .append('path')
        .attr('class', 'stream')
        .attr('d', area)
        .attr('fill', d => colorScale(d.key))
        .style('opacity', 0.8)
        .on('mouseover', function(event, d) {
            d3.select(this).style('opacity', 1).style('stroke', '#333').style('stroke-width', 2);
            
            // Show tooltip
            const tooltip = g.append('text')
                .attr('class', 'stream-tooltip')
                .attr('x', innerWidth / 2)
                .attr('y', -10)
                .attr('text-anchor', 'middle')
                .style('font-size', '14px')
                .style('font-weight', 'bold')
                .style('fill', '#333')
                .text(d.key.charAt(0).toUpperCase() + d.key.slice(1));
        })
        .on('mouseout', function() {
            d3.select(this).style('opacity', 0.8).style('stroke', 'none');
            g.selectAll('.stream-tooltip').remove();
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
        .attr('y', innerHeight + 50)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .text('Year');
    
    g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', -15)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .style('fill', '#6b6560')
        .text('Depicted Objects Over Time');
}

function createLineGraph(svg, width, height) {
    const margin = { top: 40, right: 150, bottom: 80, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Process data by decade
    const decades = d3.groups(photographData, d => Math.floor(+d.creation_year / 10) * 10)
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
                
                // Show tooltip
                const tooltip = g.append('text')
                    .attr('class', 'line-tooltip')
                    .attr('x', xScale(d.decade))
                    .attr('y', yScale(d[subject]) - 15)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '12px')
                    .style('font-weight', 'bold')
                    .style('fill', '#333')
                    .text(`${d[subject]} works`);
            })
            .on('mouseout', function() {
                d3.select(this).attr('r', 5);
                g.selectAll('.line-tooltip').remove();
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
        .attr('y', innerHeight + 50)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .text('Year');
    
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -50)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .text('# of Works');
    
    g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', -15)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .style('fill', '#6b6560')
        .text('Depicted Objects Over Time');
}

function createStreamgraphPercentage(svg, width, height) {
    const margin = { top: 40, right: 150, bottom: 80, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Process data by decade
    const decades = d3.groups(photographData, d => Math.floor(+d.creation_year / 10) * 10)
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
        .on('mouseover', function(event, d) {
            d3.select(this).style('opacity', 1).style('stroke', '#333').style('stroke-width', 2);
            
            // Show tooltip
            const tooltip = g.append('text')
                .attr('class', 'stream-tooltip')
                .attr('x', innerWidth / 2)
                .attr('y', -10)
                .attr('text-anchor', 'middle')
                .style('font-size', '14px')
                .style('font-weight', 'bold')
                .style('fill', '#333')
                .text(d.key.charAt(0).toUpperCase() + d.key.slice(1));
        })
        .on('mouseout', function() {
            d3.select(this).style('opacity', 0.8).style('stroke', 'none');
            g.selectAll('.stream-tooltip').remove();
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
        .attr('y', innerHeight + 50)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .text('Year');
    
    g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', -15)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .style('fill', '#6b6560')
        .text('Depicted Objects Over Time (Percentage Streamgraph)');
}

function createLineGraphPercentage(svg, width, height) {
    const margin = { top: 40, right: 150, bottom: 80, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Process data by decade
    const decades = d3.groups(photographData, d => Math.floor(+d.creation_year / 10) * 10)
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
                
                // Show tooltip
                const tooltip = g.append('text')
                    .attr('class', 'line-tooltip')
                    .attr('x', xScale(d.decade))
                    .attr('y', yScale(d[subject]) - 15)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '12px')
                    .style('font-weight', 'bold')
                    .style('fill', '#333')
                    .text(`${d[subject].toFixed(1)}%`);
            })
            .on('mouseout', function() {
                d3.select(this).attr('r', 5);
                g.selectAll('.line-tooltip').remove();
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
        .attr('y', innerHeight + 50)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .text('Year');
    
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -50)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .text('Percentage of Works');
    
    g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', -15)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .style('fill', '#6b6560')
        .text('Depicted Objects Over Time (Percentage)');
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
