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

  getAuthUrl() {
    const authUrl = this.client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    });
    return authUrl;
  }

  getToken(code) {
    return new Promise((resolve, reject) => {
      this.client.getToken(code, (err, token) => {
        if (err) return reject(new Error('Error retrieving access token'));
        //this.client.setCredentials(token);
        resolve(token);
      });
    });
  }
}

// FIXME: `export default Gmail;` requires bable.
module.exports = Gmail;
