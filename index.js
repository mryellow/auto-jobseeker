require('dotenv').config();
const fs = require('fs');
const gmail = require('./gmail.js');

if (!process.env.GOOGLE_CREDS) throw new Error('GOOGLE_CREDS required');
if (!process.env.JOBSEEKER_ID) throw new Error('JOBSEEKER_ID required');
if (!process.env.JOBSEEKER_FROM) throw new Error('JOBSEEKER_FROM required');

const credentials = JSON.parse(process.env.GOOGLE_CREDS);

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
    let to = process.env.JOBSEEKER_TO || 'jobsearcheffort@employment.gov.au';
    // Send to self in test mode.
    if (process.env.JOBSEEKER_MODE === 'test') to = process.env.JOBSEEKER_FROM;

    /* TODO: Add decoration.
    ```
    ++++++++++ Forwarded message ++++++++++
    From: SEEK Apply <service@s.seek.com.au>
    Date: 11 August 2018 at 13:09
    Subject: Your application was successfully submitted
    To: seek@example.com
    ```
    */

    await gmail.sendMessage(
      oAuth2Client,
      to,
      process.env.JOBSEEKER_FROM,
      'FWD Job Application Confirmation - ' + process.env.JOBSEEKER_ID,
      messages[i].decoded
    );

    await gmail.markAsRead(oAuth2Client, messages[i].id);
    console.log(new Date().toISOString(), 'Processed message', messages[i].id);
    cnt++;
  }
  console.log('Finished %d messages.', cnt);
}

//const credentials = JSON.parse(fs.readFileSync('credentials.json'));
init(credentials).catch(err => {
  console.log(err);
});
