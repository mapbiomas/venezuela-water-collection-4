/**
 * @fileoverview Build a temporal-behavior image from annual surface-water presence.
 * Define annual presence from at least six monthly water observations and export frequency,
 * time to first presence, and time since last presence. The grid geometry is supplied as an
 * Earth Engine import.
 */

//var collection = ee.ImageCollection('projects/mapbiomas-raisg/PRODUCTOS/AGUA/VENEZUELA/COLECCION1/POSTPROCESSING/02-gap-01')
//                    .filter("year >= 2000")
//                    .filter("year < 2013")
//                    .merge(ee.ImageCollection("projects/mapbiomas-raisg/PRODUCTOS/AGUA/VENEZUELA/COLECCION1/POSTPROCESSING/02-gap-03"))
//                    .filter("year >= 2000")
//                 .map(function(image){
//                      return image.clip(grid);
//                 });

/**
 * Monthly surface-water classifications restricted to the imported grid.
 * @type {ee.ImageCollection}
 */
var collection = ee
  .ImageCollection(
    "projects/mapbiomas-venezuela/assets/AGUA/SUPERFICIE/COLECCION3/POSTPROCESSING/04-remap-04",
  )
  .filter("year >= 2000")
  .map(function (image) {
    return image.clip(grid);
  })
  .map(function (image) {
    var yearGet = ee.Number(image.getNumber("year"));
    return image.lte(3).selfMask().byte().set("year", yearGet);
  });

var waterFrequency = collection.map(function (image) {
  var annual = image.lte(3).selfMask().reduce("sum").gte(6).selfMask();

  return annual.byte();
});

/**
 * Expected annual water-presence band names used to label the input stack.
 * @type {string[]}
 */
var band_names_list = [
  "water_2000",
  "water_2001",
  "water_2002",
  "water_2003",
  "water_2004",
  "water_2005",
  "water_2006",
  "water_2007",
  "water_2008",
  "water_2009",
  "water_2010",
  "water_2011",
  "water_2012",
  "water_2013",
  "water_2014",
  "water_2015",
  "water_2016",
  "water_2017",
  "water_2018",
  "water_2019",
  "water_2020",
  "water_2021",
  "water_2022",
  "water_2023",
  "water_2024",
  "water_2025",
];

var image = waterFrequency.toBands().rename(band_names_list);

//Map.addLayer(image.reduce("sum"));

Map.addLayer(ee.Image(1), { palette: "008000" }, "green", false, 0.5);
Map.addLayer(ee.Image(1), { palette: "ffffff" }, "white", false, 0.5);

/**
 * Index-based stack for the first 23 annual bands used by the first- and last-presence
 * metrics.
 * @type {ee.List|ee.ImageCollection}
 */
var timecol = ee.List.sequence(0, 22, 1).map(function (element) {
  var isWater = image.select(ee.Number(element));

  return isWater.multiply(ee.Number(element).add(1)).byte().rename("isWater");
});

timecol = ee.ImageCollection.fromImages(timecol);

var begin2first = timecol.min();
var last2end = ee.Image.constant(timecol.size()).subtract(timecol.max());
var freq = image.reduce(ee.Reducer.sum());

var rgb = ee.Image.rgb(last2end, begin2first, freq).rename([
  "last2end",
  "begin2first",
  "freq",
]);

Map.addLayer(
  freq,
  { palette: "ffffff, 00ffff, 0000ff, 000040", min: 1, max: 36 },
  "freq",
  false,
);

Map.addLayer(rgb, { min: 1, max: 36 }, "rgb temporal", false);

Export.image.toAsset({
  image: rgb,
  description: "temporal_behavior_2000_2023",
  assetId:
    "projects/mapbiomas-venezuela/AGUA/CUERPOS_HIDRICOS/COLECCION4/temporal-behavior_00_23_col2",
  region: grid,
  scale: 30,
  maxPixels: 1e13,
});
