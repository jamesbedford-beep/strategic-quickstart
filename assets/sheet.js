/* Sheet model -> .xlsx (SpreadsheetML) or .csv. No dependencies.
   An .xlsx is a ZIP of XML parts; we write the minimum Excel accepts,
   plus styles, frozen panes, autofilter, dropdown validation, formulas
   and one color scale.

   Sheet model:
   { name, cols:[{w}], freeze:{row,col}, rows:[{h, cells:[cell|null]}],
     merges:['A1:F1'], validations:[{ref, values:[]}],
     colorScale:{ref, min, mid, max}, autoFilter:'A4:G40' }

   Cell: { v, s, f }
     v  value (string | number | Date)
     s  style name from STYLES below
     f  formula text without the leading '='  */
(function (SIK) {
  'use strict';

  var DAY = 86400000;

  /* ---------- style registry: name -> cellXfs index ---------- */
  var STYLES = {
    base: 0, bold: 1, title: 2, muted: 3,
    head: 4, headL: 5,
    cell: 6, cellC: 7, date: 8,
    phase: 9,
    bar: 10, barLight: 11,
    green: 12, amber: 13, red: 14, gray: 15,
    off: 16,
    headRot: 17,
    accent: 18, tiny: 19, num: 20, cellWeak: 21,
    milestone: 22, sub: 23,
    headRotToday: 24, headToday: 25, phaseDate: 26
  };

  var STYLES_XML =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="2">' +
      '<numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/>' +
      '<numFmt numFmtId="166" formatCode="#,##0"/>' +
    '</numFmts>' +
    '<fonts count="7">' +
      '<font><sz val="11"/><name val="Calibri"/><color rgb="FF1F2933"/></font>' +
      '<font><sz val="11"/><name val="Calibri"/><color rgb="FF1F2933"/><b/></font>' +
      '<font><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/><b/></font>' +
      '<font><sz val="10"/><name val="Calibri"/><color rgb="FF6B7280"/><i/></font>' +
      '<font><sz val="15"/><name val="Calibri"/><color rgb="FF1F2933"/><b/></font>' +
      '<font><sz val="11"/><name val="Calibri"/><color rgb="FF3757C8"/><b/></font>' +
      '<font><sz val="9"/><name val="Calibri"/><color rgb="FF6B7280"/></font>' +
    '</fonts>' +
    '<fills count="12">' +
      '<fill><patternFill patternType="none"/></fill>' +
      '<fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF1F2933"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFEEF1F6"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF3757C8"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFF1F3F5"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFE6F4EA"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFFDF0DC"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFFBE7E7"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFECEEF0"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF9BB0E8"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFE8ECFB"/><bgColor indexed="64"/></patternFill></fill>' +
    '</fills>' +
    '<borders count="3">' +
      '<border><left/><right/><top/><bottom/><diagonal/></border>' +
      '<border>' +
        '<left style="thin"><color rgb="FFDDE1E6"/></left><right style="thin"><color rgb="FFDDE1E6"/></right>' +
        '<top style="thin"><color rgb="FFDDE1E6"/></top><bottom style="thin"><color rgb="FFDDE1E6"/></bottom>' +
        '<diagonal/></border>' +
      '<border><left/><right/><top/><bottom style="thin"><color rgb="FFCED4DA"/></bottom><diagonal/></border>' +
    '</borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="27">' +
      /* 0 base   */ '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      /* 1 bold   */ '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
      /* 2 title  */ '<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
      /* 3 muted  */ '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
      /* 4 head   */ '<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
      /* 5 headL  */ '<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>' +
      /* 6 cell   */ '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
      /* 7 cellC  */ '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      /* 8 date   */ '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      /* 9 phase  */ '<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>' +
      /*10 bar    */ '<xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>' +
      /*11 barLite*/ '<xf numFmtId="0" fontId="0" fillId="10" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>' +
      /*12 green  */ '<xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      /*13 amber  */ '<xf numFmtId="0" fontId="0" fillId="7" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      /*14 red    */ '<xf numFmtId="0" fontId="0" fillId="8" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      /*15 gray   */ '<xf numFmtId="0" fontId="0" fillId="9" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      /*16 off    */ '<xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>' +
      /*17 headRot*/ '<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment textRotation="90" horizontal="center" vertical="bottom"/></xf>' +
      /*18 accent */ '<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
      /*19 tiny   */ '<xf numFmtId="0" fontId="6" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
      /*20 num    */ '<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      /*21 weak   */ '<xf numFmtId="0" fontId="0" fillId="11" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
      /*22 mstone */ '<xf numFmtId="0" fontId="1" fillId="10" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      /*23 sub    */ '<xf numFmtId="0" fontId="1" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"/>' +
      /*24 hRotTdy*/ '<xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment textRotation="90" horizontal="center" vertical="bottom"/></xf>' +
      /*25 headTdy*/ '<xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
      /*26 phsDate*/ '<xf numFmtId="164" fontId="1" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';

  /* ---------- helpers ---------- */
  function colName(n) {           // 1 -> A, 27 -> AA
    var s = '';
    while (n > 0) { var r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - 1 - r) / 26; }
    return s;
  }

  function esc(s) {
    return String(s)
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function serial(d) {            // Excel date serial (1900 system)
    return Math.round((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) -
      Date.UTC(1899, 11, 30)) / DAY);
  }

  function sheetXml(sheet) {
    var rows = sheet.rows || [];
    var maxCol = 1;
    rows.forEach(function (r) { if (r && r.cells) maxCol = Math.max(maxCol, r.cells.length); });

    var x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<dimension ref="A1:' + colName(maxCol) + Math.max(1, rows.length) + '"/>' +
      '<sheetViews><sheetView workbookViewId="0" showGridLines="0">';

    var fz = sheet.freeze;
    if (fz && (fz.row || fz.col)) {
      x += '<pane' +
        (fz.col ? ' xSplit="' + fz.col + '"' : '') +
        (fz.row ? ' ySplit="' + fz.row + '"' : '') +
        ' topLeftCell="' + colName((fz.col || 0) + 1) + ((fz.row || 0) + 1) + '"' +
        ' activePane="bottomRight" state="frozen"/>';
    }
    x += '</sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/>';

    if (sheet.cols && sheet.cols.length) {
      x += '<cols>';
      sheet.cols.forEach(function (c, i) {
        x += '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + (c.w || 10) +
          '" customWidth="1"' + (c.hidden ? ' hidden="1"' : '') + '/>';
      });
      x += '</cols>';
    }

    x += '<sheetData>';
    rows.forEach(function (row, ri) {
      if (!row) return;
      var r = ri + 1;
      x += '<row r="' + r + '"' + (row.h ? ' ht="' + row.h + '" customHeight="1"' : '') + '>';
      (row.cells || []).forEach(function (cell, ci) {
        if (cell === null || cell === undefined) return;
        var ref = colName(ci + 1) + r;
        var si = STYLES[cell.s];
        var sAttr = si ? ' s="' + si + '"' : '';

        if (cell.f) {
          x += '<c r="' + ref + '"' + sAttr + '><f>' + esc(cell.f) + '</f></c>';
          return;
        }
        var v = cell.v;
        if (v === null || v === undefined || v === '') {
          if (sAttr) x += '<c r="' + ref + '"' + sAttr + '/>';
          return;
        }
        if (v instanceof Date) {
          x += '<c r="' + ref + '"' + sAttr + '><v>' + serial(v) + '</v></c>';
        } else if (typeof v === 'number' && isFinite(v)) {
          x += '<c r="' + ref + '"' + sAttr + '><v>' + v + '</v></c>';
        } else {
          x += '<c r="' + ref + '"' + sAttr + ' t="inlineStr"><is><t xml:space="preserve">' +
            esc(v) + '</t></is></c>';
        }
      });
      x += '</row>';
    });
    x += '</sheetData>';

    /* order below is fixed by the schema: autoFilter, mergeCells, conditionalFormatting, dataValidations */
    if (sheet.autoFilter) x += '<autoFilter ref="' + sheet.autoFilter + '"/>';

    if (sheet.merges && sheet.merges.length) {
      x += '<mergeCells count="' + sheet.merges.length + '">';
      sheet.merges.forEach(function (m) { x += '<mergeCell ref="' + m + '"/>'; });
      x += '</mergeCells>';
    }

    if (sheet.colorScale) {
      var cs = sheet.colorScale;
      x += '<conditionalFormatting sqref="' + cs.ref + '">' +
        '<cfRule type="colorScale" priority="1"><colorScale>' +
        '<cfvo type="num" val="' + (cs.min != null ? cs.min : 1) + '"/>' +
        '<cfvo type="num" val="' + (cs.mid != null ? cs.mid : 10) + '"/>' +
        '<cfvo type="num" val="' + (cs.max != null ? cs.max : 25) + '"/>' +
        '<color rgb="FFE6F4EA"/><color rgb="FFFDF0DC"/><color rgb="FFF7BDBD"/>' +
        '</colorScale></cfRule></conditionalFormatting>';
    }

    var dvs = (sheet.validations || []).filter(function (d) {
      return d && d.ref && d.values && d.values.length &&
        ('"' + d.values.join(',') + '"').length <= 255;
    });
    if (dvs.length) {
      x += '<dataValidations count="' + dvs.length + '">';
      dvs.forEach(function (d) {
        x += '<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1"' +
          ' sqref="' + d.ref + '"><formula1>' + esc('"' + d.values.join(',') + '"') +
          '</formula1></dataValidation>';
      });
      x += '</dataValidations>';
    }

    return x + '</worksheet>';
  }

  /* ---------- xlsx package ---------- */
  function toXlsx(sheets) {
    var files = [];
    var n = sheets.length;

    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
    for (var i = 1; i <= n; i++) {
      ct += '<Override PartName="/xl/worksheets/sheet' + i +
        '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    }
    ct += '</Types>';
    files.push({ name: '[Content_Types].xml', data: ct });

    files.push({
      name: '_rels/.rels',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>'
    });

    var wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"' +
      ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>';
    sheets.forEach(function (s, i) {
      /* sheet names: 31 chars max, no : \ / ? * [ ] */
      var nm = (s.name || ('Sheet' + (i + 1))).replace(/[:\\\/\?\*\[\]]/g, ' ').slice(0, 31);
      wb += '<sheet name="' + esc(nm) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
    });
    wb += '</sheets><calcPr calcId="0" fullCalcOnLoad="1"/></workbook>';
    files.push({ name: 'xl/workbook.xml', data: wb });

    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
    sheets.forEach(function (s, i) {
      rels += '<Relationship Id="rId' + (i + 1) +
        '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"' +
        ' Target="worksheets/sheet' + (i + 1) + '.xml"/>';
    });
    rels += '<Relationship Id="rId' + (n + 1) +
      '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>';
    files.push({ name: 'xl/_rels/workbook.xml.rels', data: rels });
    files.push({ name: 'xl/styles.xml', data: STYLES_XML });

    sheets.forEach(function (s, i) {
      files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: sheetXml(s) });
    });

    return SIK.zip(files);
  }

  /* ---------- csv ---------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function isoDate(d) {
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }

  function cellText(cell) {
    if (!cell) return '';
    if (cell.f) return '=' + cell.f;
    var v = cell.v;
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return isoDate(v);
    return String(v);
  }

  function toCsv(sheet) {
    return (sheet.rows || []).map(function (row) {
      if (!row) return '';
      return (row.cells || []).map(function (c) {
        var t = cellText(c);
        return /[",\r\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
      }).join(',');
    }).join('\r\n');
  }

  SIK.sheet = {
    toXlsx: toXlsx, toCsv: toCsv,
    colName: colName, cellText: cellText, isoDate: isoDate, STYLES: STYLES
  };
})(window.SIK = window.SIK || {});
