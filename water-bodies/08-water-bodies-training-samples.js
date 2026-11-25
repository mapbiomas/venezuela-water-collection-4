/**
 * @fileoverview Collect manually labeled training shapes for water-body classification in the Earth Engine Code Editor.
 * Preview the selected grid and year using Landsat and water-body layers, read natural,
 * anthropogenic, and false-positive shapes from the drawing tools, and export the labeled
 * features to Drive as CSV.
 */

// #### PAIS NAME --------------------------------------------------------------------------------------------------------------------------------

var pais = "venezuela";

// #### GRIDS RANDOM PAIS -------------------------------------------------------------------------------------------------------------------------

/**
 * Sampled grids with new_id and year properties used by the labeling UI.
 * @type {ee.FeatureCollection}
 */
var table = ee.FeatureCollection(
  "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/GRIDS/grids-classificacion-venezuela-02",
);

// #### PALETTES VIS-----  -------------------------------------------------------------------------------------------------------

var palettes = require("users/mapbiomas/modules:Palettes.js");
var mapbiomasPalette = palettes.get("classification8");

var vis = {
  min: 0,
  max: 62,
  palette: mapbiomasPalette,
  format: "png",
};

var imageVisParam2 = {
  opacity: 1,
  bands: ["swir1", "nir", "red"],
  min: 0,
  max: 10135,
  gamma: 1.9460000000000002,
};

// #### LANDSAT PROCESSING -------------------------------------------------------------------------------------------------------------------------

var l5_col_2 = ee.ImageCollection("LANDSAT/LT05/C02/T1_L2");
var l7_col_2 = ee.ImageCollection("LANDSAT/LE07/C02/T1_L2");
l7_col_2 = l7_col_2.filterDate("1995-01-01", "2012-12-31");
var l8_col_2 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2");

/**
 * Rescale Landsat Collection 2 surface reflectance and store the result as unsigned 16-bit
 * values.
 *
 * @param {ee.Image} image - Landsat Level-2 image with SR_B bands.
 * @returns {ee.Image} Image with rescaled optical bands and copied properties.
 */
function applyScaleFactors(image) {
  var opticalBands = image
    .select("SR_B.")
    .multiply(0.0000275)
    .add(-0.2)
    .multiply(10000);
  return image
    .addBands(opticalBands, null, true)
    .uint16()
    .copyProperties(image);
}

l5_col_2 = l5_col_2.map(applyScaleFactors);
l7_col_2 = l7_col_2.map(applyScaleFactors);
l8_col_2 = l8_col_2.map(applyScaleFactors);

/**
 * Common optical band names used across the Landsat sensors.
 * @type {string[]}
 */
var bandnamed = ["blue", "green", "red", "nir", "swir1", "swir2"];
var bands_l5_2 = ["SR_B1", "SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B7"];
var bands_l7_2 = ["SR_B1", "SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B7"];
var bands_l8_2 = ["SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B6", "SR_B7"];

/**
 * Select sensor-specific optical bands and rename them to the shared band names.
 *
 * @param {ee.ImageCollection} imgCol - Landsat collection to standardize.
 * @param {string[]} input - Source band names in the desired order.
 * @returns {ee.ImageCollection} Collection with the six common optical bands.
 */
var rename_bands = function (imgCol, input) {
  return imgCol.select(input, bandnamed);
};

/**
 * Pass a standardized image through the collection map.
 *
 * @param {ee.Image} image - Standardized Landsat image.
 * @returns {ee.Image} Input image.
 */
var process_image = function (image) {
  return image;
};

var l5_ready = rename_bands(l5_col_2, bands_l5_2).map(process_image);
var l7_ready = rename_bands(l7_col_2, bands_l7_2).map(process_image);
var l8_ready = rename_bands(l8_col_2, bands_l8_2).map(process_image);

var landsatCollection = l5_ready.merge(l7_ready).merge(l8_ready);

// ✅ CORRECCIÓN 1: filterBounds(feature.geometry()) en vez de filterBounds(table)
var mosaicLandsat = table.map(function (feature) {
  var year = feature.getNumber("year").int();

  var start = ee.Date.fromYMD(year, 1, 1);
  var end = start.advance(1, "year");

  var landsatFiltered = landsatCollection
    .filterDate(start, end)
    .filterBounds(feature.geometry()) // ← CORREGIDO: solo la celda actual
    .filter(ee.Filter.lte("CLOUD_COVER", 50))
    .median();

  landsatFiltered = landsatFiltered.clip(feature);

  return landsatFiltered;
});

// ✅ CORRECCIÓN 2: sin toList() para evitar materialización en memoria
var landsat_year = ee.ImageCollection(mosaicLandsat).mosaic();

// #### SEGMENT WATER LAYER AND MAPBIOMAS LAYER / GRID --------------------------------------------------------------------------------------------------------

// # COLORS
var blues = [
  "ff0000",
  "ffffff",
  "aaffff",
  "55ffff",
  "00ffff",
  "00bfff",
  "007fff",
  "003fff",
  "0000ff",
  "0000cf",
  "00009f",
  "00006f",
  "000040",
];

// # TEMPORAL BEHAVIOR, COLLECTION WATER AND MAPBIOMAS LULC CLASSIFICATION

var temp_bhv = ee.Image(
  "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/temporal-behavior_00_25_col4",
);

var collection = ee
  .ImageCollection(
    "projects/mapbiomas-venezuela/assets/AGUA/SUPERFICIE/COLECCION3/POSTPROCESSING/04-remap-04",
  )
  .filter("year >= 2000")
  .filter("year < 2013")
  .merge(
    ee
      .ImageCollection(
        "projects/mapbiomas-venezuela/assets/AGUA/SUPERFICIE/COLECCION3/POSTPROCESSING/04-remap-04",
      )
      .filter("year >= 2013"),
  )
  .map(function (image) {
    return image.clip(table);
  })
  .map(function (image) {
    var yearGet = ee.Number(image.getNumber("year"));
    return image.lte(3).selfMask().byte().set("year", yearGet);
  });

var mapb_year = ee
  .Image(
    "projects/mapbiomas-venezuela/assets/LANDSAT/VENEZUELA-3/integracion/VENEZUELA-8",
  )
  .addBands(
    ee
      .Image(
        "projects/mapbiomas-venezuela/assets/LANDSAT/VENEZUELA-3/integracion/VENEZUELA-8",
      )
      .select(["classification_2023"], ["classification_2024"]),
  );

// # SEGMENTS

var folder_list = ee.data.getList({
  id: "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ2_2",
});

var coll_list = folder_list.map(function (e) {
  var path = e.id;
  var fc = ee.FeatureCollection(path);
  return fc;
});
coll_list = ee.List(coll_list);

var years = ee.List.sequence(2000, 2023, 1);
var objs = coll_list;

var listMap = ee.List.sequence(0, 22, 1).map(function (index) {
  return ee
    .FeatureCollection(objs.get(index))
    .set("year", ee.Number(years.get(index)));
});

var objsCol = ee.FeatureCollection(listMap);

// # PROCESSING PER GRIDS

var waterMosaic = table.map(function (feature) {
  var year = feature.getNumber("year");

  var freqAnual = collection
    .filter(ee.Filter.eq("year", year))
    .first()
    .reduce("sum")
    .unmask()
    .clip(feature);
  var mapbiomas = mapb_year
    .select(ee.String("classification_").cat(ee.String(year).slice(0, 4)))
    .clip(feature);

  var objsColYear = ee.FeatureCollection(
    objsCol.filter(ee.Filter.eq("year", year)).first(),
  );
  var segment = ee.Image(0).mask(0).paint(objsColYear, "000000", 2);

  return freqAnual
    .rename("freqAnual")
    .addBands(mapbiomas.rename("mapbiomas"))
    .addBands(freqAnual.selfMask().blend(segment).rename("segment"));
});

// # MOSAIC AND ADD LAYERS

waterMosaic = ee.ImageCollection(waterMosaic).mosaic();

Map.addLayer(
  ee.Image(1).clip(table),
  { palette: "008000" },
  "background",
  true,
  0.5,
);
Map.addLayer(landsat_year, imageVisParam2, "landsat mosaic");
Map.addLayer(waterMosaic.select("mapbiomas"), vis, "mapbiomas");
Map.addLayer(
  waterMosaic.select("freqAnual"),
  { palette: ["black", "red", "white", "blue"], min: 0, max: 12 },
  "freqAnual",
);
Map.addLayer(
  waterMosaic.select("segment"),
  { palette: blues, min: 0, max: 12 },
  "segment",
);
Map.addLayer(temp_bhv, { min: 0, max: 23 }, "temporal behavior");
Map.addLayer(
  ee.Image(0).mask(0).paint(table, "000000", 2),
  { palette: "ff0000" },
  "grid",
  true,
);

// #### FUNCTIONS PANEL ------------------------------------------------------------------------------------------------------------------------------

var cell_index = 0;
var year = 0;
var textbox_index = ui.Textbox("start index...", "1");
var feature; // variable global

// ✅ CORRECCIÓN 3: SIN "var" para actualizar la variable global "feature"
/**
 * Load the selected grid, update the year label, and center the map on the feature.
 *
 * @param {number} cell_index - Sample grid new_id.
 * @returns {void}
 */
function update(cell_index) {
  feature = table.filter(ee.Filter.eq("new_id", cell_index)).first(); // ← SIN var

  year = ee.Number(feature.getNumber("year"));
  year_label.setValue(year.getInfo(), true);

  Map.centerObject(feature, 12);
}

var next_button = ui.Button({
  label: "▶️",
  onClick: function () {
    var polygons_nat = Map.drawingTools()
      .layers()
      .get(0)
      .getEeObject()
      .filterBounds(feature.geometry())
      .map(function (p) {
        return p
          .set("class", 1)
          .set("year", year)
          .set("cell_index", cell_index)
          .set("pais", pais)
          .set("pais_name", "VEN")
          .set("pais_index", 8);
      });

    var polygons_ant = Map.drawingTools()
      .layers()
      .get(1)
      .getEeObject()
      .filterBounds(feature.geometry())
      .map(function (p) {
        return p
          .set("class", 2)
          .set("year", year)
          .set("cell_index", cell_index)
          .set("pais", pais)
          .set("pais_name", "VEN")
          .set("pais_index", 8);
      });

    var polygons_fpo = Map.drawingTools()
      .layers()
      .get(2)
      .getEeObject()
      .filterBounds(feature.geometry())
      .map(function (p) {
        return p
          .set("class", 3)
          .set("year", year)
          .set("cell_index", cell_index)
          .set("pais", pais)
          .set("pais_name", "VEN")
          .set("pais_index", 8);
      });

    var merged = polygons_nat.merge(polygons_ant).merge(polygons_fpo);

    print(merged);

    Export.table.toDrive(
      merged,
      "fc_exp_" + pais + "_" + cell_index,
      "amostras_corpos_hidricos",
      "fc_exp_" + pais + "_" + cell_index,
      "csv",
    );

    cell_index = cell_index + 1;
    update(cell_index);
    grid_label.setValue(cell_index, true);
  },
});

var items_panel_sup = ui.Panel({
  widgets: [/*prev_button, */ next_button],
  layout: ui.Panel.Layout.flow("horizontal"),
  style: {
    margin: "0px 0px 0px 40px",
  },
});

var grid_label = ui.Label("0", { fontWeight: "bold", fontSize: "24px" });
var year_label = ui.Label(year, { fontWeight: "bold", fontSize: "24px" });

var ok_button = ui.Button({
  label: "✔️",
  onClick: function () {
    cell_index = ee.Number.parse(textbox_index.getValue(), 10).getInfo();

    update(cell_index);

    grid_label.setValue(cell_index, true);
  },
});

var select_ok = ui.Panel({
  widgets: [/*select,*/ textbox_index, ok_button, grid_label],
  layout: ui.Panel.Layout.flow("horizontal"),
  style: {},
});

var yearLabel = ui.Panel({
  widgets: [year_label],
  layout: ui.Panel.Layout.flow("horizontal"),
  style: {},
});

var opt_panel = ui.Panel(
  [select_ok, yearLabel, items_panel_sup],
  ui.Panel.Layout.flow("horizontal"),
  { height: "50px" },
);

var main = ui.Panel({
  layout: ui.Panel.Layout.flow("vertical"),
  widgets: [opt_panel],
  style: { stretch: "both" },
});

Map.add(main);
