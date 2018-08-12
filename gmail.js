const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send'
];
const TOKEN_PATH = 'token.json';

const cor = {
  project_id: '',

  /**
   * Encode email message
   * @param {String} message Text to encode
   */
  encodeMessage: message => {
    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  },

  /**
   * Decode email message
   * @param {String} message Text to decode
   */
  decodeMessage: message => {
    return Buffer.from(message, 'base64')
      .toString('ascii')
      .replace(/\-/g, '+')
      .replace(/\_/g, '/');
  },

  /**
   * Create an OAuth2 client with the given credentials, and then execute the
   * given callback function.
   * @param {Object} credentials The authorization client credentials.
   */
  authorize: credentials => {
    cor.project_id = credentials.installed.project_id;
    return new Promise(function(resolve, reject) {
      const { client_secret, client_id, redirect_uris } = credentials.installed;
      const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      // Check if we have previously stored a token.
      fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) {
          resolve(cor.getNewToken(oAuth2Client));
        } else {
          oAuth2Client.setCredentials(JSON.parse(token));
          resolve(oAuth2Client);
        }
      });
    });
  },

  /**
   * Get and store new token after prompting for user authorization, and then
   * execute the given callback with the authorized OAuth2 client.
   * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
   */
  getNewToken: oAuth2Client => {
    return new Promise(function(resolve, reject) {
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
      });
      console.log('Authorize this app by visiting this url: ', authUrl);
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question('Enter the code from that page here: ', code => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
          if (err) return reject(new Error('Error retrieving access token'));
          oAuth2Client.setCredentials(token);
          fs.writeFile(TOKEN_PATH, JSON.stringify(token), err => {
            if (err) return reject(new Error(err));
            console.log('Token stored to', TOKEN_PATH);
          });
          resolve(oAuth2Client);
        });
      });
    });
  },

  /**
   * Lists the labels in the user's account.
   *
   * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
   */
  listLabels: auth => {
    return new Promise(function(resolve, reject) {
      const gmail = google.gmail({ auth: auth, version: 'v1' });
      gmail.users.labels.list(
        {
          userId: 'me'
        },
        (err, res) => {
          if (err) return reject(new Error(err));
          resolve(res.data.labels);
        }
      );
    });
  },

  /**
   * Lists the messages in the user's account with matching labels.
   *
   * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
   * @param {Array} labelIds List of labels to filter.
   */
  listMessages: (auth, labelIds) => {
    return new Promise(function(resolve, reject) {
      const gmail = google.gmail({ auth: auth, version: 'v1' });
      gmail.users.messages.list(
        {
          includeSpamTrash: false,
          labelIds: labelIds || [],
          userId: 'me'
        },
        (err, res) => {
          if (err) return reject(new Error(err));
          resolve(res.data.messages);
        }
      );
    });
  },

  /**
   * Retrieve message contents given an Id.
   *
   * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
   * @param {String} messageId Message unique identifier.
   */
  getMessage: (auth, messageId) => {
    return new Promise(function(resolve, reject) {
      const gmail = google.gmail({ auth: auth, version: 'v1' });
      gmail.users.messages.get(
        {
          userId: 'me',
          id: messageId
          //format: 'full'
        },
        (err, res) => {
          if (err) return reject(new Error(err));

          let body = {}; //res.data.payload.body.data;
          for (let j = 0; j < res.data.payload.parts.length; j++) {
            body[res.data.payload.parts[j].mimeType] = cor.decodeMessage(
              res.data.payload.parts[j].body.data
            );
          }
          res.data.decoded = body;

          resolve(res.data);
        }
      );
    });
  },

  /**
   * Create an encoded email message.
   *
   * @param {String} to To email address
   * @param {String} from From email address
   * @param {String} subject Message subject.
   * @param {String} bodyText Message body text/plain.
   * @param {String} bodyHtml Message body text/html.
   */
  // TODO: Make multipart messages with same parts as original.
  // FIXME: `from` is ignored, must be an alias?
  makeMessage: (to, from, subject, bodyText, bodyHtml) => {
    const boundary = new Date().getTime();
    let str = [
      'MIME-Version: 1.0\n',
      'to: ',
      to,
      '\n',
      'from: ',
      from,
      '\n',
      'subject: ',
      subject,
      '\n',
      'Content-Type: multipart/alternative; boundary="' + boundary + '"\n',
      '\n',
      '--' + boundary + '\n',
      'Content-Type: text/plain; charset="UTF-8"\n',
      'Content-Transfer-Encoding: 7bit\n',
      //'Content-Transfer-Encoding: quoted-printable\n',
      '\n',
      bodyText,
      '\n',
      '--' + boundary + '\n',
      'Content-Type: text/html; charset="UTF-8"\n',
      'Content-Transfer-Encoding: 7bit\n',
      //'Content-Transfer-Encoding: quoted-printable\n',
      '\n',
      bodyHtml,
      '\n\n',
      '--' + boundary + '--\n'
    ].join('');

    return cor.encodeMessage(str);
  },

  /**
   * Retrieve message contents given an Id.
   *
   * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
   * @param {String} to To email address
   * @param {String} from From email address
   * @param {String} subject Message subject.
   * @param {String} bodyText Message body text/plain.
   * @param {String} bodyHtml Message body text/html.
   */
  sendMessage: (auth, to, from, subject, bodyText, bodyHtml) => {
    return new Promise(function(resolve, reject) {
      const gmail = google.gmail({ auth: auth, version: 'v1' });
      gmail.users.messages.send(
        {
          userId: 'me',
          resource: {
            raw: cor.makeMessage(to, from, subject, bodyText, bodyHtml)
          }
        },
        (err, res) => {
          if (err) return reject(new Error(err));
          resolve(res.data);
        }
      );
    });
  },

  /**
   * Remove 'UNREAD' label given an Id.
   *
   * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
   * @param {String} messageId Message unique identifier.
   */
  markAsRead: (auth, messageId) => {
    return new Promise(function(resolve, reject) {
      const gmail = google.gmail({ auth: auth, version: 'v1' });
      gmail.users.messages.modify(
        {
          userId: 'me',
          id: messageId,
          resource: {
            addLabelIds: [],
            removeLabelIds: ['UNREAD']
          }
        },
        (err, res) => {
          if (err) return reject(new Error(err));
          resolve();
        }
      );
    });
  }
};

module.exports = cor;
