const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
var Promise = require('bluebird');
const pgp = require('pg-promise')({
  promiseLib: Promise
});
const dbConfig = require('./dbConfig');
const sessionConfig = require('./sessionConfig');
const db = pgp(dbConfig);

var app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(__dirname + '/public'));
app.use(session(sessionConfig));
app.use(function historify(req,res,next) {
  if (req.session.history === undefined) {
    req.session.history = [];
  }
  if (!req.path.includes('/login') && !req.path.includes('/public') && !req.path.includes('Account') && !req.path.includes('add') && !req.path.includes('new') && !req.path.includes('icon')) {
    req.session.history.push(req.path);
  }
  next();
});
app.set('view engine', 'hbs');

app.get('/', function(req, res) {
  res.render('home.hbs', {
    loggedIn: req.session.loggedIn,
    session_name: req.session.name
  });
});

app.get('/search', function(req, res, next) {
  var qString = req.query.search_query;
  dbqString = `%${qString}%`;
  db.any('select * from restaurant where name ilike $1', dbqString)
    .then(function(data) {
      if (data.length === 0) {
        res.render('noResult.hbs', {
          qString: qString,
          loggedIn: req.session.loggedIn,
          session_name: req.session.name
        });
      } else {
        res.render('search.hbs', {
          qString: qString,
          keySet: Object.keys(data[0]),
          restaurants: data,
          loggedIn: req.session.loggedIn,
          session_name: req.session.name
        });
      }
    })
    .catch(next);
});

app.get('/restaurant/:id', function(req, res, next) {
  db.one("select * from restaurant where id = $1", [`${req.params.id}`])
    .then(function(data) {
      db.any("select reviewer.name, review.title, review.stars, review.review from restaurant inner join review on restaurant.id=review.restaurant_id inner join reviewer on review.reviewer_id=reviewer.id where restaurant.id=$1", [`${req.params.id}`])
        .then(function(reviews) {
          res.render('restaurant.hbs', {
            id: data.id,
            name: data.name,
            address: data.address,
            category: data.category,
            reviews: reviews,
            loggedIn: req.session.loggedIn,
            session_name: req.session.name
          });
        })
        .catch(next);
    })
    .catch(next);
});

app.get('/createAccount', function(req,res,next) {
  res.render('new_reviewer.hbs', {
    name_taken: req.session.name_taken,
    no_names: JSON.stringify(req.session.no_names),
    pass_fail: req.session.pass_fail,
    pass_string: req.session.pass_string
  });
});

app.post('/addAccount', function(req,res,next) {
  if (req.body.password !== req.body.confirm_password) {
    req.session.pass_fail = true;
    req.session.pass_string = 'The passwords you entered do not match.';
    res.redirect('/createAccount');
  } else {
    db.none('select * from reviewer where name=$1', [req.body.username])
      .then(() => {
        bcrypt.hash(req.body.password, 10)
          .then((encPass) => {
            db.one('insert into reviewer values (default, $1, $2, 1, $3) returning id', [req.body.username, req.body.email, encPass])
              .then((data) => {
                req.session.name = req.body.username;
                req.session.user_id = data.id;
                req.session.loggedIn = true;
                req.session.tries = 0;
                res.redirect(req.session.history[req.session.history.length - 1] === undefined ? '/' : req.session.history[req.session.history.length - 1]);
              })
              .catch(next);
          })
          .catch(next);
      }).catch((err) => {
        req.session.name_taken = true;
        if (req.session.no_names === undefined) {
          req.session.no_names = [];
        }
        req.session.no_names.push(req.body.username);
        res.redirect('/createAccount');
      });
  }
});

app.get('/login', function(req,res,next) {
  if (req.session.tries === undefined) {
    req.session.tries = 0;
  }
  res.render('login.hbs', {
    loggedIn: req.session.loggedIn,
    prevTries: req.session.tries > 0,
    tryCount: req.session.tries
  });
});

app.post('/login/submit', function(req, res, next) {
  db.one('select * from reviewer where name=$1', [req.body.name])
    .then((data) => {
      bcrypt.compare(req.body.password, data.password)
        .then(function(match) {
          if (match) {
            req.session.name = data.name;
            req.session.user_id = data.id;
            req.session.loggedIn = true;
            req.session.tries = 0;
            res.redirect(req.session.history[req.session.history.length - 1] === undefined ? '/' : req.session.history[req.session.history.length - 1]);
          } else {
            req.session.loggedIn = false;
            req.session.tries += 1;
            res.redirect('/login');
          }
        })
        .catch((err) => {
          req.session.loggedIn = false;
          req.session.tries += 1;
          res.redirect('/login');
        });
    }).catch((err) => {
      req.session.loggedIn = false;
      req.session.tries += 1;
      res.redirect('/login');
    });
});

app.use(function authenticate(req, res, next) {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
});

app.get('/new_restaurant', function(req, res) {
  res.render('new_restaurant.hbs', {
    loggedIn: req.session.loggedIn,
    session_name: req.session.name
  });
});

app.get('/new_review', function(req, res) {
  res.render('new_review.hbs', {
    loggedIn: req.session.loggedIn,
    session_name: req.session.name
  });
});

app.post('/addReview', function(req, res, next) {
  var restaurant_id = req.session.history[req.session.history.length - 1].replace("/restaurant/", "");
  db.none(`insert into review values (default,$1,$2,$3,$4,$5)`, [`${req.session.user_id}`,`${req.body.stars}`, `${req.body.title}`, `${req.body.review}`, `${restaurant_id}`])
    .then(function() {
      res.redirect(`${req.session.history[req.session.history.length - 1]}`);
    })
    .catch(next);
});

app.post('/addRestaurant', function(req, res, next) {
  db.one("insert into restaurant values (default, $1,$2,$3) returning id", [`${req.body.name}`, `${req.body.address}`, `${req.body.category}`])
    .then(function(data) {
      res.redirect(`${req.session.history[req.session.history.length - 1]}`);
    })
    .catch((err) => {
      throw err;
    });
});

app.use(function errs(err,req,res,next) {
  console.log(`Method: ${req.method} || Path: ${req.path}`);
  console.log(err);
  next();
});

app.listen(8888, () => {
  console.log("Listening on port 8888");
});
