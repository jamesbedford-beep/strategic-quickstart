# Making Team notes work without a login

By default the Team notes tab reads and writes the GitHub issues on this repo.
Reading needs nothing, but **posting needs a GitHub account**, which most people
do not have. Putting a Google Form in front of it removes that: anyone with the
link can add a note, no sign-in.

Four steps, about four minutes, no code.

## 1. Create the form

A new Google Form. Suggested questions, though the page adapts to whatever you
use, so change them freely:

| Question | Type |
| --- | --- |
| Title | Short answer |
| What is awkward or missing today | Paragraph |
| What you would like instead | Paragraph |
| Which document or step it affects | Short answer |
| How much it matters | Multiple choice: nice to have / would save real time / blocking me |
| Your name (optional) | Short answer |

Put **Title** first. The page treats the first question as the note's heading and
lists the rest underneath it.

## 2. Turn off anything that forces a sign-in

In the form's **Settings**:

- **Collect email addresses:** off
- **Limit to 1 response:** off
- If the form was created in a Google Workspace account, open **Responses ->
  Restrict to users in your organization** and switch it **off**

That last one is the setting that otherwise quietly forces a login, which is the
whole thing you are trying to avoid.

## 3. Copy the two URLs

**The form URL.** Send -> the link icon (🔗) -> **untick Shorten URL** -> copy.
It should look like:

```
https://docs.google.com/forms/d/e/1FAIpQLSd..../viewform
```

Use the long one. A `forms.gle` short link does not embed reliably.

**The responses URL.** On the form's **Responses** tab, link it to a Google
Sheet. Then in that sheet: **File -> Share -> Publish to web**, choose the
response tab, choose **Comma-separated values (.csv)**, and **Publish**. Copy
that URL. It looks like:

```
https://docs.google.com/spreadsheets/d/e/2PACX-1vQ..../pub?gid=0&single=true&output=csv
```

## 4. Paste them in and push

Edit `assets/notes-config.js`:

```js
formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSd..../viewform',
csvUrl:  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ..../pub?output=csv',
```

Commit and push. GitHub Pages rebuilds in about a minute and the tab switches
over on its own: the setup panel disappears, "Add a note" opens the form inline,
and notes render from the sheet.

## If notes do not load

The published-CSV endpoint occasionally refuses cross-origin reads. If the tab
says it could not read the sheet, use the alternative endpoint instead. Share the
sheet as **Anyone with the link -> Viewer**, then use:

```
https://docs.google.com/spreadsheets/d/SHEET_ID/gviz/tq?tqx=out:csv&sheet=Form%20Responses%201
```

`SHEET_ID` is the long id in the sheet's normal edit URL. Match `sheet=` to the
response tab's actual name.

## Worth knowing

- **Notes are public.** Anything submitted is readable by anyone who opens the
  page. It is a suggestion box, not a place for anything sensitive. Say so to the
  team.
- **The form is publicly writable**, so in principle it can be spammed. For a
  link shared internally this is unlikely to matter, and you can turn the form
  off or switch back to GitHub by blanking the two URLs.
- **Nothing here is secret.** Both URLs are meant to be public, which is why they
  can sit in a public repo with no risk.
- **The Build tab is unaffected** and still makes no network calls at all.
