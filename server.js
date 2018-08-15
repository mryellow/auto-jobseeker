require('dotenv').config();
const fs = require('fs');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const helmet = require('helmet');
//const md5 = require('md5');
//const path = require('path');
const IPFS = require('ipfs');
const OrbitDB = require('orbit-db');

const Gmail = require('./gmail.js');
const gmail = new Gmail(JSON.parse(process.env.GOOGLE_CREDS));

const ipfsOptions = {
  EXPERIMENTAL: {
    pubsub: true
  }
};

const ipfs = new IPFS(ipfsOptions);

const port = process.env.PORT || 3000;
//const debug = process.env.NODE_ENV !== 'production';

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
  const delimiter = '%%';
  fs.readFile(filePath, function(err, content) {
    if (err) return callback(err);

    let rendered = content.toString();
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

ipfs.on('error', e => console.error(e));
ipfs.on('ready', async () => {
  const orbitdb = new OrbitDB(ipfs);
  const db = await orbitdb.kvstore('settings');
  await db.load();

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

    let length = db.get('length') || 0;
    await db.put('length', ++length);
    await db.put(length + '_id', req.body);
    console.log(
      '%s: Saved Jobseeker #%d ID: %s',
      new Date().toISOString(),
      length,
      db.get(length + '_id').id
    );
    res.redirect('/');
  });

  // Log errors
  app.use(function(err, req, res, next) {
    console.error(err);
  });

  app.listen(port, function() {
    console.log('Listening on port ' + port + '!');
  });
});
