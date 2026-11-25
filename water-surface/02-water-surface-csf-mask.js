/**
 * @fileoverview Apply CSF and ancillary masks to monthly surface-water detections.
 * Mosaic regional detections for each year, screen water classes using annual frequency,
 * terrain, and spectral fractions, and apply configured land-cover masks and manual
 * corrections. The export path points to Collection 3 post-processing.
 */

// Versión CSF/mask AMAZONIA
/// Modificado por Nelly Rivero Septiembre 2026

var paisName = "Venezuela"; // Ecuador, Perú, Bolivia, Venezuela, Colombia, Suriname, Guiana Francesa, Guyana

/**
 * Years selected for monthly mask exports.
 * @type {number[]}
 */
var years = ee.List.sequence(2025, 2025).getInfo(); /// John
// var version_input = 1
var version_out = 1;
var cloud_cover = 70;
var region_class = 1097;

var region_interes = "Amazonia";

/**
 * Classification region IDs grouped by regional processing area.
 * @type {Object<string, number[]>}
 */
var reg_clasif = {
  Amazonia: [
    1057, 1041, 1055, 1018, 1006, 1012, 1060, 1002, 1065, 1063, 1074, 1054,
    1049, 1040, 1007, 1014, 1001, 1004, 1017, 1000, 1005, 1087, 1059, 1076,
    1083, 1084, 1070, 1073, 1078, 1071, 1081, 1082, 1067, 1072, 1105, 1134,
    1135, 1136, 1092, 1034, 1033, 1030, 1027, 1133, 1097, 1086, 1090, 1089,
    1088, 1079, 1124, 1108, 1101, 1100, 1094, 1091, 1085, 1093, 1080, 1098,
    1095, 1106, 1130, 1123, 1128, 1131, 1137, 1208, 1209, 1210, 1053, 1046,
    1048, 1039, 1028, 1015, 1016, 1036, 1043, 1051, 1052, 1003, 1008, 1011,
    1009, 1058, 1066, 1038, 1045, 1064, 1068, 1050, 1138, 1129, 1126, 1132,
    1125, 1062, 1047, 1032, 1031, 1096, 1103, 1104, 1102, 1099, 1026, 1025,
    1024, 1023, 1022, 1127, 1122, 1121, 1119, 1110, 1117, 1116, 1113, 1118,
    1120, 1111, 1115, 1109, 1112, 1107, 1114, 1077, 1075, 1069, 1029, 1035,
    1042, 1013, 1020, 1044, 1061, 1021, 1019, 1010,
  ],
};
// 'Andes_altos':[1001, 1004, 1005, 1006],
// 'Andes_bajos': [1021,1022,1023,1029,1030,1027,1026],
// 'Andes_intermedios':[1010,1012,1015,1016,1017,1019,1011,1014],
// 'Caribe':[1058],
// 'Guajira':[1061],
// 'Inter_Andina':[1060],
// 'Orinoquia':[1059],
// 'Pacifico':[1038]}

/**
 * Whether the export uses the additional MapBiomas land-cover exclusions.
 * @type {boolean}
 */
var useMask_Mapbiomas = true;
var vis = {
  // Visualizacion solo un grid
  Map_addLayer: true,
  listbandMonth: [
    // Visualizacion de meses
    // 'w_1',
    // 'w_2',
    // 'w_3','w_4',
    // 'w_5',
    // 'w_6',
    // 'w_7',
    "w_4",
    // 'w_9','w_10',
    // 'w_11',
    // 'w_12'
  ],
};

var namecountry = paisName.replace("ú", "u");
var paises = ee.FeatureCollection(
  "projects/mapbiomas-raisg/DATOS_AUXILIARES/VECTORES/paises-4",
);
var grids = ee.FeatureCollection(
  "projects/mapbiomas-raisg/PRODUCTOS/AGUA/DATOS_AUXILIARES/TEMP/bigGrids_" +
    namecountry,
);
var pais = paises.filter(ee.Filter.eq("pais", paisName));

// --------------------------------------------------------------------------------------------------------------------------
// para el enmasacaramiento de Tierras bajas
// cambiar la ruta que se cuenta la version de Andes...
var Mask = ee.Image(
  "projects/mapbiomas-venezuela/assets/AGUA/DATOS_AUXILIARES/RASTER/Regiones_Vzla_24_02_2026",
);
// (se elimina region_orinoquia: solo se usaba para el ajuste de vectores ajuste_mascara_ori, ya no aplica)
var regAndes = ee.FeatureCollection(
  "projects/mapbiomas-venezuela/assets/AGUA/DATOS_AUXILIARES/VECTOR/Regiones_Vzla_19Feb2016",
);
print(regAndes);
var regionMask_v1 = regAndes.reduceToImage({
  properties: ["ID_Region"],
  reducer: ee.Reducer.first(),
});
Mask = regionMask_v1;

// --------------------------------------------------------------------------------------------------------------------------
// para el y procesar solo para la region de ineteres
var reg_filter = reg_clasif[region_interes];
print("region filtrada", reg_filter);

var region_export_rast = Mask; //Mask.eq(1005)
var region_export_vect = regAndes.filter(
  ee.Filter.inList("ID_Region", reg_filter),
);

var regionesMask = {
  Amazonia: Mask.eq(1057)
    .or(Mask.eq(1041))
    .or(Mask.eq(1055))
    .or(Mask.eq(1018))
    .or(Mask.eq(1006))
    .or(Mask.eq(1012))
    .or(Mask.eq(1060))
    .or(Mask.eq(1002))
    .or(Mask.eq(1065))
    .or(Mask.eq(1063))
    .or(Mask.eq(1074))
    .or(Mask.eq(1054))
    .or(Mask.eq(1049))
    .or(Mask.eq(1040))
    .or(Mask.eq(1007))
    .or(Mask.eq(1014))
    .or(Mask.eq(1001))
    .or(Mask.eq(1004))
    .or(Mask.eq(1017))
    .or(Mask.eq(1000))
    .or(Mask.eq(1005))
    .or(Mask.eq(1087))
    .or(Mask.eq(1059))
    .or(Mask.eq(1076))
    .or(Mask.eq(1083))
    .or(Mask.eq(1084))
    .or(Mask.eq(1070))
    .or(Mask.eq(1073))
    .or(Mask.eq(1078))
    .or(Mask.eq(1071))
    .or(Mask.eq(1081))
    .or(Mask.eq(1082))
    .or(Mask.eq(1067))
    .or(Mask.eq(1072))
    .or(Mask.eq(1105))
    .or(Mask.eq(1134))
    .or(Mask.eq(1135))
    .or(Mask.eq(1136))
    .or(Mask.eq(1092))
    .or(Mask.eq(1034))
    .or(Mask.eq(1033))
    .or(Mask.eq(1030))
    .or(Mask.eq(1027))
    .or(Mask.eq(1133))
    .or(Mask.eq(1097))
    .or(Mask.eq(1086))
    .or(Mask.eq(1090))
    .or(Mask.eq(1089))
    .or(Mask.eq(1088))
    .or(Mask.eq(1079))
    .or(Mask.eq(1124))
    .or(Mask.eq(1108))
    .or(Mask.eq(1101))
    .or(Mask.eq(1100))
    .or(Mask.eq(1094))
    .or(Mask.eq(1091))
    .or(Mask.eq(1085))
    .or(Mask.eq(1093))
    .or(Mask.eq(1080))
    .or(Mask.eq(1098))
    .or(Mask.eq(1095))
    .or(Mask.eq(1106))
    .or(Mask.eq(1130))
    .or(Mask.eq(1123))
    .or(Mask.eq(1128))
    .or(Mask.eq(1131))
    .or(Mask.eq(1137))
    .or(Mask.eq(1208))
    .or(Mask.eq(1209))
    .or(Mask.eq(1210))
    .or(Mask.eq(1053))
    .or(Mask.eq(1046))
    .or(Mask.eq(1048))
    .or(Mask.eq(1039))
    .or(Mask.eq(1028))
    .or(Mask.eq(1015))
    .or(Mask.eq(1016))
    .or(Mask.eq(1036))
    .or(Mask.eq(1043))
    .or(Mask.eq(1051))
    .or(Mask.eq(1052))
    .or(Mask.eq(1003))
    .or(Mask.eq(1008))
    .or(Mask.eq(1011))
    .or(Mask.eq(1009))
    .or(Mask.eq(1058))
    .or(Mask.eq(1066))
    .or(Mask.eq(1038))
    .or(Mask.eq(1045))
    .or(Mask.eq(1064))
    .or(Mask.eq(1068))
    .or(Mask.eq(1050))
    .or(Mask.eq(1138))
    .or(Mask.eq(1129))
    .or(Mask.eq(1126))
    .or(Mask.eq(1132))
    .or(Mask.eq(1125))
    .or(Mask.eq(1062))
    .or(Mask.eq(1047))
    .or(Mask.eq(1032))
    .or(Mask.eq(1031))
    .or(Mask.eq(1096))
    .or(Mask.eq(1103))
    .or(Mask.eq(1104))
    .or(Mask.eq(1102))
    .or(Mask.eq(1099))
    .or(Mask.eq(1026))
    .or(Mask.eq(1025))
    .or(Mask.eq(1024))
    .or(Mask.eq(1023))
    .or(Mask.eq(1022))
    .or(Mask.eq(1127))
    .or(Mask.eq(1122))
    .or(Mask.eq(1121))
    .or(Mask.eq(1119))
    .or(Mask.eq(1110))
    .or(Mask.eq(1117))
    .or(Mask.eq(1116))
    .or(Mask.eq(1113))
    .or(Mask.eq(1118))
    .or(Mask.eq(1120))
    .or(Mask.eq(1111))
    .or(Mask.eq(1115))
    .or(Mask.eq(1109))
    .or(Mask.eq(1112))
    .or(Mask.eq(1107))
    .or(Mask.eq(1114))
    .or(Mask.eq(1077))
    .or(Mask.eq(1075))
    .or(Mask.eq(1069))
    .or(Mask.eq(1029))
    .or(Mask.eq(1035))
    .or(Mask.eq(1042))
    .or(Mask.eq(1013))
    .or(Mask.eq(1020))
    .or(Mask.eq(1044))
    .or(Mask.eq(1061))
    .or(Mask.eq(1021))
    .or(Mask.eq(1019))
    .or(Mask.eq(1010))
    .selfMask(),
};
// 'Andes_altos' : Mask.eq(1001).or( Mask.eq(1004)).or( Mask.eq(1005)).or( Mask.eq(1006)).selfMask(),
// 'Andes_bajos' : Mask.eq(1021).or( Mask.eq(1022)).or( Mask.eq(1023)).or( Mask.eq(1029)).or( Mask.eq(1030)).or( Mask.eq(1027)).or( Mask.eq(1026)).selfMask(),
// 'Andes_intermedios' : Mask.eq(1010).or( Mask.eq(1012)).or( Mask.eq(1015)).or( Mask.eq(1016)).or( Mask.eq(1017)).or( Mask.eq(1019)).or( Mask.eq(1011)).or( Mask.eq(1014)).selfMask(),
// 'Caribe' : Mask.eq(1058).selfMask(),
// 'Guajira' : Mask.eq(1061).selfMask(),
// 'Inter_Andina' : Mask.eq(1050).selfMask(),
// 'Orinoquia' : Mask.eq(1059).selfMask(),
// 'Pacifico' : Mask.eq(1038).selfMask()}
region_export_rast = regionesMask[region_interes];

Map.addLayer(region_export_rast, {}, "region_export_rast");
Map.addLayer(region_export_vect, {}, "region_export_vect");

var modules = require("users/rcamargo/projects-mapbiomas-water-c1:step-05-coleccion-1-1/Map001_module_mosaic_andes1");

//var tierrasBajas = ee.Image('projects/mapbiomas-raisg/DATOS_AUXILIARES/RASTERS/clasificacion-mosaicos-4')
// Corresponde al codigo de pais y mosaico

var tierrasBajas = Mask.eq(1057)
  .or(Mask.eq(1041))
  .or(Mask.eq(1055))
  .or(Mask.eq(1018))
  .or(Mask.eq(1006))
  .or(Mask.eq(1012))
  .or(Mask.eq(1060))
  .or(Mask.eq(1002))
  .or(Mask.eq(1065))
  .or(Mask.eq(1063))
  .or(Mask.eq(1074))
  .or(Mask.eq(1054))
  .or(Mask.eq(1049))
  .or(Mask.eq(1040))
  .or(Mask.eq(1007))
  .or(Mask.eq(1014))
  .or(Mask.eq(1001))
  .or(Mask.eq(1004))
  .or(Mask.eq(1017))
  .or(Mask.eq(1000))
  .or(Mask.eq(1005))
  .or(Mask.eq(1087))
  .or(Mask.eq(1059))
  .or(Mask.eq(1076))
  .or(Mask.eq(1083))
  .or(Mask.eq(1084))
  .or(Mask.eq(1070))
  .or(Mask.eq(1073))
  .or(Mask.eq(1078))
  .or(Mask.eq(1071))
  .or(Mask.eq(1081))
  .or(Mask.eq(1082))
  .or(Mask.eq(1067))
  .or(Mask.eq(1072))
  .or(Mask.eq(1105))
  .or(Mask.eq(1134))
  .or(Mask.eq(1135))
  .or(Mask.eq(1136))
  .or(Mask.eq(1092))
  .or(Mask.eq(1034))
  .or(Mask.eq(1033))
  .or(Mask.eq(1030))
  .or(Mask.eq(1027))
  .or(Mask.eq(1133))
  .or(Mask.eq(1097))
  .or(Mask.eq(1086))
  .or(Mask.eq(1090))
  .or(Mask.eq(1089))
  .or(Mask.eq(1088))
  .or(Mask.eq(1079))
  .or(Mask.eq(1124))
  .or(Mask.eq(1108))
  .or(Mask.eq(1101))
  .or(Mask.eq(1100))
  .or(Mask.eq(1094))
  .or(Mask.eq(1091))
  .or(Mask.eq(1085))
  .or(Mask.eq(1093))
  .or(Mask.eq(1080))
  .or(Mask.eq(1098))
  .or(Mask.eq(1095))
  .or(Mask.eq(1106))
  .or(Mask.eq(1130))
  .or(Mask.eq(1123))
  .or(Mask.eq(1128))
  .or(Mask.eq(1131))
  .or(Mask.eq(1137))
  .or(Mask.eq(1208))
  .or(Mask.eq(1209))
  .or(Mask.eq(1210))
  .or(Mask.eq(1053))
  .or(Mask.eq(1046))
  .or(Mask.eq(1048))
  .or(Mask.eq(1039))
  .or(Mask.eq(1028))
  .or(Mask.eq(1015))
  .or(Mask.eq(1016))
  .or(Mask.eq(1036))
  .or(Mask.eq(1043))
  .or(Mask.eq(1051))
  .or(Mask.eq(1052))
  .or(Mask.eq(1003))
  .or(Mask.eq(1008))
  .or(Mask.eq(1011))
  .or(Mask.eq(1009))
  .or(Mask.eq(1058))
  .or(Mask.eq(1066))
  .or(Mask.eq(1038))
  .or(Mask.eq(1045))
  .or(Mask.eq(1064))
  .or(Mask.eq(1068))
  .or(Mask.eq(1050))
  .or(Mask.eq(1138))
  .or(Mask.eq(1129))
  .or(Mask.eq(1126))
  .or(Mask.eq(1132))
  .or(Mask.eq(1125))
  .or(Mask.eq(1062))
  .or(Mask.eq(1047))
  .or(Mask.eq(1032))
  .or(Mask.eq(1031))
  .or(Mask.eq(1096))
  .or(Mask.eq(1103))
  .or(Mask.eq(1104))
  .or(Mask.eq(1102))
  .or(Mask.eq(1099))
  .or(Mask.eq(1026))
  .or(Mask.eq(1025))
  .or(Mask.eq(1024))
  .or(Mask.eq(1023))
  .or(Mask.eq(1022))
  .or(Mask.eq(1127))
  .or(Mask.eq(1122))
  .or(Mask.eq(1121))
  .or(Mask.eq(1119))
  .or(Mask.eq(1110))
  .or(Mask.eq(1117))
  .or(Mask.eq(1116))
  .or(Mask.eq(1113))
  .or(Mask.eq(1118))
  .or(Mask.eq(1120))
  .or(Mask.eq(1111))
  .or(Mask.eq(1115))
  .or(Mask.eq(1109))
  .or(Mask.eq(1112))
  .or(Mask.eq(1107))
  .or(Mask.eq(1114))
  .or(Mask.eq(1077))
  .or(Mask.eq(1075))
  .or(Mask.eq(1069))
  .or(Mask.eq(1029))
  .or(Mask.eq(1035))
  .or(Mask.eq(1042))
  .or(Mask.eq(1013))
  .or(Mask.eq(1020))
  .or(Mask.eq(1044))
  .or(Mask.eq(1061))
  .or(Mask.eq(1021))
  .or(Mask.eq(1019))
  .or(Mask.eq(1010))
  .selfMask();

//tierrasBajas = tierrasBajas.where(MaskAndes.gt(0),0).selfMask()

var get_Collection = modules.get_Collection2;
var get_csf = modules.csf;
var get_NDWImf = modules.NDWImf;
var get_mNDWI = modules.mNDWI;

// var Collection_all = get_Collection(pais.geometry().bounds(),cloud_cover); ///// modificado
var Collection_all = get_Collection(
  region_export_vect.geometry().bounds(),
  cloud_cover,
);
// --------------------------------------------------------------------------------------------------------------------------

var srtm = ee.Image("USGS/SRTMGL1_003");
var slopes = ee.Terrain.slope(srtm);

/**
 * Minimum annual water count used by the first terrain and frequency test.
 * @type {number}
 */
var threshold_freq_mean = 1.8;
var threshold_freq_recap = 8; // 8
var threshold_srtm_mean = 20; // 20

// ---- CORRECCIÓN MANUAL POR POLÍGONO (clase 4 -> agua) ----

/**
 * Whether the imported correccion_agua_manual polygon can convert class 4 to water.
 * @type {boolean}
 */
var usar_correccion_manual = true;

for (var i = 0; i < years.length; i++) {
  var year = years[i];
  var start = String(year) + "-01-01";
  var end = String(year) + "-12-31";

  var CollectionYear = Collection_all.filterDate(start, end)
    .map(get_csf)
    .map(get_NDWImf);
  // .map(get_mNDWI);

  var shade_year = CollectionYear.select("shade").median();
  var csf_year = CollectionYear.select("csf").median();
  var soil_year = CollectionYear.select("soil").median();
  var ndwi_mcfeeters_year = CollectionYear.select("ndwi_mcfeeters").median();
  var mndwi_year = CollectionYear.select("mndwi").median();

  // Map.addLayer(csf_year,{},'csf_year')
  // var mapbiomas = ee.Image('projects/mapbiomas-raisg/public/collection4/mapbiomas_raisg_panamazonia_collection4_integration_v1')

  // mapbiomas = mapbiomas.addBands(mapbiomas.select('classification_2021').rename('classification_2022'))
  //                     .select('classification_'+year)
  //                     .selfMask()
  var colombia_col1 = ee.Image(
    "projects/mapbiomas-raisg/MAPBIOMAS-VENEZUELA/COLECCION1/integracion/VENEZUELA-6",
  );

  // var urbanCol =ee.Image('projects/mapbiomas-raisg/TRANSVERSALES/COLOMBIA/COLECCION5/URBANA/INTEGRACION/MERGE_URBANA_Colombia');

  var miningCol = colombia_col1.mask(colombia_col1.eq(30)).selfMask();
  var urbanCol = colombia_col1.mask(colombia_col1.eq(24)).selfMask();

  var mapbiomas = ee.Image(
    "projects/mapbiomas-raisg/public/collection5/mapbiomas_raisg_panamazonia_collection5_integration_v1",
  );

  if (paisName === "Perú") {
    mapbiomas = ee.Image(
      "projects/mapbiomas-raisg/PRODUCTOS/PERU/COLECCION4/INTEGRACION/integracion-pais/Integracion-PERU-6",
    );
  }
  if (paisName === "Bolivia") {
    mapbiomas = ee.Image(
      "projects/mapbiomas-raisg/PRODUCTOS/BOLIVIA/COLECCION4/INTEGRACION/integracion-pais/BOLIVIA-4",
    );
  }
  //Datos Colombia
  // if (paisName == 'Colombia'){
  //   mapbiomas =ee.Image('projects/mapbiomas-raisg/TRANSVERSALES/COLOMBIA/COLECCION5/URBANA/INTEGRACION/MERGE_URBANA_Colombia')
  // }

  // mapbiomas = mapbiomas.addBands(ee.Image('projects/mapbiomas-raisg/TRANSVERSALES/COLOMBIA/COLECCION5/URBANA/INTEGRACION/MERGE_URBANA_Colombia'))
  mapbiomas = mapbiomas
    .addBands(
      mapbiomas.select("classification_2021").rename("classification_2022"),
    )
    .select("classification_2021")
    .selfMask();

  urbanCol = urbanCol.select("classification_2021").selfMask();
  miningCol = miningCol.select("classification_2021").selfMask();

  // ----------------------------------------------------------------------------------------------------------------------------------------------------

  if (true) {
    // Listado de regiones y biggrids que se van a integrar
    var tableRegions = [
      //Idregion ,version, Region pais (1 Andes region; 2 Amazonia baja BigGrid)
      // Regiones de Andes

      [1057, 1, 1], //Amazonia
      [1041, 1, 1], //Amazonia
      [1055, 1, 1], //Amazonia
      [1018, 1, 1], //Amazonia
      [1006, 1, 1], //Amazonia
      [1012, 1, 1], //Amazonia
      [1060, 1, 1], //Amazonia
      [1002, 1, 1], //Amazonia
      [1065, 1, 1], //Amazonia
      [1063, 1, 1], //Amazonia
      [1074, 1, 1], //Amazonia
      [1054, 1, 1], //Amazonia
      [1049, 1, 1], //Amazonia
      [1040, 1, 1], //Amazonia
      [1007, 1, 1], //Amazonia
      [1014, 1, 1], //Amazonia
      [1001, 1, 1], //Amazonia
      [1004, 1, 1], //Amazonia
      [1017, 1, 1], //Amazonia
      [1000, 1, 1], //Amazonia
      [1005, 1, 1], //Amazonia
      [1087, 1, 1], //Amazonia
      [1059, 1, 1], //Amazonia
      [1076, 1, 1], //Amazonia
      [1083, 1, 1], //Amazonia
      [1084, 1, 1], //Amazonia
      [1070, 1, 1], //Amazonia
      [1073, 1, 1], //Amazonia
      [1078, 1, 1], //Amazonia
      [1071, 1, 1], //Amazonia
      [1081, 1, 1], //Amazonia
      [1082, 1, 1], //Amazonia
      [1067, 1, 1], //Amazonia
      [1072, 1, 1], //Amazonia
      [1105, 1, 1], //Amazonia
      [1134, 1, 1], //Amazonia
      [1135, 1, 1], //Amazonia
      [1136, 1, 1], //Amazonia
      [1092, 1, 1], //Amazonia
      [1034, 1, 1], //Amazonia
      [1033, 1, 1], //Amazonia
      [1030, 1, 1], //Amazonia
      [1027, 1, 1], //Amazonia
      [1133, 1, 1], //Amazonia
      [1097, 1, 1], //Amazonia
      [1086, 1, 1], //Amazonia
      [1090, 1, 1], //Amazonia
      [1089, 1, 1], //Amazonia
      [1088, 1, 1], //Amazonia
      [1079, 1, 1], //Amazonia
      [1124, 1, 1], //Amazonia
      [1108, 1, 1], //Amazonia
      [1101, 1, 1], //Amazonia
      [1100, 1, 1], //Amazonia
      [1094, 1, 1], //Amazonia
      [1091, 1, 1], //Amazonia
      [1085, 1, 1], //Amazonia
      [1093, 1, 1], //Amazonia
      [1080, 1, 1], //Amazonia
      [1098, 1, 1], //Amazonia
      [1095, 1, 1], //Amazonia
      [1106, 1, 1], //Amazonia
      [1130, 1, 1], //Amazonia
      [1123, 1, 1], //Amazonia
      [1128, 1, 1], //Amazonia
      [1131, 1, 1], //Amazonia
      [1137, 1, 1], //Amazonia
      [1208, 1, 1], //Amazonia
      [1209, 1, 1], //Amazonia
      [1210, 1, 1], //Amazonia
      [1053, 1, 1], //Amazonia
      [1046, 1, 1], //Amazonia
      [1048, 1, 1], //Amazonia
      [1039, 1, 1], //Amazonia
      [1028, 1, 1], //Amazonia
      [1015, 1, 1], //Amazonia
      [1016, 1, 1], //Amazonia
      [1036, 1, 1], //Amazonia
      [1043, 1, 1], //Amazonia
      [1051, 1, 1], //Amazonia
      [1052, 1, 1], //Amazonia
      [1003, 1, 1], //Amazonia
      [1008, 1, 1], //Amazonia
      [1011, 1, 1], //Amazonia
      [1009, 1, 1], //Amazonia
      [1058, 1, 1], //Amazonia
      [1066, 1, 1], //Amazonia
      [1038, 1, 1], //Amazonia
      [1045, 1, 1], //Amazonia
      [1064, 1, 1], //Amazonia
      [1068, 1, 1], //Amazonia
      [1050, 1, 1], //Amazonia
      [1138, 1, 1], //Amazonia
      [1129, 1, 1], //Amazonia
      [1126, 1, 1], //Amazonia
      [1132, 1, 1], //Amazonia
      [1125, 1, 1], //Amazonia
      [1062, 1, 1], //Amazonia
      [1047, 1, 1], //Amazonia
      [1032, 1, 1], //Amazonia
      [1031, 1, 1], //Amazonia
      [1096, 1, 1], //Amazonia
      [1103, 1, 1], //Amazonia
      [1104, 1, 1], //Amazonia
      [1102, 1, 1], //Amazonia
      [1099, 1, 1], //Amazonia
      [1026, 1, 1], //Amazonia
      [1025, 1, 1], //Amazonia
      [1024, 1, 1], //Amazonia
      [1023, 1, 1], //Amazonia
      [1022, 1, 1], //Amazonia
      [1127, 1, 1], //Amazonia
      [1122, 1, 1], //Amazonia
      [1121, 1, 1], //Amazonia
      [1119, 1, 1], //Amazonia
      [1110, 1, 1], //Amazonia
      [1117, 1, 1], //Amazonia
      [1116, 1, 1], //Amazonia
      [1113, 1, 1], //Amazonia
      [1118, 1, 1], //Amazonia
      [1120, 1, 1], //Amazonia
      [1111, 1, 1], //Amazonia
      [1115, 1, 1], //Amazonia
      [1109, 1, 1], //Amazonia
      [1112, 1, 1], //Amazonia
      [1107, 1, 1], //Amazonia
      [1114, 1, 1], //Amazonia
      [1077, 1, 1], //Amazonia
      [1075, 1, 1], //Amazonia
      [1069, 1, 1], //Amazonia
      [1029, 1, 1], //Amazonia
      [1035, 1, 1], //Amazonia
      [1042, 1, 1], //Amazonia
      [1013, 1, 1], //Amazonia
      [1020, 1, 1], //Amazonia
      [1044, 1, 1], //Amazonia
      [1061, 1, 1], //Amazonia
      [1021, 1, 1], //Amazonia
      [1019, 1, 1], //Amazonia
      [1010, 1, 1], //Amazonia
      // Region Amazonia baja o pacífico

      //  ['NA-19-X',1,2],
      //  ['NA-19-Z',1,2],
      //  ['NA-20-V',1,2],
      //  ['NA-20-X',1,2],
      //  ['NA-20-Y',1,2],
      //  ['NB-18-X',1,2],
      //  ['NB-19-V',1,2],
      //  ['NB-19-X',1,2],
      //  ['NB-19-Z',1,2],
      //  ['NA-18-Y',1,2],
      //  ['NB-20-V',1,2],
      //  ['NB-20-X',1,2],
      //  ['NB-20-Y',1,2],
      //  ['NB-20-Z',1,2],
      //  ['NC-18-X',1,2],
      //  ['NC-18-Z',1,2],
      //  ['NC-19-V',1,2],
      //  ['NC-19-X',1,2],
      //  ['NC-19-Y',1,2],
      //  ['NC-19-Z',1,2],
      //  ['NC-20-V',1,2],
      //  ['NC-20-X',1,2],
      //  ['NC-20-Y',1,2],
      //  ['NC-20-Z',1,2],
      //  ['NC-21-Y',1,2],
      //  ['ND-19-Y',1,2],
      //  ['ND-19-Z',1,2],
    ];

    var asset =
      "projects/mapbiomas-venezuela/assets/AGUA/SUPERFICIE/COLECCION4/clasificacion-01";
    // var MaskRegions = ee.Image("projects/mapbiomas-raisg/PRODUCTOS/AGUA/DATOS_AUXILIARES/RASTERS/"+namecountry.toUpperCase()+"/clasificacion-regiones-agua-v3")
    // var MaskAndes = MaskRegions.updateMask(MaskRegions.neq(1322))  // 1322 es amazonia baja en el Perú
    // var tierrasBajas = MaskRegions.eq(1322).selfMask();

    var lits_imgs = [];
    var temp;

    tableRegions.forEach(function (ele) {
      temp = ee.Image();
      //'projects/mapbiomas-raisg/PRODUCTOS/AGUA/ECUADOR/COLECCION1/clasificacion-01/class_water_2020_1110_1'

      if (ele[2] == 1) {
        temp = ee.Image(
          asset + "/class_water_" + year + "_" + ele[0] + "_" + ele[1],
        );
      } else {
        temp = ee.Image(asset + "/class_water_" + year + "_" + ele[0]);
      }

      if (ele[2] === 2) {
        // Amazonia baja
        // temp = temp.where(MaskAndes.gt(0),0).selfMask()
        temp = temp.mask(tierrasBajas).selfMask();
      }
      lits_imgs.push(temp);
    });
    // print('lits_imgs',lits_imgs)

    var water = ee
      .ImageCollection(lits_imgs)
      // .filter(ee.Filter.eq('version', version))
      .mosaic()
      .selfMask();
    print("water", water);
  }

  var freq_year = water
    .gte(1)
    .and(water.lte(3))
    .reduce("sum")
    .selfMask()
    .rename("freq");

  // ---- FILTRO GEOMÉTRICO  ----

  var ok_img = freq_year
    .gte(threshold_freq_mean)
    .and(slopes.lt(threshold_srtm_mean));
  ok_img = ok_img
    .addBands(
      freq_year.gte(threshold_freq_recap).and(slopes.lt(threshold_srtm_mean)),
    )
    .reduce(ee.Reducer.max());

  //Map.addLayer (mean_freq_img, {palette: ['ffffff','04fff4','0c2aff','001b9d'], min:1,max:12}, 'mean_freq_img');
  //Map.addLayer (srtm_mean_img, {palette: ['ffffff','04fff4','0c2aff','001b9d'], min:1,max:40}, 'srtm_mean_img');
  //Map.addLayer (freq_year, {palette: ['ffffff','04fff4','0c2aff','001b9d'], min:1,max:12}, 'freq_year');
  // Map.addLayer (csf_year, {palette: ['ffffff','04fff4','0c2aff','001b9d'], min: 0, max:1}, 'csf_year');
  // Map.addLayer (ndwi_mcfeeters_year, {palette: ['ffffff','04fff4','0c2aff','001b9d'], min: 3901, max:18000}, 'ndwi_mcfeeters_year');
  // Map.addLayer (ndwi_mcfeeters_year.gte(8000).selfMask(), {palette: 'red'}, 'Water_ndwi_mcfeeters_year');
  // Map.addLayer (mndwi_year, {palette: ['ffffff','04fff4','0c2aff','001b9d'], min: 3901, max:18000}, 'mndwi_year');

  //Map.addLayer (ok_img, {palette: ['000000','1921ff'], min: 0, mas: 1 }, 'ok_img') ;

  var months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  var water_month_col = months.map(function (month) {
    var water_month = water.select("w_" + month);

    // 1° teste
    var mask_freq = ok_img.eq(0).selfMask();

    // 2° teste
    var detet = water_month
      .eq(1)
      .multiply(1)
      .selfMask()
      .where(mask_freq.eq(1), 4)
      .where(csf_year.lte(0.25).or(freq_year.lte(3).and(csf_year.lte(0.5))), 4)
      .where(soil_year.gte(20), 16);
    // .where(ndwi_mcfeeters_year.lte(7200).and(tierrasBajas.selfMask()), 4);  //MASK andes-costa ndwi_mcfeeters_year
    // .where(ndwi_mcfeeters_year.lte(7200), 4);

    var fil_1 = water_month
      .eq(2)
      .multiply(2)
      .selfMask()
      .where(mask_freq.eq(1), 4)
      .where(csf_year.lte(0.25).or(freq_year.lte(3).and(csf_year.lte(0.5))), 4)
      .where(soil_year.gte(20), 16);
    // .where(ndwi_mcfeeters_year.lte(9000).and(tierrasBajas.selfMask()), 4);  //MASK andes-costa ndwi_mcfeeters_year
    // .where(ndwi_mcfeeters_year.lte(9000), 4);

    var fil_2 = water_month
      .eq(3)
      .multiply(3)
      .selfMask()
      .where(mask_freq.eq(1), 4)
      .where(csf_year.lte(0.25).or(freq_year.lte(3).and(csf_year.lte(0.5))), 4)
      .where(soil_year.gte(20), 16);
    // .where(ndwi_mcfeeters_year.lte(9000).and(tierrasBajas.selfMask()), 4);  //MASK andes-costa ndwi_mcfeeters_year
    // .where(ndwi_mcfeeters_year.lte(9000), 4);
    var water0 = detet.blend(fil_1).blend(fil_2);

    // var img_ref = water_month.mask(water_month.eq(0).or(water_month.eq(3)).or(water_month.eq(4)));
    var img_ref = water_month.mask(
      water_month
        .eq(4)
        .or(water_month.eq(5))
        .or(water_month.eq(6))
        .or(water_month.eq(7))
        .or(water_month.eq(8))
        .or(water_month.eq(9)),
    );

    return water0
      .blend(img_ref)
      .rename("w_" + month)
      .set("system:index", "w_" + month);
  });

  water_month_col = ee.ImageCollection.fromImages(water_month_col);

  var water_img = water_month_col
    .toBands()
    .select(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
    .rename(
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
    )
    .set("year", year);
  water_img = water_img.updateMask(region_export_rast);

  var color = ["ffffff", "063cff", "13ff10", "ff0000", "000000"];

  print("year " + year, water_img);
  // Map.addLayer (water_img, {bands: 'w_7', palette: color, min:0,max:4}, 'just water');
  if (useMask_Mapbiomas) {
    var water_img2 = water_img
      .where(water_img.gte(1).and(water_img.lte(3)).and(mapbiomas.eq(30)), 4)
      .where(water_img.gte(1).and(water_img.lte(3)).and(mapbiomas.eq(24)), 4)
      // .where((water_img.gte(1).and(water_img.lte(3))).and(mapbiomas.eq(15)), 4)
      // .where((water_img.gte(1).and(water_img.lte(3))).and(mapbiomas.eq(18)), 4)
      // .where((water_img.gte(1).and(water_img.lte(3))).and(mapbiomas.eq(9)), 4)
      // .where((water_img.gte(1).and(water_img.lte(3))).and(mapbiomas.eq(21)), 4)
      .where(water_img.gte(1).and(water_img.lte(3)).and(mapbiomas.eq(35)), 4)
      .where(water_img.gte(1).and(water_img.lte(3)).and(mapbiomas.eq(9)), 4)
      .where(water_img.gte(1).and(water_img.lte(3)).and(urbanCol.eq(24)), 4)
      .where(water_img.gte(1).and(water_img.lte(3)).and(miningCol.eq(30)), 4);
  }

  if (vis.Map_addLayer) {
    vis.listbandMonth.forEach(function (bandMonth) {
      var month = parseInt(bandMonth.split("_")[1]);
      var start = ee.Date.fromYMD(year, month, 1);
      var end = start.advance(1, "month");
      Map.addLayer(
        CollectionYear.filterDate(start, end).median(),
        { bands: ["swir1", "nir", "red"], min: 200, max: 4000 },
        "mosaic-" + month + "-" + year,
        false,
      );

      Map.addLayer(
        csf_year,
        { palette: ["ffffff", "04fff4", "0c2aff", "001b9d"], min: 0, max: 1 },
        "csf_year",
        false,
      );
      Map.addLayer(
        ndwi_mcfeeters_year,
        {
          palette: ["ffffff", "04fff4", "0c2aff", "001b9d"],
          min: 3901,
          max: 15000,
        },
        "ndwi_mcfeeters_year",
        false,
      );
      Map.addLayer(
        shade_year.gte(55).and(shade_year.lte(75)).selfMask(),
        { palette: ["ffffff" /*'04fff4','0c2aff','001b9d'*/], min: 0, max: 1 },
        "shade_year",
        false,
      );
      Map.addLayer(
        csf_year
          .gte(0.35)
          .or(freq_year.gt(3).and(csf_year.gt(0.7)))
          .selfMask(),
        { palette: "coral" /*'04fff4','0c2aff','001b9d'*/ },
        "csf_year_agua",
        false,
      );
      Map.addLayer(
        ndwi_mcfeeters_year.gte(7200).selfMask(),
        { palette: "red" },
        "Water_ndwi_mcfeeters_year1",
        false,
      );
      Map.addLayer(
        ndwi_mcfeeters_year.gte(9000).selfMask(),
        { palette: "orange" },
        "Water_ndwi_mcfeeters_year2",
        false,
      );

      Map.addLayer(
        water.select(bandMonth),
        {
          min: 0,
          max: 4,
          palette: ["ffffff", "0000ff", "00aa00", "ff0000", "000000"],
        },
        "clasif-pilot-" + bandMonth,
        false,
      );
      // Map.addLayer(water_img.select(bandMonth),{"min":0,"max":4,"palette":['ffffff','0000ff','00aa00','ff0000','000000'] },'clasif-mask-'+bandMonth,false);
      Map.addLayer(
        water_img.select(bandMonth),
        {
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
        },
        "clasif-mask-" + bandMonth,
        false,
      );

      if (useMask_Mapbiomas) {
        Map.addLayer(
          water_img2.select(bandMonth),
          {
            min: 0,
            max: 4,
            palette: ["ffffff", "0000ff", "00aa00", "ff0000", "000000"],
          },
          "clasif-mask-MB-" + bandMonth,
          false,
        );
        Map.addLayer(
          mapbiomas,
          {
            min: 0,
            max: 34,
            palette: [
              "ffffff",
              "129912",
              "1f4423",
              "006400",
              "00ff00",
              "687537",
              "76a5af",
              "29eee4",
              "77a605",
              "935132",
              "bbfcac",
              "45c2a5",
              "b8af4f",
              "f1c232",
              "ffffb2",
              "ffd966",
              "f6b26b",
              "f99f40",
              "e974ed",
              "d5a6bd",
              "c27ba0",
              "fff3bf",
              "ea9999",
              "dd7e6b",
              "aa0000",
              "ff99ff",
              "0000ff",
              "d5d5e5",
              "dd497f",
              "b2ae7c",
              "af2a2a",
              "8a2be2",
              "968c46",
              "0000ff",
              "4fd3ff",
            ],
          },
          "mapbiomasRaisg-" + year,
          false,
        );
        Map.addLayer(
          urbanCol,
          {
            min: 0,
            max: 34,
            palette: [
              "ffffff",
              "129912",
              "1f4423",
              "006400",
              "00ff00",
              "687537",
              "76a5af",
              "29eee4",
              "77a605",
              "935132",
              "bbfcac",
              "45c2a5",
              "b8af4f",
              "f1c232",
              "ffffb2",
              "ffd966",
              "f6b26b",
              "f99f40",
              "e974ed",
              "d5a6bd",
              "c27ba0",
              "fff3bf",
              "ea9999",
              "dd7e6b",
              "aa0000",
              "ff99ff",
              "0000ff",
              "d5d5e5",
              "dd497f",
              "b2ae7c",
              "af2a2a",
              "8a2be2",
              "968c46",
              "0000ff",
              "4fd3ff",
            ],
          },
          "urbanCol-1-" + year,
          false,
        );
      }
      // (se elimina Map.addLayer(tables_merged...) — tables_merged ya no existe sin vectorización)
    });
  }

  var img_input_freq = water_img
    .gte(1)
    .and(water_img.lte(3))
    .selfMask()
    .reduce(ee.Reducer.sum());

  var img_input = img_input_freq.gte(6).selfMask();

  var colorRamp = ["ffffff", "02ffe8", "0417ff", "000da7"];

  if (vis.Map_addLayer) {
    Map.addLayer(
      img_input_freq,
      { palette: colorRamp, min: 0, max: 12 },
      "freq",
      false,
    );
    Map.addLayer(img_input, { palette: "blue" }, "annual", false);
  }

  if (useMask_Mapbiomas) {
    var water_img = water_img2;
  }

  // ---- APLICACIÓN DE LA CORRECCIÓN MANUAL (clase 4 -> agua) ----

  if (usar_correccion_manual) {
    var mask_correccion = ee.Image.constant(1).clip(correccion_agua_manual);
    water_img = water_img.where(water_img.eq(4).and(mask_correccion), 1);
    if (vis.Map_addLayer) {
      Map.addLayer(
        correccion_agua_manual,
        { color: "yellow" },
        "correccion_agua_manual",
        false,
      );
    }
  }

  water_img = water_img
    .set("year", year)
    .set("version", version_out)
    .set("country", namecountry.toUpperCase());

  // water_img = water_img.set('id_region',region_class)
  water_img = water_img.set("reg_clasif", region_interes);
  print("capa a exportar", water_img);
  // Map.addLayer(region_export_vect.geometry().bounds(),{},'pais export')
  // Map.addLayer(water_img.select('w_1'),{"min":1,"max":9,"palette":['0000ff','009900','5af100','ffffff','000000','ff0000','ff60c7','c6c6c6','ffff00'] },'capa a exportar')
  Export.image.toAsset({
    image: water_img,
    description: region_interes + "_" + "water_" + year,
    // assetId: 'projects/mapbiomas-raisg/PRODUCTOS/AGUA/'+ namecountry.toUpperCase() +'/BETA/pilot-mask-04/' + 'water-' + year,
    assetId:
      "projects/mapbiomas-venezuela/assets/AGUA/SUPERFICIE/COLECCION3/POSTPROCESSING/03-mask-01/" +
      region_interes +
      "-" +
      "water-" +
      year,

    region: region_export_vect.geometry().bounds(),
    // region: pais.geometry().bounds(),
    scale: 30,
    pyramidingPolicy: {
      ".default": "mode",
    },
    maxPixels: 1e13,
  });
}
