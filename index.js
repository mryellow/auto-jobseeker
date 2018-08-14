require('dotenv').config();
const fs = require('fs');
const PouchDB = require('pouchdb-node');
const gmail = require('./gmail.js');

if (!process.env.GOOGLE_CREDS) throw new Error('GOOGLE_CREDS required');
if (!process.env.DBNAME) throw new Error('DBNAME required');

const JOBSEEKER_LABEL = process.env.JOBSEEKER_LABEL || 'AutoJobseeker';

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

async function findLabel(auth) {
  const labels = await gmail.listLabels(auth);
  return labels.find(item => {
    return item.name === JOBSEEKER_LABEL;
  });
}

async function listMessages(auth, label) {
  const msgs = await gmail.listMessages(auth, ['UNREAD', label]);
  // Exit without error when no messages.
  if (!msgs) {
    console.log('Finished 0 messages.');
    process.exit();
  } //throw new Error('No messages found');

  let res = [];
  for (let i = 0; i < msgs.length; i++) {
    const getMessage = await gmail.getMessage(auth, msgs[i].id);
    res.push(getMessage);
    //console.log('Message', getMessage.id, getMessage.labelIds);
  }
  return res;
}

async function init(creds) {
  if (!creds) throw new Error('Error missing credentials.');
  //const oAuth2Client = await gmail.authorize(creds);
  //if (!oAuth2Client) throw new Error('Authorisation failed.');

  // TODO: Loop through users in PouchDB and reconfigure `oAuth2Client`
  pdb
    .allDocs({
      include_docs: true
    })
    .then(function(docs) {
      console.log('docs', docs);
      // oAuth2Client.setCredentials(JSON.parse(token));
    });

  /*
  const label = await findLabel(oAuth2Client);
  if (!label) throw new Error('Unable to find label: ' + JOBSEEKER_LABEL);
  console.log('Label found: "%s".', label.id);
  const messages = await listMessages(oAuth2Client, label.id);

  let cnt = 0;
  for (let i = 0; i < messages.length; i++) {
    let destination =
      process.env.JOBSEEKER_TO || 'jobsearcheffort@employment.gov.au';

    // Map headers to object
    let headers = {};
    for (let j = 0; j < messages[i].payload.headers.length; j++) {
      headers[messages[i].payload.headers[j].name] =
        messages[i].payload.headers[j].value;
    }

    // Send to self in test mode.
    if (process.env.NODE_ENV !== 'production') destination = headers['To'];

    await gmail.sendMessage(
      oAuth2Client,
      destination,
      headers['To'],
      // TODO: Get `JOBSEEKER_ID` from PouchDB
      'FW Job Application Confirmation - ' + process.env.JOBSEEKER_ID,
      messages[i].decoded['text/plain'],
      messages[i].decoded['text/html']
    );

    await gmail.markAsRead(oAuth2Client, messages[i].id);
    console.log(new Date().toISOString(), 'Processed message', messages[i].id);
    cnt++;
  }
  console.log('Finished %d messages.', cnt);
  */
}

//const credentials = JSON.parse(fs.readFileSync('credentials.json'));
const credentials = JSON.parse(process.env.GOOGLE_CREDS);
init(credentials).catch(err => {
  console.log(err);
});
