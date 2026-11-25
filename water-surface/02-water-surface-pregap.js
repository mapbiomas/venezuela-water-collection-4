/**
 * @fileoverview Prepare monthly surface-water maps for temporal gap filling.
 * Check each month against the Landsat observation mask and flag unobserved class 4 pixels
 * as class 5. Export the twelve monthly bands for the years selected by the processing
 * loop.
 */

var paisName = "Venezuela"; // Ecuador, Perú, Bolivia, Venezuela, Colombia, Suriname, Guiana Francesa, Guyana
var paisName1 = "Venezuela";

/**
 * Post-processing folder containing the masked monthly input maps.
 * @type {string}
 */
var imput_imgColl = "03-mask-02";
var version_in = "1";
var cloud_cover = 70;

var vis_image = {
  opacity: 1,
  bands: ["swir1", "nir", "red"],
  gain: [0.08, 0.06, 0.2],
  gamma: 0.65,
};

var namecountry = paisName.replace("ú", "u");
var paises = ee.FeatureCollection(
  "projects/mapbiomas-venezuela/assets/AGUA/DATOS_AUXILIARES/VECTOR/Prueba_Pol_Vzla2_11Oct2026",
);
var pais = paises.filter(ee.Filter.eq("pais", paisName1));

var modules = require("users/rcamargo/projects-mapbiomas-water-c1:step-05-coleccion-1-1/Map001_module_mosaic_andes_gapMask");
var get_Collection = modules.get_Collection2;

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
 * Year list used by the indexed batch loop.
 * @type {number[]}
 */
var years = ee.List.sequence(y_start, y_end).getInfo();
//var years = [1988]
/**
 * Month selected for the map comparison.
 * @type {number}
 */
var viz_month = 1;

for (var i = 8; i < 10; i++) {
  //var
  var year = years[i];

  var Collection = get_Collection(pais, cloud_cover, years); ///.median();

  var img = ee.Image(
    "projects/mapbiomas-venezuela/assets/AGUA/SUPERFICIE/COLECCION4/POSTPROCESSING/" +
      imput_imgColl +
      "/water-" +
      year,
  );
  print(img);
  var n_bands = img.bandNames().size();

  // ----------------------------------------------------------------------

  var ListMonths = ee.List.sequence(1, n_bands, 1);

  var water = ListMonths.map(function (month) {
    //var month = ee.Number(1)
    var start = ee.Date.fromYMD(year, ee.Number(month), 1);
    var end = start.advance(1, "month");

    var col = Collection.filterDate(start, end).median(); //.select('red').gt(0).selfMask()
    //print(col)

    var nodata_mask = ee.Algorithms.If(
      col.bandNames().length().gt(0),
      col.select("red").gt(0).selfMask(),
      ee.Image(0).selfMask(),
    );

    nodata_mask = ee.Image(nodata_mask);

    //print('img',img)
    //print(ee.String('w_').cat(month))
    var actual = img.select(ee.String("w_").cat(month).slice(0, -2));

    //print('actual',actual)
    //print('nodata_mask',nodata_mask)
    //Map.addLayer(nodata_mask.unmask().not().selfMask().clip(pais))
    return actual.where(
      actual.eq(4).and(nodata_mask.unmask().not().selfMask()),
      5,
    );
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
  water = ee.ImageCollection(water).toBands().rename(bNames("w_"));
  print("water", water);

  var imageVisParam1 = {
    min: 1,
    max: 9,
    bands: "w_" + viz_month,
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

  Export.image.toAsset({
    image: water,
    description: "water_pregap_" + year + "_" + paisName,
    assetId:
      "projects/mapbiomas-venezuela/assets/AGUA/SUPERFICIE/COLECCION4/POSTPROCESSING/03-pre-gap-01/" +
      "water-gap-" +
      year,
    region: pais.geometry().bounds(),
    scale: 30,
    pyramidingPolicy: {
      ".default": "mode",
    },
    maxPixels: 1e13,
  });

  var start = ee.Date.fromYMD(year, viz_month, 1);
  var end = start.advance(1, "month");

  Map.addLayer(img, imageVisParam1, "imput " + viz_month + " " + year, false);
  Map.addLayer(
    water,
    imageVisParam1,
    "output " + viz_month + " " + year,
    false,
  );

  //Map.addLayer(Collection.filterDate(start, end).median(),vis_image,'mosaic: '+year+'-'+ viz_month,false);
  // Map.addLayer(Collection.filterDate(start, end).median().gt(0).selfMask(),{},'mask mosaic')
  //return
}

//var collection = col_2020.merge(col_2021).merge(col_2022);
