# Metropolitan Museum Photographs Dataset
## Data Pipeline & Cleaning Documentation

**Final Dataset:** `final_dataset.csv`  
**Total Records:** 1,401 photographs  
**Source:** Metropolitan Museum of Art OpenAccess Collection

---

## Overview

This dataset contains Metropolitan Museum of Art photographs enriched with semantic segmentation data identifying 27 object categories within each image. Each photograph includes artist metadata (name, nationality, gender, creation year) and detailed object detection results showing what visual elements appear in the image and what percentage of the image they occupy.

---

## Data Pipeline

### Stage 1: Initial Data Collection & Filtering

**Source Data:**
- Metropolitan Museum of Art OpenAccess CSV (~480,000 museum objects)
- Downloaded from: `https://media.githubusercontent.com/media/metmuseum/openaccess/master/MetObjects.csv`

**Filtering Criteria:**
1. **Work Type:** Filtered to only "Photograph" objects (from `Object Name` field)
2. **Artist Information:** Kept only artworks with known artist names (non-null `Artist Display Name`)
3. **Nationality:** Kept only artworks where artist nationality is known (non-null `Artist Nationality`)

**Initial Result:** ~15,000 photographs with artist metadata

---

### Stage 2: Gender Data Enrichment

**Problem:** Many artist records lacked gender information in the Met's dataset.

**Solution:** Enriched missing gender data using Wikidata SPARQL queries.

**Process:**
1. Identified artists with Wikidata URLs but missing gender information
2. Extracted Wikidata QIDs (e.g., Q123456) from URLs like `https://www.wikidata.org/wiki/Q123456`
3. Queried Wikidata for gender property (P21) for each artist
4. Normalized gender values:
   - Wikidata entity Q6581072 → "female"
   - Wikidata entity Q6581097 → "male"
5. Excluded collaborative works (multiple QIDs separated by `|`)

**Gender Normalization Rules:**
- Converted various formats (URIs, text) to standardized "male" or "female" values
- Removed records where gender could not be determined

**Wikidata Query Example:**
```sparql
SELECT ?gender ?birth WHERE {
  wd:Q123456 wdt:P31 wd:Q5 .
  OPTIONAL { wd:Q123456 wdt:P21 ?gender. }
  OPTIONAL { wd:Q123456 wdt:P569 ?birth. }
}
```

**Result After Enrichment:** ~12,000 photographs with complete artist metadata including gender

---

### Stage 3: Artist Work Count & Balancing

**Problem:** Some prolific artists had hundreds of works, which could bias analysis.

**Solution:** Capped the number of works per artist at the 90th percentile.

**Process:**
1. Counted total works per artist in the filtered dataset
2. Calculated distribution statistics:
   - 25th percentile: ~1 work
   - 50th percentile (median): ~2 works
   - 75th percentile: ~6 works
   - **90th percentile: ~27 works** ← chosen threshold
   - 95th percentile: ~50 works
3. For artists exceeding 27 works, randomly sampled 27 works (random_state=42 for reproducibility)
4. Added `works_in_museum` field showing total works by each artist in the Met collection

**Rationale:** The 90th percentile cap prevents over-representation while retaining diversity from prolific artists.

**Result:** ~8,000 photographs with balanced artist representation

---

### Stage 4: Image Acquisition

**Source:** Metropolitan Museum of Art Collection API

**API Endpoint:** `https://collectionapi.metmuseum.org/public/collection/v1/objects/{object_id}`

**Process:**
1. For each artwork's `object_id`, called the Met API
2. Retrieved image URLs from response fields:
   - `primaryImage` (high resolution)
   - `primaryImageSmall` (fallback)
3. Downloaded images to `images_met/` directory
4. Implemented polite rate limiting (delays between requests)
5. Added retry logic for failed downloads

**Image Storage:**
- Format: JPEG/PNG
- Naming: `{object_id}.jpg`
- Total size: ~2.7GB (compressed)

**Data Cleaning:**
- Removed records where images could not be downloaded
- Verified image files exist before including in final dataset

**Result:** ~1,500 photographs with successfully downloaded images

---

### Stage 5: Semantic Segmentation

**Model:** SegFormer (`nvidia/segformer-b2-finetuned-ade-512-512`)  
**Framework:** Hugging Face Transformers  
**Training Data:** ADE20K dataset (150 object categories)

**Process:**
1. Loaded each photograph image
2. Ran SegFormer semantic segmentation model
3. Model outputs pixel-wise classification for 150 object categories
4. For each detected object, computed:
   - **Binary presence:** `has_{object}` (1.0 if detected, empty otherwise)
   - **Area percentage:** `{object}_percent` (percentage of image pixels classified as this object)
   - **Confidence scores:** (optional, not included in final dataset)

**Output:** Raw segmentation data with all 150 object categories

---

### Stage 6: Object Category Curation

**Problem:** 150 object categories included many that were:
- Too common to be informative (e.g., "sky" in 90% of outdoor photos)
- Inaccurately classified by the model
- Too rare to be informative (<10 photos)

**Solution:** Manually curated list of 27 meaningful object categories.

**Selection Criteria:**
1. **Classification Accuracy:** Objects that SegFormer reliably identifies in photographs
2. **Frequency Balance:** Excluded overly common objects (sky, wall) and extremely rare ones

**27 Objects Kept:**

| Category | Objects |
|----------|---------|
| **People** | person |
| **Natural Landscape** | tree, mountain, grass, water, rock, sea, river, field |
| **Built Environment** | building, house, road, sidewalk, fence, bridge, pier |
| **Structures** | column, hovel, tent |
| **Water Features** | boat |
| **Vegetation** | plant |
| **Interior Elements** | curtain, windowpane, chair, table |
| **Animals** | animal |
| **Outdoor Furniture** | bench |

**Filtering Process:**
1. Created `to_keep.txt` with 27 object names (one per line)
2. Filtered segmentation results to keep only columns for these 27 objects
3. Retained all metadata columns (object_id, artist_name, origin, gender, creation_year, works_in_museum, work_type)
4. For each kept object, preserved:
   - `has_{object}` - Binary presence flag
   - `{object}_percent` - Percentage of image area

**Result:** Clean dataset with 27 meaningful object categories

---

**Final Dataset:** 1,401 photographs

---

## Final Dataset Schema

### Metadata Fields (8 columns)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `object_id` | integer | Metropolitan Museum object ID | 268620 |
| `artist_name` | string | Artist's display name | "Ansel Adams" |
| `origin` | string | Artist's nationality | "American" |
| `gender` | string | Artist's gender | "male" or "female" |
| `creation_year` | integer | Year photograph was created | 1942 |
| `works_in_museum` | integer | Total works by this artist in Met collection | 27 |
| `work_type` | string | Type of artwork (always "Photograph") | "Photograph" |

### Object Detection Fields (54 columns = 27 objects × 2 fields)

For each of the 27 objects, two columns:

| Field Pattern | Type | Description | Example |
|---------------|------|-------------|---------|
| `has_{object}` | float | 1.0 if object detected, empty otherwise | 1.0 |
| `{object}_percent` | float | Percentage of image area occupied | 23.5 |

**Example Row:**
```csv
object_id,has_person,person_percent,has_building,building_percent,...,artist_name,origin,gender,creation_year,works_in_museum,work_type
260967,1.0,15.3,1.0,42.8,...,Adolphe Braun,French,male,1872,27,Photograph
```

---

## Data Quality Metrics

### Coverage Statistics
- **Total Photographs:** 1,401
- **Unique Artists:** ~800
- **Date Range:** 1839-2020s
- **Gender Distribution:** 
  - Male artists: ~85%
  - Female artists: ~15%
- **Geographic Coverage:** 40+ nationalities

### Object Detection Statistics
- **Average objects per photo:** ~3-4 categories detected
- **Most common objects:** person (40%), building (35%), tree (30%)
- **Least common objects:** hovel (<1%), tent (<1%), pier (~2%)

### Data Completeness
- **Artist metadata:** 100% complete (all records have name, nationality, gender, year)
- **Image availability:** 100% (all records have corresponding image files)
- **Object detection:** 100% (all images processed through SegFormer)

---

## Data Limitations & Considerations

### 1. Artist Representation Bias
- **Gender imbalance:** Historical photography was male-dominated; dataset reflects this reality
- **Geographic bias:** Western European and American artists over-represented
- **Temporal bias:** More works from 20th century than 19th century

### 2. Semantic Segmentation Limitations
- **Model accuracy:** SegFormer not 100% accurate; some objects may be misclassified
- **Ambiguous categories:** Some objects difficult to distinguish (e.g., "house" vs "building")
- **Small objects:** Tiny objects may not be detected if they occupy <1% of image
- **Artistic interpretation:** Abstract or experimental photographs may confuse the model

### 3. Data Collection Artifacts
- **Missing images:** Some Met objects lack images
- **Artist capping:** Maximum 27 works per artist may undersample extremely prolific photographers
- **Wikidata dependency:** Gender data quality depends on Wikidata completeness

### 4. Metadata Accuracy
- **Creation year:** Some dates are approximate or estimated
- **Nationality:** Artist nationality may not reflect where photograph was taken
- **Gender:** Binary gender classification may not reflect historical complexity

---

## Data Provenance

### Original Sources
1. **Metropolitan Museum of Art OpenAccess**
   - License: CC0 1.0 (Public Domain)
   - URL: https://github.com/metmuseum/openaccess
   - Access Date: October 2025

2. **Wikidata**
   - License: CC0 1.0 (Public Domain)
   - URL: https://www.wikidata.org
   - SPARQL Endpoint: https://query.wikidata.org/sparql

3. **SegFormer Model**
   - Model: nvidia/segformer-b2-finetuned-ade-512-512
   - Training Data: ADE20K dataset
   - License: Apache 2.0
   - Source: Hugging Face Transformers

### Processing Information
- **Processed by:** Paula Zhuang (paulazhuang@college.harvard.edu)
- **Institution:** Harvard University
- **Course:** CS 1710
- **Processing Date:** October 2025

---

## Acknowledgments

- **Metropolitan Museum of Art** for making their collection openly accessible
- **Wikidata** community for maintaining artist biographical data
- **NVIDIA & Hugging Face** for the SegFormer semantic segmentation model
- **ADE20K** dataset creators for training data
