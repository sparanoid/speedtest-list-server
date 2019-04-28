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
      const result = content.settings.servers[0].server.map(item => {
        return item.$;
      })

      const output = JSON.stringify(result, null, 2)

      fs.writeFile(filename, output, function(err) {
        if (err) throw err;
        console.log(`List saved to ${filename}`);
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
