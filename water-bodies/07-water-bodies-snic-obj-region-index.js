/**
 * @fileoverview Calculate predictor properties for regional SNIC water-body objects.
 * Measure object shape and neighbors, summarize water frequency and timing, and derive
 * contextual properties from land cover, hydrography, and terrain. Export the enriched
 * table for each configured region.
 */

var pais_name = "VENZUELA";
/**
 * Year of the regional object and surface-water inputs.
 * @type {number}
 */
var year = 2002;

//# SUBSTITUIR PELO NOME DAS CARTAS DO PAIS
//var idRegions = [
// "NB-20-Z",
//  "NB-20-X",
//  "NC-20-Z",
///  "NB-18-X",
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
// "NB-19-X",
//  "NC-19-Z",
//  "NC-19-X",
//  "ND-19-Z",
//  "NA-20-X",
//  "NC-20-X"
//];

/**
 * Identifiers of the regional object tables to enrich.
 * @type {number[]}
 */
var idRegions = [
  1801, 1802, 1803, 1804, 1805, 1806, 1807, 1808, 1809, 1810, 1811,
];

idRegions.forEach(function (id) {
  var srtm = ee.Image("USGS/SRTMGL1_003");
  var srtm_slopes = ee.Terrain.slope(srtm).unmask(0);

  var table = ee.FeatureCollection(
    "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION2/obj_" +
      year +
      "_region_" +
      id,
  );

  var mapb = ee.Image(
    "projects/mapbiomas-venezuela/assets/LANDSAT/VENEZUELA-3/integracion/VENEZUELA-8",
  ); // MPBIOMAS LULC DO PAIS
  mapb = mapb.addBands(
    mapb.select("classification_2022").rename("classification_2023"),
  );

  var hidroGlobal = ee
    .Image("MERIT/Hydro/v1_0_1")
    .select("upa")
    .gt(70)
    .selfMask();
  var mapb_year = mapb.select("classification_" + year).unmask(1);

  //#######################################################################################################
  //## AQUI TEM QUE SER PRE-GAP

  var col = ee.Image(
    "projects/mapbiomas-venezuela/assets/AGUA/SUPERFICIE/COLECCION3/POSTPROCESSING/04-remap-04/water-" +
      year,
  ); // AQUI TEM QUE SER PRE-GAP

  ///mapbiomas-venezuela/assets/AGUA/SUPERFICIE/COLECCION3/POSTPROCESSING/03-gap-01/water-gap-2000

  //#######################################################################################################

  var temp = ee.Image(
    "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/temporal-behavior_00_25_col4",
  ); // TEMPORAL BEHAVIOR ATUAL

  var total_freq = temp.select("freq");
  var temp_behavior_green = temp.select("begin2first");
  var temp_behavior_red = temp.select("last2end");
  var anual_freq = col.reduce(ee.Reducer.sum());

  /**
   * Add geometry, shape, and neighboring-object properties to a SNIC segment.
   *
   * @param {ee.Feature} f - Water-body segment with a polygon geometry.
   * @returns {ee.Feature} Segment with morp_ predictor properties.
   */
  var morp_props = function (f) {
    var bound = f.geometry().bounds();
    var laenge = ee.Geometry.LineString([
      ee.List(bound.coordinates().get(0)).get(0),
      ee.List(bound.coordinates().get(0)).get(1),
    ]); //.length();
    var breite = ee.Geometry.LineString([
      ee.List(bound.coordinates().get(0)).get(1),
      ee.List(bound.coordinates().get(0)).get(2),
    ]); //.length();
    var area = f.area(10);
    var perimetro = f.perimeter();
    var ratio = ee.Number(area).divide(ee.Number(perimetro));
    var compactness = ee
      .Number(0.2821)
      .multiply(perimetro)
      .divide(ee.Number(area).sqrt());
    var circularity = ee
      .Number(3.14159265359)
      .multiply(4)
      .multiply(area)
      .divide(perimetro.pow(2));
    var convexidade = ee.Number(area).divide(ee.Number(bound.area(10)));
    var max_extensao = ee.Number(
      ee.List([laenge.length(), breite.length()]).reduce(ee.Reducer.max()),
    );
    var elongation = ee
      .Number(1.128)
      .multiply(area.divide(max_extensao.pow(2)).sqrt());
    var shape_form = max_extensao.pow(2).divide(area);
    var ratio_laenge_breite = ee
      .List([
        laenge.length().divide(breite.length()),
        breite.length().divide(laenge.length()),
      ])
      .reduce(ee.Reducer.min());
    var nr_of_neighbors_im = table.filterBounds(f.geometry()).size();
    var nr_of_neighbors_50 = table.filterBounds(f.geometry().buffer(50)).size();

    return f
      .set("morp_aream2", area)
      .set("morp_perime", perimetro)
      .set("morp_r_aPer", ratio)
      .set("morp_r_aPeC", compactness)
      .set("morp_r_circ", circularity)
      .set("morp_r_elon", elongation)
      .set("morp_r_shpf", shape_form)
      .set("morp_r_laCu", ratio_laenge_breite)
      .set("morp_convex", convexidade)
      .set("morp_maxExt", max_extensao)
      .set("morp_nrViim", nr_of_neighbors_im)
      .set("morp_nrVi50", nr_of_neighbors_50);
  };
  /**
   * Summarize water frequency and temporal-behavior bands within the segment.
   *
   * @param {ee.Feature} f - Water-body segment to summarize.
   * @returns {ee.Feature} Segment with freq_ predictor properties.
   */
  var freq_props = function (f) {
    var freq_meanTo = ee.Number(
      total_freq
        .rename("number")
        .reduceRegion({
          reducer: ee.Reducer.mean(),
          geometry: f.geometry(),
          scale: 30,
          bestEffort: true,
          maxPixels: 1e12,
        })
        .get("number"),
    );

    var freq_meanAn = ee.Number(
      anual_freq
        .rename("number")
        .reduceRegion({
          reducer: ee.Reducer.mean(),
          geometry: f.geometry(),
          scale: 30,
          bestEffort: true,
          maxPixels: 1e12,
        })
        .get("number"),
    );

    var freq_tempUl = ee.Number(
      temp_behavior_red
        .rename("number")
        .reduceRegion({
          reducer: ee.Reducer.mode(),
          geometry: f.geometry(),
          scale: 30,
          bestEffort: true,
          maxPixels: 1e12,
        })
        .get("number"),
    );

    var freq_tempPr = ee.Number(
      temp_behavior_green
        .rename("number")
        .reduceRegion({
          reducer: ee.Reducer.mode(),
          geometry: f.geometry(),
          scale: 30,
          bestEffort: true,
          maxPixels: 1e12,
        })
        .get("number"),
    );

    return f
      .set("freq_meanTo", freq_meanTo)
      .set("freq_meanAn", freq_meanAn)
      .set("freq_tempUl", freq_tempUl)
      .set("freq_tempPr", freq_tempPr);
  };
  /**
   * Derive contextual land-cover, hydrography, and slope predictors.
   *
   * @param {ee.Feature} f - Segment whose footprint and surroundings are summarized.
   * @returns {ee.Feature} Segment with data_ predictor properties.
   */
  var data_props = function (f) {
    var area = f.area(10);

    var data_mpbCls = ee.Number(
      mapb_year
        .rename("number")
        .reduceRegion({
          reducer: ee.Reducer.mode(),
          geometry: f.geometry().buffer(100),
          scale: 30,
          bestEffort: true,
          maxPixels: 1e12,
        })
        .get("number"),
    );

    var nat_area = ee.Number(
      ee.Image.pixelArea()
        .updateMask(hidroGlobal)
        .reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: f.geometry().buffer(100),
          scale: 30,
          bestEffort: true,
          maxPixels: 1e12,
        })
        .get("area"),
    );
    var data_hydNat = nat_area.divide(area);

    var agr_area = ee.Number(
      ee.Image.pixelArea()
        .updateMask(
          mapb_year
            .eq(18)
            .or(mapb_year.eq(31))
            .or(mapb_year.eq(35))
            .or(mapb_year)
            .eq(9)
            .or(mapb_year.eq(21)),
        )
        .reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: f.geometry().buffer(100),
          scale: 30,
          bestEffort: true,
          maxPixels: 1e12,
        })
        .get("area"),
    );
    var data_mpbAgr = agr_area.divide(area);

    var urb_area = ee.Number(
      ee.Image.pixelArea()
        .updateMask(mapb_year.eq(24))
        .reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: f.geometry().buffer(100),
          scale: 30,
          bestEffort: true,
          maxPixels: 1e12,
        })
        .get("area"),
    );
    var data_mpbUrb = urb_area.divide(area);

    var min_area = ee.Number(
      ee.Image.pixelArea()
        .updateMask(mapb_year.eq(30))
        .reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: f.geometry().buffer(100),
          scale: 30,
          bestEffort: true,
          maxPixels: 1e12,
        })
        .get("area"),
    );
    var data_mpbMin = min_area.divide(area);

    var for_area = ee.Number(
      ee.Image.pixelArea()
        .updateMask(
          mapb_year
            .eq(3)
            .or(mapb_year.eq(6))
            .or(mapb_year.eq(5))
            .or(mapb_year.eq(49))
            .or(mapb_year.eq(4)),
        )
        .reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: f.geometry().buffer(100),
          scale: 30,
          bestEffort: true,
          maxPixels: 1e12,
        })
        .get("area"),
    );
    var data_mpbFor = for_area.divide(area);

    var nnf_area = ee.Number(
      ee.Image.pixelArea()
        .updateMask(mapb_year.eq(12).or(mapb_year.eq(11)).or(mapb_year.eq(50)))
        .reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: f.geometry().buffer(100),
          scale: 30,
          bestEffort: true,
          maxPixels: 1e12,
        })
        .get("area"),
    );
    var data_mpbNnf = nnf_area.divide(area);

    var pas_area = ee.Number(
      ee.Image.pixelArea()
        .updateMask(mapb_year.eq(15).or(mapb_year.eq(21)))
        .reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: f.geometry().buffer(100),
          scale: 30,
          bestEffort: true,
          maxPixels: 1e12,
        })
        .get("area"),
    );
    var data_mpbPas = pas_area.divide(area);

    var otr_nat_area = ee.Number(
      ee.Image.pixelArea()
        .updateMask(mapb_year.eq(32).or(mapb_year.eq(61)).or(mapb_year.eq(23)))
        .reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: f.geometry().buffer(100),
          scale: 30,
          bestEffort: true,
          maxPixels: 1e12,
        })
        .get("area"),
    );
    var data_otr_nat_area = otr_nat_area.divide(area);

    var srtmMx = ee.Number(
      srtm_slopes
        .rename("number")
        .reduceRegion({
          reducer: ee.Reducer.max(),
          geometry: f.geometry(),
          scale: 30,
          bestEffort: true,
          maxPixels: 1e12,
        })
        .get("number"),
    );
    var data_srtmMx = srtmMx.divide(area);

    return f
      .set("data_mpbCls", data_mpbCls)
      .set("data_hydNat", data_hydNat)
      .set("data_mpbAgr", data_mpbAgr)
      .set("data_mpbUrb", data_mpbUrb)
      .set("data_mpbMin", data_mpbMin)
      .set("data_mpbFor", data_mpbFor)
      .set("data_mpbNnf", data_mpbNnf)
      .set("data_mpbPas", data_mpbPas)
      .set("data_otr_nat_area", data_otr_nat_area)
      .set("data_srtmMx", data_srtmMx);
  };

  var prop_table = table.map(morp_props).map(freq_props).map(data_props);

  print(prop_table);

  //## DEFINIR ASSET DO REPOSITORIO DE SAIDA CRIAR A PASTA "SNIC_OBJ_REGION_INDEX"
  Export.table.toAsset(
    prop_table,
    "obj" + "_" + year + "_region_" + id,
    "projects/mapbiomas-venezuela/assets/AGUA/CUERPOS_HIDRICOS/COLECCION4/SNIC_OBJ_REGION_INDEX2/" +
      "obj" +
      "_" +
      year +
      "_region_" +
      id,
  );
});
