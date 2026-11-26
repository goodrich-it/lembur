# Absensi Lembur

Halaman statis (GitHub Pages) untuk sistem absensi lembur. Data, aturan jam, tarif, dan rekap ada di Google Sheets + Apps Script; halaman ini hanya tampilan.

| Halaman | Alamat |
|---|---|
| Form daftar lembur | `https://goodrich-it.github.io/lembur/` |
| Porsi untuk chef | `https://goodrich-it.github.io/lembur/chef.html` |
| Rekap finance | `https://goodrich-it.github.io/lembur/finance.html?kode=KODE` (kode ada di tab PENGATURAN) |

- `api.js` berisi alamat web app Apps Script (`LEMBUR_API`). Ganti di sini kalau web app di-deploy ulang dengan alamat baru.
- Halaman memanggil Apps Script tanpa cookie Google, jadi tetap jalan walau browser login ke banyak akun Google.
- Repo ini tidak berisi data karyawan, tarif, atau kode finance.
