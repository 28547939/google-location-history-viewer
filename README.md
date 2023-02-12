# google-location-history-viewer

A self-hosted web application providing a basic, minimal view of one's Google location history, as exported using Google's Takeout mechanism, using the OpenLayers API.

SQL table schemas are provided (for MySQL), and `history-sql.py` is used to extract the data from the Takeout into a MySQL database.
Users can adapt this without too much difficulty to other databases.

Your webserver's document root should be the `www` directory; `data.php` receives AJAX requests, retrieving the location data from your database.
`index.php` just includes a file that has been placed into `www/dist` - in this setup, `npm` is used to prepare JS dependencies alongside an HTML file, and the resulting files are placed in `www/dist`.

The files that users will find the most useful are the actual webpage - mainly `index.js`, but also `main.html`. They need to be deployed to `www/dist` using something like `npm run build` (see `package.json`). Dependencies will need to be installed into `vendor` directories using `npm` before this can happen.

`index.js` uses the OpenLayers API to draw points and lines on the map; it also uses Knockout.js to provide the "data layer", handling the underlying location data that's retrieved via AJAX, which ends up in both the map and the `<table>` that shows the history in table form.
