![MapBiomas Agua](./mapbiomas-agua.png)

[![Back to Venezuela All Initiatives](https://img.shields.io/badge/←%20Venezuela%20All%20Initiatives-gray?style=for-the-badge)](https://github.com/mapbiomas/venezuela-all-initiatives)

# MapBiomas Venezuela

_**Water Mapping Module — Collection 4**_

This repository contains Google Earth Engine scripts for mapping glaciers, detecting surface water by month, and classifying water bodies by year in Venezuela.

## Repository Structure

```text
venezuela-water-collection-4/
    ├── glacier/
    ├── water-surface/
    └── water-bodies/
```

## Methodological Steps

### Glacier

| Script | Purpose |
| --- | --- |
| [Training samples](./glacier/01-glacier-training-samples.js) | Generates labeled samples from glacier and water reference geometries and stable reference pixels. Exports a sample CSV and can export an annual classification. |
| [Classifier](./glacier/01-glacier-classifier.js) | Trains a Random Forest model on Landsat predictors and applies additional spectral, terrain, and cloud rules. |
| [Gap Fill](./glacier/01-glacier-gapfill.js) | Fills gaps across annual bands and exports the classification and source observation years. |
| [Temporal filter](./glacier/01-glacier-temporal-filter.js) | Applies temporal consistency rules and configured exclusions. Can export the classification and area summaries to Drive. |

### Surface Water

| Script | Purpose |
| --- | --- |
| [Detection](./water-surface/02-water-surface-detection.js) | Detects water with ecosystem-specific Landsat probability and threshold rules and exports twelve monthly bands per year. |
| [CSF mask](./water-surface/02-water-surface-csf-mask.js) | Mosaics regional detections and applies water-frequency, terrain, spectral, and configured land-cover masks. |
| [Pre-gap preparation](./water-surface/02-water-surface-pregap.js) | Flags class 4 pixels without a usable Landsat observation as unobserved before gap filling. |
| [Gap Fill](./water-surface/02-water-surface-gapfill.js) | Fills unobserved months from a five-year window and applies configured inclusions and exclusions. |
| [Remaps](./water-surface/02-water-surface-remaps.js) | Applies frequency tests and corrections from vector assets and manual polygons. |

### Water Bodies

| Script | Purpose |
| --- | --- |
| [01. Grid selection](./water-bodies/01-water-bodies-grid-selection.js) | Selects a random subset of grids containing water for training-sample labeling. |
| [02. Temporal behavior](./water-bodies/02-water-bodies-temporal-behavior.js) | Derives water frequency and first- and last-presence metrics from monthly classifications. |
| [03. SNIC segmentation](./water-bodies/03-water-bodies-snic-segmentation.js) | Segments annual water pixels using temporal behavior and annual water frequency. |
| [04. SNIC objects](./water-bodies/04-water-bodies-snic-obj.js) | Converts annual SNIC rasters into watershed-level polygon tables. |
| [05. Merge objects](./water-bodies/05-water-bodies-snic-merge-obj.js) | Combines watershed-level tables into one object collection per year. |
| [06. Regional objects](./water-bodies/06-water-bodies-snic-obj-region.js) | Selects and exports annual objects for each classification region. |
| [07. Object predictors](./water-bodies/07-water-bodies-snic-obj-region-index.js) | Adds shape, water-frequency, timing, and land-cover context properties to each object. |
| [08. Training samples](./water-bodies/08-water-bodies-training-samples.js) | Provides a map interface for labeling reference geometries and exporting them to Drive. |
| [09. Properties and aggregates](./water-bodies/09-water-bodies-properties-and-aggregates.js) | Joins sample assets to indexed objects and exports the training table. |
| [10. Classification](./water-bodies/10-water-bodies-classification.js) | Classifies indexed objects with Random Forest and applies surface-water evidence, auxiliary masks, and manual corrections. |

## Getting Started

1. Open the script in the [Google Earth Engine Code Editor](https://code.earthengine.google.com/). Check access to the assets and external modules it references.
2. Set the regions, years, versions, and asset paths for the run. Supply the Code Editor imports used by the script, such as `Glaciar` and `Agua` for glacier samples or `grid` and `bound` for the corresponding water-body steps.
3. Create the output asset folders and launch the applicable export tasks from **Tasks**. For water-body training, upload the labeled samples from Drive to the configured sample-assets folder before running step 09.

> [!IMPORTANT]
> Check the input and output paths before chaining steps. The surface-water CSF script exports to Collection 3 `03-mask-01`, while pre-gap reads Collection 4 `03-mask-02`. The watershed vectorization script writes to `SNIC_OBJ2`, while the merge script reads `SNIC_OBJ`. Set the consuming script to the asset folder and version you intend to use.
