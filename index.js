require('dotenv').config();
const fs = require('fs');
const gmail = require('./gmail.js');

if (!process.env.JOBSEEKER_ID) throw new Error('JOBSEEKER_ID required');
if (!process.env.JOBSEEKER_EMAIL) throw new Error('JOBSEEKER_EMAIL required');

let destination = 'test@example.com';
if (process.env.JOBSEEKER_MODE === 'test') {
  destination = process.env.JOBSEEKER_EMAIL;
}

const JOBSEEKER_LABEL = 'AutoJobseeker';

async function findLabel(auth) {
  const labels = await gmail.listLabels(auth).catch(err => console.error);
  return labels.find(item => {
    return item.name === JOBSEEKER_LABEL;
  });
}

async function listMessages(auth, label) {
  console.log('listMessages', label);
  const msgs = await gmail
    .listMessages(auth, ['UNREAD', label])
    .catch(err => console.error);
  if (!msgs) throw new Error('No messages found');

  let res = [];
  for (let i = 0; i < msgs.length; i++) {
    const getMessage = await gmail
      .getMessage(auth, msgs[i].id)
      .catch(err => console.error);
    res.push(getMessage);
    console.log(getMessage.id, getMessage.threadId, getMessage.labelIds);
  }
  return res;
}

async function init(creds) {
  const oAuth2Client = await gmail
    .authorize(JSON.parse(creds))
    .catch(err => console.error);
  const label = await findLabel(oAuth2Client);
  if (!label) throw new Error('Unable to find label: ' + JOBSEEKER_LABEL);
  console.log('Found', label);
  const messages = await listMessages(oAuth2Client, label.id);
  //console.log(messages);

  let cnt = 0;
  for (let i = 0; i < messages.length; i++) {
    await gmail
      .markAsRead(oAuth2Client, messages[i].id)
      .catch(err => console.error);
    cnt++;
  }
  console.log('Marked ' + cnt + ' messages as read.');

  // TODO: FWD
  /*
  const sendMessage = await gmail.sendMessage(
    auth,
    destination,
    process.env.JOBSEEKER_EMAIL,
    'FWD: Job Application Confirmation - ' + process.env.JOBSEEKERID,
    getMessage.snippet
  );
  console.log('sendMessage', sendMessage);
  */
}

const creds = fs.readFileSync('credentials.json');
if (!creds) throw new Error('Error loading client secret file');
init(creds);
