## Auto-Jobseeker

Taking the onerous data-entry pain out of compliance forms.

### Mode of action

- Checks for `UNREAD` emails with `AutoJobseeker` label.
- Crafts the appropriate subject line `FWD Job Application Confirmation - JOBSEEKER_ID`
- Forwards email to `jobsearcheffort@employment.gov.au` from `JOBSEEKER_EMAIL`.

### Configuration

Configuration information may be provided by adding a local `.env` file.

```
JOBSEEKER_MODE=test
JOBSEEKER_ID=XXX
JOBSEEKER_TO=jobsearcheffort@employment.gov.au
JOBSEEKER_FROM=autojobseeker@example.com
```

### Setup

- Create a new ["oAuth client ID"](https://console.developers.google.com/apis/credentials).
- Download the credentials JSON and copy it into `GOOGLE_CREDS` environment.
- Create a label `AutoJobseeker` and filter messages into this label.
- Run `node .` on this repository periodically.
