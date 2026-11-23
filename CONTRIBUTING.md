# Berkontribusi

Terima kasih sudah mau membantu. Panduan singkat:

## Menyiapkan
```bash
git clone https://github.com/ArrowTin/frontend-vibe-kit.git
cd frontend-vibe-kit
npm run check        # validasi repo + tes CLI (butuh Node 18.3+, tanpa dependensi lain)
```

## Jenis kontribusi yang paling berguna
1. **Laporan kesalahan agen.** Agen memakai pustaka salah, mengarang prop, atau mengabaikan aturan. Gunakan template issue dan sertakan prompt, alat AI, dan hasilnya.
2. **Perbaikan `library-map.md` dan `recipes.md`** saat versi pustaka berubah (nama komponen, perintah instal, API).
3. **Aturan baru atau anti-pola** di `SKILL.md`, dengan alasan singkat.
4. **Lokasi folder skill alat baru** di `bin/lib.mjs` dan `docs/INTEGRATIONS.md`.

## Aturan perubahan
- Jalankan `npm run check` sebelum membuat pull request. CI menjalankan hal yang sama.
- Jaga `SKILL.md` di bawah 500 baris; detail panjang masuk ke `references/`.
- Satu pekerjaan, satu pustaka: jangan menambah pustaka yang tumpang tindih dengan yang sudah ada.
- Setiap perubahan perilaku skill dicatat di `CHANGELOG.md`.
- Ubah versi di `package.json` dan `metadata.version` pada `SKILL.md` secara bersamaan (validasi akan memeriksanya).
- Tuliskan aturan dalam bentuk yang bisa diperiksa ("animasikan hanya `transform` dan `opacity`"), bukan imbauan umum ("buat animasi yang bagus").

Detail arsitektur ada di [docs/DEVELOPER.md](docs/DEVELOPER.md).
