var soil_salinity = ee.ImageCollection("projects/sat-io/open-datasets/global_soil_salinity");
var dataset = ee.ImageCollection('MODIS/006/MOD44W');
var waterMask = dataset.filter(ee.Filter.date('1999-12-06', '2000-01-05')).select('water_mask');
// Chegaralar va ma'muriy birliklar uchun ma'lumotlar to'plamini yuklash
var countries_b = ee.FeatureCollection('USDOS/LSIB/2017'); // Davlatlar CHEGARALARI
var countries = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017'); // Davlatlar 
var admin1 = ee.FeatureCollection('FAO/GAUL/2015/level1'); // Ma'muriy birliklar (level 1)

// Countries bounds-davlat chegaralari
var styleParams = {
  fillColor: '00000000',
  color: '0000ff',
  width: 1,
};
var countries_bounds = countries_b.style(styleParams);

// Global panelni yaratish (faqat bir marta)
var point_info = ui.Panel({
  style: {
    position: 'bottom-right',
    padding: '8px 15px'
  }
});

// panelning o'rnini belgilash
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '9px 15px'
  }
});
 
// Legend sarlavhasini belgilash
var legendTitle = ui.Label({
  value: 'Legend',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
    }
});
 
// Sarlavhani panelga qo'shish
legend.add(legendTitle);
 
// Legendning 1qatorini yaratish va unga stel berish
var makeRow = function(color, name) {
      // Aslida rangli quti bo'lgan yorliqni yaratish.
      var colorBox = ui.Label({
        style: {
          backgroundColor: '#' + color,
          // Qutining balandligi va kengligini berish uchun to'ldirishdan foydalaning.
          padding: '8px',
          margin: '0 0 4px 0'
        }
      });
 
      // Tavsif matni bilan to'ldirilgan yorliqni yarating.
      var description = ui.Label({
        value: name,
        style: {margin: '0 0 4px 6px'}
      });
 
      // panelni qaytaring
      return ui.Panel({
        widgets: [colorBox, description],
        layout: ui.Panel.Layout.Flow('horizontal')
      });
};
 
//  Ranglar palitrasi
var palette =['00FF00', 'FFFF00','FFA500','FF0000', '8B0000'];
 
// Legend nomlari
var names = ['Non saline','Slightly saline','Moderately saline','Highly saline','Extremely saline'];
 
// Nomi va rangini qo'shish
for (var i = 0; i < 5; i++) {
  legend.add(makeRow(palette[i], names[i]));
  }

// Panel sarlavhasini qo'shish
var PointTitle = ui.Label({
  value: 'Point info',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
  }
});

point_info.add(PointTitle);

// Nuqtaning davlat va ma'muriy birlik nomlari
function showcoordpoint(coords, callback) {
  var point = ee.Geometry.Point(coords.lon, coords.lat);
  var country = countries.filterBounds(point).first();
  var countryName = country.get('country_na');
  var admin = admin1.filterBounds(point).first();
  var adminName = admin.get('ADM1_NAME');
  var salinity = soil_salinity.median().reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: point,
    scale: 30,  // Adjust the scale according to the resolution of the dataset
    maxPixels: 1e9
  }).get('b1');
  countryName.evaluate(function(countryNameValue) {
    adminName.evaluate(function(adminNameValue) {
      salinity.evaluate(function(salinityValue) {
      var info = [countryNameValue, adminNameValue, coords.lon, coords.lat, salinityValue];
      callback(info);
      });
    });
  });
}

// Panelni yangilash funksiyasi
function updateInfoPanel(values) {
  point_info.clear(); // Panelni tozalash
  point_info.add(PointTitle); // Sarlavhani qayta qo'shish

  var info_base = ['Country: ', 'Administrative Unit: ', 'lon: ', 'lat: ', 'Soil Salinity: '];
  
  for (var i = 0; i < 5; i++) {
    var description = ui.Label({
      value: info_base[i] + values[i],
      style: { margin: '0 0 4px 6px' }
    });
    point_info.add(description);
  }
}

// Xaritaga legendni qo'shish
Map.add(legend);

Map.addLayer(soil_salinity.median().updateMask(waterMask.mosaic().eq(0)),{'min':0,'max':5,'palette':palette},'Soil salinity')
Map.addLayer(countries_bounds, {}, 'USDOS/LSIB/2017', true, 0.8);

var dateSlider = ui.DateSlider({
  start: '2000-01-01',
  end: '2015-01-01',
  value: '2000-01-01',
  period: 365,
  onChange: function(dateRange) {
    var selectedDate = ee.Date(dateRange.start());
    var dataset_new = dataset.filter(ee.Filter.date(selectedDate, selectedDate.advance(1, 'year')));
    var waterMask = dataset.filter(ee.Filter.date(selectedDate.format('YYYY-MM-dd').getInfo())).select('water_mask');
    Map.clear();
    Map.add(legend);
    
    Map.addLayer(soil_salinity.median().updateMask(waterMask.mosaic().eq(0)),{'min':0,'max':5,'palette':palette},'Soil salinity');
    Map.add(dateSliderContainer);
    Map.add(point_info);
    Map.onClick(function(coords) {
    showcoordpoint(coords, function(values) {
      updateInfoPanel(values); // Panelni yangi ma'lumotlar bilan yangilash
    });
});
    Map.addLayer(countries_bounds, {}, 'USDOS/LSIB/2017', true, 0.8);
  },
  style: {stretch: 'horizontal'}
});

var dateSliderContainer = ui.Panel({
  style: {
    width: '400px',
    height: '135px', 
    position: 'bottom-right',
  }
});

// Sana slayderini asosiy konteynerga qo'shing
dateSliderContainer.add(dateSlider);

// Xaritaga asosiy konteynerni qo'shing
Map.add(dateSliderContainer);
Map.add(point_info); // Panelni xaritaga bir marta qo'shish
// Xarita bosilganda panelni yangilash
Map.onClick(function(coords) {
  showcoordpoint(coords, function(values) {
    updateInfoPanel(values);  // Panelni yangi ma'lumotlar bilan yangilash
  });
});
