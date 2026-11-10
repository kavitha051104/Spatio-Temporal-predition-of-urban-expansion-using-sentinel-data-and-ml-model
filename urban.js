//=========================================================
// TIRUNELVELI URBAN GROWTH ANALYSIS
// CODE 1
// STUDY AREA + SENTINEL-2 DATA COLLECTION
// YEARS : 2016, 2019, 2022, 2026
//=========================================================


//=========================================================
// 1. STUDY AREA
//=========================================================

var tvl = ee.FeatureCollection(
    'projects/tirunelveli-urban-growth/assets/tvl'
);

// Study Area Geometry
var studyArea = tvl.geometry();

// Center Map
Map.centerObject(studyArea,11);

// Display Boundary
Map.addLayer(
    tvl,
    {
      color:'red'
    },
    'Tirunelveli Boundary'
);

print('Study Area',tvl);


//=========================================================
// 2. YEARS
//=========================================================

var years = [2016,2019,2022,2026];


//=========================================================
// 3. CLOUD MASK FUNCTION
//=========================================================

function maskS2Clouds(image){

  var qa = image.select('QA60');

  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image
      .updateMask(mask)
      .copyProperties(image,['system:time_start']);

}


//=========================================================
// 4. SENTINEL-2 FUNCTION
//=========================================================

function getSentinel2(year){

  var start = ee.Date.fromYMD(year,1,1);
  var end   = start.advance(1,'year');

  var collection = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
      .filterBounds(studyArea)
      .filterDate(start,end)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))
      .map(maskS2Clouds);

  print(' ');
  print('===================================');
  print('YEAR : ',year);
  print('===================================');

  print('Start Date : ',start);
  print('End Date   : ',end);

  print('Total Images : ',collection.size());

  print('Collection : ',collection);

  var composite = collection
      .median()
      .clip(studyArea);

  print('Composite '+year,composite);

  Map.addLayer(
      composite,
      {
        bands:['B4','B3','B2'],
        min:0,
        max:3000,
        gamma:1.2
      },
      'RGB '+year,
      false
  );

  return composite;

}
//=========================================================
// 5. CREATE COMPOSITES
//=========================================================

var composite2016 = getSentinel2(2016);

var composite2019 = getSentinel2(2019);

var composite2022 = getSentinel2(2022);

var composite2026 = getSentinel2(2026);


//=========================================================
// 6. DISPLAY RGB
//=========================================================

Map.addLayer(
    composite2016,
    {
      bands:['B4','B3','B2'],
      min:0,
      max:3000,
      gamma:1.2
    },
    'RGB 2016',
    true
);

Map.addLayer(
    composite2019,
    {
      bands:['B4','B3','B2'],
      min:0,
      max:3000,
      gamma:1.2
    },
    'RGB 2019',
    false
);

Map.addLayer(
    composite2022,
    {
      bands:['B4','B3','B2'],
      min:0,
      max:3000,
      gamma:1.2
    },
    'RGB 2022',
    false
);

Map.addLayer(
    composite2026,
    {
      bands:['B4','B3','B2'],
      min:0,
      max:3000,
      gamma:1.2
    },
    'RGB 2026',
    false
);


//=========================================================
// 7. BAND INFORMATION
//=========================================================

print('Bands - 2016', composite2016.bandNames());
print('Bands - 2019', composite2019.bandNames());
print('Bands - 2022', composite2022.bandNames());
print('Bands - 2026', composite2026.bandNames());


//=========================================================
// 8. CODE COMPLETED
//=========================================================

print('===================================');
print('CODE 1 COMPLETED SUCCESSFULLY');
print('Study Area Loaded');
print('Cloud Mask Applied');
print('Sentinel-2 Data Collected');
print('Median Composite Created');
print('RGB Layers Added');
print('===================================');



//=========================================================
// CODE 2 : SENTINEL-1 DATA COLLECTION
// YEARS : 2016, 2019, 2022, 2026
//=========================================================


//=========================================================
// SENTINEL-1 FUNCTION
//=========================================================

function getSentinel1(year){

  var start = ee.Date.fromYMD(year,1,1);
  var end = start.advance(1,'year');

  var collection = ee.ImageCollection('COPERNICUS/S1_GRD')
      .filterBounds(studyArea)
      .filterDate(start,end)
      .filter(ee.Filter.eq('instrumentMode','IW'))
      .filter(ee.Filter.listContains(
          'transmitterReceiverPolarisation','VV'))
      .filter(ee.Filter.listContains(
          'transmitterReceiverPolarisation','VH'))
      .filter(ee.Filter.eq(
          'orbitProperties_pass','DESCENDING'));

  print(' ');
  print('===================================');
  print('SENTINEL-1 YEAR : ',year);
  print('===================================');

  print('Total Sentinel-1 Images : ',
        collection.size());

  print('Collection : ',collection);

  // Sentinel-1 Median Composite
  var composite = collection
      .median()
      .clip(studyArea);

  print('Sentinel-1 Composite '+year,
        composite);

  return composite;
}


//=========================================================
// CREATE SENTINEL-1 COMPOSITES
//=========================================================

var radar2016 = getSentinel1(2016);

var radar2019 = getSentinel1(2019);

var radar2022 = getSentinel1(2022);

var radar2026 = getSentinel1(2026);


//=========================================================
// BAND INFORMATION
//=========================================================

print('Radar Bands 2016 : ',
      radar2016.bandNames());

print('Radar Bands 2019 : ',
      radar2019.bandNames());

print('Radar Bands 2022 : ',
      radar2022.bandNames());

print('Radar Bands 2026 : ',
      radar2026.bandNames());


//=========================================================
// DISPLAY ONLY 2016 VV
//=========================================================

Map.addLayer(
  radar2016.select('VV'),
  {
    min:-25,
    max:0
  },
  'VV 2016',
  true
);


//=========================================================
// COMPLETION
//=========================================================

print('===================================');
print('CODE 2 COMPLETED SUCCESSFULLY');
print('Sentinel-1 Data Loaded');
print('VV & VH Bands Created');
//=========================================================
// CODE 3 : FEATURE EXTRACTION
// NDVI + NDBI + NDWI + VV/VH RATIO
// MULTI-SENSOR FEATURE STACK
//=========================================================


//=========================================================
// FEATURE EXTRACTION FUNCTION
//=========================================================

function createFeatureStack(optical, radar, year){

  //==========================
  // Sentinel-2 Bands
  //==========================

  var bands = optical.select([
    'B2',
    'B3',
    'B4',
    'B8',
    'B11',
    'B12'
  ]);

  //==========================
  // NDVI
  //==========================

  var ndvi = optical
    .normalizedDifference(['B8','B4'])
    .rename('NDVI');

  //==========================
  // NDBI
  //==========================

  var ndbi = optical
    .normalizedDifference(['B11','B8'])
    .rename('NDBI');

  //==========================
  // NDWI
  //==========================

  var ndwi = optical
    .normalizedDifference(['B3','B8'])
    .rename('NDWI');

  //==========================
  // Sentinel-1
  //==========================

  var vv = radar.select('VV');

  var vh = radar.select('VH');

  var ratio = vv.divide(vh.abs())
      .rename('VV_VH_Ratio');

  //==========================
  // Feature Stack
  //==========================

  var featureStack = bands
      .addBands(ndvi)
      .addBands(ndbi)
      .addBands(ndwi)
      .addBands(vv)
      .addBands(vh)
      .addBands(ratio);

  print(' ');
  print('=================================');
  print('FEATURE STACK : ',year);
  print('=================================');

  print('Band Names',
        featureStack.bandNames());

  //==========================
  // RGB
  //==========================

  Map.addLayer(
      optical,
      {
        bands:['B4','B3','B2'],
        min:0,
        max:3000
      },
      'RGB '+year,
      false
  );

  //==========================
  // False Color
  //==========================

  Map.addLayer(
      optical,
      {
        bands:['B8','B4','B3'],
        min:0,
        max:3000
      },
      'False Color '+year,
      false
  );

  //==========================
  // NDVI
  //==========================

  Map.addLayer(
      ndvi,
      {
        min:-1,
        max:1,
        palette:['brown','yellow','green']
      },
      'NDVI '+year,
      false
  );

  //==========================
  // NDBI
  //==========================

  Map.addLayer(
      ndbi,
      {
        min:-1,
        max:1,
        palette:['green','white','red']
      },
      'NDBI '+year,
      false
  );

  //==========================
  // NDWI
  //==========================

  Map.addLayer(
      ndwi,
      {
        min:-1,
        max:1,
        palette:['brown','white','blue']
      },
      'NDWI '+year,
      false
  );

  //==========================
  // VV
  //==========================

  Map.addLayer(
      vv,
      {
        min:-25,
        max:0
      },
      'VV '+year,
      false
  );

  //==========================
  // VH
  //==========================

  Map.addLayer(
      vh,
      {
        min:-30,
        max:-5
      },
      'VH '+year,
      false
  );

  //==========================
  // VV/VH Ratio
  //==========================

  Map.addLayer(
      ratio,
      {
        min:0,
        max:5,
        palette:['blue','yellow','red']
      },
      'VV/VH Ratio '+year,
      false
  );

  return featureStack;

}


//=========================================================
// CREATE FEATURE STACKS
//=========================================================

var feature2016 =
createFeatureStack(
composite2016,
radar2016,
2016);

var feature2019 =
createFeatureStack(
composite2019,
radar2019,
2019);

var feature2022 =
createFeatureStack(
composite2022,
radar2022,
2022);

var feature2026 =
createFeatureStack(
composite2026,
radar2026,
2026);


//=========================================================
// CHECK BAND NAMES
//=========================================================

print('2016 Feature Bands',
feature2016.bandNames());

print('2019 Feature Bands',
feature2019.bandNames());

print('2022 Feature Bands',
feature2022.bandNames());

print('2026 Feature Bands',
feature2026.bandNames());

print('===================================');
print('CODE 3 COMPLETED SUCCESSFULLY');
print('Feature Extraction Completed');
print('Multi-Sensor Feature Stack Ready');
print('===================================');
//=========================================================
// CODE 4 : TRAINING SAMPLE EXTRACTION (3 CLASSES)
// Vegetation - Barren - Built-up
//=========================================================


//=========================================================
// FUNCTION : CREATE TRAINING DATA
//=========================================================

function createTrainingData(featureStack,
                            vegetation,
                            barren,
                            builtup,
                            year){

//---------------------------------------------------------
// 1. PREPARE TRAINING POLYGONS
//---------------------------------------------------------

var vegetationFC = vegetation.map(function(f){
  return f.set('class',0);
});

var barrenFC = barren.map(function(f){
  return f.set('class',1);
});

var builtupFC = builtup.map(function(f){
  return f.set('class',2);
});


var polygons = vegetationFC
.merge(barrenFC)
.merge(builtupFC);

print(year + ' Training Polygons', polygons);


//---------------------------------------------------------
// 2. SAMPLE EXTRACTION
//---------------------------------------------------------

var samples = featureStack.sampleRegions({

  collection: polygons,

  properties:['class'],

  scale:10,

  tileScale:16,

  geometries:false

});


//---------------------------------------------------------
// 3. RANDOM COLUMN
//---------------------------------------------------------

samples = samples.randomColumn('random',42);


//---------------------------------------------------------
// 4. BALANCED SAMPLES
//---------------------------------------------------------

var vegetationData = samples
.filter(ee.Filter.eq('class',0))
.sort('random')
.limit(500);

var barrenData = samples
.filter(ee.Filter.eq('class',1))
.sort('random')
.limit(500);

var builtupData = samples
.filter(ee.Filter.eq('class',2))
.sort('random')
.limit(500);


var balancedData = vegetationData
.merge(barrenData)
.merge(builtupData);


print(year + ' Balanced Samples',
      balancedData.size());

print(year + ' Class Distribution',
      balancedData.aggregate_histogram('class'));


//---------------------------------------------------------
// 5. TRAIN / VALIDATION SPLIT
//---------------------------------------------------------

var split = balancedData.randomColumn('split',42);

var trainingSet = split.filter(
ee.Filter.lte('split',0.7));

var validationSet = split.filter(
ee.Filter.gt('split',0.7));


print(year + ' Training Set',
trainingSet.size());

print(year + ' Validation Set',
validationSet.size());


//---------------------------------------------------------
// RETURN
//---------------------------------------------------------

return{

training:trainingSet,

validation:validationSet

};

}



//=========================================================
// CREATE TRAINING DATA
//=========================================================


//--------------------2016--------------------

var data2016 = createTrainingData(

feature2016,

vegetation2016,

barren2016,

builtup2016,

'2016'

);


//--------------------2019--------------------

var data2019 = createTrainingData(

feature2019,

vegetation2016,

barren2016,

builtup2016,

'2019'

);


//--------------------2022--------------------

var data2022 = createTrainingData(

feature2022,

vegetation2016,

barren2016,

builtup2016,

'2022'

);


//--------------------2026--------------------

var data2026 = createTrainingData(

feature2026,

vegetation2016,

barren2016,

builtup2016,

'2026'

);


print('====================================');
print('CODE 4 COMPLETED SUCCESSFULLY');
print('3 CLASS TRAINING DATA READY');
print('====================================');

//=========================================================
// CODE 5 : RANDOM FOREST CLASSIFICATION
// 3 CLASS STANDARD VERSION
//=========================================================

var bands = feature2016.bandNames();

function classifyImage(featureImage, data, year){

  var classifier = ee.Classifier.smileRandomForest({
      numberOfTrees:200,
      variablesPerSplit:null,
      minLeafPopulation:1,
      bagFraction:0.7,
      seed:42
  }).train({
      features:data.training,
      classProperty:'class',
      inputProperties:bands
  });

  var classified = featureImage
      .select(bands)
      .classify(classifier)
      .rename('classification');

  Map.addLayer(
      classified,
      {
        min:0,
        max:2,
        palette:[
          '006400',   // Vegetation
          '8B4513',   // Barren
          'FF0000'    // Built-up
        ]
      },
      'LULC '+year,
      false
  );

  return {
      classifier:classifier,
      lulc:classified
  };

}

//=========================================================
// 2019 ONLY CLASSIFIER
//=========================================================

function classifyImage2019(featureImage, data){

  var classifier = ee.Classifier.smileRandomForest({
      numberOfTrees:300,
      variablesPerSplit:4,
      minLeafPopulation:5,
      bagFraction:0.7,
      seed:42
  }).train({
      features:data.training,
      classProperty:'class',
      inputProperties:bands
  });

  var classified = featureImage
      .select(bands)
      .classify(classifier)
      .focal_mode({
          radius:20,
          units:'meters'
      })
      .rename('classification');

  Map.addLayer(
      classified,
      {
        min:0,
        max:2,
        palette:[
          '006400',
          '8B4513',
          'FF0000'
        ]
      },
      'LULC 2019 Improved',
      false
  );

  return {
      classifier: classifier,
      lulc: classified
  };
}



//========================
// RUN
//========================

var result2016 = classifyImage(feature2016,data2016,'2016');
var result2019 = classifyImage2019(feature2019, data2019);
var result2022 = classifyImage(feature2022,data2022,'2022');
var result2026 = classifyImage(feature2026,data2026,'2026');

var classifier2016 = result2016.classifier;
var classifier2019 = result2019.classifier;
var classifier2022 = result2022.classifier;
var classifier2026 = result2026.classifier;

var lulc2016 = result2016.lulc;
var lulc2019 = result2019.lulc;
var lulc2022 = result2022.lulc;
var lulc2026 = result2026.lulc;

print('====================================');
print('CODE 5 COMPLETED SUCCESSFULLY');
print('Random Forest Classification Completed');
print('====================================');


//=========================================================
// CODE 6 : ACCURACY ASSESSMENT
// RANDOM FOREST (3 CLASSES)
//=========================================================


//=========================================================
// FUNCTION
//=========================================================

function calculateAccuracy(classifier,
                           validationData,
                           year){

  var validation = validationData.validation.classify(classifier);

  var matrix = validation.errorMatrix(
      'class',
      'classification'
  );

  print('=================================');
  print(year + ' Accuracy Assessment');
  print('=================================');

  print(
      year + ' Confusion Matrix',
      matrix
  );

  print(
      year + ' Overall Accuracy',
      matrix.accuracy()
  );

  print(
      year + ' Producer Accuracy',
      matrix.producersAccuracy()
  );

  print(
      year + ' User Accuracy',
      matrix.consumersAccuracy()
  );

  print(
      year + ' Kappa Coefficient',
      matrix.kappa()
  );

}


//=========================================================
// RUN
//=========================================================

calculateAccuracy(
    classifier2016,
    data2016,
    '2016'
);

calculateAccuracy(
    classifier2019,
    data2019,
    '2019'
);

calculateAccuracy(
    classifier2022,
    data2022,
    '2022'
);

calculateAccuracy(
    classifier2026,
    data2026,
    '2026'
);


print('====================================');
print('CODE 6 COMPLETED SUCCESSFULLY');
print('Accuracy Assessment Completed');
print('====================================');


//=========================================================
// CODE 7 : LULC AREA CALCULATION (3 CLASSES)
// 2016 - 2019 - 2022 - 2026
//=========================================================


//=========================================================
// CLASS NAMES
//=========================================================

var classNames = ee.Dictionary({

  0: 'Vegetation',
  1: 'Barren',
  2: 'Built-up'

});


//=========================================================
// FUNCTION
//=========================================================

function calculateLULCArea(lulcImage, year){

  var areaImage = ee.Image.pixelArea()
      .addBands(lulcImage);

  var area = areaImage.reduceRegion({

      reducer: ee.Reducer.sum().group({

        groupField:1,
        groupName:'classification'

      }),

      geometry:tvl.geometry(),

      scale:10,

      maxPixels:1e13

  });

  var groups = ee.List(area.get('groups'));

  var result = groups.map(function(item){

      item = ee.Dictionary(item);

      var id = ee.Number(item.get('classification'));

      var sqm = ee.Number(item.get('sum'));

      return ee.Dictionary({

          'Year':year,

          'Class_ID':id,

          'Class':classNames.get(id.format()),

          'Area_Square_Meter':sqm,

          'Area_Square_KM':sqm.divide(1000000)

      });

  });

  print(year + ' LULC Area Summary',result);

  return result;

}




//=========================================================
// RUN
//=========================================================

var area2016 = calculateLULCArea(lulc2016,'2016');

var area2019 = calculateLULCArea(lulc2019,'2019');

var area2022 = calculateLULCArea(lulc2022,'2022');

var area2026 = calculateLULCArea(lulc2026,'2026');





print('====================================');

print('ALL YEARS LULC AREA RESULT');

print([

area2016,

area2019,

area2022,

area2026

]);

print('====================================');

print('CODE 7 COMPLETED SUCCESSFULLY');

print('Area Calculation Completed');

print('2016 - 2019 - 2022 - 2026');

print('====================================');
//=========================================================
// CODE 8 : URBAN GROWTH ANALYSIS
//=========================================================

//=========================================================
// FUNCTION TO GET BUILT-UP AREA
//=========================================================

function getBuiltupArea(areaList) {

  areaList = ee.List(areaList);

  var builtup = ee.Dictionary(
    areaList.iterate(function(item, result) {

      item = ee.Dictionary(item);

      return ee.Algorithms.If(
        ee.Number(item.get('Class_ID')).eq(2),
        item,
        result
      );

    }, ee.Dictionary({}))
  );

  return ee.Number(builtup.get('Area_Square_KM'));
}

//---------------------------------------------------------
// Built-up Area
//---------------------------------------------------------

var builtup2016 = getBuiltupArea(area2016);
var builtup2019 = getBuiltupArea(area2019);
var builtup2022 = getBuiltupArea(area2022);
var builtup2026 = getBuiltupArea(area2026);

//---------------------------------------------------------
// Growth (km²)
//---------------------------------------------------------

var growth2016_2019 = builtup2019.subtract(builtup2016);
var growth2019_2022 = builtup2022.subtract(builtup2019);
var growth2022_2026 = builtup2026.subtract(builtup2022);
var totalGrowth = builtup2026.subtract(builtup2016);

//---------------------------------------------------------
// Growth Percentage
//---------------------------------------------------------

var percent2016_2019 = growth2016_2019.divide(builtup2016).multiply(100);
var percent2019_2022 = growth2019_2022.divide(builtup2019).multiply(100);
var percent2022_2026 = growth2022_2026.divide(builtup2022).multiply(100);
var totalPercent = totalGrowth.divide(builtup2016).multiply(100);

//---------------------------------------------------------
// PRINT
//---------------------------------------------------------

print('====================================');
print('CODE 8 : URBAN GROWTH ANALYSIS');
print('====================================');

print('Built-up Area 2016 (km²):', builtup2016);
print('Built-up Area 2019 (km²):', builtup2019);
print('Built-up Area 2022 (km²):', builtup2022);
print('Built-up Area 2026 (km²):', builtup2026);

print('------------------------------------');

print('Growth 2016 → 2019 (km²):', growth2016_2019);
print('Growth 2019 → 2022 (km²):', growth2019_2022);
print('Growth 2022 → 2026 (km²):', growth2022_2026);
print('Overall Growth 2016 → 2026 (km²):', totalGrowth);

print('------------------------------------');

print('Growth % 2016 → 2019:', percent2016_2019);
print('Growth % 2019 → 2022:', percent2019_2022);
print('Growth % 2022 → 2026:', percent2022_2026);
print('Overall Growth %:', totalPercent);

print('====================================');
print('CODE 8 COMPLETED SUCCESSFULLY');
print('====================================');
//=========================================================
// CODE 9 : CART CLASSIFICATION
// 2016 - 2019 - 2022 - 2026
//=========================================================

// Feature Bands
var bands = feature2016.bandNames();

//=========================================================
// CART FUNCTION
//=========================================================

function classifyImageCART(featureImage, data, year){

  var classifier = ee.Classifier.smileCart()
      .train({
          features: data.training,
          classProperty: 'class',
          inputProperties: bands
      });

  var classified = featureImage
      .select(bands)
      .classify(classifier)
      .rename('classification');

  Map.addLayer(
      classified,
      {
        min:0,
        max:2,
        palette:[
          '006400',   // Vegetation
          '8B4513',   // Barren
          'FF0000'    // Built-up
        ]
      },
      'CART LULC ' + year,
      false
  );

  return {
      classifier: classifier,
      lulc: classified
  };
}

//=========================================================
// RUN
//=========================================================

var cart2016 = classifyImageCART(feature2016, data2016, '2016');

var cart2019 = classifyImageCART(feature2019, data2019, '2019');

var cart2022 = classifyImageCART(feature2022, data2022, '2022');

var cart2026 = classifyImageCART(feature2026, data2026, '2026');

//=========================================================
// SAVE OUTPUT
//=========================================================

var cartClassifier2016 = cart2016.classifier;
var cartClassifier2019 = cart2019.classifier;
var cartClassifier2022 = cart2022.classifier;
var cartClassifier2026 = cart2026.classifier;

var cartLULC2016 = cart2016.lulc;
var cartLULC2019 = cart2019.lulc;
var cartLULC2022 = cart2022.lulc;
var cartLULC2026 = cart2026.lulc;

print('====================================');
print('CODE 9 COMPLETED SUCCESSFULLY');
print('CART Classification Completed');
print('====================================');
//=========================================================
// CODE 10 : CART ACCURACY ASSESSMENT
//=========================================================

function cartAccuracyAssessment(data, classifier, year){

  var validated = data.validation.classify(classifier);

  var matrix = validated.errorMatrix('class', 'classification');

  print('=================================');
  print(year + ' CART Accuracy Assessment');
  print('=================================');

  print(year + ' CART Confusion Matrix');
  print(matrix);

  print(year + ' CART Overall Accuracy');
  print(matrix.accuracy());

  print(year + ' CART Producer Accuracy');
  print(matrix.producersAccuracy());

  print(year + ' CART User Accuracy');
  print(matrix.consumersAccuracy());

  print(year + ' CART Kappa Coefficient');
  print(matrix.kappa());

}

//=========================================================
// RUN
//=========================================================

cartAccuracyAssessment(data2016, cartClassifier2016, '2016');

cartAccuracyAssessment(data2019, cartClassifier2019, '2019');

cartAccuracyAssessment(data2022, cartClassifier2022, '2022');

cartAccuracyAssessment(data2026, cartClassifier2026, '2026');

print('====================================');
print('CODE 10 COMPLETED SUCCESSFULLY');
print('CART Accuracy Assessment Completed');
print('====================================');

//=========================================================
// CODE 11 : CART LULC AREA CALCULATION
//=========================================================

// 2016
var cartArea2016 = calculateLULCArea(cartLULC2016,'2016 CART');

// 2019
var cartArea2019 = calculateLULCArea(cartLULC2019,'2019 CART');

// 2022
var cartArea2022 = calculateLULCArea(cartLULC2022,'2022 CART');

// 2026
var cartArea2026 = calculateLULCArea(cartLULC2026,'2026 CART');

print('====================================');
print('CART AREA RESULTS');
print([
  cartArea2016,
  cartArea2019,
  cartArea2022,
  cartArea2026
]);

print('====================================');
print('CODE 11 COMPLETED SUCCESSFULLY');
print('CART Area Calculation Completed');
print('====================================');

//=========================================================
// CODE 12 : GRADIENT TREE BOOST CLASSIFICATION
//=========================================================

var bands = feature2016.bandNames();

//=========================================================
// GTB FUNCTION
//=========================================================

function classifyImageGTB(featureImage, data, year){

  var classifier = ee.Classifier.smileGradientTreeBoost({
      numberOfTrees: 200,
      shrinkage: 0.1,
      samplingRate: 0.7,
      maxNodes: 50,
      seed: 42
  }).train({
      features: data.training,
      classProperty: 'class',
      inputProperties: bands
  });

  var classified = featureImage
      .select(bands)
      .classify(classifier)
      .rename('classification');

  Map.addLayer(
      classified,
      {
        min:0,
        max:2,
        palette:[
          '006400',   // Vegetation
          '8B4513',   // Barren
          'FF0000'    // Built-up
        ]
      },
      'GTB LULC ' + year,
      false
  );

  return {
      classifier: classifier,
      lulc: classified
  };

}

//=========================================================
// RUN
//=========================================================

var gtb2016 = classifyImageGTB(feature2016, data2016, '2016');

var gtb2019 = classifyImageGTB(feature2019, data2019, '2019');

var gtb2022 = classifyImageGTB(feature2022, data2022, '2022');

var gtb2026 = classifyImageGTB(feature2026, data2026, '2026');

//=========================================================
// SAVE OUTPUT
//=========================================================

var gtbClassifier2016 = gtb2016.classifier;
var gtbClassifier2019 = gtb2019.classifier;
var gtbClassifier2022 = gtb2022.classifier;
var gtbClassifier2026 = gtb2026.classifier;

var gtbLULC2016 = gtb2016.lulc;
var gtbLULC2019 = gtb2019.lulc;
var gtbLULC2022 = gtb2022.lulc;
var gtbLULC2026 = gtb2026.lulc;

print('====================================');
print('CODE 12 COMPLETED SUCCESSFULLY');
print('Gradient Tree Boost Classification Completed');
print('====================================');

//=========================================================
// CODE 13 : GRADIENT TREE BOOST ACCURACY ASSESSMENT
//=========================================================

function gtbAccuracyAssessment(data, classifier, year){

  var validated = data.validation.classify(classifier);

  var matrix = validated.errorMatrix('class', 'classification');

  print('=================================');
  print(year + ' GTB Accuracy Assessment');
  print('=================================');

  print(year + ' GTB Confusion Matrix');
  print(matrix);

  print(year + ' GTB Overall Accuracy');
  print(matrix.accuracy());

  print(year + ' GTB Producer Accuracy');
  print(matrix.producersAccuracy());

  print(year + ' GTB User Accuracy');
  print(matrix.consumersAccuracy());

  print(year + ' GTB Kappa Coefficient');
  print(matrix.kappa());

}

//=========================================================
// RUN
//=========================================================

gtbAccuracyAssessment(data2016, gtbClassifier2016, '2016');

gtbAccuracyAssessment(data2019, gtbClassifier2019, '2019');

gtbAccuracyAssessment(data2022, gtbClassifier2022, '2022');

gtbAccuracyAssessment(data2026, gtbClassifier2026, '2026');

print('====================================');
print('CODE 13 COMPLETED SUCCESSFULLY');
print('Gradient Tree Boost Accuracy Completed');
print('====================================');

//=========================================================
// CODE 14 : GTB AREA CALCULATION
//=========================================================

var gtbArea2016 = calculateLULCArea(gtbLULC2016,'2016 GTB');

var gtbArea2019 = calculateLULCArea(gtbLULC2019,'2019 GTB');

var gtbArea2022 = calculateLULCArea(gtbLULC2022,'2022 GTB');

var gtbArea2026 = calculateLULCArea(gtbLULC2026,'2026 GTB');

print('====================================');
print('GTB AREA RESULTS');

print([
  gtbArea2016,
  gtbArea2019,
  gtbArea2022,
  gtbArea2026
]);

print('====================================');
print('CODE 14 COMPLETED SUCCESSFULLY');
print('Gradient Tree Boost Area Calculation Completed');
print('====================================');

//=========================================================
// CODE 15 : ALGORITHM COMPARISON
// RF vs CART vs GTB
//=========================================================

//-----------------------------
// Overall Accuracy
//-----------------------------

var rfAccuracy  = ee.Number(0.9692);   // RF Average Accuracy
var cartAccuracy = ee.Number(0.9481);  // CART Average Accuracy
var gtbAccuracy  = ee.Number(0.9550);  // GTB Average Accuracy

//-----------------------------
// Kappa Coefficient
//-----------------------------

var rfKappa  = ee.Number(0.9529);
var cartKappa = ee.Number(0.9202);
var gtbKappa  = ee.Number(0.9360);

//-----------------------------
// Built-up Area (2026)
//-----------------------------

var rfArea = ee.Number(97.67);
var cartArea = ee.Number(90.09);
var gtbArea = ee.Number(91.70);

//=========================================================
// PRINT RESULTS
//=========================================================

print('======================================');
print('ALGORITHM COMPARISON');
print('======================================');

print('Random Forest');
print('Overall Accuracy :', rfAccuracy);
print('Kappa            :', rfKappa);
print('Built-up Area    :', rfArea, 'km²');

print('--------------------------------------');

print('CART');
print('Overall Accuracy :', cartAccuracy);
print('Kappa            :', cartKappa);
print('Built-up Area    :', cartArea, 'km²');

print('--------------------------------------');

print('Gradient Tree Boost');
print('Overall Accuracy :', gtbAccuracy);
print('Kappa            :', gtbKappa);
print('Built-up Area    :', gtbArea, 'km²');

print('======================================');

//-----------------------------
// Best Algorithm
//-----------------------------

var bestAccuracy = rfAccuracy.max(cartAccuracy).max(gtbAccuracy);

print('Highest Overall Accuracy :', bestAccuracy);

print('--------------------------------------');
print('FINAL SELECTED ALGORITHM');
print('Random Forest');
print('======================================');
print('CODE 15 COMPLETED SUCCESSFULLY');

//=========================================================
// CODE 16 : EXPORT FINAL LULC MAPS
// Random Forest Classification Results
//=========================================================

Export.image.toDrive({
  image: lulc2016,
  description: 'RF_LULC_2016',
  folder: 'Tirunelveli_LULC',
  fileNamePrefix: 'RF_LULC_2016',
  region: tvl.geometry(),
  scale: 10,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: lulc2019,
  description: 'RF_LULC_2019',
  folder: 'Tirunelveli_LULC',
  fileNamePrefix: 'RF_LULC_2019',
  region: tvl.geometry(),
  scale: 10,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: lulc2022,
  description: 'RF_LULC_2022',
  folder: 'Tirunelveli_LULC',
  fileNamePrefix: 'RF_LULC_2022',
  region: tvl.geometry(),
  scale: 10,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: lulc2026,
  description: 'RF_LULC_2026',
  folder: 'Tirunelveli_LULC',
  fileNamePrefix: 'RF_LULC_2026',
  region: tvl.geometry(),
  scale: 10,
  maxPixels: 1e13
});

print('====================================');
print('CODE 16 COMPLETED SUCCESSFULLY');
print('Export Tasks Created');
print('4 LULC Maps Ready for Download');
print('====================================');
//=========================================================
// CHANGE DETECTION : 2016 → 2019
// 3 CLASS RANDOM FOREST
//=========================================================

// Transition coding
// 0 = Vegetation
// 1 = Barren
// 2 = Built-up

var change2016_2019 = lulc2016
    .multiply(10)
    .add(lulc2019)
    .rename('transition');


//=========================================================
// STUDY AREA
//=========================================================

var studyArea = lulc2016.geometry();


//=========================================================
// PIXEL AREA IN km²
//=========================================================

var pixelArea = ee.Image.pixelArea()
    .divide(1000000);


//=========================================================
// 1. VEGETATION → BUILT-UP
// 0 → 2 = 2
//=========================================================

var vegetationToBuiltup =
    change2016_2019.eq(2);

var vegetationToBuiltupArea =
    pixelArea
    .updateMask(vegetationToBuiltup)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: studyArea,
      scale: 30,
      maxPixels: 1e9,
      tileScale: 4
    });


//=========================================================
// 2. BARREN → BUILT-UP
// 1 → 2 = 12
//=========================================================

var barrenToBuiltup =
    change2016_2019.eq(12);

var barrenToBuiltupArea =
    pixelArea
    .updateMask(barrenToBuiltup)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: studyArea,
      scale: 30,
      maxPixels: 1e9,
      tileScale: 4
    });


//=========================================================
// 3. BUILT-UP → BUILT-UP
// 2 → 2 = 22
//=========================================================

var builtupStable =
    change2016_2019.eq(22);

var builtupStableArea =
    pixelArea
    .updateMask(builtupStable)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: studyArea,
      scale: 30,
      maxPixels: 1e9,
      tileScale: 4
    });


//=========================================================
// PRINT RESULTS
//=========================================================

print('====================================');
print('CHANGE DETECTION : 2016 → 2019');
print('====================================');

print(
  'Vegetation → Built-up (km²):',
  vegetationToBuiltupArea.get('area')
);

print(
  'Barren → Built-up (km²):',
  barrenToBuiltupArea.get('area')
);

print(
  'Built-up → Built-up (km²):',
  builtupStableArea.get('area')
);

print('====================================');
//=========================================================
// CHANGE DETECTION : 2019 → 2022
// 3 CLASS RANDOM FOREST
//=========================================================

// 0 = Vegetation
// 1 = Barren
// 2 = Built-up

var change2019_2022 = lulc2019
    .multiply(10)
    .add(lulc2022)
    .rename('transition_2019_2022');


//=========================================================
// STUDY AREA
//=========================================================

var studyArea = lulc2019.geometry();


//=========================================================
// PIXEL AREA IN km²
//=========================================================

var pixelArea = ee.Image.pixelArea()
    .divide(1000000);


//=========================================================
// 1. VEGETATION → BUILT-UP
// 0 → 2 = 2
//=========================================================

var vegetationToBuiltup_2019_2022 =
    change2019_2022.eq(2);

var vegetationToBuiltupArea_2019_2022 =
    pixelArea
    .updateMask(vegetationToBuiltup_2019_2022)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: studyArea,
      scale: 30,
      maxPixels: 1e9,
      tileScale: 4
    });


//=========================================================
// 2. BARREN → BUILT-UP
// 1 → 2 = 12
//=========================================================

var barrenToBuiltup_2019_2022 =
    change2019_2022.eq(12);

var barrenToBuiltupArea_2019_2022 =
    pixelArea
    .updateMask(barrenToBuiltup_2019_2022)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: studyArea,
      scale: 30,
      maxPixels: 1e9,
      tileScale: 4
    });


//=========================================================
// 3. BUILT-UP → BUILT-UP
// 2 → 2 = 22
//=========================================================

var builtupStable_2019_2022 =
    change2019_2022.eq(22);

var builtupStableArea_2019_2022 =
    pixelArea
    .updateMask(builtupStable_2019_2022)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: studyArea,
      scale: 30,
      maxPixels: 1e9,
      tileScale: 4
    });


//=========================================================
// PRINT RESULTS
//=========================================================

print('====================================');
print('CHANGE DETECTION : 2019 → 2022');
print('====================================');

print(
  'Vegetation → Built-up (km²):',
  vegetationToBuiltupArea_2019_2022.get('area')
);

print(
  'Barren → Built-up (km²):',
  barrenToBuiltupArea_2019_2022.get('area')
);

print(
  'Built-up → Built-up (km²):',
  builtupStableArea_2019_2022.get('area')
);

print('====================================');


//=========================================================
// CHANGE DETECTION : 2022 → 2026
//=========================================================

var change2022_2026 = lulc2022
    .multiply(10)
    .add(lulc2026)
    .rename('transition_2022_2026');

var studyArea2022_2026 = lulc2022.geometry();

var pixelArea2022_2026 = ee.Image.pixelArea()
    .divide(1000000);


// Vegetation → Built-up
var vegetationToBuiltup_2022_2026 =
    change2022_2026.eq(2);

var vegetationToBuiltupArea_2022_2026 =
    pixelArea2022_2026
    .updateMask(vegetationToBuiltup_2022_2026)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: studyArea2022_2026,
      scale: 30,
      maxPixels: 1e9,
      tileScale: 4
    });


// Barren → Built-up
var barrenToBuiltup_2022_2026 =
    change2022_2026.eq(12);

var barrenToBuiltupArea_2022_2026 =
    pixelArea2022_2026
    .updateMask(barrenToBuiltup_2022_2026)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: studyArea2022_2026,
      scale: 30,
      maxPixels: 1e9,
      tileScale: 4
    });


// Built-up → Built-up
var builtupStable_2022_2026 =
    change2022_2026.eq(22);

var builtupStableArea_2022_2026 =
    pixelArea2022_2026
    .updateMask(builtupStable_2022_2026)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: studyArea2022_2026,
      scale: 30,
      maxPixels: 1e9,
      tileScale: 4
    });


//=========================================================
// RESULTS
//=========================================================

print('====================================');
print('CHANGE DETECTION : 2022 → 2026');
print('====================================');

print(
  'Vegetation → Built-up (km²):',
  vegetationToBuiltupArea_2022_2026.get('area')
);

print(
  'Barren → Built-up (km²):',
  barrenToBuiltupArea_2022_2026.get('area')
);

print(
  'Built-up → Built-up (km²):',
  builtupStableArea_2022_2026.get('area')
);

print('====================================');

//=========================================================
// OVERALL CHANGE DETECTION : 2016 → 2026
//=========================================================

// Class IDs
// 0 = Vegetation
// 1 = Barren
// 2 = Built-up

var change2016_2026 = lulc2016
    .multiply(10)
    .add(lulc2026)
    .rename('transition_2016_2026');

var studyAreaOverall = lulc2016.geometry();

var pixelAreaOverall = ee.Image.pixelArea()
    .divide(1000000);


//=========================================================
// VEGETATION → BUILT-UP
// 0 → 2 = 2
//=========================================================

var vegBuiltOverall = change2016_2026.eq(2);

var vegBuiltAreaOverall = pixelAreaOverall
    .updateMask(vegBuiltOverall)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: studyAreaOverall,
      scale: 30,
      maxPixels: 1e9,
      tileScale: 4
    });


//=========================================================
// BARREN → BUILT-UP
// 1 → 2 = 12
//=========================================================

var barrenBuiltOverall = change2016_2026.eq(12);

var barrenBuiltAreaOverall = pixelAreaOverall
    .updateMask(barrenBuiltOverall)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: studyAreaOverall,
      scale: 30,
      maxPixels: 1e9,
      tileScale: 4
    });


//=========================================================
// BUILT-UP → BUILT-UP
// 2 → 2 = 22
//=========================================================

var builtStableOverall = change2016_2026.eq(22);

var builtStableAreaOverall = pixelAreaOverall
    .updateMask(builtStableOverall)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: studyAreaOverall,
      scale: 30,
      maxPixels: 1e9,
      tileScale: 4
    });


//=========================================================
// VEGETATION → VEGETATION
// 0 → 0 = 0
//=========================================================
var vegToVeg = lulc2016.eq(0)
    .and(lulc2026.eq(0));

var vegToVegArea = ee.Image.pixelArea()
    .divide(1000000)
    .updateMask(vegToVeg)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: lulc2016.geometry(),
      scale: 30,
      maxPixels: 1e9,
      tileScale: 8
    });


//=========================================================
// BARREN → BARREN
// 1 → 1 = 11
//=========================================================

var barrenStableOverall = change2016_2026.eq(11);

var barrenStableAreaOverall = pixelAreaOverall
    .updateMask(barrenStableOverall)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: studyAreaOverall,
      scale: 30,
      maxPixels: 1e9,
      tileScale: 4
    });


//=========================================================
// BUILT-UP → VEGETATION
// 2 → 0 = 20
//=========================================================

var builtToVegOverall = change2016_2026.eq(20);

var builtToVegAreaOverall = pixelAreaOverall
    .updateMask(builtToVegOverall)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: studyAreaOverall,
      scale: 30,
      maxPixels: 1e9,
      tileScale: 4
    });


//=========================================================
// BUILT-UP → BARREN
// 2 → 1 = 21
//=========================================================

var builtToBarrenOverall = change2016_2026.eq(21);

var builtToBarrenAreaOverall = pixelAreaOverall
    .updateMask(builtToBarrenOverall)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: studyAreaOverall,
      scale: 30,
      maxPixels: 1e9,
      tileScale: 4
    });


//=========================================================
// RESULTS
//=========================================================

print('==========================================');
print('OVERALL CHANGE DETECTION : 2016 → 2026');
print('==========================================');

print(
  'Vegetation → Vegetation (km²):',
  vegToVegArea.get('area')
);
print('Vegetation → Built-up (km²):',
      vegBuiltAreaOverall.get('area'));

print('Barren → Barren (km²):',
      barrenStableAreaOverall.get('area'));

print('Barren → Built-up (km²):',
      barrenBuiltAreaOverall.get('area'));

print('Built-up → Vegetation (km²):',
      builtToVegAreaOverall.get('area'));

print('Built-up → Barren (km²):',
      builtToBarrenAreaOverall.get('area'));

print('Built-up → Built-up (km²):',
      builtStableAreaOverall.get('area'));

print('==========================================');

//=========================================================
// FINAL CHANGE DETECTION MAP : 2016 → 2026
//=========================================================

// 0 = Vegetation
// 1 = Barren
// 2 = Built-up

var transition2016_2026 = lulc2016
    .multiply(10)
    .add(lulc2026);


//=========================================================
// FINAL CHANGE CLASSES
//=========================================================

// 0 = No Change
var noChange = lulc2016.eq(lulc2026);

// 1 = Vegetation → Built-up
var vegetationBuiltup =
    transition2016_2026.eq(2);

// 2 = Barren → Built-up
var barrenBuiltup =
    transition2016_2026.eq(12);

// 3 = Built-up → Vegetation
var builtupVegetation =
    transition2016_2026.eq(20);

// 4 = Built-up → Barren
var builtupBarren =
    transition2016_2026.eq(21);


//=========================================================
// CREATE FINAL CHANGE MAP
//=========================================================

var finalChangeMap = ee.Image(0)
    .where(vegetationBuiltup, 1)
    .where(barrenBuiltup, 2)
    .where(builtupVegetation, 3)
    .where(builtupBarren, 4)
    .where(
      noChange.and(
        vegetationBuiltup.not()
      ).and(
        barrenBuiltup.not()
      ).and(
        builtupVegetation.not()
      ).and(
        builtupBarren.not()
      ),
      0
    )
    .rename('Change_Class');


//=========================================================
// DISPLAY FINAL MAP
//=========================================================

Map.addLayer(
    finalChangeMap,
    {
      min: 0,
      max: 4,
      palette: [
        'D9D9D9', // 0 No Change
        'FF0000', // 1 Vegetation → Built-up
        'FFA500', // 2 Barren → Built-up
        '00A000', // 3 Built-up → Vegetation
        '8B4513'  // 4 Built-up → Barren
      ]
    },
    'FINAL CHANGE DETECTION 2016-2026',
    true
);

print('====================================');
print('FINAL CHANGE DETECTION MAP');
print('2016 → 2026');
print('====================================');

//=========================================================
// CODE 17 : 2030 PREDICTION - BASE LAYER
// 2026 LULC AS INPUT
//=========================================================

// Class IDs
// 0 = Vegetation
// 1 = Barren
// 2 = Built-up


//=========================================================
// 1. 2026 LULC BASE MAP
//=========================================================

var baseLULC2026 = lulc2026;


//=========================================================
// 2. DISPLAY 2026 LULC
//=========================================================

Map.addLayer(
  baseLULC2026,
  {
    min: 0,
    max: 2,
    palette: [
      '006400',   // Vegetation
      '8B4513',   // Barren
      'FF0000'    // Built-up
    ]
  },
  '2026 LULC - Base for 2030',
  true
);


//=========================================================
// 3. CHECK CLASS VALUES
//=========================================================

print('====================================');
print('2030 PREDICTION - STEP 1');
print('====================================');

print('2026 LULC Base Layer:', baseLULC2026);

print('Class Information:');
print('0 = Vegetation');
print('1 = Barren');
print('2 = Built-up');


//=========================================================
// 4. STUDY AREA
//=========================================================

var predictionArea = studyArea;


//=========================================================
// 5. CENTER MAP
//=========================================================

Map.centerObject(predictionArea, 11);


print('====================================');
print('CODE 17 COMPLETED');
print('2026 LULC Ready as 2030 Base Layer');
print('====================================');
//=========================================================
// CODE 18 : TRANSITION PROBABILITY
// FINAL FIXED VERSION
//=========================================================

// 0 = Vegetation
// 1 = Barren
// 2 = Built-up


//=========================================================
// FUNCTION
//=========================================================

function transitionProbability(oldImage, newImage, oldYear, newYear) {

  print('====================================');
  print(oldYear + ' → ' + newYear);
  print('====================================');

  // -----------------------------------------
  // Transition layers
  // -----------------------------------------

  var v_v = oldImage.eq(0).and(newImage.eq(0));
  var v_b = oldImage.eq(0).and(newImage.eq(1));
  var v_u = oldImage.eq(0).and(newImage.eq(2));

  var b_v = oldImage.eq(1).and(newImage.eq(0));
  var b_b = oldImage.eq(1).and(newImage.eq(1));
  var b_u = oldImage.eq(1).and(newImage.eq(2));

  var u_v = oldImage.eq(2).and(newImage.eq(0));
  var u_b = oldImage.eq(2).and(newImage.eq(1));
  var u_u = oldImage.eq(2).and(newImage.eq(2));


  // -----------------------------------------
  // Combine and rename
  // -----------------------------------------

  var transitions = ee.Image.cat([
    v_v.rename('VV'),
    v_b.rename('VB'),
    v_u.rename('VU'),

    b_v.rename('BV'),
    b_b.rename('BB'),
    b_u.rename('BU'),

    u_v.rename('UV'),
    u_b.rename('UB'),
    u_u.rename('UU')
  ]);


  // -----------------------------------------
  // Count pixels
  // -----------------------------------------

  var counts = transitions.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: studyArea,
    scale: 10,
    maxPixels: 1e13,
    tileScale: 4
  });


  print('Transition Pixel Counts:', counts);


  //=====================================================
  // VEGETATION ROW
  //=====================================================

  var VV = ee.Number(counts.get('VV'));
  var VB = ee.Number(counts.get('VB'));
  var VU = ee.Number(counts.get('VU'));

  var totalV = VV.add(VB).add(VU);


  print('Vegetation → Vegetation:',
    VV.divide(totalV));

  print('Vegetation → Barren:',
    VB.divide(totalV));

  print('Vegetation → Built-up:',
    VU.divide(totalV));


  //=====================================================
  // BARREN ROW
  //=====================================================

  var BV = ee.Number(counts.get('BV'));
  var BB = ee.Number(counts.get('BB'));
  var BU = ee.Number(counts.get('BU'));

  var totalB = BV.add(BB).add(BU);


  print('Barren → Vegetation:',
    BV.divide(totalB));

  print('Barren → Barren:',
    BB.divide(totalB));

  print('Barren → Built-up:',
    BU.divide(totalB));


  //=====================================================
  // BUILT-UP ROW
  //=====================================================

  var UV = ee.Number(counts.get('UV'));
  var UB = ee.Number(counts.get('UB'));
  var UU = ee.Number(counts.get('UU'));

  var totalU = UV.add(UB).add(UU);


  print('Built-up → Vegetation:',
    UV.divide(totalU));

  print('Built-up → Barren:',
    UB.divide(totalU));

  print('Built-up → Built-up:',
    UU.divide(totalU));


  //=====================================================
  // PRINT TOTALS
  //=====================================================

  print('Total Vegetation Pixels:', totalV);
  print('Total Barren Pixels:', totalB);
  print('Total Built-up Pixels:', totalU);
}


//=========================================================
// 1. 2016 → 2019
//=========================================================

transitionProbability(
  lulc2016,
  lulc2019,
  '2016',
  '2019'
);


//=========================================================
// 2. 2019 → 2022
//=========================================================

transitionProbability(
  lulc2019,
  lulc2022,
  '2019',
  '2022'
);


//=========================================================
// 3. 2022 → 2026
//=========================================================

transitionProbability(
  lulc2022,
  lulc2026,
  '2022',
  '2026'
);


//=========================================================
// CLASS INFORMATION
//=========================================================

print('====================================');
print('CLASS INFORMATION');
print('====================================');

print('0 = Vegetation');
print('1 = Barren');
print('2 = Built-up');

print('====================================');
print('CODE 18 COMPLETED');
print('====================================');
//=========================================================
// CODE 19 : ESTIMATED 2026 → 2030 TRANSITION PROBABILITY
//=========================================================

// 2016 → 2019 Matrix
var M1 = ee.Array([
  [0.5742007202, 0.1995923422, 0.2262069376],
  [0.0985901089, 0.8397799439, 0.0616299472],
  [0.1787576404, 0.1952988885, 0.6259434711]
]);

// 2019 → 2022 Matrix
var M2 = ee.Array([
  [0.8355393121, 0.0684372387, 0.0960234492],
  [0.2071449449, 0.6149406217, 0.1779144335],
  [0.2326058968, 0.0721112989, 0.6952828043]
]);

// 2022 → 2026 Matrix
var M3 = ee.Array([
  [0.7688305036, 0.0644574256, 0.1667120708],
  [0.1138441473, 0.7527071623, 0.1334486904],
  [0.1307940369, 0.1221551294, 0.7470508338]
]);


//=========================================================
// WEIGHTS
//=========================================================

// Older period = lower influence
// Recent period = higher influence

var W1 = 0.20;
var W2 = 0.30;
var W3 = 0.50;


//=========================================================
// WEIGHTED TRANSITION MATRIX
//=========================================================

var predictedMatrix = M1.multiply(W1)
  .add(M2.multiply(W2))
  .add(M3.multiply(W3));


//=========================================================
// PRINT FINAL MATRIX
//=========================================================

print('====================================');
print('CODE 19');
print('====================================');

print('Estimated 2026 → 2030 Transition Matrix:',
  predictedMatrix);


//=========================================================
// EXTRACT IMPORTANT TRANSITIONS
//=========================================================

var vegToVeg = predictedMatrix.get([0, 0]);
var vegToBarren = predictedMatrix.get([0, 1]);
var vegToBuilt = predictedMatrix.get([0, 2]);

var barrenToVeg = predictedMatrix.get([1, 0]);
var barrenToBarren = predictedMatrix.get([1, 1]);
var barrenToBuilt = predictedMatrix.get([1, 2]);

var builtToVeg = predictedMatrix.get([2, 0]);
var builtToBarren = predictedMatrix.get([2, 1]);
var builtToBuilt = predictedMatrix.get([2, 2]);


//=========================================================
// PRINT VALUES
//=========================================================

print('Vegetation → Vegetation:', vegToVeg);
print('Vegetation → Barren:', vegToBarren);
print('Vegetation → Built-up:', vegToBuilt);

print('Barren → Vegetation:', barrenToVeg);
print('Barren → Barren:', barrenToBarren);
print('Barren → Built-up:', barrenToBuilt);

print('Built-up → Vegetation:', builtToVeg);
print('Built-up → Barren:', builtToBarren);
print('Built-up → Built-up:', builtToBuilt);


//=========================================================
// CHECK ROW SUMS
//=========================================================

print('====================================');
print('ROW SUM CHECK');
print('====================================');

print(
  'Vegetation Row Sum:',
  ee.Number(vegToVeg)
    .add(vegToBarren)
    .add(vegToBuilt)
);

print(
  'Barren Row Sum:',
  ee.Number(barrenToVeg)
    .add(barrenToBarren)
    .add(barrenToBuilt)
);

print(
  'Built-up Row Sum:',
  ee.Number(builtToVeg)
    .add(builtToBarren)
    .add(builtToBuilt)
);


//=========================================================
// COMPLETED
//=========================================================

print('====================================');
print('CODE 19 COMPLETED');
print('====================================');

print(
  'Estimated transition probabilities for 2026 → 2030 are ready.'
);

print(
  'Next step: Spatial allocation and 2030 LULC prediction.'
);
//=========================================================
// CODE 20 : 2030 URBAN GROWTH SUITABILITY
// FINAL FIXED VERSION
//=========================================================

// 0 = Vegetation
// 1 = Barren
// 2 = Built-up


//=========================================================
// 1. USE EXISTING 2026 FEATURE STACK
//=========================================================

// feature2026 was already created in CODE 3
// using:
// composite2026 + radar2026

print('====================================');
print('CODE 20 : 2030 URBAN SUITABILITY');
print('====================================');

print('Existing 2026 Feature Stack:', feature2026);


//=========================================================
// 2. SELECT FEATURES
//=========================================================

var ndvi2026 = feature2026.select('NDVI');

var ndbi2026 = feature2026.select('NDBI');

var ndwi2026 = feature2026.select('NDWI');


//=========================================================
// 3. NDBI NORMALIZATION
//=========================================================

var ndbiStats = ndbi2026.reduceRegion({

  reducer: ee.Reducer.minMax(),

  geometry: studyArea,

  scale: 10,

  maxPixels: 1e13,

  tileScale: 4

});


var ndbiMin = ee.Number(
  ndbiStats.get('NDBI_min')
);

var ndbiMax = ee.Number(
  ndbiStats.get('NDBI_max')
);


var ndbiNorm = ndbi2026
  .subtract(ndbiMin)
  .divide(
    ndbiMax.subtract(ndbiMin)
  )
  .clamp(0,1);


//=========================================================
// 4. NDVI NORMALIZATION
//=========================================================

var ndviStats = ndvi2026.reduceRegion({

  reducer: ee.Reducer.minMax(),

  geometry: studyArea,

  scale: 10,

  maxPixels: 1e13,

  tileScale: 4

});


var ndviMin = ee.Number(
  ndviStats.get('NDVI_min')
);

var ndviMax = ee.Number(
  ndviStats.get('NDVI_max')
);


var ndviNorm = ndvi2026
  .subtract(ndviMin)
  .divide(
    ndviMax.subtract(ndviMin)
  )
  .clamp(0,1);


//=========================================================
// 5. NDWI NORMALIZATION
//=========================================================

var ndwiStats = ndwi2026.reduceRegion({

  reducer: ee.Reducer.minMax(),

  geometry: studyArea,

  scale: 10,

  maxPixels: 1e13,

  tileScale: 4

});


var ndwiMin = ee.Number(
  ndwiStats.get('NDWI_min')
);

var ndwiMax = ee.Number(
  ndwiStats.get('NDWI_max')
);


var ndwiNorm = ndwi2026
  .subtract(ndwiMin)
  .divide(
    ndwiMax.subtract(ndwiMin)
  )
  .clamp(0,1);


//=========================================================
// 6. URBAN SUITABILITY
//=========================================================

// NDBI  = 50%
// NDVI  = 25%
// NDWI  = 15%
//
// Higher NDBI  → higher urban suitability
// Lower NDVI  → higher urban suitability
// Lower NDWI  → higher urban suitability


var urbanSuitability = ndbiNorm
  .multiply(0.50)

  .add(
    ee.Image(1)
      .subtract(ndviNorm)
      .multiply(0.25)
  )

  .add(
    ee.Image(1)
      .subtract(ndwiNorm)
      .multiply(0.15)
  )

  .rename('Urban_Suitability')

  .clip(studyArea);


//=========================================================
// 7. DISPLAY SUITABILITY MAP
//=========================================================

Map.addLayer(

  urbanSuitability,

  {
    min:0,
    max:1,
    palette:[
      '0000FF',
      '00FFFF',
      'FFFF00',
      'FF0000'
    ]
  },

  '2030 Urban Growth Suitability',

  true

);


//=========================================================
// 8. STATISTICS
//=========================================================

var suitabilityStats =
urbanSuitability.reduceRegion({

  reducer: ee.Reducer.minMax(),

  geometry: studyArea,

  scale:10,

  maxPixels:1e13,

  tileScale:4

});


print(
  'Suitability Minimum:',
  suitabilityStats.get(
    'Urban_Suitability_min'
  )
);


print(
  'Suitability Maximum:',
  suitabilityStats.get(
    'Urban_Suitability_max'
  )
);


//=========================================================
// 9. COMPLETION
//=========================================================

print('====================================');
print('CODE 20 COMPLETED');
print('====================================');

print(
  'Existing 2026 Feature Stack Used.'
);

print(
  '2030 Urban Growth Suitability Created.'
);

print(
  'Higher value = Higher urban expansion suitability.'
);

print('====================================');

/// ============================================================
// CODE 21 : 2026 → 2030 SPATIAL ALLOCATION
// ============================================================

// ------------------------------------------------------------
// 1. 2026 LULC
// ------------------------------------------------------------

var currentLULC = lulc2026;


// ------------------------------------------------------------
// 2. Recreate 2026 Urban Growth Suitability
// ------------------------------------------------------------

var ndvi2026 = feature2026.select('NDVI');
var ndbi2026 = feature2026.select('NDBI');
var ndwi2026 = feature2026.select('NDWI');


// NDVI normalization
var ndviMinMax = ndvi2026.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: studyArea,
  scale: 10,
  maxPixels: 1e13,
  tileScale: 4
});

var ndviMin = ee.Number(ndviMinMax.get('NDVI_min'));
var ndviMax = ee.Number(ndviMinMax.get('NDVI_max'));

var ndviNorm = ndvi2026
  .subtract(ndviMin)
  .divide(ndviMax.subtract(ndviMin));


// NDBI normalization
var ndbiMinMax = ndbi2026.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: studyArea,
  scale: 10,
  maxPixels: 1e13,
  tileScale: 4
});

var ndbiMin = ee.Number(ndbiMinMax.get('NDBI_min'));
var ndbiMax = ee.Number(ndbiMinMax.get('NDBI_max'));

var ndbiNorm = ndbi2026
  .subtract(ndbiMin)
  .divide(ndbiMax.subtract(ndbiMin));


// NDWI normalization
var ndwiMinMax = ndwi2026.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: studyArea,
  scale: 10,
  maxPixels: 1e13,
  tileScale: 4
});

var ndwiMin = ee.Number(ndwiMinMax.get('NDWI_min'));
var ndwiMax = ee.Number(ndwiMinMax.get('NDWI_max'));

var ndwiNorm = ndwi2026
  .subtract(ndwiMin)
  .divide(ndwiMax.subtract(ndwiMin));


// ------------------------------------------------------------
// 3. Suitability Map
// ------------------------------------------------------------

var suitability2030 =
  ndbiNorm.multiply(0.50)
  .add(
    ee.Image(1)
      .subtract(ndviNorm)
      .multiply(0.25)
  )
  .add(
    ee.Image(1)
      .subtract(ndwiNorm)
      .multiply(0.15)
  )
  .rename('suitability');

print(
  '2030 Suitability Map:',
  suitability2030
);


// ------------------------------------------------------------
// 4. Markov Transition Probabilities
// ------------------------------------------------------------

var VtoBuilt = 0.15740445768;
var BarrenToBuilt = 0.13242466469;


// ------------------------------------------------------------
// 5. Class Masks
// ------------------------------------------------------------

var vegetationCandidate =
  currentLULC.eq(0);

var barrenCandidate =
  currentLULC.eq(1);


// ------------------------------------------------------------
// 6. Suitability for each candidate class
// ------------------------------------------------------------

var vegSuitability =
  suitability2030.updateMask(
    vegetationCandidate
  );

var barrenSuitability =
  suitability2030.updateMask(
    barrenCandidate
  );


// ------------------------------------------------------------
// 7. Thresholds
// ------------------------------------------------------------

var vegThreshold =
  vegSuitability.reduceRegion({
    reducer: ee.Reducer.percentile([70]),
    geometry: studyArea,
    scale: 10,
    maxPixels: 1e13,
    tileScale: 4
  })
  .get('suitability');

var barrenThreshold =
  barrenSuitability.reduceRegion({
    reducer: ee.Reducer.percentile([70]),
    geometry: studyArea,
    scale: 10,
    maxPixels: 1e13,
    tileScale: 4
  })
  .get('suitability');


print(
  'Vegetation Threshold:',
  vegThreshold
);

print(
  'Barren Threshold:',
  barrenThreshold
);


// ------------------------------------------------------------
// 8. Select high suitability locations
// ------------------------------------------------------------

var vegetationGrowth =
  vegetationCandidate
  .and(
    suitability2030.gte(
      ee.Number(vegThreshold)
    )
  );

var barrenGrowth =
  barrenCandidate
  .and(
    suitability2030.gte(
      ee.Number(barrenThreshold)
    )
  );


// ------------------------------------------------------------
// 9. Generate 2030 Predicted LULC
// ------------------------------------------------------------

var lulc2030 =
  currentLULC
  .where(vegetationGrowth, 2)
  .where(barrenGrowth, 2)
  .clip(studyArea)
  .rename('LULC_2030');


// ------------------------------------------------------------
// 10. Display 2030 Map
// ------------------------------------------------------------

Map.addLayer(
  lulc2030,
  {
    min: 0,
    max: 2,
    palette: [
      '006400',
      '8B4513',
      'FF0000'
    ]
  },
  '2030 Predicted LULC',
  true
);

Map.centerObject(
  studyArea,
  11
);


// ------------------------------------------------------------
// 11. Calculate 2030 Areas
// ------------------------------------------------------------

var area2030 =
  ee.Image.pixelArea()
  .divide(1e6)
  .addBands(lulc2030)
  .reduceRegion({
    reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: 'class'
    }),
    geometry: studyArea,
    scale: 10,
    maxPixels: 1e13,
    tileScale: 4
  });

print(
  '2030 Predicted Class Areas (km²):',
  area2030
);

// ============================================================
// CODE 23 : QUANTITY-CONSTRAINED 2026 → 2030 ALLOCATION
// Corrected - Band Name Independent
// ============================================================


// ------------------------------------------------------------
// 1. Base 2026 LULC
// ------------------------------------------------------------

var base2026 = lulc2026;


// ------------------------------------------------------------
// 2. Calculate 2026 CLASS AREAS directly
// ------------------------------------------------------------

// Vegetation = Class 0
var vegArea2026 = ee.Image.pixelArea()
  .updateMask(base2026.eq(0))
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: studyArea,
    scale: 10,
    maxPixels: 1e13,
    tileScale: 4
  })
  .get('area');


// Barren = Class 1
var barrenArea2026 = ee.Image.pixelArea()
  .updateMask(base2026.eq(1))
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: studyArea,
    scale: 10,
    maxPixels: 1e13,
    tileScale: 4
  })
  .get('area');


// Built-up = Class 2
var builtArea2026 = ee.Image.pixelArea()
  .updateMask(base2026.eq(2))
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: studyArea,
    scale: 10,
    maxPixels: 1e13,
    tileScale: 4
  })
  .get('area');


// Convert m² → km²
var vegKm2026 =
  ee.Number(vegArea2026).divide(1e6);

var barrenKm2026 =
  ee.Number(barrenArea2026).divide(1e6);

var builtKm2026 =
  ee.Number(builtArea2026).divide(1e6);


print(
  '2026 Vegetation Area (km²):',
  vegKm2026
);

print(
  '2026 Barren Area (km²):',
  barrenKm2026
);

print(
  '2026 Built-up Area (km²):',
  builtKm2026
);


// ------------------------------------------------------------
// 3. Markov 2026 → 2030 probabilities
// ------------------------------------------------------------

var VtoBuilt = 0.15740445768;

var BarrenToBuilt = 0.13242466469;


// ------------------------------------------------------------
// 4. Expected new Built-up area
// ------------------------------------------------------------

var expectedVegToBuiltKm =
  vegKm2026.multiply(VtoBuilt);

var expectedBarrenToBuiltKm =
  barrenKm2026.multiply(BarrenToBuilt);


print(
  'Expected Vegetation → Built-up (km²):',
  expectedVegToBuiltKm
);

print(
  'Expected Barren → Built-up (km²):',
  expectedBarrenToBuiltKm
);


// ------------------------------------------------------------
// 5. Candidate suitability
// ------------------------------------------------------------

var vegSuitability23 =
  suitability2030.updateMask(
    base2026.eq(0)
  );

var barrenSuitability23 =
  suitability2030.updateMask(
    base2026.eq(1)
  );


// ------------------------------------------------------------
// 6. Growth percentage
// ------------------------------------------------------------

var vegGrowthPercent =
  expectedVegToBuiltKm
    .divide(vegKm2026)
    .multiply(100);

var barrenGrowthPercent =
  expectedBarrenToBuiltKm
    .divide(barrenKm2026)
    .multiply(100);


print(
  'Vegetation → Built-up Growth %:',
  vegGrowthPercent
);

print(
  'Barren → Built-up Growth %:',
  barrenGrowthPercent
);


// ------------------------------------------------------------
// 7. Suitability percentiles
// ------------------------------------------------------------

var vegPercentile =
  ee.Number(100)
    .subtract(vegGrowthPercent);

var barrenPercentile =
  ee.Number(100)
    .subtract(barrenGrowthPercent);


print(
  'Vegetation Selection Percentile:',
  vegPercentile
);

print(
  'Barren Selection Percentile:',
  barrenPercentile
);


// ------------------------------------------------------------
// 8. Suitability thresholds
// ------------------------------------------------------------

var vegThreshold23 =
  vegSuitability23.reduceRegion({
    reducer: ee.Reducer.percentile([
      vegPercentile
    ]),
    geometry: studyArea,
    scale: 10,
    maxPixels: 1e13,
    tileScale: 4
  })
  .get('suitability');


var barrenThreshold23 =
  barrenSuitability23.reduceRegion({
    reducer: ee.Reducer.percentile([
      barrenPercentile
    ]),
    geometry: studyArea,
    scale: 10,
    maxPixels: 1e13,
    tileScale: 4
  })
  .get('suitability');


print(
  'Vegetation Allocation Threshold:',
  vegThreshold23
);

print(
  'Barren Allocation Threshold:',
  barrenThreshold23
);


// ------------------------------------------------------------
// 9. Select high suitability transition locations
// ------------------------------------------------------------

var vegetationGrowth =
  base2026.eq(0)
    .and(
      suitability2030.gte(
        ee.Number(vegThreshold23)
      )
    );


var barrenGrowth =
  base2026.eq(1)
    .and(
      suitability2030.gte(
        ee.Number(barrenThreshold23)
      )
    );


// ------------------------------------------------------------
// 10. Generate 2030 LULC
// ------------------------------------------------------------

var lulc2030Final =
  base2026
    .where(vegetationGrowth, 2)
    .where(barrenGrowth, 2)
    .clip(studyArea)
    .rename('LULC_2030');


// ------------------------------------------------------------
// 11. Display 2030 map
// ------------------------------------------------------------

Map.addLayer(
  lulc2030Final,
  {
    min: 0,
    max: 2,
    palette: [
      '006400',
      '8B4513',
      'FF0000'
    ]
  },
  '2030 Final Predicted LULC',
  true
);

Map.centerObject(
  studyArea,
  11
);


// ------------------------------------------------------------
// 12. Final 2030 class areas
// ------------------------------------------------------------

var finalVegArea =
  ee.Image.pixelArea()
    .updateMask(lulc2030Final.eq(0))
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: studyArea,
      scale: 10,
      maxPixels: 1e13,
      tileScale: 4
    })
    .get('area');


var finalBarrenArea =
  ee.Image.pixelArea()
    .updateMask(lulc2030Final.eq(1))
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: studyArea,
      scale: 10,
      maxPixels: 1e13,
      tileScale: 4
    })
    .get('area');


var finalBuiltArea =
  ee.Image.pixelArea()
    .updateMask(lulc2030Final.eq(2))
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: studyArea,
      scale: 10,
      maxPixels: 1e13,
      tileScale: 4
    })
    .get('area');


print(
  'FINAL 2030 Vegetation (km²):',
  ee.Number(finalVegArea).divide(1e6)
);

print(
  'FINAL 2030 Barren (km²):',
  ee.Number(finalBarrenArea).divide(1e6)
);

print(
  'FINAL 2030 Built-up (km²):',
  ee.Number(finalBuiltArea).divide(1e6)
);

// ============================================================
// FINAL STEP : 2030 URBAN GROWTH RESULT
// ============================================================

// ------------------------------------------------------------
// 1. CALCULATE 2026 BUILT-UP AREA FROM ACTUAL LULC
// ------------------------------------------------------------

var built2026Area =
  ee.Image.pixelArea()
    .updateMask(lulc2026.eq(2))
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: studyArea,
      scale: 10,
      maxPixels: 1e13
    })
    .get('area');


// ------------------------------------------------------------
// 2. CALCULATE 2030 BUILT-UP AREA FROM ACTUAL PREDICTION
// ------------------------------------------------------------

var built2030Area =
  ee.Image.pixelArea()
    .updateMask(lulc2030Final.eq(2))
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: studyArea,
      scale: 10,
      maxPixels: 1e13
    })
    .get('area');


// Convert m² → km²
var built2026 =
  ee.Number(built2026Area).divide(1e6);

var built2030 =
  ee.Number(built2030Area).divide(1e6);


// ------------------------------------------------------------
// 3. GROWTH CALCULATION
// ------------------------------------------------------------

var growth2030 =
  built2030.subtract(built2026);

var growthPercent2030 =
  growth2030
    .divide(built2026)
    .multiply(100);


// ------------------------------------------------------------
// 4. PRINT FINAL RESULTS
// ------------------------------------------------------------

print('====================================');
print('FINAL 2030 URBAN GROWTH RESULTS');
print('====================================');

print(
  '2026 Built-up Area (km²):',
  built2026
);

print(
  '2030 Predicted Built-up Area (km²):',
  built2030
);

print(
  '2026 → 2030 Growth (km²):',
  growth2030
);

print(
  '2026 → 2030 Growth (%):',
  growthPercent2030
);


// ------------------------------------------------------------
// 5. FINAL 2030 LULC MAP
// ------------------------------------------------------------

Map.addLayer(
  lulc2030Final,
  {
    min: 0,
    max: 2,
    palette: [
      '006400',   // Vegetation
      '8B4513',   // Barren
      'FF0000'    // Built-up
    ]
  },
  'FINAL 2030 PREDICTED LULC',
  true
);


// ------------------------------------------------------------
// 6. 2026 → 2030 NEW URBAN GROWTH
// ------------------------------------------------------------

var urbanGrowth2026_2030 =
  lulc2030Final.eq(2)
    .and(lulc2026.neq(2))
    .selfMask();


// Display new growth in YELLOW

Map.addLayer(
  urbanGrowth2026_2030,
  {
    palette: ['FFFF00']
  },
  '2026 → 2030 NEW URBAN GROWTH',
  true
);


// ------------------------------------------------------------
// 7. CALCULATE NEW URBAN GROWTH AREA
// ------------------------------------------------------------

var newGrowthArea =
  ee.Image.pixelArea()
    .updateMask(urbanGrowth2026_2030)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: studyArea,
      scale: 10,
      maxPixels: 1e13
    })
    .get('area');

var newGrowthKm2 =
  ee.Number(newGrowthArea).divide(1e6);


print(
  '2026 → 2030 New Urban Expansion (km²):',
  newGrowthKm2
);


// ------------------------------------------------------------
// 8. CENTER MAP
// ------------------------------------------------------------

Map.centerObject(
  studyArea,
  11
);

print('====================================');
print('FINAL 2030 PREDICTION COMPLETED');
print('====================================');