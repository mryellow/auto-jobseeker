require('dotenv').config();
const fs = require('fs');
const gmail = require('./gmail.js');

if (!process.env.JOBSEEKER_ID) throw new Error('JOBSEEKER_ID required');
if (!process.env.JOBSEEKER_EMAIL) throw new Error('JOBSEEKER_EMAIL required');

let destination = 'test@example.com';
if (process.env.JOBSEEKER_MODE === 'test') {
  destination = process.env.JOBSEEKER_EMAIL;
}

const JOBSEEKER_LABEL = process.env.JOBSEEKER_LABEL || 'AutoJobseeker';

async function findLabel(auth) {
  const labels = await gmail.listLabels(auth);
  return labels.find(item => {
    return item.name === JOBSEEKER_LABEL;
  });
}

async function listMessages(auth, label) {
  const msgs = await gmail.listMessages(auth, ['UNREAD', label]);
  if (!msgs) throw new Error('No messages found');

  let res = [];
  for (let i = 0; i < msgs.length; i++) {
    const getMessage = await gmail.getMessage(auth, msgs[i].id);
    res.push(getMessage);
    //console.log('Message', getMessage.id, getMessage.labelIds);
  }
  return res;
}

async function init(creds) {
  if (!creds) throw new Error('Error loading client secret file');
  const oAuth2Client = await gmail.authorize(creds);
  if (!oAuth2Client) throw new Error('Authorisation failed.');

  const label = await findLabel(oAuth2Client);
  if (!label) throw new Error('Unable to find label: ' + JOBSEEKER_LABEL);
  console.log('Label found: "%s".', label.id);
  const messages = await listMessages(oAuth2Client, label.id);

  let cnt = 0;
  for (let i = 0; i < messages.length; i++) {
    await gmail.sendMessage(
      oAuth2Client,
      destination,
      process.env.JOBSEEKER_EMAIL,
      'FWD Job Application Confirmation - ' + process.env.JOBSEEKER_ID,
      messages[i].plainDecoded
    );

    await gmail.markAsRead(oAuth2Client, messages[i].id);
    console.log(new Date().toISOString(), 'Processed message', messages[i].id);
    cnt++;
  }
  console.log('Marked %d messages as read.', cnt);
}

const creds = fs.readFileSync('credentials.json');
init(JSON.parse(creds)).catch(err => {
  console.log(err);
});
