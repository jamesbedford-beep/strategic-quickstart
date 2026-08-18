/* Turning "not quite right" into actual changes.

   The box on the last screen used to only record a comment. People reasonably
   expect typing "add a decision log and put funding risk first" to change the
   files they are about to download, so it now does.

   There is no model here to interpret free text, so this reads a defined set of
   intents with plain regular expressions, and it shows the user exactly what it
   understood before applying anything. Anything it cannot act on is listed as not
   understood rather than quietly dropped: a parser that silently ignores half a
   sentence is worse than one that admits the gap.

   Output is declarative, so this file never touches state. It returns
   { changes: [{type, value, label}], noops: [string], unmatched: [string] }
   and app.js is what applies it. */
(function (SIK) {
  'use strict';

  /* longest phrases first, so "project plan" wins over "plan" */
  var DOC_WORDS = [
    ['stakeholder map', 'stakeholders'], ['stakeholders', 'stakeholders'],
    ['risk register', 'risks'],
    ['decision log', 'decisions'], ['prolog', 'decisions'], ['decision record', 'decisions'],
    ['raci matrix', 'raci'], ['responsibility matrix', 'raci'], ['raci', 'raci'],
    ['project charter', 'charter'], ['charter', 'charter'],
    ['gantt chart', 'gantt'], ['gantt', 'gantt'],
    ['project plan', 'plan'], ['workplan', 'plan'], ['work plan', 'plan'],
    ['status report', 'status'], ['status update', 'status'],
    ['kickoff agenda', 'kickoff'], ['kick off agenda', 'kickoff'], ['kickoff', 'kickoff'],
    ['one pager', 'onepager'], ['one-pager', 'onepager'], ['onepager', 'onepager'],
    ['exec summary', 'onepager'], ['executive summary', 'onepager']
  ];

  var MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july',
    'august', 'september', 'october', 'november', 'december'];

  function docFrom(text) {
    var t = text.toLowerCase();
    for (var i = 0; i < DOC_WORDS.length; i++) {
      if (t.indexOf(DOC_WORDS[i][0]) >= 0) return DOC_WORDS[i][1];
    }
    return null;
  }

  function docName(id) {
    var d = (SIK.templates.DOCS || []).filter(function (x) { return x.id === id; })[0];
    return d ? d.name : id;
  }

  function tidy(s) {
    return String(s || '')
      .replace(/^[\s"'“]+|[\s"'”.,;]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  /* Only split where a new instruction clearly begins. An earlier version treated
     every verb as a boundary, which chopped "the risks should start with funding"
     in half at "start". Newlines, semicolons and full stops always separate; "and"
     or a comma separate only before one of these openers. */
  /* "no" is deliberately absent here: as a split boundary it chopped
     "has no capacity" in half. It is still read as a removal when it opens an
     instruction, which is the only place it is unambiguous. */
  var OPENER = '(?:also\\s+)?(?:add|include|drop|remove|delete|leave out|lose|plus)\\b';

  function split(text) {
    var out = [];
    String(text || '').split(/[\n;]+|\.(?:\s+|$)/).forEach(function (part) {
      var re = new RegExp('(?:,\\s*|\\s+)(?:and\\s+|then\\s+)?(?=' + OPENER + ')', 'gi');
      part.split(re).forEach(function (bit) {
        var b = tidy(bit);
        if (b) out.push(b);
      });
    });
    return out;
  }

  /* strip the grammar that reads oddly when replayed as "needed to ..." */
  function cleanAsk(s) {
    return tidy(String(s || '')
      .replace(/^(?:who|which|that|they|she|he|it)\s+/i, '')
      .replace(/^(?:will|would|should|must|needs? to|has to|is|are)\s+/i, '')
      .replace(/^(?:be\s+)?/i, ''));
  }

  function parse(text, ctx) {
    ctx = ctx || {};
    var changes = [], unmatched = [], noops = [];
    var have = ctx.docs || [];

    function push(type, value, label) { changes.push({ type: type, value: value, label: label }); }

    split(text).forEach(function (raw) {
      var t = raw.toLowerCase();
      var m;

      /* ---- a risk, before documents, so "a risk that X" is not read as the
              risk register. The lookahead keeps "add a risk register" out. ---- */
      m = raw.match(/^(?:add\s+|include\s+)?(?:a\s+)?risks?(?!\s+register)(?:\s+(?:of|about|that|:|is))?\s+(.+)$/i) ||
          raw.match(/^(?:i(?:'m| am)\s+)?(?:also\s+)?worried\s+(?:about\s+|that\s+)?(.+)$/i) ||
          raw.match(/^(?:the\s+)?risks?\s+should\s+(?:start|begin|lead)\s+with\s+(.+)$/i) ||
          raw.match(/^(?:put|move)\s+(.+?)\s+(?:first|at the top)(?:\s+of the risk(?:s| register)?)?$/i);
      if (m) {
        var risk = cap(tidy(m[1]));
        if (risk) { push('addRisk', risk, 'Put "' + risk + '" at the top of the risk register'); return; }
      }

      /* ---- documents in or out ---- */
      if (/^(?:also\s+)?(?:add|include|put in|throw in|we(?:'ll| will)? need|i(?:'ll| will)? need|we need|i need)\b/i.test(t)) {
        var addId = docFrom(t);
        if (addId) {
          if (have.indexOf(addId) >= 0) noops.push('The ' + docName(addId).toLowerCase() + ' is already included');
          else push('addDoc', addId, 'Add the ' + docName(addId).toLowerCase() + ' to the set');
          return;
        }
      }
      if (/^(?:drop|remove|delete|lose|leave out|no|do ?n[o']?t (?:need|want)|without|skip)\b/i.test(t)) {
        var rmId = docFrom(t);
        if (rmId) {
          if (have.indexOf(rmId) < 0) noops.push('The ' + docName(rmId).toLowerCase() + ' was not included anyway');
          else push('removeDoc', rmId, 'Leave out the ' + docName(rmId).toLowerCase());
          return;
        }
      }

      /* ---- scope: capture only the thing, not the clause that labels it ---- */
      m = raw.match(/^(?:out of scope|explicitly out)\s*[:\-]\s*(.+)$/i) ||
          raw.match(/^(?:add\s+|include\s+|put\s+)?(.+?)\s+(?:is|are|should be|stays?|goes?)\s+(?:explicitly\s+)?out of scope$/i);
      if (m) {
        var outv = cap(tidy(m[1]));
        if (outv) { push('addOutScope', outv, 'Add "' + outv + '" to what is explicitly out of scope'); return; }
      }
      m = raw.match(/^in scope\s*[:\-]\s*(.+)$/i) ||
          raw.match(/^(?:add\s+|include\s+|put\s+)?(.+?)\s+(?:is|are|should be|stays?|goes?)\s+in scope$/i);
      if (m) {
        var inv = cap(tidy(m[1]));
        if (inv) { push('addScope', inv, 'Add "' + inv + '" to what is in scope'); return; }
      }

      /* ---- cadence, before people, so "updates should be weekly" is not a name ---- */
      if (/\b(weekly|fortnightly|biweekly|every two weeks|monthly)\b/i.test(t) &&
          /\b(update|report|check ?in|cadence|status)/i.test(t)) {
        var word = /fortnight|biweekly|every two weeks/i.test(t) ? 'Fortnightly'
          : (/monthly/i.test(t) ? 'Monthly' : 'Weekly');
        push('setCadence', word, 'Set updates to ' + word.toLowerCase());
        return;
      }

      /* ---- people ---- */
      m = raw.match(/^(?:add|include|involve)\s+([A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+)?)\s*(?:,|\bas\b|\bto\b|\bwho\b|\bfor\b|\bshould\b|\bneeds?\b)?\s*(.*)$/) ||
          raw.match(/^([A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+)?)\s+(?:should|needs? to|must|has to|will)\s+(.+)$/);
      if (m && m[1]) {
        var person = tidy(m[1]);
        var ask = cleanAsk(m[2]);
        push('addPerson', { name: person, ask: ask },
          'Add ' + person + ' to the team' + (ask ? ', needed to ' + ask : ''));
        return;
      }

      /* ---- stages ---- */
      m = raw.match(/^(?:add|include)\s+(?:a\s+)?(?:stage|phase)\s+(?:called\s+|named\s+|for\s+)?(.+)$/i) ||
          raw.match(/^(?:add|include)\s+(?:a\s+)?(.+?)\s+(?:stage|phase)$/i);
      if (m) {
        var stage = cap(tidy(m[1]));
        if (stage) { push('addStage', stage, 'Add a stage called "' + stage + '" at the end'); return; }
      }

      /* ---- overall length ---- */
      m = raw.match(/\b(?:make it|change it to|set it to|over|across|about|run it for)\s+(\d+)\s*(days?|weeks?|months?)\b/i) ||
          raw.match(/^(\d+)\s*(days?|weeks?|months?)\s*(?:long|total|in total)?$/i);
      if (m) {
        var n = parseInt(m[1], 10), unit = m[2].toLowerCase();
        var days = /month/.test(unit) ? Math.round(n * 30.4) : (/week/.test(unit) ? n * 7 : n);
        if (days > 0 && days <= 1460) {
          push('setLength', days, 'Stretch the whole thing to ' + n + ' ' + unit);
          return;
        }
      }

      /* ---- start date ---- */
      m = raw.match(/\bstart(?:s|ing)?\s+(?:in|on|from)?\s*(\d{4}-\d{2}-\d{2})\b/i);
      if (m) { push('setStart', m[1], 'Start on ' + m[1]); return; }
      m = t.match(/\bstart(?:s|ing)?\s+(?:in|from)\s+([a-z]+)\b/);
      if (m) {
        var mi = MONTHS.indexOf(m[1]);
        if (mi >= 0) {
          var now = SIK.plan.today();
          var yr = now.getUTCFullYear() + (mi < now.getUTCMonth() ? 1 : 0);
          push('setStart', SIK.plan.iso(new Date(Date.UTC(yr, mi, 1))),
            'Start at the beginning of ' + cap(m[1]) + ' ' + yr);
          return;
        }
      }

      /* ---- dates to plan around ---- */
      m = raw.match(/^(?:plan around|work around|avoid|watch out for|note)\s+(.+)$/i) ||
          raw.match(/^(.+?)\s+(?:is|are)\s+(?:a\s+)?(?:holiday|closed|out|on leave|unavailable|away)$/i);
      if (m) {
        var around = cap(tidy(m[1]).replace(/^the\s+/i, ''));
        if (around) { push('addAround', around, 'Note "' + around + '" as something to plan around'); return; }
      }

      /* ---- rename ---- */
      m = raw.match(/^(?:call it|rename it to|name it|title it)\s+(.+)$/i);
      if (m) {
        var title = tidy(m[1]);
        if (title) { push('rename', title, 'Rename it to "' + title + '"'); return; }
      }

      unmatched.push(raw);
    });

    return { changes: changes, noops: noops, unmatched: unmatched };
  }

  SIK.feedback = { parse: parse, docName: docName };
})(window.SIK = window.SIK || {});
