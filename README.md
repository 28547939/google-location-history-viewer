# google-location-history-viewer

A self-hosted web application providing a basic, minimal view of one's Google location history, as exported using Google's Takeout mechanism, using the OpenLayers API. 

SQL table schemas are provided (for MySQL), and `history-sql.py` is used to extract the data from the Takeout into a MySQL database.
Users can adapt this without too much difficulty to other databases.

Your webserver's document root should be the `www` directory; `data.php` receives AJAX requests, retrieving the location data from your database.
`index.php` just includes a file that has been placed into `www/dist` - in this setup, `npm` is used to prepare JS dependencies alongside an HTML file, and the resulting files are placed in `www/dist`.

The files that users will find the most useful are the actual webpage - mainly `index.js`, but also `main.html`. They need to be deployed to `www/dist` using something like `npm run build` (see `package.json`). Dependencies will need to be installed into `vendor` directories using `npm` before this can happen.

`index.js` uses the OpenLayers API to draw points and lines on the map; it also uses Knockout.js to provide the "data layer", handling the underlying location data that's retrieved via AJAX, which ends up in both the map and the `<table>` that shows the history in table form. The OpenLayers API is the most interesting part, and users are invited to take a look at the official website [https://openlayers.org/](https://openlayers.org/).

To recap, `index.js` is the JavaScript that runs on the webpage, `main.html`, and both need to end up in `www/dist`. `www/index.php` just includes `main.html` (as located in `www/dist`). You should use `npm` to install dependencies and deploy to `www/dist`. Your browser's request will be directed at `index.php`.

See screenshot below for an example of what everything should look like when it's working. Users are advised not to get their hopes up as far as aesthetics. Segments of travel between points are often inaccurate and/or imprecise, sometimes to the extent that it's difficult to figure out what's going on; this probably depends partly on one's GPS accuracy at that time. But the ordering of the events in time and the metadata present in the `placeVisit` structures should provide enough context.

It may be that some less important metadata is not extracted from the Google Takeout, but that data could always be integrated in future work. I assume that Google's own location history viewer provides a much better, richer interface to the location history data, so this software is mainly useful for those who want to delete Google's record of their location history, for whatever reason. 



![example](https://user-images.githubusercontent.com/122396215/218289123-0f9fc601-f725-406a-9bda-e3e62dbac4c6.png)
