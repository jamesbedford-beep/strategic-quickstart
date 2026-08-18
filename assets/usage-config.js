/* Optional team register: a record of what this tool has been used for, so you
   can see "used for X in the water team, Y in nutrition" rather than guessing.

   Off until a form URL is filled in below, and even then nothing is ever sent
   automatically. The register panel appears next to Export with the exact fields
   it would record, and only sends when someone presses the button. That is
   deliberate: silent telemetry would contradict what the homepage promises, and
   a register nobody knows about is worse than no register.

   What it records: project title, template, which documents, the timeline
   length, and an optional team or program. Never any document content, and never
   what anyone typed into the charter, scope, risks or notes.

   To switch it on:
     1. Make a Google Form with these questions, in this order, all short answer
        except the last: What / Team or program / Template / Documents /
        Timeline. In Settings turn off "collect email addresses" and, if it is a
        Workspace form, turn off "restrict to users in your organization", so
        nobody needs to sign in.
     2. Open the live form, view source, and find the five entry ids
        (they look like entry.123456789). Paste them below in the same order.
     3. Put the form's action URL in postUrl: it is the /viewform URL with
        /viewform replaced by /formResponse.
     4. To read the register, link the form to a Google Sheet.

   Both values here are meant to be public, so they are safe in a public repo. */
(function (SIK) {
  'use strict';

  SIK.usageConfig = {
    /* .../formResponse, not /viewform */
    postUrl: '',

    /* the five entry ids, in this order */
    fields: {
      what: '',
      team: '',
      template: '',
      documents: '',
      timeline: ''
    }
  };
})(window.SIK = window.SIK || {});
