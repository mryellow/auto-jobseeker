## Auto-Jobseeker

Taking the onerous data-entry pain out of compliance forms.

### Mode of action

- Checks for `UNREAD` emails with `AutoJobseeker` label.
- Crafts the appropriate subject line `FW Job Application Confirmation - JOBSEEKER_ID`
- Forwards email to `jobsearcheffort@employment.gov.au` from `JOBSEEKER_EMAIL`.

### Configuration

Configuration information may be provided by adding a local `.env` file.

```
JOBSEEKER_MODE=test
JOBSEEKER_ID=XXX
JOBSEEKER_EMAIL=autojobseeker@example.com
```

### Setup

- Create a label `AutoJobseeker` and filter messages into this label.
- Run `node .` on this repository periodically.
