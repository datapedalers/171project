# Co-occurrence Network Visualization

## Overview
I've successfully created a co-occurrence network visualization for your photography dataset and placed it in the **Evolving Perspectives** section (Visualization 2) of your index.html.

## What It Shows
The visualization displays how different object categories appear together in photographs:

- **Circles (Nodes)**: Each circle represents an object category (person, building, tree, water, mountain, grass, animal, house, road, boat)
  - **Size**: Proportional to the overall frequency of that object appearing in photographs
  - **Color**: Each object has a unique color for easy identification
  - **Label**: Object name displayed on each circle

- **Lines (Links)**: Connect circles when those objects frequently appear together
  - **Thickness**: Proportional to the co-occurrence frequency (how often they appear together)
  - Only shows connections where objects co-occur in at least 5 photographs

## Interactive Features
- **Drag nodes**: Click and drag any circle to reposition it
- **Hover tooltips**: 
  - Hover over circles to see the exact frequency count
  - Hover over lines to see which objects are connected and how often they appear together
- **Force-directed layout**: The network automatically arranges itself to minimize overlaps

## Technical Implementation

### Files Modified
1. **index.html**: Updated Visualization 2 placeholder with proper heading and description
2. **visualizations.js**: Added `createCooccurrenceNetwork()` function with:
   - Co-occurrence matrix calculation
   - D3.js force-directed graph
   - Interactive drag functionality
   - Dynamic sizing and coloring
3. **styles.css**: Added styling for hover effects and visual polish

### Data Processing
The visualization:
1. Calculates frequency for each object category across all photographs
2. Computes co-occurrence matrix (how often pairs of objects appear together)
3. Filters to show only meaningful connections (≥5 co-occurrences)
4. Uses D3.js force simulation for automatic layout

### Key Parameters
- **Objects included**: 10 main categories (person, building, tree, water, mountain, grass, animal, house, road, boat)
- **Minimum co-occurrence threshold**: 5 photographs
- **Radius range**: 15-50 pixels (scaled by frequency)
- **Line width range**: 1-8 pixels (scaled by co-occurrence)
- **Force simulation**: Balanced for readability with collision detection

## How to View
1. Open your browser to `http://localhost:8000`
2. Navigate to the "Evolving Perspectives" section
3. The co-occurrence network is the second visualization

## Insights Revealed
The visualization helps answer the question "What Objects Appear Together?" and reveals:
- Urban scenes typically combine buildings and people
- Landscape photography clusters around nature elements (trees, water, mountains)
- The "visual grammar" photographers use when composing their frames
- Which elements are complementary vs. independent in photographic composition

## Future Enhancements (Optional)
If you want to extend this visualization, you could:
- Add a time slider to see how co-occurrences change over decades
- Filter by artist nationality or gender
- Add edge highlighting when hovering on nodes
- Show percentage-based co-occurrence (normalized by frequency)
- Add clustering algorithms to identify distinct photographic "themes"

