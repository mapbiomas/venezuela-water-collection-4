/**
 * @fileoverview Apply final remaps to gap-filled surface-water maps for MapBiomas Venezuela Collection 4.
 * Use exclusion assets, frequency checks, manual polygons, and an inclusion asset to revise
 * the twelve monthly bands. Export one corrected image per selected year.
 */

// ===============================
// Remap Venezuela
// Modificado por: Nelly Rivero fecha: octubre 2026
// CONFIGURACIÓN INICIAL
// ===============================
var paisName = "Venezuela";
/**
 * Years selected for remap exports.
 * @type {number[]}
 */
var years = [2025];
var cloud_cover = 70;
/**
 * Post-processing folder containing the gap-filled water maps.
 * @type {string}
 */
var input_clasif = "03-gap-01";
var version_out = 1;
var month = "w_4";
var minfrec = 20;

// ===============================
// PARÁMETROS DE CORRECCIÓN
// ===============================

// ---- Protección de agua en la exclusión ----
var clases_protegidas = [1, 2, 3];
var clases_exclusion_objetivo = [9];
var valor_exclusion = 6;

// ---- Inclusión manual por polígono  ----
var usar_correccion_manual = true;
var clases_a_corregir = [4]; // ej. [4], [4,6,7], [4,5,6,7,8]

// ---- Inclusión manual 2  ----
var usar_correccion_manual_2 = true;
var clases_a_corregir_2 = [6, 7];
var valor_inclusion_2 = 1;

// ---- Exclusión manual por polígono ----

var usar_exclusion_manual = true;

// ---- Exclusión manual 2  ----

var usar_exclusion_manual_2 = true;
var clases_exclusion_2 = [1, 2, 3];
var valor_exclusion_2 = 6;

var anios_correccion_manual = [];
var anios_correccion_manual_2 = [];
var anios_exclusion_manual = [];
var anios_exclusion_manual_2 = [];

// Clases de exclusión efectivas
/**
 * Effective target classes for exclusions that honor clases_protegidas.
 * @type {number[]}
 */
var clases_excl = clases_exclusion_objetivo.filter(function (c) {
  return clases_protegidas.indexOf(c) === -1;
});

var namecountry = paisName.replace("ú", "u");

// === Assets ===
var folder_geometrias =
  "projects/mapbiomas-raisg/PRODUCTOS/AGUA/DATOS_AUXILIARES/VECTOR/" +
  namecountry.toUpperCase() +
  "/EXCLUSION";
var folder_inclusion =
  "projects/mapbiomas-venezuela/assets/AGUA/DATOS_AUXILIARES/VECTOR/LagunasO_2025";

var clasificacionAgua = ee.ImageCollection(
  "projects/mapbiomas-venezuela/assets/AGUA/SUPERFICIE/COLECCION4/POSTPROCESSING/" +
    input_clasif,
);
var paises = ee.FeatureCollection(
  "projects/mapbiomas-raisg/DATOS_AUXILIARES/VECTORES/paises-4",
);
var pais = paises.filter(ee.Filter.eq("pais", paisName));
var grids = ee.FeatureCollection(
  "projects/mapbiomas-raisg/PRODUCTOS/AGUA/DATOS_AUXILIARES/TEMP/bigGrids_" +
    namecountry,
);

// ===============================
// FRECUENCIAS
// ===============================
var WaterGap_month_frec = clasificacionAgua.map(function (ima) {
  return ima.gte(1).and(ima.lte(3));
});
WaterGap_month_frec = WaterGap_month_frec.map(function (imaM) {
  return imaM.reduce("sum");
});
var WaterGap_month_fred_imag = WaterGap_month_frec.reduce("sum");
var WaterGap_month_fred_imag_fill = WaterGap_month_fred_imag.gte(
  minfrec,
).multiply(WaterGap_month_fred_imag);
var WaterGap_month_fred_imag_del = WaterGap_month_fred_imag.lt(minfrec);

Map.addLayer(
  WaterGap_month_fred_imag.selfMask(),
  {
    min: 0,
    max: 456,
    palette: [
      "ff0606",
      "ffb60e",
      "faff10",
      "10ff18",
      "10fff5",
      "0ca4ff",
      "1a0aff",
    ],
  },
  "Water_sum",
  false,
);
Map.addLayer(
  WaterGap_month_fred_imag_fill.selfMask(),
  {
    min: 0,
    max: 456,
    palette: [
      "ff0606",
      "ffb60e",
      "faff10",
      "10ff18",
      "10fff5",
      "0ca4ff",
      "1a0aff",
    ],
  },
  "Water_sum_fill",
  false,
);

// ===============================
// FUNCIONES AUXILIARES
// ===============================
/**
 * Load a feature collection from an Earth Engine asset listing entry.
 *
 * @param {{id: string}} e - Asset listing entry with a feature collection ID.
 * @returns {ee.FeatureCollection} Feature collection loaded from the asset.
 */
function list_folder_to_featColl(e) {
  var path = e.id;
  var fc = ee.FeatureCollection(path);
  return fc;
}

/**
 * Load and flatten the feature collections listed in a folder.
 *
 * @param {string} folder_geo - Earth Engine folder path.
 * @returns {ee.FeatureCollection} Features from the listed assets.
 */
var getfeacollFolder = function (folder_geo) {
  var lista1 = ee.data.listAssets(folder_geo);
  var listaAsset1 = lista1["assets"];
  var list = listaAsset1.map(list_folder_to_featColl);
  list = ee.FeatureCollection(list).flatten();
  return list;
};

// ===============================
// CARGA DE EXCLUSION
// ===============================
var feaCollGeo = getfeacollFolder(folder_geometrias);
feaCollGeo = feaCollGeo.map(function (f) {
  return f.set("geo_type", f.geometry().type());
});
var feaCollGeo_Polygon = feaCollGeo.filter(ee.Filter.eq("geo_type", "Polygon"));
var exclusionSHP = feaCollGeo_Polygon.filter(ee.Filter.eq("type", "exclusion"));
print("exclusion", exclusionSHP.size());

// ===============================
// CARGA DE INCLUSION (ASSET EXTERNO)
// ===============================
var inclusionSHP = ee.FeatureCollection(folder_inclusion);
print("inclusion", inclusionSHP.size());

// ===============================
// COMBINAR INCLUSION Y EXCLUSION
// ===============================
/**
 * Convert inclusion and exclusion features into a two-band mask.
 *
 * @param {ee.FeatureCollection} inclu - Inclusion features with the tipo property.
 * @param {ee.FeatureCollection} exclu - Exclusion features with the value property.
 * @returns {ee.Image} Byte image with inclu and exclu bands.
 */
function inclus_exclu(inclu, exclu) {
  var inclusionRegions = ee
    .FeatureCollection(inclu)
    .reduceToImage(["tipo"], ee.Reducer.first())
    .eq(1);
  var exclusionRegions = ee
    .FeatureCollection(exclu)
    .reduceToImage(["value"], ee.Reducer.first())
    .eq(1);
  var INCLU_EXCLU = inclusionRegions
    .rename("inclu")
    .addBands(exclusionRegions.rename("exclu"));
  return INCLU_EXCLU.toUint8();
}

var classArea = inclus_exclu(inclusionSHP, exclusionSHP);
Map.addLayer(classArea.select("exclu"), { palette: "red" }, "exclu", false);
Map.addLayer(classArea.select("inclu"), { palette: "blue" }, "inclu", false);

// ===============================
// FUNCIONES DE CORRECCIÓN
// ===============================
/**
 * Determine whether a correction rule applies to the selected year.
 *
 * @param {number[]} lista - Eligible years. An empty list enables all years.
 * @param {number} y - Year being processed.
 * @returns {boolean} Whether the correction should run for this year.
 */
function aplicaAnio(lista, y) {
  return lista.length === 0 || lista.indexOf(y) !== -1;
}

// Imagen booleana (multibanda): 1 donde el píxel pertenece a alguna clase de la lista.
// Los píxeles enmascarados cuentan como clase 5 (No observado).
/**
 * Build a per-band mask of pixels matching any selected class.
 * Treat masked observations as class 5 before testing.
 *
 * @param {ee.Image} img - Monthly water classification.
 * @param {number[]} lista - Nonempty list of class codes to match.
 * @returns {ee.Image} Boolean mask aligned with the input bands.
 */
function esClase(img, lista) {
  var u = img.unmask(5);
  var acc = u.eq(lista[0]);
  lista.slice(1).forEach(function (c) {
    acc = acc.or(u.eq(c));
  });
  return acc;
}

// Reemplaza por "valor" los píxeles/bandas donde cond == 1. Rellena también píxeles enmascarados.
/**
 * Blend a constant class value into the selected pixels, including masked input pixels.
 *
 * @param {ee.Image} img - Classification to update.
 * @param {ee.Image} cond - Boolean mask selecting the replacement pixels.
 * @param {number} valor - New class code.
 * @returns {ee.Image} Updated classification image.
 */
function reemplazar(img, cond, valor) {
  var constImg = img.unmask(5).multiply(0).add(valor);
  return img.blend(constImg.updateMask(cond));
}

// ===============================
// MOSAICOS
// ===============================
var modules = require("users/rcamargo/projects-mapbiomas-water-c1:step-05-coleccion-1-1/Map001_module_mosaic_andes1");
var get_Collection = modules.get_Collection2;
var Collection_all = get_Collection(pais.geometry().bounds(), 70);

// ===============================
// PROCESAMIENTO POR AÑO
// ===============================
years.forEach(function (year) {
  var clasificacionAguayear = clasificacionAgua
    .filter(ee.Filter.eq("year", year))
    .max();
  var water = clasificacionAguayear.gte(1).and(clasificacionAguayear.lte(3));

  var Elim_Agua_frec = water
    .eq(1)
    .and(WaterGap_month_fred_imag_del.eq(1))
    .multiply(10)
    .selfMask();

  var clasificacionAguayearREMAP = clasificacionAguayear;

  // 1) Exclusión por asset: solo sobre clases NO protegidas (nunca toca 1, 2, 3)
  if (clases_excl.length > 0) {
    clasificacionAguayearREMAP = reemplazar(
      clasificacionAguayearREMAP,
      esClase(clasificacionAguayear, clases_excl).and(
        classArea.select("exclu").eq(1),
      ),
      valor_exclusion,
    );
  }

  // 2) Filtro de frecuencia
  clasificacionAguayearREMAP = clasificacionAguayearREMAP.where(
    Elim_Agua_frec,
    10,
  );

  // 3) Inclusión manual por polígono
  if (usar_correccion_manual && aplicaAnio(anios_correccion_manual, year)) {
    var mask_correccion = ee.Image.constant(1)
      .clip(correccion_agua_manual)
      .unmask(0)
      .eq(1);
    clasificacionAguayearREMAP = reemplazar(
      clasificacionAguayearREMAP,
      esClase(clasificacionAguayearREMAP, clases_a_corregir).and(
        mask_correccion,
      ),
      1,
    );
  }

  // 3b) Inclusión manual 2
  if (usar_correccion_manual_2 && aplicaAnio(anios_correccion_manual_2, year)) {
    var mask_correccion_2 = ee.Image.constant(1)
      .clip(correccion_agua_manual_2)
      .unmask(0)
      .eq(1);
    clasificacionAguayearREMAP = reemplazar(
      clasificacionAguayearREMAP,
      esClase(clasificacionAguayearREMAP, clases_a_corregir_2).and(
        mask_correccion_2,
      ),
      valor_inclusion_2,
    );
  }

  // 4) Exclusión manual por polígono: solo sobre clases NO protegidas (nunca toca 1, 2, 3)
  if (
    usar_exclusion_manual &&
    clases_excl.length > 0 &&
    aplicaAnio(anios_exclusion_manual, year)
  ) {
    var mask_exclusion = ee.Image.constant(1)
      .clip(correccion_excluir_agua_manual)
      .unmask(0)
      .eq(1);
    clasificacionAguayearREMAP = reemplazar(
      clasificacionAguayearREMAP,
      esClase(clasificacionAguayearREMAP, clases_excl).and(mask_exclusion),
      valor_exclusion,
    );
  }

  // 4b) Exclusión manual 2
  if (usar_exclusion_manual_2 && aplicaAnio(anios_exclusion_manual_2, year)) {
    var mask_exclusion_2 = ee.Image.constant(1)
      .clip(correccion_excluir_agua_manual_2)
      .unmask(0)
      .eq(1);
    clasificacionAguayearREMAP = reemplazar(
      clasificacionAguayearREMAP,
      esClase(clasificacionAguayearREMAP, clases_exclusion_2).and(
        mask_exclusion_2,
      ),
      valor_exclusion_2,
    );
  }

  // 5) Inclusión de cuerpos de agua externos (asset)
  clasificacionAguayearREMAP = clasificacionAguayearREMAP.where(
    classArea.select("inclu").eq(1),
    1,
  );

  // Paleta
  var pal = [
    "0000ff",
    "009900",
    "5af100",
    "ffffff",
    "000000",
    "ff0000",
    "ff60c7",
    "c6c6c6",
    "ffff00",
    "f7c504",
    "000000",
  ];

  // Fechas
  var start = ee.Date(String(year) + "-" + month.replace("w_", "") + "-01");
  var end = start.advance(1, "month");
  var CollectionYear = Collection_all.filterDate(start, end);

  // Capas de control
  Map.addLayer(
    CollectionYear.median(),
    { bands: ["swir1", "nir", "red"], min: 200, max: 4000 },
    "mosaic-" + year,
    false,
  );
  Map.addLayer(
    clasificacionAguayear.select(month),
    { min: 1, max: 11, palette: pal },
    "clasif-" + year + "-" + month,
    false,
  );
  // Esta capa corresponde EXACTAMENTE a lo que se exporta (ya con todas las correcciones)
  Map.addLayer(
    clasificacionAguayearREMAP.select(month),
    { min: 1, max: 11, palette: pal },
    "clasif-remap-" + year + "-" + month,
    false,
  );

  // Añadir propiedad de año
  clasificacionAguayearREMAP = clasificacionAguayearREMAP.set("year", year);

  // Exportar
  Export.image.toAsset({
    image: clasificacionAguayearREMAP,
    description: "water-" + year,
    assetId:
      "projects/mapbiomas-venezuela/assets/AGUA/SUPERFICIE/COLECCION4/POSTPROCESSING/04-remap-01/" +
      "water-" +
      year,
    region: pais.geometry().bounds(),
    scale: 30,
    pyramidingPolicy: { ".default": "mode" },
    maxPixels: 1e13,
  });
});

if (usar_correccion_manual) {
  Map.addLayer(
    correccion_agua_manual,
    { color: "yellow" },
    "correccion_agua_manual (poligono)",
    false,
  );
}
if (usar_correccion_manual_2) {
  Map.addLayer(
    correccion_agua_manual_2,
    { color: "orange" },
    "correccion_agua_manual_2 (poligono)",
    false,
  );
}
if (usar_exclusion_manual) {
  Map.addLayer(
    correccion_excluir_agua_manual,
    { color: "cyan" },
    "correccion_excluir_agua_manual (poligono)",
    false,
  );
}

if (usar_exclusion_manual_2) {
  Map.addLayer(
    correccion_excluir_agua_manual_2,
    { color: "magenta" },
    "correccion_excluir_agua_manual_2 (poligono)",
    false,
  );
}

Map.addLayer(grids.style({ fillColor: "00000000" }), {}, "grids", true);
