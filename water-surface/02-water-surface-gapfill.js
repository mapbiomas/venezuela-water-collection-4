/**
 * @fileoverview Fill unobserved months in surface-water maps for MapBiomas Venezuela Collection 4.
 * Use observations within a five-year window to replace class 5 gaps. Apply configured
 * vector and manual corrections before exporting the twelve filled monthly bands.
 */

/// =====================================================================================
/// GAP (Fase 4b) - MapBiomas Agua Venezuela
/// Modificado por Nelly Rivero Fecha: Octubre 2026
/// =====================================================================================

var paisName = "Venezuela"; // Ecuador, Perú, Bolivia, Venezuela, Colombia, Suriname, Guiana Francesa, Guyana
var paisName1 = "Venezuela";

/**
 * Post-processing folder containing monthly pre-gap classifications.
 * @type {string}
 */
var imput_imgColl = "03-pre-gap-01";

var namecountry = paisName.replace("ú", "u");
var paises = ee.FeatureCollection(
  "projects/mapbiomas-venezuela/assets/AGUA/DATOS_AUXILIARES/VECTOR/Prueba_Pol_Vzla2_11Oct2026",
);
var pais = paises.filter(ee.Filter.eq("pais", paisName1));

var imageVisParam = {
  opacity: 1,
  bands: ["w_1_2"],
  min: 1,
  max: 9,
  palette: [
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

var y_start = 2000; // no cambiar usar el for para dividir tareas
var y_end = 2025; // no cambiar

/**
 * Year list used to select output years and neighboring input maps.
 * @type {number[]}
 */
var years = ee.List.sequence(y_start, y_end).getInfo();
//var year = 2022
var viz_month = "w_1";

/**
 * Years eligible for the auxiliary NoData overlay when present in a gap-fill window.
 * @type {number[]}
 */
var years_exclude = [1985, 1988, 1992, 1993, 1994, 1995];
//print(ee.List(years_exclude).contains(1985))

// var exclude_imgcoll = ee.ImageCollection('projects/mapbiomas-raisg/PRODUCTOS/AGUA/COLOMBIA/COLECCION1/clasificacion-nodata')
var exclude_imgcoll = ee.ImageCollection(
  "projects/mapbiomas-raisg/PRODUCTOS/AGUA/VENEZUELA/COLECCION1/clasificacion-nodata",
);

//var MaskRegions = ee.Image("projects/mapbiomas-raisg/PRODUCTOS/AGUA/DATOS_AUXILIARES/RASTERS/"+namecountry.toUpperCase()+"/clasificacion-regiones-agua-v3")
//var MaskRegions_sel = MaskRegions.updateMask(MaskRegions.eq(1313).or(MaskRegions.eq(1314))).gt(0).multiply(5)  // 1322 es amazonia baja en el Perú

// =====================================================================================
// PARÁMETROS DE CORRECCIÓN
// =====================================================================================

var palette_agua = [
  "0000ff",
  "009900",
  "5af100",
  "ffffff",
  "000000",
  "ff0000",
  "ff60c7",
  "c6c6c6",
  "ffff00",
];

var anios_inclusion_vector = [];
var anios_inclusion_manual = [];
var anios_exclusion_manual = [];

// ---- A) INCLUSIÓN DESDE ASSET VECTORIAL (red hidrográfica / cuerpos de agua) ----

/**
 * Whether to add water from the configured vector asset before manual corrections.
 * @type {boolean}
 */
var usar_inclusion_vector = false;
var asset_inclusion_vector =
  "projects/mapbiomas-venezuela/assets/AGUA/DATOS_AUXILIARES/VECTOR/Inclusion_cuerpos_agua_VEN";
var clase_inclusion_vector = 1; // 1 = Agua detectada
var clases_agua_existente = [1, 2, 3, 9]; // clases que ya cuentan como agua y se respetan

var ancho_linea_px = 1;

// ---- B) INCLUSIÓN MANUAL POR POLÍGONO (varias clases -> agua) ----

var usar_correccion_manual = true;
var clases_a_corregir = [4]; // ej. [4], [4,6,7], [4,5,6,7,8]

// ---- C) EXCLUSIÓN MANUAL POR POLÍGONO (agua -> no agua) ----

var usar_exclusion_manual = true;
var clases_agua = [1, 2, 3, 9, 16];

// ---- Funciones auxiliares ----
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

// Imagen booleana (multibanda): 1 donde el píxel de img pertenece a alguna clase de la lista.
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

// Máscara raster (0/1) del asset de inclusión: polígonos rellenos + líneas con ancho.
var mask_inclusion_vector = null;
if (usar_inclusion_vector) {
  var fc_inclusion = ee.FeatureCollection(asset_inclusion_vector);
  mask_inclusion_vector = ee
    .Image(0)
    .byte()
    .paint(fc_inclusion, 1)
    .paint(fc_inclusion, 1, ancho_linea_px)
    .eq(1);
}

for (var i = 23; i < 26; i++) {
  //39
  var year = years[i];

  var y_window = ee
    .List(
      ee.Array([0, 1, 2, 3, 4]).add(
        ee.Algorithms.If(
          ee.Number(year).gt(y_end - 2),
          ee.Number(y_end - year - 4).add(year),
          ee
            .Number(y_start - year)
            .max(-2)
            .add(year),
        ),
      ),
    )
    .getInfo();

  print(y_window);
  // var img =           ee.Image('projects/mapbiomas-raisg/PRODUCTOS/AGUA/'+ namecountry.toUpperCase() +'/COLECCION1/POSTPROCESSING/' + imput_imgColl + '/water-gap-' + y_window[0])
  //           .addBands(ee.Image('projects/mapbiomas-raisg/PRODUCTOS/AGUA/'+ namecountry.toUpperCase() +'/COLECCION1/POSTPROCESSING/' + imput_imgColl + '/water-gap-' + y_window[1]))
  //           .addBands(ee.Image('projects/mapbiomas-raisg/PRODUCTOS/AGUA/'+ namecountry.toUpperCase() +'/COLECCION1/POSTPROCESSING/' + imput_imgColl + '/water-gap-' + y_window[2]))
  //           .addBands(ee.Image('projects/mapbiomas-raisg/PRODUCTOS/AGUA/'+ namecountry.toUpperCase() +'/COLECCION1/POSTPROCESSING/' + imput_imgColl + '/water-gap-' + y_window[3]))
  //           .addBands(ee.Image('projects/mapbiomas-raisg/PRODUCTOS/AGUA/'+ namecountry.toUpperCase() +'/COLECCION1/POSTPROCESSING/' + imput_imgColl + '/water-gap-' + y_window[4]))

  var img = ee.Image([]).select([]);
  y_window.forEach(function (yeari) {
    var waterYear = ee.Image(
      "projects/mapbiomas-venezuela/assets/AGUA/SUPERFICIE/COLECCION4/POSTPROCESSING/" +
        imput_imgColl +
        "/water-gap-" +
        yeari,
    );
    Map.addLayer(
      waterYear,
      { min: 1, max: 9, bands: viz_month, palette: palette_agua },
      "waterYear" + yeari,
      false,
    );
    waterYear = ee.Algorithms.If(
      ee.List(years_exclude).contains(yeari),
      waterYear.blend(
        exclude_imgcoll.filter(ee.Filter.eq("year", yeari)).mosaic().selfMask(),
      ),
      waterYear,
    );
    waterYear = ee.Image(waterYear);
    Map.addLayer(
      waterYear,
      { min: 1, max: 9, bands: viz_month, palette: palette_agua },
      "waterYear_ajus" + yeari,
      false,
    );
    img = img.addBands(waterYear);
  });

  print("first img", img);
  //Map.addLayer(img, imageVisParam,'input')

  var n_bands = img.bandNames().size();
  var bands_size = ee.List.sequence(1, n_bands, 1);

  var bands = bands_size.map(function (index) {
    return ee.String("w_").cat(index).slice(0, -2);
  });

  //collection = collection.toBands().rename(bands);

  img = img.rename(bands);

  //print('img rename',img)

  var water = img;
  // no hacer remap
  //var water = bands_size.map(function(month){
  //     var water_remapped = collection.select(ee.String('w_').cat(month).slice(0,-2)).remap([0,1,2,3,4], [0,1,1,0,2]);
  //     return water_remapped;
  //});
  //
  //water = ee.ImageCollection(water).toBands().rename(bands);

  //Map.addLayer(water.select(0).mask(water.select(0).neq(5)))

  // ----------------------------------------------------------------------

  var ListMonths = ee.List.sequence(1, n_bands, 1);

  if (year - y_start == 0) {
    var process_block = ListMonths.slice(0, 12);
  } else {
    if (year - y_start == 1) {
      var process_block = ListMonths.slice(12, 24);
    } else {
      if (y_end - year == 1) {
        var process_block = ListMonths.slice(36, 48);
      } else {
        if (y_end - year == 0) {
          var process_block = ListMonths.slice(48, 60);
        } else {
          var process_block = ListMonths.slice(24, 36);
        }
      }
    }
  }
  print("process_block", process_block);

  var output = process_block.map(function (month) {
    var actual = water
      .select(ee.String("w_").cat(month).slice(0, -2))
      .updateMask(water.select(ee.String("w_").cat(month).slice(0, -2)).neq(5));

    var list_prev = ListMonths.slice(0, ee.Number(month).subtract(1)).reverse();
    var list_next = ListMonths.slice(month, n_bands);

    var z_loop = list_next.zip(list_prev);

    var list_month_gap = ee.List(
      ee.Algorithms.If(
        ee.Number(list_next.size()).gt(list_prev.size()),
        ee.List(z_loop.flatten().cat(list_next).distinct()),
        ee.List(z_loop.flatten().cat(list_prev).distinct()),
      ),
    );

    var z_size = list_month_gap.size();

    var forLoop2 = ee.List.sequence(0, z_size.subtract(1), 1).map(function (i) {
      var m_next = list_month_gap.get(i);
      var next = water
        .select(ee.String("w_").cat(m_next).slice(0, -2))
        .updateMask(
          water.select(ee.String("w_").cat(m_next).slice(0, -2)).neq(5),
        );
      return next.rename("w").set("w", ee.Number(i).add(1));
    });

    forLoop2 = ee.ImageCollection(forLoop2);

    return ee.ImageCollection.fromImages([
      actual.rename("w").set("w", ee.Number(0)),
    ])
      .merge(forLoop2)
      .sort("w", false)
      .mosaic();
  });

  // ----------------------------------------------------------------------
  //print('forLoop1',forLoop1)

  /**
   * Create the twelve monthly band names for the annual export.
   *
   * @param {string} prefix - Text prefixed to each month number.
   * @returns {ee.List} Monthly band names in calendar order.
   */
  var bNames = function (prefix) {
    return ee.List.sequence(1, 12, 1).map(function (i) {
      return ee.String(prefix).cat(ee.String(i).slice(0, -2));
    });
  };
  output = ee.ImageCollection(output).toBands().rename(bNames("w_"));
  print("output", output);

  // Copia del resultado del gap SIN correcciones (solo para comparar en el mapa)
  var output_sin_corregir = output;

  // ======================================================================
  // CORRECCIONES POST-GAP  (A -> B -> C)
  // ======================================================================

  // ---- A) Inclusión desde asset vectorial (red hidrográfica / cuerpos de agua) ----
  if (usar_inclusion_vector && aplicaAnio(anios_inclusion_vector, year)) {
    var no_es_agua = esClase(output, clases_agua_existente).not();
    output = reemplazar(
      output,
      mask_inclusion_vector.and(no_es_agua),
      clase_inclusion_vector,
    );
  }

  // ---- B) Inclusión manual por polígono (varias clases -> agua) ----
  if (usar_correccion_manual && aplicaAnio(anios_inclusion_manual, year)) {
    var mask_correccion = ee.Image.constant(1)
      .clip(correccion_agua_manual)
      .unmask(0)
      .eq(1);
    output = reemplazar(
      output,
      esClase(output, clases_a_corregir).and(mask_correccion),
      1,
    );
  }

  // ---- C) Exclusión manual por polígono (agua -> no agua). Va al final: gana en solapes ----
  if (usar_exclusion_manual && aplicaAnio(anios_exclusion_manual, year)) {
    var mask_exclusion = ee.Image.constant(1)
      .clip(correccion_excluir_agua_manual)
      .unmask(0)
      .eq(1);
    output = reemplazar(
      output,
      esClase(output, clases_agua).and(mask_exclusion),
      4,
    );
  }

  output = output.set("year", year);

  var imageVisParam1 = {
    min: 1,
    max: 9,
    bands: viz_month,
    palette: palette_agua,
  };

  Export.image.toAsset({
    image: output,
    description: "water-gap-" + year + "_" + namecountry,
    assetId:
      "projects/mapbiomas-venezuela/assets/AGUA/SUPERFICIE/COLECCION4/POSTPROCESSING/03-gap-01/" +
      "water-gap-" +
      year,
    region: pais.geometry().bounds(),
    scale: 30,
    pyramidingPolicy: {
      ".default": "mode",
    },
    maxPixels: 1e13,
  });

  Map.addLayer(
    img
      .select(ee.List(ee.Array(process_block).subtract(1).toByte()).getInfo())
      .rename(bNames("w_")),
    imageVisParam1,
    "imput " + viz_month + " " + year + "-1",
    false,
  );
  Map.addLayer(
    output_sin_corregir,
    imageVisParam1,
    "output SIN corregir " + viz_month + " " + year,
    false,
  );
  // Esta es la capa que corresponde EXACTAMENTE a lo que se exporta (ya con A, B y C aplicadas)
  Map.addLayer(
    output,
    imageVisParam1,
    "output FINAL " + viz_month + " " + year,
    false,
  );

  //return
}

// ---- Capas de apoyo (se agregan una sola vez) ----
if (usar_inclusion_vector) {
  Map.addLayer(
    mask_inclusion_vector.selfMask(),
    { palette: "magenta" },
    "inclusion_vector (asset, 30 m)",
    false,
  );
}
if (usar_correccion_manual) {
  Map.addLayer(
    correccion_agua_manual,
    { color: "yellow" },
    "correccion_agua_manual (poligono)",
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

//var collection = col_2020.merge(col_2021).merge(col_2022);
