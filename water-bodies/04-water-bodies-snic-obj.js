/**
 * @fileoverview Vectorize annual SNIC cluster rasters by watershed.
 * Create one table task per selected year and watershed. The output features carry a
 * cluster label and pixel count.
 */

/*
 * ============================================================
 * Script: Vectorización SNIC por cuenca - Venezuela
 * Version: v1.1
 * Autor: Nelly Rivero Fecha: 20/08/2026
 * ============================================================
 */

/**
 * SNIC and output folders, watershed identifiers, target years, and vectorization settings.
 * @type {Object}
 */
var param = {
  paisName: "Venezuela",
  snicFolder:
    "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC/",
  outFolder:
    "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ2/",
  cuencasAssetId:
    "projects/mapbiomas-venezuela/assets/AGUA/DATOS_AUXILIARES/VECTOR/Pol_CA_4",
  idField: "Id_Region",
  nameField: "LEVEL_2", // usado solo para hacer legible la descripción del task, no afecta el assetId
  years: [2025], //
  tileScale: 16,
};

// ---- Cargar cuencas ----
var cuencas = ee.FeatureCollection(param.cuencasAssetId);
print("Total de cuencas cargadas:", cuencas.size());

// ---- Obtener lista de features (client-side) para armar el loop de export ----

var cuencaInfo = cuencas
  .reduceColumns({
    reducer: ee.Reducer.toList(2),
    selectors: [param.idField, param.nameField],
  })
  .get("list")
  .getInfo();

print("Cuencas a procesar (Id_Region, LEVEL_2):", cuencaInfo);

// ---- Loop de exportación: año x cuenca ----
param.years.forEach(function (year) {
  var assetId =
    param.snicFolder + "snic_" + param.paisName + "_" + year + "_12";
  var snics_year = ee.Image(assetId).toInt();

  cuencaInfo.forEach(function (c) {
    var cuencaId = c[0];
    var cuencaName = (c[1] || "sn").toString().replace(/[^a-zA-Z0-9]/g, "_"); // limpia caracteres no válidos para nombre de asset

    var cuencaGeom = cuencas
      .filter(ee.Filter.eq(param.idField, cuencaId))
      .first()
      .geometry();

    var obj = snics_year.reduceToVectors({
      geometry: cuencaGeom,
      scale: param.scale,
      geometryType: "polygon",
      eightConnected: false,
      labelProperty: "label",
      reducer: ee.Reducer.countEvery(),
      bestEffort: true,
      maxPixels: 1e13,
      tileScale: param.tileScale,
    });

    Export.table.toAsset({
      collection: obj,
      description: "obj_" + year + "_cuenca_" + cuencaId + "_" + cuencaName,
      assetId: param.outFolder + "obj_" + year + "_cuenca_" + cuencaId,
    });
  });
});
