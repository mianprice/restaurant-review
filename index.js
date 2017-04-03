const express = require('express');
const bodyParser = require('body-parser');
var Promise = require('bluebird');
const pgp = require('pg-promise')({
  promiseLib: Promise
});
const dbConfig = require('./dbConfig');
const db = pgp(dbConfig);

var app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static('public'));
app.set('view engine', 'hbs');

app.get('/', function(req, res) {
  res.render('home.hbs');
});

app.get('/search', function(req, res, next) {
  var qString = req.query.search_query;
  dbqString = `%${qString}%`;
  db.any('select name, distance, stars, favorite_dish from restaurants where name ilike $1', dbqString)
    .then(function(data) {
      if (data.length === 0) {
        res.render('noResult.hbs', {
          qString: qString
        });
        return;
      }
      var collection = data.map(function(element) {
        var arr = [];
        Object.keys(element).forEach(function(k) {
          arr.push(element[k]);
        });
        return arr;
      });
      res.render('search.hbs', {
        qString: qString,
        keySet: Object.keys(data[0]),
        restaurants: collection
      });
    })
    .catch(err => {throw err;});

});








app.listen(8888, () => {
  console.log("Listening on port 8888");
});
