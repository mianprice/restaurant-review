const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
var Promise = require('bluebird');
const pgp = require('pg-promise')({
  promiseLib: Promise
});
const dbConfig = require('./dbConfig');
const db = pgp(dbConfig);

var app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'hbs');

app.get('/', function(req, res) {
  res.render('home.hbs');
});

app.get('/search', function(req, res, next) {
  var qString = req.query.search_query;
  dbqString = `%${qString}%`;
  db.any('select * from restaurant where name ilike $1', dbqString)
    .then(function(data) {
      if (data.length === 0) {
        res.render('noResult.hbs', {
          qString: qString
        });
      } else {
        res.render('search.hbs', {
          qString: qString,
          keySet: Object.keys(data[0]),
          restaurants: data
        });
      }
    })
    .catch(next);
});

app.get('/restaurant/new', function(req, res) {
  res.render('new_restaurant.hbs');
});

app.get('/restaurant/:id', function(req, res, next) {
  db.one(`select * from restaurant where id = ${req.params.id}`)
    .then(function(data) {
      db.any(`select reviewer.name, review.title, review.stars, review.review from restaurant inner join review on restaurant.id=review.restaurant_id inner join reviewer on review.reviewer_id=reviewer.id where restaurant.id=${req.params.id}`)
        .then(function(reviews) {
          res.render('restaurant.hbs', {
            id: data.id,
            name: data.name,
            address: data.address,
            category: data.category,
            reviews: reviews,
          });
        })
        .catch(next);
    })
    .catch(next);
});

app.post('/restaurant/:id/addReview', function(req, res, next) {
  db.none(`insert into review values (default, 6, ${req.body.stars},'${req.body.title}','${req.body.review}',${req.params.id})`)
    .then(function() {
      res.redirect(`/restaurant/${req.params.id}`);
    })
    .catch(next);
});

app.post('/restaurant/submit_new', function(req, res, next) {
  db.one(`insert into restaurant values (default, '${req.body.name}','${req.body.address}','${req.body.category}') returning id`)
    .then(function(data) {
      res.redirect(`/restaurant/${data.id}`);
    })
    .catch(next);
});

app.listen(8888, () => {
  console.log("Listening on port 8888");
});
