/**
 * @fileoverview Combine watershed-level SNIC object tables into one asset per year.
 * Find the tables by year in the source folder, compare the count with the watershed
 * inventory, and flatten and export the available tables.
 */

/*
 * ============================================================
 * Script: Merge de assets SNIC_OBJ por cuenca -> asset anual único
 * Version: v1.0
 * Autor: Nelly Rivero Fecha: 2026-08-28
 * ============================================================
 */

/**
 * Source and output folders, watershed inventory, and years to merge.
 * @type {Object}
 */
var param = {
  paisName: "Venezuela",
  srcFolder:
    "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ",
  outFolder:
    "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_2/",
  cuencasAssetId:
    "projects/mapbiomas-venezuela/assets/AGUA/DATOS_AUXILIARES/VECTOR/Pol_CA_4",
  idField: "Id_Region",
  years: [2000],
};

// ---- Cantidad esperada de cuencas (para comparar contra lo encontrado) ----
var cuencas = ee.FeatureCollection(param.cuencasAssetId);
var totalCuencasEsperadas = cuencas.size().getInfo();
print(
  "Cuencas esperadas por año (según " + param.cuencasAssetId + "):",
  totalCuencasEsperadas,
);

// ---- Listar todos los assets existentes en la carpeta fuente (una sola llamada) ----
var listado = ee.data.listAssets(param.srcFolder);
var todosLosIds = listado.assets.map(function (a) {
  return a.name;
});
print("Total de assets encontrados en SNIC_OBJ:", todosLosIds.length);

param.years.forEach(function (year) {
  // ---- Filtrar solo los assets de este año, por patrón exacto de nombre ----
  var prefijo = param.srcFolder + "/obj_" + year + "_cuenca";
  var idsDelAnio = todosLosIds.filter(function (id) {
    return id.indexOf(prefijo) === 0;
  });

  print(
    "Año " + year + " — assets encontrados:",
    idsDelAnio.length,
    "/ esperados:",
    totalCuencasEsperadas,
    idsDelAnio,
  );

  if (idsDelAnio.length === 0) {
    print("⚠️ Año " + year + ": no se encontraron assets, se omite.");
    return;
  }
  if (idsDelAnio.length < totalCuencasEsperadas) {
    print(
      "⚠️ Año " +
        year +
        ": faltan cuencas (" +
        (totalCuencasEsperadas - idsDelAnio.length) +
        "). Revisar antes de dar el merge por definitivo.",
    );
  }

  // ---- Cargar cada asset como FeatureCollection y mergear ----
  var fcList = idsDelAnio.map(function (id) {
    return ee.FeatureCollection(id);
  });
  var merged = ee.FeatureCollection(fcList).flatten();

  // ---- Exportar como asset anual único ----
  var descripcion = (param.paisName.toLowerCase() + "_obj_" + year).slice(
    0,
    100,
  );

  Export.table.toAsset({
    collection: merged,
    description: descripcion,
    assetId: param.outFolder + "obj_" + year,
  });
});
