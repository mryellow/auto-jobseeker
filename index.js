require('dotenv').config();
const fs = require('fs');
const PouchDB = require('pouchdb-node');

PouchDB.plugin(require('pouchdb-adapter-leveldb')).plugin(
  require('pouchdb-adapter-http')
);

if (!process.env.GOOGLE_CREDS) throw new Error('GOOGLE_CREDS required');
if (!process.env.DBNAME) throw new Error('DBNAME required');

const Gmail = require('./gmail.js');
const gmail = new Gmail(JSON.parse(process.env.GOOGLE_CREDS));

const JOBSEEKER_LABEL = process.env.JOBSEEKER_LABEL || 'AutoJobseeker';

// TODO: Encapsulate duplication
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

async function findLabel(token) {
  const labels = await gmail.listLabels(token);
  return labels.find(item => {
    return item.name === JOBSEEKER_LABEL;
  });
}

async function listMessages(token, label) {
  const msgs = await gmail.listMessages(token, ['UNREAD', label]);
  // Exit without error when no messages.
  if (!msgs) {
    console.log('Finished 0 messages.');
    process.exit();
  } //throw new Error('No messages found');

  let res = [];
  for (let i = 0; i < msgs.length; i++) {
    const getMessage = await gmail.getMessage(token, msgs[i].id);
    res.push(getMessage);
    //console.log('Message', getMessage.id, getMessage.labelIds);
  }
  return res;
}

async function init() {
  // TODO: Loop through users in PouchDB and reconfigure `oAuth2Client`
  const docs = await pdb.allDocs({
    include_docs: true
  });

  for (let i = 0; i < docs.rows.length; i++) {
    const row = docs.rows[i];
    const token = row.doc.token;
    console.log('Processing Jobseeker', row.id);
    const label = await findLabel(token);
    if (!label) {
      console.error('Unable to find label: ' + JOBSEEKER_LABEL);
      continue;
    }
    console.log('Label found: "%s".', label.id);

    const messages = await listMessages(token, label.id);
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
        token,
        destination,
        headers['To'],
        'FW Job Application Confirmation - ' + row.id,
        messages[i].decoded['text/plain'],
        messages[i].decoded['text/html']
      );

      await gmail.markAsRead(token, messages[i].id);
      console.log(
        new Date().toISOString(),
        'Processed message',
        messages[i].id
      );
      cnt++;
    }
    console.log('Finished %d messages.', cnt);
  }
}

init().catch(err => {
  console.log(err);
});
