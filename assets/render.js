/* Renderers. Narrative documents are built as block arrays and rendered to
   Markdown or to Word-compatible HTML. Sheets are rendered to a preview table. */
(function (SIK) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* inline **bold**, *italic*, `code`, [text](url) -> html */
  function inline(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }

  /* ---------- blocks -> markdown ---------- */
  function toMarkdown(blocks) {
    var out = [];
    blocks.forEach(function (b) {
      if (!b) return;
      if (b.h1) out.push('# ' + b.h1);
      else if (b.h2) out.push('## ' + b.h2);
      else if (b.h3) out.push('### ' + b.h3);
      else if (b.p) out.push(b.p);
      else if (b.ul) out.push(b.ul.map(function (i) { return '- ' + i; }).join('\n'));
      else if (b.ol) out.push(b.ol.map(function (i, n) { return (n + 1) + '. ' + i; }).join('\n'));
      else if (b.quote) out.push(b.quote.split('\n').map(function (l) { return '> ' + l; }).join('\n'));
      else if (b.hr) out.push('---');
      else if (b.meta) out.push(b.meta.map(function (m) { return '**' + m[0] + ':** ' + m[1]; }).join('  \n'));
      else if (b.table) {
        /* the whole table is one block: a blank line anywhere inside it
           breaks table rendering in every Markdown viewer */
        var t = b.table;
        var lines = ['| ' + t.head.join(' | ') + ' |',
          '|' + t.head.map(function () { return ' --- '; }).join('|') + '|'];
        t.rows.forEach(function (r) {
          lines.push('| ' + r.map(function (c) {
            return String(c == null ? '' : c).replace(/\|/g, '\\|').replace(/\n/g, ' ');
          }).join(' | ') + ' |');
        });
        out.push(lines.join('\n'));
      } else if (b.checklist) {
        out.push(b.checklist.map(function (i) { return '- [ ] ' + i; }).join('\n'));
      }
    });
    return out.join('\n\n') + '\n';
  }

  /* ---------- blocks -> html body ---------- */
  function toHtmlBody(blocks) {
    var out = [];
    blocks.forEach(function (b) {
      if (!b) return;
      if (b.h1) out.push('<h1>' + inline(b.h1) + '</h1>');
      else if (b.h2) out.push('<h2>' + inline(b.h2) + '</h2>');
      else if (b.h3) out.push('<h3>' + inline(b.h3) + '</h3>');
      else if (b.p) out.push('<p>' + inline(b.p) + '</p>');
      else if (b.ul) out.push('<ul>' + b.ul.map(function (i) { return '<li>' + inline(i) + '</li>'; }).join('') + '</ul>');
      else if (b.ol) out.push('<ol>' + b.ol.map(function (i) { return '<li>' + inline(i) + '</li>'; }).join('') + '</ol>');
      else if (b.checklist) out.push('<ul class="check">' + b.checklist.map(function (i) { return '<li>' + inline(i) + '</li>'; }).join('') + '</ul>');
      else if (b.quote) out.push('<blockquote>' + inline(b.quote) + '</blockquote>');
      else if (b.hr) out.push('<hr/>');
      else if (b.meta) out.push('<p class="metablock">' + b.meta.map(function (m) {
        return '<strong>' + esc(m[0]) + ':</strong> ' + inline(String(m[1]));
      }).join('<br/>') + '</p>');
      else if (b.table) {
        var t = b.table;
        out.push('<table><thead><tr>' + t.head.map(function (h) { return '<th>' + inline(h) + '</th>'; }).join('') +
          '</tr></thead><tbody>' + t.rows.map(function (r) {
            return '<tr>' + r.map(function (c) { return '<td>' + inline(String(c == null ? '' : c)) + '</td>'; }).join('') + '</tr>';
          }).join('') + '</tbody></table>');
      }
    });
    return out.join('\n');
  }

  function toHtmlDoc(blocks, title) {
    return '<!doctype html>\n<html><head><meta charset="utf-8"><title>' + esc(title) + '</title>\n' +
      '<style>\n' +
      'body{font-family:Calibri,"Segoe UI",Arial,sans-serif;font-size:11pt;color:#1f2933;max-width:44em;margin:2.5em auto;padding:0 1.5em;line-height:1.5}\n' +
      'h1{font-size:19pt;margin:0 0 .2em}h2{font-size:13pt;margin:1.6em 0 .4em}h3{font-size:11pt;margin:1.2em 0 .3em}\n' +
      'p{margin:0 0 .7em}ul,ol{margin:0 0 .7em;padding-left:1.4em}li{margin:.15em 0}\n' +
      'table{border-collapse:collapse;width:100%;margin:.6em 0 1em;font-size:10pt}\n' +
      'th,td{border:1px solid #ced4da;padding:5px 7px;text-align:left;vertical-align:top}\n' +
      'th{background:#eef1f6;font-weight:600}\n' +
      'blockquote{margin:0 0 .8em;padding:.5em .9em;background:#f1f3f5;border-left:3px solid #3757c8;color:#4b5563}\n' +
      '.metablock{color:#4b5563;font-size:10pt}hr{border:0;border-top:1px solid #ced4da;margin:1.4em 0}\n' +
      'ul.check{list-style:none;padding-left:0}ul.check li:before{content:"\\2610  ";color:#6b7280}\n' +
      'code{font-family:Consolas,monospace;background:#f1f3f5;padding:1px 4px;border-radius:3px;font-size:10pt}\n' +
      '</style></head><body>\n' + toHtmlBody(blocks) + '\n</body></html>\n';
  }

  /* ---------- sheet -> preview table ---------- */
  var MAX_ROWS = 70, MAX_COLS = 34;

  function previewSheet(sheet) {
    var rows = (sheet.rows || []).slice(0, MAX_ROWS);
    var merges = {};          /* "r,c" -> span, plus covered flags */
    var covered = {};
    (sheet.merges || []).forEach(function (m) {
      var mm = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(m);
      if (!mm) return;
      var c1 = colIndex(mm[1]), r1 = +mm[2], c2 = colIndex(mm[3]), r2 = +mm[4];
      if (r1 !== r2) return;  /* preview handles single-row merges only */
      merges[r1 + ',' + c1] = c2 - c1 + 1;
      for (var c = c1 + 1; c <= c2; c++) covered[r1 + ',' + c] = true;
    });

    var html = '<table class="pv">';
    rows.forEach(function (row, ri) {
      var r = ri + 1;
      html += '<tr>';
      var cells = (row && row.cells) || [];
      var n = Math.min(Math.max(cells.length, 1), MAX_COLS);
      for (var ci = 0; ci < n; ci++) {
        var c = ci + 1;
        if (covered[r + ',' + c]) continue;
        var cell = cells[ci];
        var span = merges[r + ',' + c];
        var cls = 'pv-' + ((cell && cell.s) || 'base');
        var txt = cell ? (cell.f ? '' : SIK.sheet.cellText(cell)) : '';
        if (cell && cell.f) txt = '=';
        html += '<td class="' + cls + '"' + (span > 1 ? ' colspan="' + span + '"' : '') + '>' +
          esc(txt) + '</td>';
      }
      html += '</tr>';
    });
    html += '</table>';
    var truncated = (sheet.rows || []).length > MAX_ROWS;
    if (truncated) html += '<p class="pv-note">Preview shows the first ' + MAX_ROWS +
      ' rows of ' + sheet.rows.length + '. The export has all of them.</p>';
    return html;
  }

  function colIndex(letters) {
    var n = 0;
    for (var i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
    return n;
  }

  SIK.render = {
    toMarkdown: toMarkdown, toHtmlDoc: toHtmlDoc, toHtmlBody: toHtmlBody,
    previewSheet: previewSheet, esc: esc, inline: inline
  };
})(window.SIK = window.SIK || {});
