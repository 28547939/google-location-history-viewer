

import 'ol/ol.css';
import Feature from 'ol/Feature';
import Map from 'ol/Map';
import VectorLayer from 'ol/layer/Vector';
import TileLayer from 'ol/layer/Tile';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import {fromLonLat} from 'ol/proj';
import {transform} from 'ol/proj';
import View from 'ol/View';
import * as olExtent from 'ol/extent';
import {Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style';
import {LineString, Point} from 'ol/geom';
import {getVectorContext} from 'ol/render';

import datepicker from "js-datepicker";
import daterangepicker from "daterangepicker";

import knockout from "knockout";

import DateTime from 'luxon/src/datetime.js'
import Duration from 'luxon/src/duration.js'

var jquery = require("jquery");
window.$ = window.jQuery = jquery;

var daterange_start;
var daterange_end;
var daterangeobj;




var initializeRangePicker = function (inst, start, end) {

		var dateSelected, startDate, endDate;
		if (typeof inst == 'undefined' || inst === null) {

			if (typeof start == 'string' && typeof end == 'string') {
				startDate = DateTime.fromISO(start);
				endDate = DateTime.fromISO(end);
			}
			dateSelected = DateTime.fromObject({ year: 2020, month: 12, day: 1 });
		} else {
			if (typeof inst.dateSelected == 'undefined') {
					dateSelected = DateTime.fromObject({ 
							year: inst.currentYear,
							month: inst.currentMonth+1,
							day: 1,
							hour: 0,
							minute: 0,
							second: 0,
					});
			} else {
					dateSelected = DateTime.fromJSDate(inst.dateSelected);
			}
		}


		console.log(dateSelected);
		console.log(startDate);
		

		// https://www.daterangepicker.com/
		$('.daterange').daterangepicker({
			startDate: typeof startDate != 'undefined' ? startDate.toJSDate(): dateSelected.toJSDate(),
			endDate: typeof endDate != 'undefined' ? endDate.toJSDate() : dateSelected.plus({ day: 14 }).toJSDate(),

		},
		function (start, end, label) {
			console.log("A new date selection was made: " + 
				start.format('YYYY-MM-DD') + ' to ' + end.format('YYYY-MM-DD'));

			daterange_start = start;
			daterange_end = end;

		});

		/* $('.daterange').on('apply.daterangepicker', function (e, obj) {}); */

		daterangeobj = $('.daterange').data('daterangepicker');
};


/* default Openlayers styles to be applied to objects on the map (points and lines between them) */
var style_default = new Style({
    image: new CircleStyle({
      radius: 5,
      fill: new Fill({color: '#ffffff'}),
      stroke: new Stroke({color: '#000000', width: 1}),
    }),
	stroke: new Stroke({
		color: '#000000',
		width: 2
	}),
});

/* Openlayers styles (orange color) to be applied to points/lines which have been selected by the user */
var style_selected = new Style({
	image: new CircleStyle({
		radius: 5,
		fill: new Fill({color: '#ff7700'}),
		stroke: new Stroke({color: '#000000', width: 1}),
	}),

	stroke: new Stroke({
		color: '#ff7700',
		width: 2
	}),
});

/* Google Maps sometimes identifies "waypoints" when traveling from A to B; these are colored more lightly than the default
 * path lines since they seem to be of secondary importance; in any case they are more numerous so coloring them more lightly
 * helps to reduce clutter in the map 
 */ 
var waypoint_style_default = new Style({
	stroke: new Stroke({
		color: '#cccccc',
		width: 1
	}),
});
var waypoint_style_selected = new Style({
	stroke: new Stroke({
		color: '#bb3300',
		width: 1
	}),
});





var map;
var view;
var placevisit_features = {};
var features = {};
var layers = {};
/* currently unused 
var activitysegment_features = {};
*/



/* view object for knockout.js */
view = {
	data_table: knockout.observableArray(),
	selected: knockout.observable(),
	history: knockout.observableArray(),
};

$(document).ready(function () {

	/* initializing the openlayers structure */
	var map = new Map({
	  layers: [
			new TileLayer({
				source: new OSM()
			}),
		],
	  target: document.getElementById('map'),
	  view: new View({
		center: [0, 0],
		zoom: 2,
	  }),
	});

	map.on('click', function (e) {
		map.forEachFeatureAtPixel(e.pixel, function (f) {
		
			if (typeof f.getId() == 'string') {

				/* trigger our custom event (a knockout.js "computed observable") when a user clicks on one of the 
				 * elements that we've drawn on the map */
				view.selected(f.getId());
			}
			return true;
		});

		const status = document.getElementById('status');
	});

	knockout.applyBindings(view);

	/* event handler for a user clicking on an item (place "placeVisit" or travel segment "activitySegment") on the map,
	 * or likewise, clicking on a row on the data table */
	view.selected.subscribe(function (id) {
		if (typeof view == 'undefined' || typeof view.selected != 'function')
			return;

		//console.log('selected '+ id);

/*
		$('#data tr').attr('class', '');
		$('#data tr#'+ id).attr('class', 'datatable_selected');
		*/

		//console.log('selected='+id);
		//

		/* scroll to the corresponding row */
		document.getElementById(id).scrollIntoView();

		var update_style = function (v) {
			var x;
			if (!Array.isArray(v))
				x = [v];
			else
				x = v;
				
			x.map(function (x) {
					if (x.getId() == id) {
						x.setStyle(style_selected);
					} else if (x.getId().indexOf(id+'-waypoint') == 0) {
						x.setStyle(waypoint_style_selected);
					} else if (x.getId().indexOf('-waypoint') != -1) {
						x.setStyle(waypoint_style_default);
					} else {
						x.setStyle(style_default);
					}
			});
		};

		Object.values(features).map(update_style);

		Object.keys(layers).forEach(i => layers[i].setZIndex(0));
		layers[id].setZIndex(1);

		if (id.indexOf('placevisit') != -1) {
				var coord = features[id].getGeometry().getCoordinates();
				if (!olExtent.containsCoordinate(map.getView().calculateExtent(), coord)) {
					map.getView().setCenter(coord);
				}
		} else {
		//	map.getView.setCenter(features[id].getGeometry().getExtent());
		}
	}),


	/* listen using knockout.js for our data_table object being populated (from AJAX); as it's populated, we 
	 * update the map with the corresponding elements (circles and lines) */
	view.data_table.subscribe(function () {
		console.log('data_table_listener');

		// delete everything on the map
		Object.keys(layers).forEach(i => map.removeLayer(layers[i]));

		/* clear previously rendered items */
		layers = {};
		placevisit_features = {};
		features = {};
		/* currently unused
		activitysegment_features = {};
		*/

		// get the current value of the table
		var data_table = view.data_table();

		map.getLayers().forEach(function (x) {
			if (x instanceof VectorLayer) {
					map.removeLayer(x);
			}
		});


		var total_extent = olExtent.createEmpty();

		data_table.map(function (x) {
			//console.log('data_table.map');


			var vectorSource = new VectorSource({
			  features: [],
			  wrapX: false,
			});

			var vector = new VectorLayer({
			  source: vectorSource,
			});

			if (x['type'] == 'placevisit') {
				//console.log('placevisit');
				var coord = transform([x.lon, x.lat], 'EPSG:4326', 'EPSG:3857');

				var pt = new Feature({
					'geometry': new Point(coord),
					'i': 0,
					'size': 2,
				});

				pt.setId(x['uniq_id']);
				pt.setStyle(style_default);

				placevisit_features[x['uniq_id']] = pt;
				features[x['uniq_id']] = pt;

				vectorSource.addFeatures([ pt ]);
			} else if (x['type'] == 'activitysegment') {
	
				var lines = [];

				var new_line = function (x, id, is_waypoint) {
					// construct line based on Google Maps longitude/latitude data
					var line = new Feature({
						'geometry': new LineString([
							transform([
								x['start_lon'] / (10**7), 
								x['start_lat'] / (10**7), 
							], 'EPSG:4326', 'EPSG:3857'), 

							transform([
								x['end_lon'] / (10**7), 
								x['end_lat'] / (10**7), 
							], 'EPSG:4326', 'EPSG:3857')
						]),
					});

					line.setStyle(is_waypoint ? waypoint_style_default : style_default);
					line.setId(id);

					return line;
				};

				/* Also add the "waypoint segments" (which are subordinated to this activitySegment) to the map */
				var i = 0;
				lines = x['waypoint_segments'].map(function (w) {
					var line = new_line(w, x['uniq_id']+'-waypoint-'+ i++, true);
					return line;
				});

				lines.push(new_line(x, x['uniq_id']));

				/* currently unused
				activitysegment_features[x['uniq_id']] = lines;
				 */
				features[x['uniq_id']] = lines;

				vectorSource.addFeatures(lines);
			}

			layers[ x['uniq_id'] ] = vector;

			olExtent.extend(total_extent, vectorSource.getExtent());
			map.addLayer(vector);
		});

		// initialize the map zoom/view to include all the elements that we've added
		if (!olExtent.isEmpty(total_extent)) {
			map.getView().fit(total_extent);
		}
	});

});

// allow keyboard arrows to trigger our 'selected' event, in addition to clicks
$(document).keydown(function (e) {
	if (e.keyCode < 37 || e.keyCode > 40)
		return;

	var data = view.data_table();
	var selected = view.selected();

	for (var i = 0; i < data.length; i++) {
		if (data[i]['uniq_id'] == selected) {

			// previous
			if (e.keyCode == 37 || e.keyCode == 38) {
				var j = (i == 0) ? (data.length - 1) : (i - 1);
				view.selected(data[j]['uniq_id']);
			// next
			} else if (e.keyCode == 39 || e.keyCode == 40) {
				view.selected(data[(i+1) % data.length]['uniq_id']);
			}
		}
	}
});




/* retrieve the history data from the backend (aside from the first page load, this is triggered by form submission);
 * and store it in the knockout.js observable, to trigger its subscribers, updating the map and the data table
 * */
var fetch = function (e) {


	$.get('/data.php', {
		'range_start': daterangeobj.startDate.format('YYYY-MM-DD'),
		'range_end': daterangeobj.endDate.format('YYYY-MM-DD'),
	},
	function (data, textStatus, jqXHR) {
		console.log(data);

		/* table of past searches is set up to make inputting date ranges more convenient */
		view.history(data['history'].map(function (x) {
			x.updateDateRange = function () {
				initializeRangePicker(undefined, x.range_start, x.range_end);
			};
			
			return x;
		}).reverse());

		var activitysegment = data['activitysegment'].map(function (x) {
			var y = x;
			y['type'] = 'activitysegment';
			y['waypoint_segments'] = data['waypoint_segments'][y['id']];
			return y;
		});

		var placevisit = data['placevisit'].map(function (x) {
			var data = x;
			data['type'] = 'placevisit';
			data['lon'] = data['lon'] / (10**7);
			data['lat'] = data['lat'] / (10**7);
			return data;
		});

		var default_keys = ['place', 'activityType', 'address'];
		var date_format = 'EEE yyyy-MM-dd HH:mm:ss';

		var x = activitysegment.concat(placevisit).map(function (x) {
		
			x['start_time'] = DateTime.fromSQL(x['start_time'], { zone: 'UTC' });
			x['end_time'] = DateTime.fromSQL(x['end_time'], { zone: 'UTC' });
			// toJSDate

			default_keys.map(function (k) {
				if (typeof x[k] == 'undefined') {
					x[k] = '';
				}
			});

			return x;
		});

		x.sort(function (a, b) {
			return a.start_time.toJSDate() - b.start_time.toJSDate();
		});

		var timezone;
		$('#timezone option:selected').each(function () {
			timezone = $(this).val();
		});

		var i = 0;
		var processed = x.map(function (x) {
			x['duration'] = x['end_time'].diff(
				x['start_time'], ['minutes', 'hours', 'days']
			).toFormat('hh:mm');

			x['start_time'] = x['start_time'].setZone(timezone).toFormat(date_format);
			x['end_time'] = x['end_time'].setZone(timezone).toFormat(date_format);

			if (typeof x['distance'] != 'undefined') {
					x['distance_str'] = (x['distance'] > 1000 
						? (String((x['distance'] / 1609.34).toFixed(2)) + ' mi') 
						: (String((x['distance'] / 3.28084).toFixed(1)) + ' ft'));
			} else {
				x['distance_str'] = '';
			}

			// keep track of the integer index of placevisits
			if (x['type'] == 'placevisit') {
				i++;
				x['i'] = i;
			} else {
				x['i'] = '';
			}

			x['uniq_id'] = x['type'] + x['id'];

			x['changeSelectedVisit'] = function () {
				view.selected(x['uniq_id']);
			};

			return x;
		});

		//console.log(x.map(function (x) { return x.start_time; }));
		//console.log(processed);

		// update the data_table knockout observable with our processed data (this triggers the subscribers)
		view.data_table(processed);
	}, 'json');
};


$(document).ready(function () {
	initializeRangePicker();

	// set up the page with whatever date range is initialized
	fetch();
});

const picker = datepicker('.yearpicker', {
	onMonthChange: initializeRangePicker,
	onSelect: initializeRangePicker,
});


$('#fetch').click(fetch);
