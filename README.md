## Auto-Jobseeker

Taking the onerous data-entry pain out of compliance forms.

### Mode of action

- Checks for `UNREAD` emails with `AutoJobseeker` label.
- Crafts the appropriate subject line `FW Job Application Confirmation - ID`
- Forwards email to `jobsearcheffort@employment.gov.au`.
- Removes `UNREAD` label.

### Configuration

Configuration information may be provided by adding a local `.env` file.

```
DBNAME=jobseekers
JOBSEEKER_TO=jobsearcheffort@employment.gov.au
GOOGLE_CREDS={"web":{"client_id":"XXXX"...
```

### Setup

- Create a new ["oAuth client ID"](https://console.developers.google.com/apis/credentials).
- Download the credentials JSON and copy it into `GOOGLE_CREDS` environment.
- Create a label `AutoJobseeker` and filter messages into this label.
- Run `node server.js` and hit http://localhost:3000/ to add users.
- Run `node .` on this repository periodically.
