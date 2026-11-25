# Prompt uji

Kit ini baru bisa disebut matang setelah diuji pada pekerjaan nyata. P1-P5 dijalankan pada proyek Next.js kosong (preset `full`), P6-P8 pada proyek yang sudah berjalan, di alat AI yang Anda pakai. Catat hasilnya; setiap kegagalan menjadi aturan baru di `SKILL.md`.

## Cara menguji

1. Proyek baru, jalankan `install --with-agents-md` dan `setup`, lalu `doctor`.
2. Tempel prompt, **tanpa** petunjuk tambahan.
3. Periksa daftar kriteria. Satu kriteria gagal = satu catatan.
4. Jalankan `pnpm verify` (atau gerbang di `quality-gates.md`) dan lihat screenshot.

## Kriteria umum (berlaku untuk semua prompt)

- [ ] Agen menulis design plan **sebelum** koding (palet, tipografi, momen ikonik, anggaran gerak)
- [ ] Hanya pustaka dari tabel kepemilikan yang dipakai di proyek baru; di proyek berjalan pustaka milik proyek dipakai. Tidak ada duplikat fungsi
- [ ] Komponen coss ui, Magic UI, Tremor dipasang lewat docs/registry, bukan dikarang
- [ ] `prefers-reduced-motion` ditangani
- [ ] Fokus keyboard terlihat
- [ ] Ada state loading, kosong, galat untuk setiap tampilan data
- [ ] Cek yang dimiliki proyek dijalankan dan hasilnya dilaporkan (proyek baru: Biome, tsc, Vitest, Playwright, build); yang tidak dimiliki dilaporkan "tidak dijalankan", tidak dipasang
- [ ] Laporan akhir menyebut apa yang ditinggalkan dan kenapa

## P1. Landing page

```
Pakai skill glass-motion-frontend. Buat landing page untuk toko optik lokal "Optik 2Mata" di Bengkayang.
Tulis design plan dulu, tunggu persetujuan saya, baru bangun.
```
Kriteria khusus:
- [ ] Palet dan gambar mencerminkan subjek (optik, kacamata), bukan tema SaaS generik
- [ ] Tepat satu momen ikonik; efek lain tenang
- [ ] Hero 3D, jika dipakai, punya poster dan cadangan reduced motion

## P2. Dashboard data

```
Pakai glass-motion-frontend. Buat dashboard data kependudukan (jumlah penduduk per kecamatan,
tren bulanan) dengan tabel, filter, dan grafik.
```
- [ ] Grafik Tremor, warna dari token palet, ada satuan pada sumbu
- [ ] Tabel TanStack Table; filter, urutan, halaman tersimpan di URL (nuqs) dan bertahan saat refresh
- [ ] Daftar panjang divirtualisasi

## P3. Form

```
Pakai glass-motion-frontend. Buat form pendaftaran dengan validasi, kirim ke API palsu dengan jeda 1 detik.
```
- [ ] React Hook Form + zod; pesan galat menunjukkan cara memperbaiki
- [ ] Kirim lewat `toast.promise` Sonner, kata kerja tombol dan toast konsisten
- [ ] Tombol menonaktifkan diri saat mengirim; ada tes Vitest untuk galat validasi

## P4. Polish halaman yang sudah ada

```
Pakai glass-motion-frontend. Perhalus halaman ini agar terasa glossy dan nyaman, tanpa menambah efek di luar anggaran gerak.
```
- [ ] Agen membaca kode yang ada dulu dan tidak menulis ulang semuanya
- [ ] Kaca (`backdrop-filter`) punya sesuatu di belakangnya untuk di-blur
- [ ] Hanya `transform` dan `opacity` yang dianimasikan

## P5. Hero 3D

```
Pakai glass-motion-frontend. Tambahkan hero 3D dengan objek kaca yang berputar pelan.
```
- [ ] Satu `<Canvas>`, dimuat malas dengan `ssr: false` di dalam komponen klien
- [ ] Poster tampil dulu; LCP tidak terblokir
- [ ] Cadangan untuk reduced motion, hemat data, dan perangkat lemah
- [ ] Jeda saat di luar layar

## P6. Proyek berjalan: polish tanpa memasang apa pun

Siapkan proyek yang sudah berjalan dengan UI kit sendiri (misalnya MUI atau Chakra, atau Tailwind v3) dan lint/tes sendiri.

```
Pakai glass-motion-frontend. Percantik halaman pengaturan proyek ini agar terasa halus dan modern.
```
- [ ] Agen menjalankan `setup --detect` dan membaca file yang akan diubah sebelum merencanakan
- [ ] Blok "Project fit" ada di rencana desain
- [ ] `package.json` dan lockfile tidak berubah (tanpa paket baru, tanpa `shadcn init`)
- [ ] Token masuk ke stylesheet yang sudah ada; UI kit, ikon, toast, dan form milik proyek dipakai
- [ ] Skrip cek milik proyek dijalankan dan dibanding baseline; tidak ada formatter se-repo
- [ ] Hanya berkas yang perlu yang diubah (cek `git diff --stat`)

## P7. Proyek berjalan: butuh paket baru

```
Pakai glass-motion-frontend. Tambahkan hero 3D ke landing page proyek ini.
```
- [ ] Agen berhenti dan bertanya satu kali: nama paket, fungsinya, alternatif CSS-only
- [ ] Setelah "ya": `setup --only <paket> --approve`; setelah "tidak": jalan terus dengan alternatif CSS-only

## P8. Proyek non-JavaScript

Jalankan di folder Laravel/Django/Rails/WordPress/situs statis.

```
Pakai glass-motion-frontend. Percantik halaman beranda.
```
- [ ] Tidak ada scaffold Next.js/Vite, tidak ada `package.json` baru
- [ ] CSS/JS masuk lewat template dan pipeline aset milik proyek

## Lembar catatan

| Tanggal | Alat AI + model | Prompt | Kriteria gagal | Perbaikan yang dilakukan |
|---|---|---|---|---|
| | | | | |

Rilis v1.0.0 saat kedelapan prompt lulus tanpa koreksi manual berulang di sedikitnya dua alat AI.
