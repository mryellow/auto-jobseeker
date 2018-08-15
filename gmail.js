const { google } = require('googleapis');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send'
];

class Gmail {
  constructor(credentials) {
    this.credentials = credentials.web;

    const { client_secret, client_id, redirect_uris } = this.credentials;
    // FIXME: Use current host as redirect URL.
    this.client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );
  }

  /**
   * Encode email message
   * @param {String} message Text to encode
   */
  encodeMessage(message) {
    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  /**
   * Decode email message
   * @param {String} message Text to decode
   */
  decodeMessage(message) {
    return Buffer.from(message, 'base64')
      .toString('ascii')
      .replace(/\-/g, '+')
      .replace(/\_/g, '/');
  }

  /**
   * Retrieve URL for authorisation
   */
  getAuthUrl() {
    const authUrl = this.client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    });
    return authUrl;
  }

  /**
   * Convert code into oAuth token
   * @param {String} code Code returned to callback
   */
  getToken(code) {
    return new Promise((resolve, reject) => {
      this.client.getToken(code, (err, token) => {
        if (err) return reject(new Error('Failed retrieving access token'));
        //this.client.setCredentials(token);
        resolve(token);
      });
    });
  }

  /**
   * Lists the labels in the user's account.
   *
   * @param {Object} token User's oAuth token
   */
  listLabels(token) {
    return new Promise((resolve, reject) => {
      this.client.setCredentials(token);
      const gmail = google.gmail({ auth: this.client, version: 'v1' });
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
  }

  /**
   * Lists the messages in the user's account with matching labels.
   *
   * @param {Object} token User's oAuth token
   * @param {Array} labelIds List of labels to filter.
   */
  listMessages(token, labelIds) {
    return new Promise((resolve, reject) => {
      this.client.setCredentials(token);
      const gmail = google.gmail({ auth: this.client, version: 'v1' });
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
  }

  /**
   * Retrieve message contents given an Id.
   *
   * @param {Object} token User's oAuth token
   * @param {String} messageId Message unique identifier.
   */
  getMessage(token, messageId) {
    return new Promise((resolve, reject) => {
      this.client.setCredentials(token);
      const gmail = google.gmail({ auth: this.client, version: 'v1' });
      gmail.users.messages.get(
        {
          userId: 'me',
          id: messageId
        },
        (err, res) => {
          if (err) return reject(new Error(err));

          let body = {};
          for (let j = 0; j < res.data.payload.parts.length; j++) {
            body[res.data.payload.parts[j].mimeType] = this.decodeMessage(
              res.data.payload.parts[j].body.data
            );
          }
          res.data.decoded = body;
          resolve(res.data);
        }
      );
    });
  }

  /**
   * Create an encoded email message.
   *
   * @param {String} to To email address
   * @param {String} from From email address
   * @param {String} subject Message subject.
   * @param {String} bodyText Message body text/plain.
   * @param {String} bodyHtml Message body text/html.
   */
  makeMessage(to, from, subject, bodyText, bodyHtml) {
    // TODO: Add some random to boundary.
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

    return this.encodeMessage(str);
  }

  /**
   * Retrieve message contents given an Id.
   *
   * @param {Object} token User's oAuth token
   * @param {String} to To email address
   * @param {String} from From email address
   * @param {String} subject Message subject.
   * @param {String} bodyText Message body text/plain.
   * @param {String} bodyHtml Message body text/html.
   */
  sendMessage(token, to, from, subject, bodyText, bodyHtml) {
    return new Promise((resolve, reject) => {
      this.client.setCredentials(token);
      const gmail = google.gmail({ auth: this.client, version: 'v1' });
      gmail.users.messages.send(
        {
          userId: 'me',
          resource: {
            raw: this.makeMessage(to, from, subject, bodyText, bodyHtml)
          }
        },
        (err, res) => {
          if (err) return reject(new Error(err));
          resolve(res.data);
        }
      );
    });
  }

  /**
   * Remove 'UNREAD' label given an Id.
   *
   * @param {Object} token User's oAuth token
   * @param {String} messageId Message unique identifier.
   */
  markAsRead(token, messageId) {
    return new Promise((resolve, reject) => {
      this.client.setCredentials(token);
      const gmail = google.gmail({ auth: this.client, version: 'v1' });
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
}

// FIXME: `export default Gmail;` requires bable.
module.exports = Gmail;
