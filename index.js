const express = require('express');
const bodyParser = require('body-parser');
var Promise = require('bluebird');
const pgp = require('pg-promise')({
  promiseLib: Promise
});

var app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static('public'));
app.set('view engine', 'hbs');

app.get('/', function(req, res) {
  res.render('home.hbs');
});

app.post('/search_query', function(req, res) {
  var qString = req.body.search_query;
  // Do some stuff with the query
  console.log(`Received a search query: ${qString}`);

  // Render the search result
  res.redirect(`/search?searchTerm=${encodeURIComponent(qString)}`);
});

app.get('/search', function(req, res) {
  var qString = req.query.searchTerm;
  qString = decodeURIComponent(qString);
  res.render('search.hbs', {
    qString: qString
  });
});







app.listen(8888, () => {
  console.log("Listening on port 8888");
});
