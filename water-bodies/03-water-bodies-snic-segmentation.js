/**
 * @fileoverview Segment annual surface-water pixels into objects using SNIC.
 * Combine the temporal-behavior bands with the annual count of water months and use a
 * 12-pixel seed grid. Export a cluster raster per year over the imported bound geometry.
 */

/*
 * PAIS
 */

var paisName = "Venezuela";
var versionGrids = "01";
var pais = ee
  .FeatureCollection(
    "projects/mapbiomas-raisg/DATOS_AUXILIARES/VECTORES/paises-4",
  )
  .filter(ee.Filter.eq("name", paisName));

/*
 * GRIDS
 */

/**
 * Asset ID for the classification regions used to restrict the input water maps.
 * @type {string}
 */
var reg_clasif =
  "projects/mapbiomas-raisg/PRODUCTOS/AGUA/DATOS_AUXILIARES/VECTOR/VENEZUELA/RegionActualizadaVenezuela";
var reg = ee.FeatureCollection(reg_clasif);

reg = reg.filterBounds(pais);

/*
 * TEMPORAL BEHAVIOR
 */

/**
 * Temporal-behavior image used to supply segmentation predictors.
 * @type {ee.Image}
 */
var rgb_temp = ee.Image(
  "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/Temporal_Behavior/temporal_behavior_2000_2025_col3",
);

/*
 * COLLECTION
 */

//var collection = ee.ImageCollection('projects/mapbiomas-raisg/PRODUCTOS/AGUA/GUYANA/COLECCION1/POSTPROCESSING/02-gap-04')
//                    .filter("year >= 2000")
//                    .filter("year < 2013")
//                    .merge(ee.ImageCollection("projects/mapbiomas-raisg/PRODUCTOS/AGUA/GUYANA/COLECCION1/POSTPROCESSING/02-gap-05")
//                    .filter("year >= 2013"))
//                 .map(function(image){
//                      return image.clip(grid);
//                 })
//                 .map(function(image){
//                   var yearGet = ee.Number(image.getNumber("year"));
//                   return image.lte(3).selfMask().byte().set("year", yearGet);
//                 });

/**
 * Annual inputs with monthly water presence derived from remapped surface-water classes.
 * @type {ee.ImageCollection}
 */
var collection = ee
  .ImageCollection(
    "projects/mapbiomas-venezuela/assets/AGUA/SUPERFICIE/COLECCION3/POSTPROCESSING/04-remap-04",
  )
  .filter("year >= 2000")
  .map(function (image) {
    return image.clip(reg);
  })
  .map(function (image) {
    var yearGet = ee.Number(image.getNumber("year"));
    return image.lte(3).selfMask().byte().set("year", yearGet);
  });

/*
 * PRODUCER SNIC AND EXPORT
 */
print(collection);

for (var year = 2000; year <= 2025; year++) {
  var anual_freq = collection
    .filter(ee.Filter.eq("year", year))
    .first()
    .reduce("sum");

  rgb_temp = rgb_temp.unmask().updateMask(anual_freq);

  var image = rgb_temp.addBands(anual_freq);

  var seeds12 = ee.Algorithms.Image.Segmentation.seedGrid(12); //.reproject({crs: 'EPSG:4326', scale: 30});

  //var seeds72 = ee.Algorithms.Image.Segmentation.seedGrid(72);

  var snic12 = ee.Algorithms.Image.Segmentation.SNIC({
    image: image,
    size: 32,
    compactness: 5,
    connectivity: 8,
    neighborhoodSize: 256,
    seeds: seeds12,
  });

  /*
var snic72 = ee.Algorithms.Image.Segmentation.SNIC({
  image: image,
  size: 32,
  compactness: 5,
  connectivity: 8,
  neighborhoodSize:256,
  seeds: seeds72
});
*/

  var clusters12 = snic12
    .select("clusters")
    .reproject({ crs: "EPSG:4326", scale: 30 });
  //var clusters72 = snic72.select("clusters").reproject({crs: 'EPSG:4326', scale: 30});

  var clusters12_img = anual_freq
    .gt(0)
    .addBands(clusters12)
    .reduce(ee.Reducer.mean())
    .set("year", year)
    .set("seed", 12);

  //var clusters72_img = anual_freq.gt(0).addBands(clusters72).reduce(ee.Reducer.mean())
  //  .set('year', year)
  //  .set('seed', 72);

  Map.addLayer(
    ee.Image(1),
    { palette: "008000" },
    "background green",
    true,
    0.5,
  );
  Map.addLayer(
    ee.Image(1),
    { palette: "808080" },
    "background grey",
    false,
    0.5,
  );
  Map.addLayer(
    anual_freq,
    { min: 1, max: 12, palette: "ffffff, 00ffff, 0000ff, 000040" },
    "annual freq",
    false,
  );
  Map.addLayer(rgb_temp, { min: 1, max: 35 }, "rgb temporal", false);
  Map.addLayer(
    clusters12_img.randomVisualizer(),
    {},
    "segments " + year,
    false,
  );

  Export.image.toAsset({
    image: clusters12_img,
    description: "SNIC_" + "Venezuela_" + year + "_12",
    assetId:
      "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC/snic_" +
      "Venezuela_" +
      year +
      "_12",
    region: bound,
    scale: 30,
    maxPixels: 1e13,
  });

  //Export.image.toAsset({
  //  image: clusters72_img,
  //  description: 'SNIC_' + year + '_72',
  //  assetId: 'projects/mapbiomas-workspace/AMOSTRAS/GTAGUA/SNIC_' + year + '_72',
  //  region: bound,
  //  scale: 30,
  //  maxPixels:1e13
  //});
}
