/* Pembuat file export laporan lembur: PDF (jsPDF + autotable) dan Excel (ExcelJS).
   Library dimuat dari CDN saat tombol diklik, jadi halaman tetap ringan. */
var EXPORT_LIB = {
  jspdf: 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
  autotable: 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js',
  exceljs: 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'
};

var HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function hariDariKey(key) {
  var p = key.split('-');
  return HARI_ID[new Date(Date.UTC(+p[2], +p[1] - 1, +p[0])).getUTCDay()];
}
function periodeTeks(d) {
  return d.awal === d.akhir ? hariDariKey(d.awal) + ', ' + d.awal : d.awal + ' s/d ' + d.akhir;
}
function angkaID(n) { return Math.round(n).toLocaleString('id-ID'); }
function jamTeks(n) { return String(Math.round(n * 100) / 100).replace('.', ','); }
function namaFileExport(d, opsi, ext) {
  var per = d.awal === d.akhir ? d.awal : d.awal + '_sd_' + d.akhir;
  return 'Laporan-' + (opsi.uang ? 'Lembur' : 'Kehadiran-Lembur') + '_' + per + '.' + ext;
}
function judulLaporan(opsi) { return opsi.uang ? 'Laporan Lembur' : 'Laporan Kehadiran Lembur'; }
function satuanTarif(d) { return d.set.mode === 'PER_JAM' ? '/jam' : '/lembur'; }
function jumlahOrang(d) { return d.rows.length; }
function porsiTotal(d) { return d.total.weekday + d.total.weekend; }

/* ---------- PDF ---------- */
function buatPdf(d, opsi, jsPDF) {
  var doc = new jsPDF({ unit: 'pt', format: 'a4' });
  var W = doc.internal.pageSize.getWidth();
  var H = doc.internal.pageSize.getHeight();
  var M = 40;
  var HITAM = [26, 31, 43], ABU = [61, 68, 81], GARIS = [201, 206, 216];
  var y = 52;

  doc.setTextColor.apply(doc, HITAM);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text(judulLaporan(opsi), M, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text('Periode: ' + periodeTeks(d), W - M, y - 8, { align: 'right' });
  doc.text('Dicetak: ' + d.dicetak + ' WIB', W - M, y + 6, { align: 'right' });
  if (d.perusahaan) { doc.setFontSize(11); doc.text(d.perusahaan, M, y + 16); }
  y += 26;
  doc.setDrawColor.apply(doc, HITAM); doc.setLineWidth(1.5); doc.line(M, y, W - M, y);
  y += 18;

  if (opsi.uang) {
    doc.setFontSize(9); doc.setTextColor.apply(doc, ABU);
    var catatan = 'Tarif: weekday Rp ' + angkaID(d.set.tarifWeekday) + ' ' + satuanTarif(d) +
      ' · weekend Rp ' + angkaID(d.set.tarifWeekend) + ' ' + satuanTarif(d) +
      '. Tanda (M) = manajemen: dapat makan, tanpa uang lembur.';
    var baris = doc.splitTextToSize(catatan, W - 2 * M);
    doc.text(baris, M, y);
    y += baris.length * 12 + 8;
    doc.setTextColor.apply(doc, HITAM);
  }

  var kartu = [['Total porsi', String(porsiTotal(d))], ['Weekday / Weekend', d.total.weekday + ' / ' + d.total.weekend], ['Jumlah orang', String(jumlahOrang(d))]];
  if (opsi.uang) kartu.push(['Total dana lembur', 'Rp ' + angkaID(d.total.dana)]);
  var gap = 8, bw = (W - 2 * M - gap * (kartu.length - 1)) / kartu.length, bh = 46;
  doc.setDrawColor.apply(doc, GARIS); doc.setLineWidth(1);
  kartu.forEach(function (k, i) {
    var x = M + i * (bw + gap);
    doc.roundedRect(x, y, bw, bh, 4, 4);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor.apply(doc, ABU);
    doc.text(k[0], x + 9, y + 15);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor.apply(doc, HITAM);
    doc.text(k[1], x + 9, y + 35);
  });
  y += bh + 26;

  var gayaTabel = {
    theme: 'grid',
    margin: { left: M, right: M, top: 48, bottom: 48 },
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, lineColor: GARIS, lineWidth: 0.75, textColor: HITAM },
    headStyles: { fillColor: [238, 241, 245], textColor: HITAM, fontStyle: 'bold' },
    footStyles: { fillColor: [246, 247, 249], textColor: HITAM, fontStyle: 'bold' },
    showFoot: 'lastPage'
  };
  function judulBagian(teks) {
    if (y > H - 120) { doc.addPage(); y = 56; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor.apply(doc, HITAM);
    doc.text(teks, M, y);
    y += 8;
  }
  function tabel(head, body, foot, kolomKanan) {
    var cs = {};
    kolomKanan.forEach(function (i) { cs[i] = { halign: 'right' }; });
    var o = Object.assign({}, gayaTabel, {
      startY: y, head: [head], body: body, columnStyles: cs,
      didParseCell: function (data) { if (kolomKanan.indexOf(data.column.index) >= 0 && data.cell.colSpan === 1) data.cell.styles.halign = 'right'; }
    });
    if (foot) o.foot = [foot];
    if (!body.length) o.body = [[{ content: 'Tidak ada lembur pada periode ini.', colSpan: head.length, styles: { halign: 'center', textColor: ABU } }]];
    doc.autoTable(o);
    y = doc.lastAutoTable.finalY + 26;
  }

  // A. Rekap per orang
  judulBagian('A. Rekap per orang');
  var nama = function (r) { return r.nama + (opsi.uang && r.manajemen ? ' (M)' : ''); };
  if (opsi.uang) {
    tabel(['No', 'Nama', 'Departemen', 'Weekday', 'Weekend', 'Porsi', 'Jam', 'Dana (Rp)'],
      d.rows.map(function (r, i) { return [i + 1, nama(r), r.departemen, r.weekday, r.weekend, r.weekday + r.weekend, jamTeks(r.jam), angkaID(r.total)]; }),
      ['', 'TOTAL', '', d.total.weekday, d.total.weekend, porsiTotal(d), jamTeks(d.total.jam), angkaID(d.total.dana)],
      [3, 4, 5, 6, 7]);
  } else {
    tabel(['No', 'Nama', 'Departemen', 'Weekday', 'Weekend', 'Porsi'],
      d.rows.map(function (r, i) { return [i + 1, nama(r), r.departemen, r.weekday, r.weekend, r.weekday + r.weekend]; }),
      ['', 'TOTAL', '', d.total.weekday, d.total.weekend, porsiTotal(d)],
      [3, 4, 5]);
  }

  // B. Rincian per tanggal
  judulBagian('B. Rincian per tanggal');
  if (opsi.uang) {
    tabel(['Tanggal', 'Hari', 'Nama', 'Departemen', 'Jenis', 'Jam', 'Dana (Rp)'],
      d.detail.map(function (r) { return [r.tanggal, r.hari, nama(r), r.departemen, r.jenis, jamTeks(r.jam), angkaID(r.dana)]; }),
      null, [5, 6]);
  } else {
    tabel(['Tanggal', 'Hari', 'Nama', 'Departemen', 'Jenis'],
      d.detail.map(function (r) { return [r.tanggal, r.hari, r.nama, r.departemen, r.jenis]; }),
      null, []);
  }

  // Tanda tangan
  if (y + 100 > H - 48) { doc.addPage(); y = 64; }
  var kolom = ['Disiapkan oleh,', 'Diperiksa oleh,', 'Disetujui oleh,'];
  var cw = (W - 2 * M) / 3;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setDrawColor.apply(doc, HITAM); doc.setLineWidth(0.75);
  kolom.forEach(function (t, i) {
    var cx = M + i * cw + cw / 2;
    doc.text(t, cx, y + 4, { align: 'center' });
    doc.line(cx - cw / 2 + 18, y + 70, cx + cw / 2 - 18, y + 70);
  });

  // Nomor halaman
  var n = doc.getNumberOfPages();
  for (var i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor.apply(doc, ABU);
    doc.text(judulLaporan(opsi) + ' · ' + periodeTeks(d), M, H - 24);
    doc.text('Halaman ' + i + ' dari ' + n, W - M, H - 24, { align: 'right' });
  }
  return doc;
}

/* ---------- Excel ---------- */
function buatExcel(d, opsi, ExcelJS) {
  var wb = new ExcelJS.Workbook();
  wb.creator = 'Absensi Lembur';
  var RP = '"Rp "#,##0';
  var tipis = { style: 'thin', color: { argb: 'FFC9CED8' } };
  var garis = { top: tipis, left: tipis, bottom: tipis, right: tipis };
  var hijau = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F3EC' } };
  var abu = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6F7F9' } };

  function tabelSheet(ws, header, rows, opsiKolom, total) {
    ws.columns = opsiKolom.map(function (k) { return { width: k.w }; });
    var h = ws.addRow(header);
    h.eachCell(function (c) { c.font = { bold: true }; c.fill = hijau; c.border = garis; });
    rows.forEach(function (r) {
      var row = ws.addRow(r);
      row.eachCell({ includeEmpty: true }, function (c, i) {
        c.border = garis;
        if (opsiKolom[i - 1].fmt) c.numFmt = opsiKolom[i - 1].fmt;
      });
    });
    if (total) {
      ws.addRow([]); // baris kosong: TOTAL tidak ikut teracak saat data di-sort/filter
      var t = ws.addRow(total);
      t.eachCell({ includeEmpty: true }, function (c, i) {
        c.font = { bold: true }; c.fill = abu; c.border = garis;
        if (opsiKolom[i - 1].fmt) c.numFmt = opsiKolom[i - 1].fmt;
      });
    }
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: header.length } };
  }

  // Ringkasan
  var s1 = wb.addWorksheet('Ringkasan');
  s1.columns = [{ width: 34 }, { width: 30 }];
  s1.addRow([judulLaporan(opsi)]).font = { bold: true, size: 14 };
  if (d.perusahaan) s1.addRow([d.perusahaan]);
  s1.addRow(['Periode', periodeTeks(d)]);
  s1.addRow(['Dicetak', d.dicetak + ' WIB']);
  if (opsi.uang) {
    s1.addRow(['Tarif weekday (Rp ' + satuanTarif(d) + ')', d.set.tarifWeekday]).getCell(2).numFmt = RP;
    s1.addRow(['Tarif weekend (Rp ' + satuanTarif(d) + ')', d.set.tarifWeekend]).getCell(2).numFmt = RP;
  }
  s1.addRow([]);
  s1.addRow(['Total porsi', porsiTotal(d)]);
  s1.addRow(['Lembur weekday', d.total.weekday]);
  s1.addRow(['Lembur weekend', d.total.weekend]);
  s1.addRow(['Jumlah orang', jumlahOrang(d)]);
  if (opsi.uang) {
    s1.addRow(['Lembur manajemen (tanpa uang lembur)', d.total.lemburManajemen]);
    var td = s1.addRow(['Total dana lembur', d.total.dana]);
    td.font = { bold: true }; td.getCell(2).numFmt = RP;
  }
  s1.getColumn(2).alignment = { horizontal: 'left' };

  // Per Orang
  var s2 = wb.addWorksheet('Per Orang');
  if (opsi.uang) {
    tabelSheet(s2, ['Nama', 'Departemen', 'Manajemen', 'Weekday', 'Weekend', 'Total Porsi', 'Total Jam', 'Dana (Rp)'],
      d.rows.map(function (r) { return [r.nama, r.departemen, r.manajemen ? 'Ya' : '', r.weekday, r.weekend, r.weekday + r.weekend, r.jam, r.total]; }),
      [{ w: 26 }, { w: 18 }, { w: 12 }, { w: 10 }, { w: 10 }, { w: 12 }, { w: 11 }, { w: 16, fmt: RP }],
      ['TOTAL', '', '', d.total.weekday, d.total.weekend, porsiTotal(d), d.total.jam, d.total.dana]);
  } else {
    tabelSheet(s2, ['Nama', 'Departemen', 'Weekday', 'Weekend', 'Total Porsi'],
      d.rows.map(function (r) { return [r.nama, r.departemen, r.weekday, r.weekend, r.weekday + r.weekend]; }),
      [{ w: 26 }, { w: 18 }, { w: 10 }, { w: 10 }, { w: 12 }],
      ['TOTAL', '', d.total.weekday, d.total.weekend, porsiTotal(d)]);
  }

  // Detail (tanggal disimpan sebagai tanggal asli, tampil DD-MM-YYYY)
  var s3 = wb.addWorksheet('Detail');
  var tgl = function (key) { var p = key.split('-'); return new Date(Date.UTC(+p[2], +p[1] - 1, +p[0])); };
  if (opsi.uang) {
    tabelSheet(s3, ['Tanggal', 'Hari', 'Nama', 'Departemen', 'Jenis', 'Manajemen', 'Jam', 'Dana (Rp)'],
      d.detail.map(function (r) { return [tgl(r.tanggal), r.hari, r.nama, r.departemen, r.jenis, r.manajemen ? 'Ya' : '', r.jam, r.dana]; }),
      [{ w: 13, fmt: 'dd-mm-yyyy' }, { w: 10 }, { w: 26 }, { w: 18 }, { w: 10 }, { w: 12 }, { w: 8 }, { w: 16, fmt: RP }],
      ['TOTAL', '', '', '', '', '', d.total.jam, d.total.dana]);
  } else {
    tabelSheet(s3, ['Tanggal', 'Hari', 'Nama', 'Departemen', 'Jenis'],
      d.detail.map(function (r) { return [tgl(r.tanggal), r.hari, r.nama, r.departemen, r.jenis]; }),
      [{ w: 13, fmt: 'dd-mm-yyyy' }, { w: 10 }, { w: 26 }, { w: 18 }, { w: 10 }],
      null);
  }
  return wb;
}

if (typeof module !== 'undefined') module.exports = { buatPdf: buatPdf, buatExcel: buatExcel, namaFileExport: namaFileExport, periodeTeks: periodeTeks };
