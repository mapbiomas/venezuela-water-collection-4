/**
 * @fileoverview Select annual SNIC objects for each configured classification region.
 * Filter a merged annual feature table by intersection with each region and export the
 * selected features as separate tables.
 */

var pais_name = "VENEZUELA";

var id =
  "projects/mapbiomas-venezuela/assets/AGUA/DATOS_AUXILIARES/VECTOR/Pol_CA_4"; // Atualizar para o pais
/**
 * Region boundaries with Id_Region values used to select the objects.
 * @type {ee.FeatureCollection}
 */
var regions = ee.FeatureCollection(id);

/**
 * Year of the merged SNIC object table to process.
 * @type {number}
 */
var year = 2009;

//Atualizar a lista de Ids para o pais

//var idRegions = [
//  "NB-20-Z",
//  "NB-20-X",
//  "NC-20-Z",
//  "NB-18-X",
//  "NC-18-Z",
//  "NC-18-X",
//  "NA-20-Y",
//  "NA-20-V",
//  "NB-20-Y",
//  "NB-20-V",
//  "NC-20-Y",
//  "NC-20-V",
//  "NC-21-Y",
//  "NB-19-V",
//  "NC-19-Y",
//  "NC-19-V",
//  "ND-19-Y",
//  "NA-19-Z",
//  "NA-19-X",
//  "NB-19-Z",
//  "NB-19-X",
//  "NC-19-Z",
//  "NC-19-X",
//  "ND-19-Z",
//  "NA-20-X",
//  "NC-20-X"
//];

/**
 * Region IDs to select and export separately.
 * @type {number[]}
 */
var idRegions = [
  1801, 1802, 1803, 1804, 1805, 1806, 1807, 1808, 1809, 1810, 1811,
];

idRegions.forEach(function (id) {
  var region = regions.filter(ee.Filter.eq("Id_Region", id));

  var table = ee
    .FeatureCollection(
      "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_2/obj_" +
        year,
    )
    .filterBounds(region);

  //var table = ee.FeatureCollection('projects/mapbiomas-raisg/MAPBIOMAS-WATER/COLECCION2/' + pais_name + '/CUERPOS/COL3/SNIC_OBJ/obj_' + year).filterBounds(region);

  Export.table.toAsset(
    table,
    "obj" + "_" + year + "_region_" + id,
    "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION/" +
      "obj" +
      "_" +
      year +
      "_region_" +
      id,
  );
});
