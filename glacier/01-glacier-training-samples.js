/**
 * @fileoverview Generate glacier and non-glacier training samples for MapBiomas Venezuela Collection 4.
 * Use stable reference pixels and Landsat predictors to train a Random Forest model. Export
 * samples from the imported Glaciar and Agua geometries to Drive and optionally export
 * annual classifications to Earth Engine assets.
 */

// TEMA TRANSVERSAL GLACIARES

/**
 * Training region, cloud threshold, sample counts, Random Forest settings, and export
 * options.
 * @type {Object}
 */
var params = {
  regionGlacier: 1002,
  pais: "VENEZUELA", // Options: 'PERU', 'BOLIVIA', 'ECUADOR', 'COLOMBIA ,'VENEZUELA'
  shadowSum: 3500,
  trees: 50,
  samples: [
    3000, // glacier  3000
    4000, // no-glacier 8000
  ],
  version: 1,
  exportar: true, // false, true
  cloud: 20, // fraccion cloud de SMA para considera un pixel como no observado
};

/**
 * Names of mosaic and terrain predictor bands used for sampling and classification.
 * @type {string[]}
 */
var variables = [
  "swir1_median",
  "nir_median",
  "red_median",
  "blue_median_dry",
  "green_median_dry",
  // "green_min",
  "red_median_dry",
  "nir_median_dry",
  "swir1_median_dry",
  "swir2_median_dry",
  // "ndwimf_median",
  "ndwimf_median_dry",
  "ndsi_median_dry",
  "ndsi_median_wet",
  "ndsi_min",
  // "ndsi_median",
  // "blue_median",
  // "green_median",
  // "red_median",
  // "nir_median",
  // "swir1_median",
  // "swir2_median",
  "slope",
  "gv",
  "npv",
  "soil",
  "cloud",
  "snow",
  "shade",
];

//l5(1985-2012), l7(1999-2022), lx(1985-2013), l8(2013-2022)
//             YEAR, SENSOR,  <=Nube, >=nir_median,>=red_median
/**
 * Annual configurations with year, Landsat sensor, cloud limit, and NIR and red thresholds.
 * @type {Array<Array<number|string>>}
 */
var YearsSensors = [
  [1985, "lx", 100, 1100, 1000],
  [1986, "lx", 70, 1100, 1000],
  [1987, "lx", 70, 1100, 1000],
  [1988, "lx", 70, 1100, 1000],
  [1989, "lx", 70, 1100, 1000],
  [1990, "lx", 70, 1100, 1000],
  [1991, "lx", 70, 1100, 1000],
  [1992, "lx", 70, 1100, 1000],
  [1993, "lx", 70, 1100, 1000],
  [1994, "lx", 70, 1100, 1000],
  [1995, "lx", 70, 1100, 1000],
  [1996, "lx", 70, 1100, 1000],
  [1997, "lx", 70, 1100, 1000],
  [1998, "lx", 70, 1100, 1000],
  [1999, "lx", 70, 1100, 1000],
  [2000, "lx", 70, 1100, 1000],
  [2001, "lx", 70, 1100, 1000],
  [2002, "lx", 70, 1100, 1000],
  [2003, "lx", 70, 1100, 1000],
  [2004, "lx", 70, 1100, 1000],
  [2005, "lx", 70, 1100, 1000],
  [2006, "lx", 70, 1100, 1000],
  [2007, "lx", 70, 1100, 1000],
  [2008, "lx", 70, 1100, 1000],
  [2009, "lx", 70, 1100, 1000],
  [2010, "lx", 70, 1100, 1000],
  [2011, "lx", 70, 1100, 1000],
  [2012, "lx", 70, 1100, 1000],
  [2013, "l8", 70, 1100, 1000],
  [2014, "l8", 70, 1100, 1000],
  [2015, "l8", 70, 1100, 1000],
  [2016, "l8", 70, 1100, 1000],
  [2017, "l8", 70, 1100, 1000],
  [2018, "l8", 70, 1100, 1000],
  [2019, "l8", 70, 1100, 1000],
  [2020, "l8", 70, 1100, 1000],
  [2021, "l8", 70, 1100, 1000],
  [2022, "l8", 70, 1100, 1000],
  [2023, "l8", 70, 1100, 1000],
  [2024, "l8", 70, 1100, 1000],
  [2025, "l8", 70, 1100, 1000],
];

/**
 * Importa geometria: carta y region
 */

var AssetRegions =
  "projects/ee-glacier-mapping/assets/AUXILIARY-DATA/VECTOR/glacier_classification_regions_4";
var AssetRegionsRaster =
  "projects/ee-glacier-mapping/assets/AUXILIARY-DATA/RASTER/glacier_classification_regions_4";
var AssetClasBatch =
  "projects/mapbiomas-raisg/TRANSVERSALES/" +
  params.pais +
  "/COLECCION4/GLACIAR/clasificacion";
var GlacierCol3 = ee.Image(
  "projects/ee-glacier-mapping/assets/COLLECTION-1/02-INTEGRATION/glacier_collection1_integration_4",
);
var palettes = require("users/mapbiomas/modules:Palettes.js");
var dem = ee.Image("USGS/SRTMGL1_003");
var slope = ee.Terrain.slope(dem).rename("slope");

var region = ee
  .FeatureCollection(AssetRegions)
  .filterMetadata("id_regionC", "equals", params.regionGlacier);
var regionRaster = ee
  .Image(AssetRegionsRaster)
  .eq(params.regionGlacier)
  .selfMask();

var clasCollBatch = ee.ImageCollection(AssetClasBatch);

// Map.centerObject(region, 10);
Map.addLayer(
  region.style({ fillColor: "000000", color: "00000000" }),
  {},
  "Background",
);

/**
 * Importa el modulo 'GetImages' para la obtención de los mosaicos
 */
var getImages = require("users/rcamargo/mapbiomas-gt-glaciares:02_amazonia/modules/GetImages.js");
var smafractions = require("users/rcamargo/mapbiomas-gt-glaciares:02_amazonia/modules/Sma-fractions.js");

/**
 * Find pixels whose class remains the same in every reference band.
 *
 * @param {ee.Image} image - Multiband reference classification.
 * @param {number[]} classes - Class IDs to evaluate for stability.
 * @returns {ee.Image} Stable class IDs, masked where no supplied class is stable.
 */
var getStablePixels = function (image, classes) {
  var bandNames = image.bandNames(),
    images = [];

  classes.forEach(function (classId) {
    var previousBand = image.select([bandNames.get(0)]).eq(classId);

    var singleClass = ee.Image(
      bandNames.slice(1).iterate(function (bandName, previousBand) {
        bandName = ee.String(bandName);
        return image.select(bandName).eq(classId).multiply(previousBand);
      }, previousBand),
    );

    singleClass = singleClass.updateMask(singleClass.eq(1)).multiply(classId);

    images.push(singleClass);
  });

  // blend all images
  var allStable = ee.Image();

  for (var i = 0; i < classes.length; i++)
    allStable = allStable.blend(images[i]);

  return allStable;
};

/**
 * Transfer reference labels and predictor values to the supplied sample points.
 *
 * @param {ee.Image} reference - Reference image containing the reference band.
 * @param {ee.Image} mosaic - Predictor bands sampled at 30 m.
 * @param {ee.FeatureCollection} points - Locations to sample.
 * @returns {{points: ee.FeatureCollection, training: ee.FeatureCollection}} Input points and sampled features.
 */
var getSamples = function (reference, mosaic, points) {
  var training = reference.addBands(mosaic).sampleRegions({
    collection: points,
    properties: ["reference"],
    scale: 30,
    geometries: true,
    tileScale: 4,
  });

  return {
    points: points,
    training: training,
  };
};

//var Clasification = ee.Image();
YearsSensors.forEach(function (yearsensor) {
  var tree = {
    nir_dry: yearsensor[3], //mayor o igual a
    red_dry: yearsensor[4], //mayor o igual a
  };
  var param = {
    // 'grid_name': params.grid_name,
    t0: yearsensor[0] + "-01-01",
    t1: yearsensor[0] + "-12-31",
    satellite: yearsensor[1],
    cloud_cover: yearsensor[2],
    pais: params.pais,
    regionMosaic: params.regionGlacier,
    shadowSum: params.shadowSum,
  };
  var ImagesYear = getImages.getImages(param, [], region);

  // print('Mosaic:'+yearsensor[0], ImagesYear[1]);

  var Mosaic = ImagesYear[0].updateMask(regionRaster).addBands(slope);

  Mosaic = Mosaic.updateMask(Mosaic.select("blue_median").gte(0));

  Mosaic = smafractions.getFractions(Mosaic);

  // Pixel estable
  var classes = ee.List.sequence(1, 34).getInfo();
  var stablePixels = getStablePixels(GlacierCol3, classes);

  stablePixels = stablePixels.updateMask(regionRaster).rename("reference");
  Map.addLayer(stablePixels, {}, "stablePixels", false);
  // clasificacion random forest

  var points = stablePixels.addBands(ee.Image.pixelLonLat()).stratifiedSample({
    numPoints: 0,
    classBand: "reference",
    region: region.geometry().bounds(),
    scale: 30,
    seed: 1,
    geometries: true,
    dropNulls: true,
    classValues: [34, 25],
    classPoints: [params.samples[0], params.samples[1]],
  });

  var MosaicForClass = Mosaic.select(variables);
  print(yearsensor[0], MosaicForClass.bandNames().size());

  //******************* Pontos de Amostra**********************************
  // Lista de Leyenda conciderada Coleccion 01
  var lista_amostra = [Glaciar, Agua];

  var amostraTotal = lista_amostra[0];
  for (var i_amostra = 1; i_amostra < lista_amostra.length; i_amostra++) {
    amostraTotal = amostraTotal.merge(lista_amostra[i_amostra]);
  }

  var trainingcollect = MosaicForClass.sampleRegions({
    collection: amostraTotal,
    properties: ["reference"],
    scale: 30,
    tileScale: 5,
  });

  // Exportar muestras
  var filename = "muestras" + "-" + "l8" + "-" + yearsensor[0] + "-" + "1";

  Export.table.toDrive({
    collection: trainingcollect,
    folder: "Glacier-Mapping",
    description: "puntos-muestras-glacier-" + "1",
    fileNamePrefix: "puntos-muestras-glacier-" + "1",
    fileFormat: "CSV",
  });

  //*************************************************************************

  var trainingSamples = getSamples(stablePixels, MosaicForClass, points);
  var training = trainingSamples.training;

  // Define classifier
  var classifier = ee.Classifier.smileRandomForest({
    numberOfTrees: params.trees,
    variablesPerSplit: 1,
  });

  var _classifier = classifier.train(training, "reference");
  var classified_RF = MosaicForClass.classify(_classifier);

  var classified_RF_v4 = classified_RF
    .where(Mosaic.select("nir_median").lte(tree.nir_dry), 25)
    .where(Mosaic.select("red_median").lte(tree.red_dry), 25)
    .where(Mosaic.select("cloud").gte(params.cloud), 27)
    .selfMask();

  var Collection = ImagesYear[1];
  //print('# imagenes:'+yearsensor[0], Collection.size())
  Map.addLayer(
    Mosaic.select(["swir1_median", "nir_median", "red_median"]),
    {
      bands: "swir1_median,nir_median,red_median",
      min: 300,
      max: 5000,
    },
    "Mosaic-median-" + yearsensor[0],
    false,
  );

  Map.addLayer(
    MosaicForClass,
    {
      bands: "swir1_median_dry,nir_median_dry,red_median_dry",
      min: 300,
      max: 5000,
    },
    "Mosaic-minsnow-" + yearsensor[0],
    false,
  );

  Map.addLayer(
    Mosaic,
    {
      bands: "cloud",
      min: 0,
      max: 40,
      palette: [
        "#00007F",
        "#002AFF",
        "#00D4FF",
        "#7FFF7F",
        "#FFD400",
        "#FF2A00",
        "#7F0000",
      ],
    },
    "fraction-" + yearsensor[0],
    false,
  );

  Map.addLayer(
    classified_RF_v4.updateMask(classified_RF_v4.eq(34)).selfMask(),
    { palette: "ff0000" },
    "classified-RF-v4-" + yearsensor[0],
    false,
  );
  // Map.addLayer(classified_RF_v4,{min:25,max:34,palette: ['#ffa500','#9d9d9d','#0cd2ff']},'classified-RF-v4-'+yearsensor[0],false)

  var clasifyearBatch = clasCollBatch
    .filter(ee.Filter.eq("year", yearsensor[0]))
    .mosaic();

  Map.addLayer(
    clasifyearBatch.updateMask(clasifyearBatch.eq(34)).selfMask(),
    { palette: "fff729" },
    "classified-RF-v4-batch" + yearsensor[0],
    false,
  );

  Map.addLayer(points, {}, "points", false);

  // RANDOM FOREST
  var Clasification_RF = classified_RF_v4.rename("classification"); //Clasification.addBands(Glacier.rename('clasification'+yearsensor[0]))

  Clasification_RF = Clasification_RF.toInt8()
    .set("region", params.regionGlacier)
    .set("year", yearsensor[0])
    .set("version", params.version)
    .set("pais", params.pais)
    .set("satellite", param.satellite)
    .set("metodo", "RF-DT");
  // print(Clasification_RF)

  var sensornameupper = param.satellite.toUpperCase();

  if (params.exportar) {
    Export.image.toAsset({
      image: Clasification_RF,
      description:
        "GLACIER-" +
        sensornameupper +
        "-" +
        params.regionGlacier +
        "-" +
        yearsensor[0] +
        "-" +
        params.version,
      assetId:
        "projects/mapbiomas-venezuela/assets/AGUA/GLACIARES/COLECCION4/clasificacion-01/" +
        "GLACIER-" +
        sensornameupper +
        "-" +
        params.regionGlacier +
        "-" +
        yearsensor[0] +
        "-" +
        params.version,
      scale: 30,
      pyramidingPolicy: {
        ".default": "mode",
      },
      maxPixels: 1e13,
      region: region.geometry().bounds(),
    });
  }
});

/**
 * Despliega en el mapa los mosaicos y polígonos necesarios
 * para la visualización
 */
//print(Clasification)

Map.addLayer(
  region.style({ fillColor: "#ff000000", color: "f59e42" }),
  {},
  "Regions " + params.pais,
  false,
);
