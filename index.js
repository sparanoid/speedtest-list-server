require('dotenv').config();
const axios = require('axios');
const xml2js = require('xml2js');
const fs = require('fs');
const parser = new xml2js.Parser();
const algoliasearch = require('algoliasearch');

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_ADMIN_KEY, {
  timeout: 4000,
});
const index = client.initIndex(process.env.ALGOLIA_INDEX);
const url = 'https://c.speedtest.net/speedtest-servers-static.php';
const filename = 'speedtest-list.json';

axios.get(url)
  .then(function (response) {
    let xml = response.data;

    parser.parseString(xml, function(err, content) {
      if (err) throw err;

      // Remove top-level "$" of every server node
      let result = content.settings.servers[0].server.map(item => {
        return item.$;
      })

      // Convert strings to number
      for (let i = 0; i < result.length; i++) {
        var obj = result[i];
        for (let prop in obj) {
          // Use reversed objectID
          // https://www.algolia.com/doc/api-client/methods/indexing/#index-objects
          obj.objectID = obj.id;

          // Use reversed geolocation
          // https://www.algolia.com/doc/guides/managing-results/refine-results/geolocation/
          obj._geoloc = {};
          obj._geoloc.lat = obj.lat;
          obj._geoloc.lon = obj.lon;

          if (obj.hasOwnProperty(prop) && obj[prop] !== null && !isNaN(obj[prop])){
            obj[prop] = +obj[prop];
          }
        }
      }

      // Remove duplicated props
      for (let i = 0; i < result.length; i++) {
        var obj = result[i];
        for (let prop in obj) {
          delete obj.id;
          delete obj.lat;
          delete obj.lon;
        }
      }

      let output = JSON.stringify(result, null, 2)

      fs.writeFile(filename, output, function(err) {
        if (err) throw err;
        console.log(`List saved to ${filename}`);
      });

      index.setSettings({
        attributesForFaceting: [
          'country'
        ],
        maxValuesPerFacet: 1000
      });

      index.addObjects(result, (err, content) => {
        if (err) throw err;
        console.log(`List uploaded to Algolia`);
      });
    });
  })
  .catch(function (error) {
    console.log(error);
  })
  .then(function () {
  });
