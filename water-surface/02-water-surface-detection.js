/**
 * @fileoverview Detect monthly surface water for MapBiomas Venezuela Collection 4.
 * Estimate water probability from Landsat observations with ecosystem-specific fuzzy rules
 * and spectral thresholds. Combine monthly, annual, and historical estimates and apply
 * terrain checks before exporting w_1 through w_12 for each configured year.
 */

//=================================================================
// SCRIPT OPTIMIZADO PARA AMAZONÍA Y GUAYANA VENEZOLANA
// Nelly Rivero / febrero 2026
// Ultima modificacion: marzo 2026
//=================================================================

/**
 * Run settings for regions, years, ecosystem, source observations, map previews, and
 * exports.
 * @type {Object}
 */
var param = {
  pais_name: "Venezuela",
  years: [2025],
  regionId: [1014],
  cloud_cover: 80,
  version: 1,
  asset_name: "clasificacion-01",

  // ECOSISTEMAS DISPONIBLES:
  // 'selva_humeda'         → Selva amazónica de baja altitud, alta biomasa
  // 'bosque_tropical'      → Bosques tropicales húmedos con dosel denso
  // 'bosque_montano'       → Tepuyes y laderas andinas, neblina frecuente
  // 'sabana'               → Llanos y sabanas abiertas (Gran Sabana)
  // 'humedal'              → Morichales, igapós, várzeas inundables
  // 'bosque_galeria'       → Bosques de ribera y galería amazónica
  ecosistema: "selva_humeda",

  Paleta: "pal-2",
  ExportAgua: true,
  Validacion: true,
  Comparacion: false,
  vis: {
    Visualizar_piloto: true,
    listbandMonth: [
      "w_1", // 'w_2','w_3','w_4','w_5','w_6',
      // 'w_7','w_8','w_9','w_10','w_11','w_12'
    ],
  },
};

//=================================================================
// CONFIGURACIONES POR ECOSISTEMA
//=================================================================
/**
 * Fuzzy-model ranges and classification thresholds keyed by ecosystem name.
 * @type {Object<string, Object>}
 */
var config_ecosistemas = {
  // ── 1. SELVA HÚMEDA AMAZÓNICA ────────────────────────────────

  selva_humeda: {
    paramfuzzy: {
      shade_min: 65,
      shade_max: 95,
      gv_soil_min: 0,
      gv_soil_max: 8,
      gv_min: 0,
      gv_max: 45,
      soil_min: 0,
      soil_max: 7,
      cloud_desc_min: 30,
      cloud_desc_max: 48,
      cloud_asc_min: 1,
      cloud_asc_max: 5,
      snow_min: 0,
      snow_max: 100,
    },
    paramClasif: {
      fill_gap_month: 0.45,
      fill_gap_year: 0.45,
      slppost2_corte: 6,
      p_img_month_gt: 0.8,
      p_img_month_lte: 0.42,
      slope_gte: 22,
      ndvi_max_water: 0.35,
      mndwi_min_water: -0.2,
      usar_mascara_mapbiomas: false,
    },
  },

  // ── 2. BOSQUE TROPICAL HÚMEDO ────────────────────────────────

  bosque_tropical: {
    paramfuzzy: {
      shade_min: 60,
      shade_max: 92,
      gv_soil_min: 0,
      gv_soil_max: 10,
      gv_min: 0,
      gv_max: 55,
      soil_min: 0,
      soil_max: 6,
      cloud_desc_min: 28,
      cloud_desc_max: 50,
      cloud_asc_min: 1,
      cloud_asc_max: 5,
      snow_min: 0,
      snow_max: 100,
    },
    paramClasif: {
      fill_gap_month: 0.4,
      fill_gap_year: 0.4,
      slppost2_corte: 5,
      p_img_month_gt: 0.75,
      p_img_month_lte: 0.38,
      slope_gte: 20,
      ndvi_max_water: 0.4,
      mndwi_min_water: -0.3,
      usar_mascara_mapbiomas: false,
    },
  },

  // ── 3. BOSQUE MONTANO (TEPUYES Y LADERAS) ────────────────────

  bosque_montano: {
    paramfuzzy: {
      shade_min: 70,
      shade_max: 95,
      gv_soil_min: 0,
      gv_soil_max: 7,
      gv_min: 0,
      gv_max: 40,
      soil_min: 0,
      soil_max: 10,
      cloud_desc_min: 35,
      cloud_desc_max: 55,
      cloud_asc_min: 1,
      cloud_asc_max: 8,
      snow_min: 0,
      snow_max: 100,
    },
    paramClasif: {
      fill_gap_month: 0.5,
      fill_gap_year: 0.5,
      slppost2_corte: 8,
      p_img_month_gt: 0.85,
      p_img_month_lte: 0.5,
      slope_gte: 30,
      ndvi_max_water: 0.3,
      mndwi_min_water: -0.15,
      usar_mascara_mapbiomas: false,
    },
  },

  // ── 4. SABANA (GRAN SABANA Y LLANOS DEL SUR) ─────────────────

  sabana: {
    paramfuzzy: {
      shade_min: 65,
      shade_max: 90,
      gv_soil_min: 0,
      gv_soil_max: 8,
      gv_min: 0,
      gv_max: 35,
      soil_min: 0,
      soil_max: 15,
      cloud_desc_min: 25,
      cloud_desc_max: 45,
      cloud_asc_min: 1,
      cloud_asc_max: 5,
      snow_min: 0,
      snow_max: 100,
    },
    paramClasif: {
      fill_gap_month: 0.45,
      fill_gap_year: 0.45,
      slppost2_corte: 6,
      p_img_month_gt: 0.8,
      p_img_month_lte: 0.45,
      slope_gte: 18,
      ndvi_max_water: 0.25,
      mndwi_min_water: -0.1,
      usar_mascara_mapbiomas: false,
    },
  },

  // ── 5. HUMEDAL (MORICHALES, IGAPÓS, VÁRZEAS) ─────────────────

  humedal: {
    paramfuzzy: {
      shade_min: 58,
      shade_max: 90,
      gv_soil_min: 0,
      gv_soil_max: 12,
      gv_min: 0,
      gv_max: 60,
      soil_min: 0,
      soil_max: 8,
      cloud_desc_min: 28,
      cloud_desc_max: 50,
      cloud_asc_min: 1,
      cloud_asc_max: 5,
      snow_min: 0,
      snow_max: 100,
    },
    paramClasif: {
      fill_gap_month: 0.35,
      fill_gap_year: 0.35,
      slppost2_corte: 4,
      p_img_month_gt: 0.7,
      p_img_month_lte: 0.35,
      slope_gte: 15,
      ndvi_max_water: 0.5,
      mndwi_min_water: -0.35,
      usar_mascara_mapbiomas: false,
    },
  },

  // ── 6. BOSQUE DE GALERÍA ──────────────────────────────────────

  bosque_galeria: {
    paramfuzzy: {
      shade_min: 62,
      shade_max: 92,
      gv_soil_min: 0,
      gv_soil_max: 10,
      gv_min: 0,
      gv_max: 50,
      soil_min: 0,
      soil_max: 8,
      cloud_desc_min: 28,
      cloud_desc_max: 48,
      cloud_asc_min: 1,
      cloud_asc_max: 5,
      snow_min: 0,
      snow_max: 100,
    },
    paramClasif: {
      fill_gap_month: 0.4,
      fill_gap_year: 0.4,
      slppost2_corte: 5,
      p_img_month_gt: 0.75,
      p_img_month_lte: 0.38,
      slope_gte: 18,
      ndvi_max_water: 0.45,
      mndwi_min_water: -0.28,
      usar_mascara_mapbiomas: false,
    },
  },
};

var paramfuzzy = config_ecosistemas[param.ecosistema].paramfuzzy;
var paramClasif = config_ecosistemas[param.ecosistema].paramClasif;

//=================================================================
// CARGAR MÓDULOS Y DATOS
//=================================================================
var modules = require("users/rcamargo/projects-mapbiomas-water-c1:step-05-coleccion-1-1/Map001_module_mosaic_andes_v2");

var regionVectorPath =
  "projects/mapbiomas-venezuela/assets/AGUA/DATOS_AUXILIARES/VECTOR/Regiones_Vzla_19Feb2016";

var region = ee
  .FeatureCollection(regionVectorPath)
  .filter(ee.Filter.inList("ID_Region", param.regionId));

var regionMask = region
  .reduceToImage({ properties: ["ID_Region"], reducer: ee.Reducer.first() })
  .eq(param.regionId)
  .selfMask()
  .reduce(ee.Reducer.allNonZero());

var slppost2 = ee.Image("projects/mapbiomas-raisg/MOSAICOS/slppost2_30_v3");
var shademask2_v3 = ee.Image("projects/mapbiomas-raisg/MOSAICOS/shademask2_v3");
var slope = ee.Terrain.slope(ee.Image("USGS/SRTMGL1_003"));

var pal = {
  "pal-1": [
    "0000ff",
    "009900",
    "009900",
    "ffffff",
    "000000",
    "ff0000",
    "ff0000",
    "c6c6c6",
    "ffff00",
  ],
  "pal-2": [
    "0000ff",
    "009900",
    "5af100",
    "ffffff",
    "000000",
    "ff0000",
    "ff60c7",
    "c6c6c6",
    "ffff00",
  ],
};
var vis_detec = pal[param.Paleta];

//=================================================================
// COEFICIENTES FUZZY
//=================================================================
var shade_Fit = ee.Dictionary(
  ee
    .List([
      [paramfuzzy.shade_min, 0],
      [paramfuzzy.shade_max, 1],
    ])
    .reduce(ee.Reducer.linearFit()),
);
var gv_Fit = ee.Dictionary(
  ee
    .List([
      [paramfuzzy.gv_min, 1],
      [paramfuzzy.gv_max, 0],
    ])
    .reduce(ee.Reducer.linearFit()),
);
var soil_Fit = ee.Dictionary(
  ee
    .List([
      [paramfuzzy.soil_min, 1],
      [paramfuzzy.soil_max, 0],
    ])
    .reduce(ee.Reducer.linearFit()),
);

//=================================================================
// IMAGEN SEGURA: garantiza siempre ≥1 banda
//=================================================================
/**
 * Return a named float band, using a constant when the input has no bands.
 *
 * @param {ee.Image} img - Empty or single-band reducer output.
 * @param {string} bandName - Name for the output band.
 * @param {number} fallbackValue - Constant used for an empty result.
 * @returns {ee.Image} Single named float band.
 */
function safeImage(img, bandName, fallbackValue) {
  return ee.Image(
    ee.Algorithms.If(
      img.bandNames().size().eq(0),
      ee.Image(fallbackValue).rename(bandName).float(),
      img.rename(bandName).float(),
    ),
  );
}

//=================================================================
// PROBABILIDAD POR IMAGEN
//=================================================================
/**
 * Estimate water probability for a Landsat observation using fuzzy fractions and MNDWI.
 * Apply soil, snow, MNDWI, and NDVI exclusions to the resulting score.
 *
 * @param {ee.Image} image - Observation with shade, gv, soil, snow, and optical bands.
 * @returns {ee.Image} Single-band water probability named prob.
 */
function class_1_probs(image) {
  var cond_1 = image
    .select("shade")
    .multiply(shade_Fit.getNumber("scale"))
    .add(shade_Fit.getNumber("offset"))
    .clamp(0, 1);
  var cond_5 = image
    .select("gv")
    .multiply(gv_Fit.getNumber("scale"))
    .add(gv_Fit.getNumber("offset"))
    .clamp(0, 1);
  var cond_6 = image
    .select("soil")
    .multiply(soil_Fit.getNumber("scale"))
    .add(soil_Fit.getNumber("offset"))
    .clamp(0, 1);
  var mndwi = image.normalizedDifference(["green", "swir1"]).clamp(-1, 1);
  var ndvi = image.normalizedDifference(["nir", "red"]).clamp(-1, 1);
  var cond_mndwi = mndwi.add(1).divide(2).clamp(0, 1);

  var prob = cond_1
    .multiply(0.8)
    .addBands(cond_5.multiply(0.7))
    .addBands(cond_6.multiply(0.7))
    .addBands(cond_mndwi.multiply(1.8))
    .reduce(ee.Reducer.mean())
    .rename("prob");

  return prob
    .where(image.select("soil").gt(18), 0)
    .where(image.select("snow").gt(75), 0)
    .where(mndwi.lt(paramClasif.mndwi_min_water), 0)
    .where(ndvi.gt(paramClasif.ndvi_max_water), 0);
}

//=================================================================
// MEDIANA MENSUAL SEGURA
//=================================================================
/**
 * Calculate median water probability from observations in one calendar month.
 *
 * @param {number|ee.Number} year - Calendar year.
 * @param {number|ee.Number} mes - Calendar month from 1 to 12.
 * @param {ee.ImageCollection} collection - Landsat observations with probability predictors.
 * @param {string} bandName - Name for the output band.
 * @param {number} fallback - Value used when the month has no observations.
 * @returns {ee.Image} Monthly median water probability or its fallback.
 */
function safeMonthMedian(year, mes, collection, bandName, fallback) {
  var start = ee.Date.fromYMD(year, mes, 1);
  var end = start.advance(1, "month");
  var col = collection.filterDate(start, end).map(class_1_probs);
  var med = col.median();
  return safeImage(med, bandName, fallback);
}

//=================================================================
// PROBABILIDADES
//=================================================================
/**
 * Calculate the median water probability for the target month.
 *
 * @param {number|ee.Number} year - Calendar year.
 * @param {number|ee.Number} mes - Calendar month from 1 to 12.
 * @param {ee.ImageCollection} collection - Input Landsat observations.
 * @returns {ee.Image} Probability band named p_water.
 */
function p_img_month_func(year, mes, collection) {
  return safeMonthMedian(year, mes, collection, "p_water", 0);
}

/**
 * Average the twelve monthly median probabilities for a calendar year.
 *
 * @param {number|ee.Number} year - Calendar year.
 * @param {ee.ImageCollection} collection - Input Landsat observations.
 * @returns {ee.Image} Annual probability band named p_year.
 */
function p_year_func(year, collection) {
  var stack = ee.ImageCollection(
    ee.List.sequence(1, 12).map(function (m) {
      return safeMonthMedian(year, m, collection, "prob_m", 0);
    }),
  );
  return safeImage(stack.mean(), "p_year", 0);
}

/**
 * Average the probability for the same calendar month at offsets from −5 to +5 years.
 * Clamp each offset year to the 1985–2024 historical range.
 *
 * @param {number|ee.Number} year - Target calendar year.
 * @param {number|ee.Number} mes - Calendar month from 1 to 12.
 * @param {ee.ImageCollection} collection - Input Landsat observations.
 * @returns {ee.Image} Historical probability band named p_month.
 */
function p_month_func(year, mes, collection) {
  var stack = ee.ImageCollection(
    ee.List([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]).map(function (off) {
      var yr = ee.Number(year).add(ee.Number(off)).clamp(1985, 2024);
      return safeMonthMedian(yr, mes, collection, "prob_h", 0);
    }),
  );
  return safeImage(stack.mean(), "p_month", 0);
}

//=================================================================
// FUNCIÓN PRINCIPAL DE DETECCIÓN
//=================================================================
/**
 * Assign monthly water classes from observed and historical probabilities.
 * Apply ecosystem-specific spectral and terrain checks to the monthly result.
 *
 * @param {number|ee.Number} year - Calendar year.
 * @param {number|ee.Number} mes - Calendar month from 1 to 12.
 * @param {ee.ImageCollection} collection - Input Landsat observations.
 * @returns {ee.Image} Single-band classification for the requested month.
 */
var water_y_m_func = function (year, mes, collection) {
  var p_img_month = p_img_month_func(year, mes, collection);
  var p_year = p_year_func(year, collection);
  var p_month = p_month_func(year, mes, collection);

  var monthStart = ee.Date.fromYMD(year, mes, 1);
  var monthEnd = monthStart.advance(1, "month");
  var colMes = collection.filterDate(monthStart, monthEnd);

  var hasMesImgs = colMes.size().gt(0);

  var colMedian = ee.Image(
    ee.Algorithms.If(
      hasMesImgs,
      colMes.median(),
      ee.Image(0).rename("placeholder"),
    ),
  );

  // ── indexOf devuelve ee.Number: ≥0 existe, -1 no existe ──
  var hasNIR = colMedian.bandNames().indexOf("nir").gte(0);
  var hasMesAndNIR = hasMesImgs.multiply(hasNIR);

  var fill_gap = p_month
    .gte(paramClasif.fill_gap_month)
    .and(p_year.gte(paramClasif.fill_gap_year))
    .selfMask();

  var detec = ee
    .Image(0)
    .where(
      slppost2
        .gt(paramClasif.slppost2_corte)
        .and(p_img_month.gte(paramClasif.p_img_month_gt)),
      1,
    )
    .where(
      slppost2
        .lte(paramClasif.slppost2_corte)
        .and(p_img_month.gte(paramClasif.p_img_month_lte)),
      1,
    );

  var ndvi_img = ee.Image(
    ee.Algorithms.If(
      hasMesAndNIR,
      colMedian.normalizedDifference(["nir", "red"]),
      ee.Image(0),
    ),
  );
  var mndwi_img = ee.Image(
    ee.Algorithms.If(
      hasMesAndNIR,
      colMedian.normalizedDifference(["green", "swir1"]),
      ee.Image(0),
    ),
  );

  detec = ee.Image(
    ee.Algorithms.If(
      hasMesAndNIR,
      detec
        .where(ndvi_img.gt(paramClasif.ndvi_max_water), 0)
        .where(mndwi_img.lt(paramClasif.mndwi_min_water), 0),
      detec,
    ),
  );

  var remv = p_year.lt(0.35).selfMask();
  var gap = fill_gap.mask(detec.unmask(0).eq(0)).selfMask().multiply(3);
  var no_data = detec.add(1).unmask().eq(0).selfMask();
  var water = no_data
    .multiply(5)
    .blend(detec)
    .blend(gap)
    .blend(remv.multiply(7));

  water = water.where(water.eq(0), 4);

  water = ee.Image(
    ee.Algorithms.If(
      hasMesAndNIR,
      water
        .where(colMedian.select(0).and(water.eq(3)), 2)
        .where(colMedian.select(0).and(water.eq(7)), 6),
      water,
    ),
  );

  water = water
    .where(
      water.eq(1).or(water.eq(2)).or(water.eq(3)).and(shademask2_v3.eq(1)),
      8,
    )
    .where(
      water
        .eq(1)
        .or(water.eq(2))
        .or(water.eq(3))
        .and(slope.gte(paramClasif.slope_gte)),
      9,
    );

  return water;
};

//=================================================================
// PROCESAMIENTO PRINCIPAL
//=================================================================
var get_Collection = modules.get_Collection2;
var Collection = get_Collection(region, param.cloud_cover, param.years);

param.years.forEach(function (year) {
  var month_names = [
    "w_1",
    "w_2",
    "w_3",
    "w_4",
    "w_5",
    "w_6",
    "w_7",
    "w_8",
    "w_9",
    "w_10",
    "w_11",
    "w_12",
  ];

  var bandas = month_names.map(function (name) {
    var m = parseInt(name.split("_")[1]);
    return water_y_m_func(year, m, Collection).rename(name);
  });

  var water_y = ee.ImageCollection(bandas).toBands().rename(month_names);

  var image = water_y
    .updateMask(regionMask)
    .set("year", year)
    .set("region", param.regionId)
    .set("version", param.version)
    .set("ecosistema", param.ecosistema)
    .set("pais", param.pais_name);

  if (param.vis.Visualizar_piloto) {
    param.vis.listbandMonth.forEach(function (bandMonth) {
      var month = parseInt(bandMonth.split("_")[1]);
      var start = ee.Date.fromYMD(year, month, 1);
      var end = start.advance(1, "month");

      Map.addLayer(
        Collection.filterBounds(region)
          .filterDate(start, end)
          .median()
          .updateMask(regionMask),
        { bands: ["swir1", "nir", "red"], min: 200, max: 4000 },
        "mosaic-" + month + "-" + year,
        false,
      );
      Map.addLayer(
        image.select(bandMonth),
        { min: 1, max: 9, palette: vis_detec },
        "clasif-" + bandMonth + "-" + year,
        false,
      );
    });
  }

  if (param.ExportAgua) {
    Export.image.toAsset({
      image: image.byte(),
      description:
        "class_water_" + year + "_" + param.regionId + "_" + param.version,
      assetId:
        "projects/mapbiomas-venezuela/assets/AGUA/SUPERFICIE/COLECCION4/" +
        param.asset_name +
        "/class_water_" +
        year +
        "_" +
        param.regionId +
        "_" +
        param.version,
      region: region.geometry().bounds(),
      scale: 30,
      pyramidingPolicy: { ".default": "mode" },
      maxPixels: 1e13,
    });
  }

  var img_input_freq = image
    .gte(1)
    .and(image.lte(3))
    .selfMask()
    .reduce(ee.Reducer.sum());
  var img_input = img_input_freq.gte(6).selfMask();

  if (param.vis.Visualizar_piloto) {
    Map.addLayer(
      img_input_freq,
      { palette: ["ffffff", "02ffe8", "0417ff", "000da7"], min: 0, max: 12 },
      "freq-" + year,
      false,
    );
    Map.addLayer(img_input, { palette: "blue" }, "annual-" + year, false);
  }
});

//=================================================================
// VALIDACIÓN
//=================================================================
if (param.Validacion) {
  print("⚠️ NOTA: Configura los puntos de validación para tu región");
}

//=================================================================
// CAPAS DE REFERENCIA Y LEYENDA
//=================================================================
Map.addLayer(region.style({ fillColor: "00000000" }), {}, "Región", true);
Map.addLayer(
  slope.gte(paramClasif.slope_gte).selfMask(),
  { palette: "black" },
  "Pendiente >" + paramClasif.slope_gte,
  false,
);
Map.addLayer(
  shademask2_v3.selfMask(),
  { palette: "aeaeae" },
  "Máscara de Sombra",
  false,
);

if (param.vis.Visualizar_piloto) {
  var legend = ui.Panel({
    style: { position: "bottom-left", padding: "8px 15px" },
  });
  legend.add(
    ui.Label({
      value: "Clasificación de Agua - " + param.ecosistema.toUpperCase(),
      style: { fontWeight: "bold", fontSize: "14px", margin: "0 0 4px 0" },
    }),
  );
  /**
   * Create a row in the water-class map legend.
   *
   * @param {string} color - Hexadecimal swatch color without a leading hash.
   * @param {string} name - Text label for the class.
   * @returns {ui.Panel} Horizontal panel containing the swatch and label.
   */
  var makeRow = function (color, name) {
    return ui.Panel({
      widgets: [
        ui.Label({
          style: {
            backgroundColor: "#" + color,
            padding: "8px",
            margin: "0 0 4px 0",
          },
        }),
        ui.Label({ value: name, style: { margin: "0 0 4px 6px" } }),
      ],
      layout: ui.Panel.Layout.Flow("horizontal"),
    });
  };
  [
    [vis_detec[0], "C1-Agua detectada"],
    [vis_detec[1], "C2-Agua incluida observada"],
    [vis_detec[2], "C3-Agua incluida no observada"],
    [vis_detec[3], "C4-No agua"],
    [vis_detec[4], "C5-No observado (nubes)"],
    [vis_detec[5], "C6-Exclusión observada"],
    [vis_detec[6], "C7-Exclusión no observada"],
    [vis_detec[7], "C8-Agua en sombra"],
    [vis_detec[8], "C9-Agua en pendiente"],
  ].forEach(function (e) {
    legend.add(makeRow(e[0], e[1]));
  });
  Map.add(legend);
}

print("✓ Script ejecutado - Ecosistema: " + param.ecosistema);
print("✓ Regiones procesadas: " + param.regionId);
print("✓ Configuración aplicada:", paramfuzzy);
