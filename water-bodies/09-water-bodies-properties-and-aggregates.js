/**
 * @fileoverview Build the water-body training table by joining labeled samples to indexed SNIC objects.
 * Load sample assets, find intersecting objects for each sample's year, copy their
 * predictor fields, and export the combined training features with the selected properties.
 */

/*
 *
 * AGRUPAR AS FEATURES COLLECTION DAS PASTAS
 *
 */

var pais = "VENEZUELA";

// Caminho para a pasta que contém as FeatureCollections
/**
 * Earth Engine folder containing uploaded sample tables.
 * @type {string}
 */
var folderPath =
  "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/MUESTRAS/";

// Listar todos os assets na pasta
var assetList = ee.data.listAssets(folderPath);

// Filtrar para obter apenas FeatureCollections
var featureCollectionPaths = assetList.assets
  .filter(function (asset) {
    return asset.type === "TABLE";
  })
  .map(function (asset) {
    return asset.id;
  });

// Função para carregar uma FeatureCollection a partir de um ID
/**
 * Load one labeled sample asset as a feature collection.
 *
 * @param {string} assetId - ID of the Earth Engine sample table.
 * @returns {ee.FeatureCollection} Labeled sample features.
 */
var loadFeatureCollection = function (assetId) {
  return ee.FeatureCollection(assetId);
};

// Carregar todas as FeatureCollections
var featureCollections = featureCollectionPaths.map(loadFeatureCollection);

// Agrupar todas as FeatureCollections em uma única FeatureCollection
var mergedFeatureCollection = ee
  .FeatureCollection(featureCollections)
  .flatten();

// Visualizar o resultado no console
print("Merged FeatureCollection:", mergedFeatureCollection);

// Para ver o resultado na visualização do mapa, adicione a camada
Map.addLayer(mergedFeatureCollection, {}, "Merged FeatureCollection");

// ***************************************************************************************************************************************
// ***************************************************************************************************************************************

var list = mergedFeatureCollection /*.limit(2)*/
  .reduceColumns(ee.Reducer.toList(2), ["system:index", "year"])
  .get("list")
  .getInfo();

/*
 *
 * PROPRIEDADE DOS VETORES PARA OS PONTOS
 *
 */

var pointsProp = list.map(function (item) {
  var year = item[1];

  // Carrega as coleções de features
  var muestras = mergedFeatureCollection.filter(
    ee.Filter.eq("system:index", item[0]),
  );
  var snic = ee
    .FeatureCollection(
      "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_" +
        year +
        "_region_1801",
    )
    .merge(
      ee.FeatureCollection(
        "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_" +
          year +
          "_region_1802",
      ),
    )
    .merge(
      ee.FeatureCollection(
        "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_" +
          year +
          "_region_1803",
      ),
    )
    .merge(
      ee.FeatureCollection(
        "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_" +
          year +
          "_region_1804",
      ),
    )
    .merge(
      ee.FeatureCollection(
        "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_" +
          year +
          "_region_1805",
      ),
    )
    .merge(
      ee.FeatureCollection(
        "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_" +
          year +
          "_region_1806",
      ),
    )
    .merge(
      ee.FeatureCollection(
        "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_" +
          year +
          "_region_1807",
      ),
    )
    .merge(
      ee.FeatureCollection(
        "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_" +
          year +
          "_region_1808",
      ),
    )
    .merge(
      ee.FeatureCollection(
        "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_" +
          year +
          "_region_1809",
      ),
    )
    .merge(
      ee.FeatureCollection(
        "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_" +
          year +
          "_region_1810",
      ),
    )
    .merge(
      ee.FeatureCollection(
        "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_" +
          year +
          "_region_1811",
      ),
    );
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_' + year + '_region_SB-18-X')).merge(
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_' + year + '_region_SB-18-Y')).merge(
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_' + year + '_region_SB-18-Z')).merge(
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_' + year + '_region_SB-19-V')).merge(
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_' + year + '_region_SC-17-X')).merge(
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_' + year + '_region_SC-17-Z')).merge(
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_' + year + '_region_SC-18-V')).merge(
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_' + year + '_region_SC-18-X')).merge(
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_' + year + '_region_SC-18-Y')).merge(
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_' + year + '_region_SC-18-Z')).merge(
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_' + year + '_region_SC-19-V')).merge(
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_' + year + '_region_SC-19-Y')).merge(
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_' + year + '_region_SC-19-Z')).merge(
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_' + year + '_region_SD-18-V')).merge(
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_' + year + '_region_SD-18-X')).merge(
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_' + year + '_region_SD-18-Y')).merge(
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_' + year + '_region_SD-18-Z')).merge(
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_' + year + '_region_SD-19-V')).merge(
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_' + year + '_region_SD-19-X')).merge(
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_' + year + '_region_SD-19-Y')).merge(
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_' + year + '_region_SD-19-Z')).merge(
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_' + year + '_region_SE-18-X')).merge(
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2obj_' + year + '_region_SE-19-V')).merge(
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_' + year + '_region_SE-19-X')).merge(
  //           ee.FeatureCollection('projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/obj_' + year + '_region_SE-19-Y'));

  // Definir o filtro espacial para o join
  var spatialFilter = ee.Filter.intersects({
    leftField: ".geo",
    rightField: ".geo",
    maxError: 10,
  });

  // Realizar o join espacial
  var spatialJoin = ee.Join.saveAll("snicMatches", "intersects");

  // Aplicar o join espacial às coleções
  var joinedCollection = spatialJoin.apply(muestras, snic, spatialFilter);

  // Função para transferir propriedades das features de snic para muestras
  /**
   * Copy predictor properties from all matching SNIC objects onto a sample.
   * When matches share a property, later matches overwrite earlier values.
   *
   * @param {ee.Feature} feature - Sample with the snicMatches join property.
   * @returns {ee.Feature} Sample with the merged SNIC properties.
   */
  var transferProperties = function (feature) {
    // Obtém as features correspondentes de snic
    var snicFeatures = ee.List(feature.get("snicMatches"));

    // Mesclar as propriedades de todas as features correspondentes de snic
    var mergedProperties = snicFeatures.iterate(function (snicFeature, acc) {
      var snicDict = ee.Feature(snicFeature).toDictionary();
      return ee.Dictionary(acc).combine(snicDict, true);
    }, ee.Dictionary({}));

    // Define as propriedades mescladas na feature de muestras
    return feature.set(mergedProperties);
  };

  // Aplicar a transferência de propriedades a cada feature da coleção joinada
  var updatedMuestras = joinedCollection.map(transferProperties);

  return updatedMuestras;
});

print(pointsProp);

// Transformar pointsProp em uma lista de FeatureCollections
var featureCollectionsList = pointsProp;

// Função para iterar sobre a lista e combinar FeatureCollections
/**
 * Flatten the per-sample feature collections into one collection.
 *
 * @param {Array<ee.FeatureCollection>|ee.List} list - Nested collections to combine.
 * @returns {ee.FeatureCollection} Combined training features.
 */
var combineFeatureCollections = function (list) {
  return ee.FeatureCollection(list).flatten();
};

// Combinar todas as FeatureCollections em uma única FeatureCollection
var combinedFeatureCollection = combineFeatureCollections(
  featureCollectionsList,
);

// Verificar o resultado
print(combinedFeatureCollection);

/**
 * Training fields retained in the consolidated export.
 * @type {string[]}
 */
var listSelect = [
  "cell_index",
  "class",
  "count",
  "data_hydNat",
  "data_mpbAgr",
  "data_mpbCls",
  "data_mpbFor",
  "data_mpbMin",
  "data_mpbNnf",
  "data_mpbPas",
  "data_mpbUrb",
  "data_otr_nat_area",
  "data_srtmMx",
  "freq_meanAn",
  "freq_meanTo",
  "freq_tempPr",
  "freq_tempUl",
  "label",
  "morp_aream2",
  "morp_convex",
  "morp_maxExt",
  "morp_nrVi50",
  "morp_nrViim",
  "morp_perime",
  "morp_r_aPeC",
  "morp_r_aPer",
  "morp_r_circ",
  "morp_r_elon",
  "morp_r_laCu",
  "morp_r_shpf",
  "pais_index",
  "pais_name",
  "year",
];

Export.table.toAsset({
  collection: combinedFeatureCollection.select(listSelect),
  description: "treinamento-" + pais,
  assetId:
    "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/MUESTRAS-AGRUPADAS/" +
    "treinamento-" +
    pais,
});
