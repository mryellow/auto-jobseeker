require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const helmet = require('helmet');
//const md5 = require('md5');
//const path = require('path');
const PouchDB = require('pouchdb-node');

const port = process.env.PORT || 3000;
//const debug = process.env.NODE_ENV !== 'production';

//.plugin(require('pouchdb-adapter-idb'))
//.plugin(require('pouchdb-adapter-websql'))

// TODO: Encapsulate duplication
let pdb;
if (process.env.DBHOST) {
  pdb = new PouchDB(process.env.DBHOST + '/' + process.env.DBNAME, {
    auth: {
      username: process.env.DBUSER,
      password: process.env.DBPWD
    }
  });
} else {
  pdb = new PouchDB(process.env.DBNAME);
}

app.use(helmet());
app.use(bodyParser.urlencoded({ extended: false }));
//app.use(bodyParser.json());

// Force HTTPS redirect unless we are using localhost
function httpsRedirect(req, res, next) {
  if (
    req.protocol === 'https' ||
    req.header('X-Forwarded-Proto') === 'https' ||
    req.hostname === 'localhost'
  ) {
    return next();
  }

  res.status(301).redirect('https://' + req.headers.host + req.url);
}

// Redirect to https except on localhost
app.use(httpsRedirect);

app.get('/', function(req, res) {
  const options = {
    root: __dirname + '/',
    dotfiles: 'deny'
    /*
    headers: {
      'x-timestamp': Date.now(),
      'x-sent': true,
    },
    */
  };

  const fileName = 'server.html';
  res.sendFile(fileName, options, function(err) {
    if (err) {
      next(err);
    } else {
      console.log('Sent:', fileName);
    }
  });
});

app.post('/', function(req, res, next) {
  console.log(req.body);
  /*
  if (!req || !req.body) return;

  pdb
    .put(req.body)
    .then(function(response) {
      // handle response
      res.json(response);
    })
    .catch(function(err) {
      console.log(err);
      res.status(err.status || 500);
      res.json(err);
    });
    */
});

// Log errors
app.use(function(err, req, res, next) {
  console.error(err);
});

app.listen(port, function() {
  console.log('Listening on port ' + port + '!');
});
