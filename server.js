require('dotenv').config();
const fs = require('fs');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const helmet = require('helmet');
const PouchDB = require('pouchdb-node');

PouchDB.plugin(require('pouchdb-adapter-leveldb')).plugin(
  require('pouchdb-adapter-http')
);

const Gmail = require('./gmail.js');
const gmail = new Gmail(JSON.parse(process.env.GOOGLE_CREDS));

const port = process.env.PORT || 3000;
//const debug = process.env.NODE_ENV !== 'production';

let pdb;
if (process.env.DBHOST) {
  pdb = new PouchDB(
    'https://' + process.env.DBHOST + '/' + process.env.DBNAME,
    {
      auth: { username: process.env.DBUSER, password: process.env.DBPASS }
    }
  );
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

// Configure view engine
app.engine('html', function(filePath, options, callback) {
  const layout = fs.readFileSync('views/layouts/default.html');
  const delimiter = '%%';
  fs.readFile(filePath, function(err, content) {
    if (err) return callback(err);

    let rendered = layout.toString().replace('%%content%%', content.toString());
    for (let key in options) {
      if (options.hasOwnProperty(key) && typeof options[key] === 'string') {
        rendered = rendered.replace(delimiter + key + delimiter, options[key]);
      }
    }
    return callback(null, rendered);
  });
});
app.set('views', './views');
app.set('view engine', 'html');

app.get('/', function(req, res) {
  const googleAuthUrl = gmail.getAuthUrl();
  const googleAuthLink = googleAuthUrl
    ? '<a href="' + googleAuthUrl + '">Authorise</a>'
    : '';

  res.render('index', { GoogleAuthLink: googleAuthLink });
});

app.get('/auth/google/callback', function(req, res) {
  res.render('callback', { code: req.query.code });
});

app.post('/auth/google/callback', async function(req, res) {
  req.body.token = await gmail.getToken(req.body.code);
  delete req.body.code;

  const existing = await pdb.get(req.body._id);
  if (existing._rev) req.body._rev = existing._rev;
  pdb
    .put(req.body)
    .then(function(response) {
      console.log('Jobseeker Saved', response.ok);
      res.redirect('/');
    })
    .catch(function(err) {
      console.log(err);
      res.status(err.status || 500);
      res.redirect('/');
    });
});

// Log errors
app.use(function(err, req, res, next) {
  console.error(err);
});

app.listen(port, function() {
  console.log('Listening on port ' + port + '!');
});
