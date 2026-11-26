/* Penghubung ke Apps Script (Google Sheets). Panggilan TANPA cookie Google,
   jadi tidak terganggu browser yang login ke banyak akun. */
var LEMBUR_API = 'https://script.google.com/macros/s/AKfycbyBhuVI1XJC8XDcnhGAxG2LJiWRS1lwg0VIA3ougEBJmtwbK5Ded5EWOQQmV_iUGFgz8Q/exec';

function bacaJawaban_(r) {
  if (!r.ok) throw new Error('Server error ' + r.status);
  return r.json().then(function (j) {
    if (!j.ok) throw new Error(j.error || 'Gagal memuat data.');
    return j.data;
  });
}

function apiGet(params) {
  var q = Object.keys(params)
    .filter(function (k) { return params[k] !== null && params[k] !== undefined && params[k] !== ''; })
    .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
    .join('&');
  return fetch(LEMBUR_API + '?' + q, { credentials: 'omit', cache: 'no-store' }).then(bacaJawaban_);
}

function apiPost(body) {
  return fetch(LEMBUR_API, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  }).then(bacaJawaban_);
}

function pesanError(e) {
  var m = e && e.message ? e.message : String(e);
  return /Failed to fetch|NetworkError|Load failed/i.test(m) ? 'Tidak bisa terhubung. Cek internet lalu coba lagi.' : m;
}
