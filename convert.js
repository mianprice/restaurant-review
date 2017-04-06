const pgp = require('pg-promise')();
const dbConfig = require('./dbConfig');
const db = pgp(dbConfig);
const bcrypt = require('bcrypt');

db.any('select * from reviewer where id<13')
  .then((data) => {
    var toChange = data.map((e) => {
      return [e.id, e.password];
    });
    toChange.forEach((e) => {
      bcrypt.hash(e[1], 10)
        .then((hashed) => {
          console.log(`Original: ${e[1]} || New: ${hashed}`);
          db.none(`update reviewer set password='${hashed}' where id=${e[0]};`)
            .then(() => {
              console.log(`Done with id: ${e[0]}`);
            })
            .catch((err) => {throw err;});
        })
        .catch((err) => {throw err;});
    });
  })
  .catch((err) => {throw err;});
