const express = require('express');
const bodyParser = require('body-parser');
var Promise = require('bluebird');
const pgp = require('pg-promise')({
  promiseLib: Promise
});

var app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static('public'));

app.get('/', function(req, res) {
  res.render('layout.hbs');
});








app.listen(8888, () => {
  console.log("Listening on port 8888");
});
