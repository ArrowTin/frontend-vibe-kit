# Roadmap

Urutan kerja dari nol sampai kit ini terasa matang. Setiap fase punya hasil yang bisa diperiksa. Perkiraan waktu untuk satu orang yang bekerja bersama agen AI; sesuaikan dengan ritme Anda.

## Fase 0: Fondasi (hari 1)
- [ ] Buat proyek Next.js + Tailwind v4 + TypeScript
- [ ] Pasang Biome, hapus ESLint/Prettier
- [ ] `shadcn init @coss/style`
- [ ] Jalankan `npx github:ArrowTin/frontend-vibe-kit install --with-agents-md` agar skill dan aturan terpasang
- [ ] Jalankan `npx github:ArrowTin/frontend-vibe-kit setup` untuk memasang dependensi sesuai preset
- [ ] Jalankan `doctor` dan pastikan tanpa FAIL
- **Selesai bila:** `pnpm dev` jalan, `pnpm biome check .` hijau, `doctor` hijau, agen AI menyebut skill `glass-motion-frontend` saat diminta membuat UI.

## Fase 1: Sistem desain (hari 2-3)
- [ ] Tentukan palet, tipografi, satu arah cahaya
- [ ] Tulis token di `globals.css`, utilitas `glass` dan `gloss`
- [ ] Siapkan latar berwarna lembut agar kaca punya sesuatu untuk di-blur
- [ ] Pasang coss ui: Button, Input, Field, Dialog, Select, Tabs, Popover
- **Selesai bila:** satu halaman contoh berisi semua primitif, terlihat konsisten di terang dan gelap.

## Fase 2: Komposisi dan efek (minggu 1)
- [ ] Layout halaman utama dengan konten asli
- [ ] Pilih maksimal tiga efek Magic UI sesuai anggaran gerak
- [ ] Ikon Lucide seragam, ilustrasi unDraw untuk keadaan kosong dan error
- [ ] Sonner terpasang di layout
- **Selesai bila:** halaman statis rapi di 390, 834, 1440 px tanpa efek berlebihan.

## Fase 3: Perilaku (minggu 2)
- [ ] Form dengan React Hook Form + zod, pesan galat yang menunjukkan cara memperbaiki
- [ ] TanStack Query dengan state loading, kosong, galat
- [ ] Tabel dengan TanStack Table, virtualisasi bila lebih dari ±100 baris
- [ ] Filter, urutan, halaman, tab di URL dengan nuqs
- [ ] Tremor untuk bagian data
- **Selesai bila:** muat ulang halaman mempertahankan filter; semua tampilan data punya tiga state.

## Fase 4: Rasa (minggu 3)
- [ ] Gerak mikro (hover, tekan, fokus) 120-200 ms
- [ ] Transisi layout dengan `layoutId` (tab, urut ulang, buka-tutup)
- [ ] Scroll halus dengan lenis, mati saat reduced motion
- [ ] Kartu miring (tilt) pada satu kelompok kartu saja
- **Selesai bila:** interaksi terasa halus di ponsel menengah; reduced motion sudah diuji.

## Fase 5: Momen 3D (minggu 4)
- [ ] Satu `<Canvas>` di hero, dimuat malas, ada gambar poster
- [ ] Cadangan untuk reduced motion, hemat data, perangkat lemah
- [ ] Jeda saat di luar layar
- [ ] Peta lingkungan di-host sendiri
- **Selesai bila:** LCP tetap di bawah 2,5 dtk dan poster tampil sebelum 3D.

## Fase 6: Mutu otomatis (minggu 4-5)
- [ ] Vitest untuk logika dan komponen penting
- [ ] Playwright: screenshot 3 ukuran, axe, reduced motion, fokus keyboard
- [ ] Rutinitas React Scan pada alur utama
- [ ] Skrip `verify` di `package.json`, dijalankan di CI
- **Selesai bila:** `pnpm verify` hijau dan menjadi syarat merge.

## Fase 7: Iterasi skill (berkelanjutan)
- [ ] Catat tiap kali agen salah memakai pustaka, tambahkan sebagai aturan atau anti-pola di `SKILL.md`
- [ ] Simpan 3-5 prompt uji (landing, dashboard, form, tabel) dan jalankan ulang setiap mengubah skill
- [ ] Perbarui `library-map.md` saat versi pustaka berubah (nama komponen, perintah instal)
- [ ] Bagikan skill sebagai repo agar dipakai di proyek lain
- **Selesai bila:** prompt uji menghasilkan hasil yang konsisten tanpa koreksi manual berulang.

## Risiko yang perlu dipantau

| Risiko | Pencegahan |
|---|---|
| Efek berlebihan, halaman terasa berat | Anggaran gerak di design plan, hapus yang tidak terdaftar |
| Kaca terlihat datar | Selalu beri latar warna di belakang kaca |
| 3D memperlambat halaman | Satu canvas, lazy load, poster, anggaran segitiga |
| Agen mengarang nama komponen | Wajib baca docs/registry sebelum memakai komponen |
| Pustaka berubah | Perbarui `library-map.md`, jalankan ulang prompt uji |
