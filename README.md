# google-location-history-viewer


## Description

See next section for more detailed setup instructions.

A self-hosted web application providing a basic, minimal view of one's Google location history, as exported using Google's Takeout mechanism, using the OpenLayers API. 
Unlike some others, this tool does not summarize or perform any analysis on the data; it just displays on the map the actual points and segments of travel between points, 
taken directly from the location history data without any further modification. The user selects a date range, and the points/segments lying in that date range are rendered 
on the map in addition to being displayed on a table. The table includes some of the additional information that's included in Google's location history data, including the
time spent on the point/segment, the inferred name and/or address of points, inferred form of travel, etc.

See screenshot below for an example of what everything should look like when it's working. Users are advised not to get their hopes up as far as aesthetics. Segments of travel between points are often inaccurate and/or imprecise, sometimes to the extent that it's difficult to figure out what's going on; this probably depends partly on one's GPS accuracy at that time. But the ordering of the events in time and the metadata present in the `placeVisit` structures should provide enough context.

There is a great deal of less important metadata that this software does not extract from the Google Takeout; but much of that data could always be integrated in future work. 
In the takeout data, each `placeVisit` entry contains alternative inferences of possible user location as well as more precise information about paths taken when moving, 
neither of which can be incorporated because the data is specified in the form of unique Google-specific map-location identifiers (and latitude/longitude); 
Google only provides metadata for the location candidate that is judged as having the highest probability.

I assume that Google's own location history viewer provides a much better, richer interface to the location history data, including being able to incorporate metadata present in the Takeout that we have omitted.
So this software is mainly useful for those who want to delete Google's record of their location history, for whatever reason, while still being able to efficiently refer to past location history when needed.


SQL table schemas are provided (for MySQL), and `loader.py` is used to extract the data from the Takeout into a MySQL database.
Currently, `loader.py` depends on the MySQL connector Python module.

### TODO

Eliminate ZF3 dependency from `data.php` 

## Quick-start

### Overview & deployment

- Webserver with PHP; document root: `www`
- `www/data.php` receives AJAX requests and retreives location data from the database
- `www/index.php` just `include`s the frontend in `www/dist` that has been compiled with `npm` (see below)
- `index.js` and `main.html` are compiled together using something like `npm run build` (see `package.json`), which also deploys them to `www/dist`.
    JS dependencies need to be installed first 
- Database configuration file needs to be called `db.yml`, one level up from your document root (i.e. where `db.yml.sample` currently is), since this is
    hard-coded in `data.php`

`index.js` uses the OpenLayers API to draw points and lines on the map; it also uses Knockout.js to provide the "data layer", handling the underlying location data that's retrieved via AJAX, 
which ends up in both the map and the `<table>` that shows the history in table form. More information about OpenLayers: [https://openlayers.org/](https://openlayers.org/).

### Database setup; loading location data

Obtain location data using Google Takeout. Based on the Takeout format as of late 2023, the Takeout will contain a directory called `Semantic Location History`; `$DATA_DIR` can be set to its path.
Use `loader.py` to load the data. The program will recursively process all JSON under the given `$DATA_DIR`:

./history-loader/src/history-loader/loader.py --db-config db.yml --data-dir $DATA_DIR

Note: one of the table columns in the provided SQL (`tables.sql`) is called `source_path`. When data is loaded into the database, the path of the provided data directory is 
stored in `source_path`. This makes it easier to test the loading of location data, since each loaded dataset can be located (and deleted) using the `source_path` if needed.
But this schema uses an auto-incremented, numeric unique ID field, so loading operations are not idempotent.

### PHP dependencies & setup

The PHP web backend depends on Zend Framework 3, which is no longer maintained (now known as Laminas). 
This might cause `composer` to fail to install dependencies. It may be necessary to manually download ZF3.

### JavaScript/`npm` dependencies

- `jQuery`
- `knockout.js` ([https://knockoutjs.com/](https://knockoutjs.com/))
- `js-datepicker` ([https://github.com/qodesmith/datepicker#readme](https://github.com/qodesmith/datepicker#readme))
- `daterangepicker` ([https://www.daterangepicker.com/](https://www.daterangepicker.com/))
- OpenLayers [https://openlayers.org/](https://openlayers.org/)

## Example screenshot

![example](https://user-images.githubusercontent.com/122396215/218289123-0f9fc601-f725-406a-9bda-e3e62dbac4c6.png)
