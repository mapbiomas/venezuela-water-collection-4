/**
 * @fileoverview Classify annual water bodies for MapBiomas Venezuela Collection 4.
 * Train one Random Forest model with the aggregated samples, classify indexed SNIC objects,
 * and apply water-surface evidence, ancillary masks, and manual corrections. Export the
 * adjusted annual rasters and, when enabled, tables recording the correction geometries.
 */

// =====================================================================================
// CLASIFICACIÓN DE CUERPOS DE AGUA — MapBiomas Venezuela Col. 4
// Con corrección manual (remapeo por clase + eliminación de falsos positivos)
// Modificado por: Nelly Rivero
// Fecha: 15/10/2025
// =====================================================================================
//
// FLUJO DE USO
//  1. Ejecuta el script una vez (Run). Se crean automáticamente, en las herramientas de
//     dibujo, una capa "remap_cXX_..." por clase y una capa "eliminar_falsos_positivos".
//     Quedan guardadas como Imports del script.
//  2. Revisa "Clasificación ANTES <año>" y dibuja polígonos/rectángulos:
//       - en la capa remap_cXX_... sobre los píxeles de agua que deben pasar a la clase XX
//         (p. ej. la parte del embalse que la máscara auxiliar no cubrió);
//       - en eliminar_falsos_positivos sobre los píxeles de agua que no son agua.
//  3. Vuelve a ejecutar (Run). Revisa "Clasificación AJUSTADA <año>", "Píxeles eliminados" y "Píxeles añadidos".
//  4. Lanza las tareas en la pestaña Tasks: se exporta SOLO la clasificación ajustada.
//
// NOTAS
//  - El remapeo manual solo cambia la clase de píxeles que ya son agua, EXCEPTO para las
//    clases listadas en param.clasesRellenoManual (por defecto 1 natural y 13 petróleo):
//    sus polígonos también rellenan los píxeles vacíos dentro del polígono.
//    Revisa la capa "Píxeles añadidos (relleno)" para ver qué se agregó.
//  - remap_c01_natural_solo_cambio: segundo remapeo a natural que SOLO cambia la clase del
//    agua existente dentro del polígono a 1 (no agrega píxeles). Se aplica después de los
//    demás remapeos, así que prevalece sobre ellos; la eliminación sigue siendo lo último.
//  - Si dos polígonos de clases distintas se superponen, gana la clase de código mayor
//    (se aplican en orden 1→15). La eliminación se aplica al final y prevalece sobre todo.
//  - Clases nuevas: 14 salinas naturales y 15 salinas artificiales (máscara sobre el agua
//    detectada, igual que gas/petróleo). Tienen sus capas remap_c14_/remap_c15_.
//  - Inclusión de minería (LagunasO_AAAA_AAAA): cada asset aplica solo a los años de su
//    intervalo (param.intervalosInclusionMineria). Los polígonos se AGREGAN al mapa con
//    valor 4, antes de las correcciones manuales (así puedes remapear o eliminar sobre ellos).
//    Si un año no tiene intervalo o falta el asset, se avisa en la Consola y queda sin inclusión.
//  - Orden del proceso: RF → máscaras automáticas (1–15) → inclusión minería →
//    remapeo manual → eliminación de falsos positivos → exportación.
//  - correccionesPorAnio = false → las mismas capas se aplican a todos los años.
//    correccionesPorAnio = true  → se crea un juego de capas por año (sufijo _AAAA),
//    útil cuando un falso positivo existe en un año y no en otro.
// =====================================================================================

// ********************************************************************************************************************************************************
// PARAMS

/**
 * Source and output assets, target years, annual presence threshold, and rules for
 * auxiliary and manual corrections.
 * @type {Object}
 */
var param = {
  pais: "VENEZUELA",
  version: 1,
  nGrids: 11,
  carpetaSnicObjIndex:
    "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/",
  assetSalida:
    "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/CLASIFICACION_CH_COL4/Clasificacion_CH_Vzla_Col4/",
  assetMapBiomas:
    "projects/mapbiomas-venezuela/assets/LANDSAT/VENEZUELA-3/integracion/VENEZUELA-8",
  assetTemporalBehavior:
    "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/temporal-behavior_00_25_col4",
  assetMuestrasAgrupadas:
    "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/MUESTRAS-AGRUPADAS/treinamento-VENEZUELA",
  assetSuperficieAgua:
    "projects/mapbiomas-venezuela/assets/AGUA/SUPERFICIE/COLECCION3/POSTPROCESSING/04-remap-04",
  // Valores del remap que se consideran agua.
  valoresAgua: [1, 2, 3, 9],
  // Mínimo de bandas (meses) con agua para considerar el píxel como agua (igual que antes: 6).
  minMesesAgua: 6,
  // Píxeles de agua de la superficie que no tienen objeto SNIC clasificado:
  // true → se incluyen con 'claseAguaSinObjeto' (1 = natural) y luego pasan por las máscaras.
  rellenarAguaSinObjeto: true,
  claseAguaSinObjeto: 1,

  assetlagunasglaciaresVector:
    "projects/mapbiomas-venezuela/assets/AGUA/DATOS_AUXILIARES/VECTOR/Lagunas_Glaciares",
  assetabastecimientoaguaVector:
    "projects/mapbiomas-venezuela/assets/AGUA/DATOS_AUXILIARES/VECTOR/Abastecimiento",
  assetriegoVector:
    "projects/mapbiomas-venezuela/assets/AGUA/DATOS_AUXILIARES/VECTOR/Riego",
  assetmixtoVector:
    "projects/mapbiomas-venezuela/assets/AGUA/DATOS_AUXILIARES/VECTOR/Mixto",
  assetHidrelectricaRaster:
    "projects/mapbiomas-venezuela/assets/AGUA/DATOS_AUXILIARES/RASTER/Hidroelectnueva2",
  assetHidrelectricaVector:
    "projects/mapbiomas-venezuela/assets/AGUA/DATOS_AUXILIARES/VECTOR/hidrelectricasnueva2",
  assetOtrosusosVector:
    "projects/mapbiomas-venezuela/assets/AGUA/DATOS_AUXILIARES/VECTOR/OtrosUsosAntropicos",
  assetGASVector:
    "projects/mapbiomas-venezuela/assets/AGUA/DATOS_AUXILIARES/VECTOR/Gasiferos",
  assetPetroleoVector:
    "projects/mapbiomas-venezuela/assets/AGUA/DATOS_AUXILIARES/VECTOR/pozospetroleros",

  // ---- Nuevas clases (enmascaradas sobre el agua ya detectada) ----
  assetSalinasNaturalesVector:
    "projects/mapbiomas-venezuela/assets/AGUA/DATOS_AUXILIARES/VECTOR/Salinas_Naturales",
  assetSalinasArtificialesVector:
    "projects/mapbiomas-venezuela/assets/AGUA/DATOS_AUXILIARES/VECTOR/Salinas_Artificiales",
  // Buffer (m) aplicado a los polígonos de salinas. 0 = sin buffer (recomendado: las salinas
  // suelen estar junto a lagunas costeras o al mar, y un buffer las haría invadir esos cuerpos).
  bufferSalinas: 0,

  // ---- Inclusión de polígonos de minería (se AGREGAN a la clasificación con valor 4) ----
  // Assets agrupados por intervalos de años: cada asset afecta SOLO a los años de su intervalo
  // (inicio y fin incluidos). Si un año no cae en ningún intervalo, se procesa sin inclusión.
  inclusionMineriaActiva: true,
  carpetaInclusionMineria:
    "projects/mapbiomas-venezuela/assets/AGUA/DATOS_AUXILIARES/VECTOR/",
  intervalosInclusionMineria: [
    { asset: "LagunasO_2000_2004", desde: 2000, hasta: 2004 },
    { asset: "LagunasO_2005_2009", desde: 2005, hasta: 2009 },
    { asset: "LagunasO_2010_2015", desde: 2010, hasta: 2015 },
    { asset: "LagunasO_2016_2018", desde: 2016, hasta: 2018 },
    { asset: "LagunasO_2019_2021", desde: 2019, hasta: 2021 },
    { asset: "LagunasO_2022_2024", desde: 2022, hasta: 2024 },
    { asset: "LagunasO_2025", desde: 2025, hasta: 2025 },
  ],
  // false → incluye todo el polígono como minería (aunque la Col. 3 no detecte agua).
  // true  → incluye solo donde la Col. 3 registró agua al menos 'rellenoMinMeses' meses.
  inclusionMineriaSoloConAgua: false,

  // ---- Corrección manual ----
  correccionesPorAnio: false,
  // Clases cuyos polígonos de remapeo TAMBIÉN rellenan píxeles vacíos dentro del polígono
  // (p. ej. huecos en el Lago de Maracaibo o el Lago de Valencia). 1 = natural, 13 = petróleo.
  // Agrega otros códigos si lo necesitas (p. ej. 3 o 10 para embalses).
  clasesRellenoManual: [1, 13],
  // true  → solo rellena donde la Col. 3 registró agua al menos 'rellenoMinMeses' meses
  //         (protege la orilla si el polígono se sale un poco del lago).
  // false → rellena todo el interior del polígono.
  rellenoSoloConAgua: false,
  rellenoMinMeses: 1,
  // Exporta los polígonos de corrección como tabla (trazabilidad). La carpeta debe existir.
  exportarCorrecciones: true,
  assetCorrecciones:
    "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/CORRECCIONES_MANUALES/",

  // Región de exportación (Venezuela). Puedes reemplazarla por la geometría del límite país.
  regionExport: ee.Geometry.Rectangle([-73.6, 0.5, -59.6, 12.4], null, false),

  processYear: [
    "2000",
    "2001",
    "2002",
    "2003",
    "2004",
    "2005",
    // '2006','2007','2008','2009','2010','2011',
    // '2012','2013','2014','2015','2016','2017','2018',
    // '2019','2020','2021','2022','2023','2024', '2025'
  ],
};

// Clases del producto final (mismo orden y colores que la paleta de visualización).
// Ajusta los nombres si lo deseas: se usan para nombrar las capas de dibujo (sin espacios).
/**
 * Class codes, names, and colors used by the map and drawing layers.
 * @type {Array<{code: number, name: string, color: string}>}
 */
var CLASES = [
  { code: 1, name: "c01_natural", color: "0000ff" },
  { code: 2, name: "c02", color: "00ffff" },
  { code: 3, name: "c03_embalse_hidro", color: "ff02f7" },
  { code: 4, name: "c04_mineria", color: "ff0000" },
  { code: 5, name: "c05_acuicultura", color: "000000" },
  { code: 6, name: "c06_lagunas_glaciares", color: "008000" },
  { code: 7, name: "c07_abastecimiento", color: "F54927" },
  { code: 8, name: "c08_riego", color: "3B1B63" },
  { code: 9, name: "c09_mixto", color: "62631B" },
  { code: 10, name: "c10_hidroelectricas", color: "ff00ff" },
  { code: 11, name: "c11_otros_usos", color: "800080" },
  { code: 12, name: "c12_gas", color: "a52a2a" },
  { code: 13, name: "c13_petroleo", color: "808080" },
  { code: 14, name: "c14_salinas_naturales", color: "ffb6c1" },
  { code: 15, name: "c15_salinas_artificiales", color: "d2691e" },
];

var PALETA = CLASES.map(function (c) {
  return c.color;
});
var VIS_CLASES = { min: 1, max: CLASES.length, palette: PALETA };

// ********************************************************************************************************************************************************
// GENERAL

var nGrids = param.nGrids;
var classProperty = "class";
var exportAsset = param.assetSalida;

var collectionNames = ee.data
  .getList({ id: param.carpetaSnicObjIndex })
  .map(function (item) {
    return ee.String(item.id);
  });

/**
 * Read the year token from the configured indexed-object asset naming convention.
 *
 * @param {ee.String|string} collectionName - Indexed-object asset ID.
 * @returns {ee.ComputedObject} Year token from the underscore-delimited ID.
 */
var extractYear = function (collectionName) {
  return ee.String(collectionName).split("_").get(5);
};

print(ee.String(ee.List(collectionNames).get(0)).split("_"));
print("collectionNames", collectionNames);

/**
 * Group indexed-object asset IDs by the year in their names.
 *
 * @param {Array<ee.String>} collectionNames - Asset IDs from the SNIC index folder.
 * @returns {ee.Dictionary} Asset ID lists keyed by year.
 */
var groupCollectionsByYear = function (collectionNames) {
  var yearDict = ee.Dictionary({});
  collectionNames.map(function (name) {
    var year = extractYear(name);
    var existingCollections = ee.List(yearDict.get(year, ee.List([])));
    yearDict = yearDict.set(year, existingCollections.add(name));
  });
  return yearDict;
};

var listYears = param.processYear;
/**
 * Fields selected for classifier training and object classification.
 * @type {string[]}
 */
var listSelect = [
  "class",
  "freq_tempPr",
  "morp_convex",
  "data_mpbCls",
  "morp_perime",
  "morp_aream2",
  "morp_r_circ",
  "data_mpbFor",
  "freq_meanAn",
  "data_hydNat",
  "freq_meanTo",
  "data_mpbAgr",
  "morp_r_elon",
  "morp_r_laCu",
  "morp_r_shpf",
  "morp_r_aPeC",
  "data_mpbMin",
  "freq_tempUl",
  "morp_maxExt",
  "data_srtmMx",
  "morp_nrViim",
  "morp_nrVi50",
  "data_mpbNnf",
  "data_otr_nat_area",
  "data_mpbUrb",
  "morp_r_aPer",
  "data_mpbPas",
];

// ********************************************************************************************************************************************************
// ASSETS Y MÁSCARAS AUXILIARES

var samples = ee.FeatureCollection(param.assetMuestrasAgrupadas);
var trainingPoints = samples
  .select(listSelect)
  .filter(ee.Filter.notNull(["freq_tempPr"]));
var hidreletica_shp = ee.FeatureCollection(param.assetHidrelectricaVector);

// bufferM: buffer en metros (por defecto 100, como en las capas auxiliares originales).
//          Con 0 se rasteriza el polígono tal cual, sin buffer.
/**
 * Rasterize auxiliary features, optionally after buffering their geometries.
 *
 * @param {ee.FeatureCollection} fc - Auxiliary features to rasterize.
 * @param {number} [bufferM=100] - Buffer in meters. A value of 0 uses the input geometry directly.
 * @returns {ee.Image} Auxiliary mask on a 30 m grid in EPSG:4326.
 */
var process_fc = function (fc, bufferM) {
  bufferM = bufferM === undefined ? 100 : bufferM;
  var fc_processed = fc.map(function (feat) {
    if (bufferM === 0) {
      return ee.Feature(feat.geometry()).set("id_raster", 1);
    }
    var reproj = feat.transform("EPSG:32719", 1);
    var buffered = reproj.buffer(bufferM);
    return ee.Feature(buffered).set("id_raster", 1);
  });
  return fc_processed
    .reduceToImage({ properties: ["id_raster"], reducer: ee.Reducer.first() })
    .rename("id_raster")
    .reproject({ crs: "EPSG:4326", scale: 30 });
};

var lag_glaciares = process_fc(
  ee.FeatureCollection(param.assetlagunasglaciaresVector),
);
var abastecimientoagua = process_fc(
  ee.FeatureCollection(param.assetabastecimientoaguaVector),
);
var riego = process_fc(ee.FeatureCollection(param.assetriegoVector));
var mixto = process_fc(ee.FeatureCollection(param.assetmixtoVector));
var hidroelectricas = process_fc(
  ee.FeatureCollection(param.assetHidrelectricaVector),
);
var otros_usos = process_fc(ee.FeatureCollection(param.assetOtrosusosVector));
var gas = process_fc(ee.FeatureCollection(param.assetGASVector));
var petroleo = process_fc(ee.FeatureCollection(param.assetPetroleoVector));

// Nuevas clases (máscara sobre el agua detectada)
var salinas_naturales = process_fc(
  ee.FeatureCollection(param.assetSalinasNaturalesVector),
  param.bufferSalinas,
);
var salinas_artificiales = process_fc(
  ee.FeatureCollection(param.assetSalinasArtificialesVector),
  param.bufferSalinas,
);

// Inclusión de polígonos de minería: busca el intervalo que contiene el año.
// Devuelve null si el año no cae en ningún intervalo o si el asset no existe.
/**
 * Check whether Earth Engine can retrieve the asset metadata.
 *
 * @param {string} id - Full Earth Engine asset ID.
 * @returns {boolean} True when the lookup succeeds.
 */
var assetExiste = function (id) {
  try {
    ee.data.getAsset(id);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Resolve the mining inclusion polygons for the selected year.
 *
 * @param {number|string} year - Year to compare against the inclusive intervals.
 * @returns {?{id: string, fc: ee.FeatureCollection, img: ee.Image}} Matching asset, features, and mask when available.
 */
var cargarInclusionMineria = function (year) {
  if (!param.inclusionMineriaActiva) {
    return null;
  }
  var y = Number(year);
  var intervalo = null;
  param.intervalosInclusionMineria.forEach(function (iv) {
    if (y >= iv.desde && y <= iv.hasta) {
      intervalo = iv;
    }
  });
  if (intervalo === null) {
    print(
      "⚠ Inclusión minería: " +
        year +
        " no cae en ningún intervalo → se procesa sin inclusión",
    );
    return null;
  }
  var id = param.carpetaInclusionMineria + intervalo.asset;
  if (!assetExiste(id)) {
    print(
      "⚠ Inclusión minería: no existe el asset " +
        id +
        " → " +
        year +
        " se procesa sin inclusión",
    );
    return null;
  }
  var fc = ee.FeatureCollection(id);
  // Sin buffer: se agregan tal cual. unmask(0) → 1 dentro del polígono, 0 fuera.
  return { id: id, fc: fc, img: process_fc(fc, 0).unmask(0) };
};

var collectionsByYear = groupCollectionsByYear(collectionNames);

// Hidroeléctrica (raster) replicado como banda por año
var singleImage = ee.Image(
  ee.ImageCollection(param.assetHidrelectricaRaster).first(),
);
var years = ee.List.sequence(2000, 2025);
var multiBandImage = ee.Image(
  years.iterate(function (year, imgAcc) {
    var bandName = ee
      .String("classification_")
      .cat(ee.Number(year).format("%d"));
    return ee.Image(imgAcc).addBands(singleImage.rename([bandName]));
  }, ee.Image([])),
);
var hidroMask2 = ee.ImageCollection([multiBandImage]);

// MapBiomas LULC (2023–2025 replican 2022)
var mapb = ee.Image(param.assetMapBiomas);
mapb = mapb.addBands(
  mapb.select("classification_2022").rename("classification_2023"),
);
mapb = mapb.addBands(
  mapb.select("classification_2022").rename("classification_2024"),
);
mapb = mapb.addBands(
  mapb.select("classification_2022").rename("classification_2025"),
);

// Clasificador RF (igual para todos los años, se entrena una sola vez)
var classifier = ee.Classifier.smileRandomForest(100).train({
  features: trainingPoints,
  classProperty: classProperty,
  inputProperties: listSelect,
});

// ********************************************************************************************************************************************************
// CAPAS DE CORRECCIÓN MANUAL (se crean automáticamente en las herramientas de dibujo)

var drawingTools = Map.drawingTools();
drawingTools.setShown(true);
drawingTools.setLinked(true); // quedan guardadas como Imports
drawingTools.setDrawModes(["point", "polygon", "rectangle"]); // punto = marca de referencia
drawingTools.setShape(null);

/**
 * Find a drawing layer by its exact name.
 *
 * @param {string} nombre - Name of the drawing layer.
 * @returns {?ui.Map.GeometryLayer} Matching layer when available.
 */
var buscarCapa = function (nombre) {
  var encontrada = null;
  drawingTools.layers().forEach(function (capa) {
    if (capa.getName() === nombre) {
      encontrada = capa;
    }
  });
  return encontrada;
};

/**
 * Use an existing drawing layer or add it to the map's drawing tools.
 *
 * @param {string} nombre - Name for the drawing layer.
 * @param {string} color - Color for a newly created layer.
 * @returns {ui.Map.GeometryLayer} Resolved layer.
 */
var obtenerOCrearCapa = function (nombre, color) {
  var capa = buscarCapa(nombre);
  if (capa === null) {
    capa = ui.Map.GeometryLayer({
      geometries: null,
      name: nombre,
      color: color,
      shown: true,
    });
    drawingTools.layers().add(capa);
  }
  return capa;
};

/**
 * Build the drawing-layer suffix used for year-specific corrections.
 *
 * @param {number|string} year - Year of the target classification.
 * @returns {string} Underscore and year for per-year layers or an empty suffix for shared layers.
 */
var sufijo = function (year) {
  return param.correccionesPorAnio ? "_" + year : "";
};

/**
 * Prepare class remap layers and the false-positive removal layer.
 *
 * @param {number|string} year - Year used to resolve the drawing-layer names.
 * @returns {Object} Object containing the remap list and removal layer.
 */
var crearCapasCorreccion = function (year) {
  var remap = CLASES.map(function (c) {
    return {
      code: c.code,
      capa: obtenerOCrearCapa("remap_" + c.name + sufijo(year), c.color),
      soloReclasificar: false,
    };
  });
  // Segundo remapeo a natural: SOLO cambia la clase del agua existente a 1 (no agrega píxeles).
  // Va al final de la lista, así prevalece sobre los demás polígonos de remapeo.
  remap.push({
    code: 1,
    capa: obtenerOCrearCapa(
      "remap_c01_natural_solo_cambio" + sufijo(year),
      "6495ed",
    ),
    soloReclasificar: true,
  });
  var eliminar = obtenerOCrearCapa(
    "eliminar_falsos_positivos" + sufijo(year),
    "ffff00",
  );
  return { remap: remap, eliminar: eliminar };
};

/**
 * Check whether a drawing layer contains geometries.
 *
 * @param {ui.Map.GeometryLayer} capa - Drawing layer to inspect.
 * @returns {boolean} True when the layer contains at least one geometry.
 */
var tieneGeometrias = function (capa) {
  return capa.geometries().length() > 0;
};

// Geometrías de una capa (puntos y polígonos) → FeatureCollection con su tipo de geometría
/**
 * Convert drawn geometries into features with their geometry type and correction
 * properties.
 *
 * @param {ui.Map.GeometryLayer} capa - Drawing layer to convert.
 * @param {Object} props - Properties to copy to each feature.
 * @returns {ee.FeatureCollection} Features with geom_tipo and the supplied properties.
 */
var featuresDeCapa = function (capa, props) {
  var feats = capa
    .geometries()
    .getJsArray()
    .map(function (g) {
      return ee.Feature(g, props);
    });
  return ee.FeatureCollection(feats).map(function (f) {
    return f.set("geom_tipo", f.geometry().type());
  });
};

// Solo los polígonos/rectángulos modifican la clasificación.
// Los puntos son marcas de referencia (áreas por corregir) y no alteran píxeles.
/**
 * Select polygons and multipolygons eligible for raster correction.
 *
 * @param {ee.FeatureCollection} fc - Drawn features with geom_tipo.
 * @returns {ee.FeatureCollection} Polygon features.
 */
var soloPoligonos = function (fc) {
  return fc.filter(ee.Filter.inList("geom_tipo", ["Polygon", "MultiPolygon"]));
};

/**
 * Select point and multipoint geometries used as reference marks.
 *
 * @param {ee.FeatureCollection} fc - Drawn features with geom_tipo.
 * @returns {ee.FeatureCollection} Point features.
 */
var soloPuntos = function (fc) {
  return fc.filter(ee.Filter.inList("geom_tipo", ["Point", "MultiPoint"]));
};

// Polígonos → imagen 0/1 sin máscara
/**
 * Rasterize correction polygons into a binary mask.
 *
 * @param {ee.FeatureCollection} fcPoligonos - Polygons to paint.
 * @returns {ee.Image} Byte image with 1 inside painted geometries and 0 elsewhere.
 */
var aMascara = function (fcPoligonos) {
  return ee.Image(0).byte().paint(fcPoligonos, 1);
};

// Aplica el remapeo manual por clase y luego elimina falsos positivos
/**
 * Apply manual class remaps and optional fill, then mask false positives.
 * Collect the geometries and pixel diagnostics for inspection and export.
 *
 * @param {ee.Image} img - Water-body classification before manual correction.
 * @param {Object} capas - Remap and removal layers from crearCapasCorreccion.
 * @param {number|string} year - Year recorded on correction features.
 * @param {ee.Image} aguaEvidencia - Binary mask of water evidence for restricted fill.
 * @returns {Object} Corrected image, added and removed pixels, and correction feature collections.
 */
var aplicarCorrecciones = function (img, capas, year, aguaEvidencia) {
  var registro = [];
  var antes = img;
  var anadidos = ee.Image(0).byte(); // acumula los píxeles añadidos por relleno

  capas.remap.forEach(function (r) {
    if (tieneGeometrias(r.capa)) {
      var rellena =
        !r.soloReclasificar && param.clasesRellenoManual.indexOf(r.code) !== -1;
      var fc = featuresDeCapa(r.capa, {
        tipo: rellena
          ? "remap_relleno"
          : r.soloReclasificar
            ? "remap_solo_cambio"
            : "remap",
        clase: r.code,
        capa: r.capa.getName(),
        year: year,
      });
      var m = aMascara(soloPoligonos(fc)).eq(1);

      if (rellena) {
        // Clases con relleno: el polígono reclasifica el agua existente Y completa los
        // píxeles vacíos (sin clasificar) dentro de él.
        var zonaRelleno = param.rellenoSoloConAgua ? m.and(aguaEvidencia) : m;
        anadidos = anadidos.or(zonaRelleno.and(antes.mask().not()));
        img = img
          .unmask(0)
          .where(m.and(img.mask()), r.code) // reclasifica agua existente
          .where(zonaRelleno, r.code) // rellena vacíos
          .selfMask();
      } else {
        // where() solo actúa sobre píxeles no enmascarados → solo cambia píxeles que ya son agua
        img = img.where(m, r.code);
      }
      registro.push(fc);
    }
  });

  var eliminados = null;
  if (tieneGeometrias(capas.eliminar)) {
    var fcElim = featuresDeCapa(capas.eliminar, {
      tipo: "eliminar",
      clase: 0,
      capa: capas.eliminar.getName(),
      year: year,
    });
    var mElim = aMascara(soloPoligonos(fcElim));
    eliminados = antes.updateMask(mElim.eq(1));
    img = img.updateMask(mElim.eq(0));
    registro.push(fcElim);
  }

  return {
    img: img,
    eliminados: eliminados,
    anadidos: anadidos.selfMask(),
    registro: registro,
  };
};

// Crear todas las capas antes de procesar (así aparecen desde la primera ejecución)
var capasPorAnio = {};
listYears.forEach(function (year) {
  capasPorAnio[year] = crearCapasCorreccion(year);
});

// ********************************************************************************************************************************************************
// PROCESO POR AÑO

listYears.forEach(function (year) {
  // Merge de TODAS las grillas SNIC del año (antes se tomaban solo las primeras nGrids:
  // si un año tenía más grillas, las sobrantes quedaban fuera y su zona salía sin agua).
  var list = ee.List(collectionsByYear.get(year)).getInfo();
  print(
    "Grillas SNIC " +
      year +
      ": " +
      list.length +
      " (esperadas: " +
      nGrids +
      ")",
    list,
  );
  if (list.length !== nGrids) {
    print(
      "⚠ " +
        year +
        ": el número de grillas SNIC no coincide con nGrids. Revisa la carpeta SNIC_OBJ_REGION_INDEX2.",
    );
  }
  var merged = ee.FeatureCollection([]);
  for (var id = 0; id < list.length; id++) {
    merged = merged.merge(ee.FeatureCollection(list[id]));
  }

  var mapb2 = mapb.select("classification_" + year);
  var hidreMask = hidroMask2
    .mosaic()
    .clip(hidreletica_shp)
    .select("classification_" + year);

  // Clasificación RF de los objetos
  var collection = merged
    .select(listSelect)
    .filter(ee.Filter.notNull(["freq_tempPr"]));
  var classified = collection.classify(classifier);

  var listBands = ["classification"];
  var img = classified.reduceToImage({
    properties: listBands,
    reducer: ee.Reducer.firstNonNull().forEach(listBands),
  });
  Map.addLayer(
    img,
    { min: 1, max: 5, palette: ["blue", "cyan", "cyan", "cyan", "black"] },
    "RF sin máscaras " + year,
    false,
  );

  // Máscaras LULC
  var mineria = mapb2.eq(30).selfMask();
  var acuicultura = mapb2.eq(31).selfMask();
  Map.addLayer(mineria, { palette: "red" }, "minería lulc " + year, false);
  Map.addLayer(
    acuicultura,
    { palette: "black" },
    "acuicultura lulc " + year,
    false,
  );

  // Superficie de agua (Col. 3)
  var remapSup = ee
    .ImageCollection(param.assetSuperficieAgua)
    .filter(ee.Filter.eq("year", Number(year)))
    .mosaic();
  // Valores de agua del remap (param.valoresAgua). Antes solo se tomaban 1–3 y se perdía el 9.
  var water = remapSup.eq(param.valoresAgua[0]);
  param.valoresAgua.slice(1).forEach(function (v) {
    water = water.or(remapSup.eq(v));
  });
  water = water.selfMask();
  var water_freq = water
    .reduce(ee.Reducer.sum())
    .gte(param.minMesesAgua)
    .selfMask();
  Map.addLayer(
    water_freq,
    { palette: "blue" },
    "superficie de agua " + year,
    false,
  );

  // Diagnóstico: agua de la superficie que NO tiene objeto SNIC clasificado
  // (grilla faltante, objetos con freq_tempPr nulo o zonas sin segmentar).
  var aguaSinObjeto = water_freq.unmask(0).and(img.mask().not()).selfMask();
  Map.addLayer(
    aguaSinObjeto,
    { palette: "ff00ff" },
    "DIAGNÓSTICO: agua sin objeto SNIC " + year,
    false,
  );

  // Relleno: esos píxeles de agua reciben la clase por defecto (1 = natural) y luego pasan
  // por las máscaras auxiliares como el resto (embalses, minería, salinas, etc.).
  if (param.rellenarAguaSinObjeto) {
    img = img.unmask(param.claseAguaSinObjeto);
  }

  img = img.updateMask(water_freq);

  // Enmascaramiento automático por capas auxiliares
  img = img
    .remap([1, 2, 3, 4, 5], [1, 2, 3, 4, 1])
    .where(mineria.eq(1), 4)
    .where(hidreMask.eq(5), 3)
    .where(acuicultura.eq(1), 5)
    .where(img.gte(1).and(lag_glaciares.eq(1)), 6)
    .where(img.gte(1).and(abastecimientoagua.eq(1)), 7)
    .where(img.gte(1).and(riego.eq(1)), 8)
    .where(img.gte(1).and(mixto.eq(1)), 9)
    .where(img.gte(1).and(hidroelectricas.eq(1)), 10)
    .where(img.gte(1).and(otros_usos.eq(1)), 11)
    .where(img.gte(1).and(gas.eq(1)), 12)
    .where(img.gte(1).and(petroleo.eq(1)), 13)
    .where(img.gte(1).and(salinas_naturales.eq(1)), 14) // nueva clase
    .where(img.gte(1).and(salinas_artificiales.eq(1)), 15) // nueva clase
    .rename("classification");

  Map.addLayer(
    salinas_naturales.selfMask(),
    { palette: CLASES[13].color },
    "salinas naturales (aux) " + year,
    false,
  );
  Map.addLayer(
    salinas_artificiales.selfMask(),
    { palette: CLASES[14].color },
    "salinas artificiales (aux) " + year,
    false,
  );

  // Evidencia de agua (al menos 'rellenoMinMeses' con agua en la Col. 3).
  // Se usa para el relleno manual y, opcionalmente, para la inclusión de minería.
  var aguaEvidencia = water
    .reduce(ee.Reducer.sum())
    .gte(param.rellenoMinMeses)
    .unmask(0);

  // Inclusión de polígonos de minería del año → valor 4 (se agregan aunque no hubiera agua detectada)
  var incMin = cargarInclusionMineria(year);
  var aplicaInclusion = incMin !== null;
  if (aplicaInclusion) {
    var zonaInclusion = param.inclusionMineriaSoloConAgua
      ? incMin.img.eq(1).and(aguaEvidencia)
      : incMin.img.eq(1);
    var incluidos = zonaInclusion.and(img.mask().not()).selfMask(); // píxeles nuevos (antes vacíos)
    img = img
      .unmask(0)
      .where(zonaInclusion, 4)
      .selfMask()
      .rename("classification");
    print("Inclusión minería " + year + ": " + incMin.id);
    Map.addLayer(
      incluidos,
      { palette: "ff7f00" },
      "Píxeles incluidos (minería) " + year,
      false,
    );
    Map.addLayer(
      incMin.fc.style({ color: "ff0000", fillColor: "00000000", width: 1 }),
      {},
      "polígonos inclusión minería " + year,
      false,
    );
  }

  Map.addLayer(img, VIS_CLASES, "Clasificación ANTES " + year);

  // Corrección manual (remapeo + eliminación)

  var res = aplicarCorrecciones(img, capasPorAnio[year], year, aguaEvidencia);
  var imgFinal = res.img.rename("classification");

  Map.addLayer(
    res.anadidos,
    { palette: "00ff00" },
    "Píxeles añadidos (relleno) " + year,
    false,
  );

  if (res.eliminados !== null) {
    Map.addLayer(
      res.eliminados.gte(1).selfMask(),
      { palette: "ffff00" },
      "Píxeles eliminados " + year,
    );
  }
  Map.addLayer(imgFinal, VIS_CLASES, "Clasificación AJUSTADA " + year);
  print(
    "Correcciones aplicadas " +
      year +
      ": " +
      res.registro.length +
      " capa(s) con geometrías",
  );

  // Exportación (solo el resultado ajustado)
  imgFinal = imgFinal
    .byte()
    .set("year", year)
    .set("version", param.version)
    .set("pais", param.pais)
    .set("correccion_manual", res.registro.length > 0 ? 1 : 0)
    .set("inclusion_mineria", aplicaInclusion ? 1 : 0);

  Export.image.toAsset({
    image: imgFinal,
    description: "classification-" + year,
    assetId: exportAsset + "classification-" + year,
    region: param.regionExport,
    scale: 30,
    maxPixels: 1e13,
  });

  if (param.exportarCorrecciones && res.registro.length > 0) {
    Export.table.toAsset({
      collection: ee.FeatureCollection(res.registro).flatten(), // incluye puntos y polígonos (campo geom_tipo)
      description: "correcciones-" + year + "-v" + param.version,
      assetId:
        param.assetCorrecciones + "correcciones-" + year + "-v" + param.version,
    });
  }
});
