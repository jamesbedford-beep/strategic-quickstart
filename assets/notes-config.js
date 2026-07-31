/* Where the Team notes tab reads and writes.

   The goal is that anyone can add a note without logging into anything. A static
   page cannot accept a post on its own, so writing goes to a Google Form set to
   "anyone can respond", and reading comes from that form's response sheet
   published to the web as CSV. No account, no key, nothing secret in here: both
   URLs below are public by design.

   Fill in the two URLs and the tab switches from the GitHub fallback to the
   no-login version automatically. Step by step instructions are in
   NOTES-SETUP.md, and the tab shows them on screen while these are blank.

   Nothing here is required for the Build tab, which never touches the network. */
(function (SIK) {
  'use strict';

  SIK.notesConfig = {
    /* 1. The form's long URL, ending in /viewform.
          Google Forms -> Send -> the link icon -> untick "Shorten URL".
          Leave the response sheet's questions in whatever shape you like: the
          page reads the column headers from the CSV rather than assuming them. */
    formUrl: '',

    /* 2. The response sheet published as CSV.
          Sheet -> File -> Share -> Publish to web -> the response tab ->
          Comma-separated values (.csv) -> Publish. */
    csvUrl: '',

    /* Used only while the two URLs above are blank, so the tab still works today
       for anyone who does have a GitHub account. */
    repo: 'jamesbedford-beep/strategic-quickstart'
  };
})(window.SIK = window.SIK || {});
