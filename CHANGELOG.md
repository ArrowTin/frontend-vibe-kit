# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/) dan versi mengikuti [SemVer](https://semver.org/).

## [0.10.0] - 2026-11-23

### Ditambahkan
- `setup` di folder kosong kini menanyakan stack: Next.js, Vite + React, atau HTML/CSS/JS murni tanpa framework. Opsi `--stack next|vite|vanilla` untuk melewati pertanyaan. Tanpa terminal interaktif (misalnya dijalankan agen), `setup` keluar dengan kode 2 dan pesan `NEEDS_STACK` agar agen bertanya kepada pengguna.
- Mode tanpa framework: template `index.html`, `css/styles.css`, `js/main.js` dan panduan `references/vanilla.md`. `setup` mengenali proyek `index.html` tanpa `package.json` sebagai proyek tanpa framework.
- `install` di folder kosong menampilkan langkah berikutnya (`setup --stack ...`). `doctor` memahami proyek kosong dan proyek HTML murni.
- `--no-backup`; sebelum mengubah `AGENTS.md` / `CLAUDE.md` yang sudah ada, kit menyimpan `*.fvk-backup` (salinan asli pertama).

### Diubah
- Proyek yang sudah berjalan tidak lagi dipasangi apa pun secara otomatis. `setup` mendeteksi stack (Next.js, React, Vue, Svelte, Angular, Astro, dll.), menyesuaikan diri, menampilkan paket opsional, dan baru memasang setelah persetujuan (`--approve` atau jawaban `y`). Tanpa persetujuan di shell non-interaktif: keluar dengan kode 3 dan `NEEDS_APPROVAL`. Proyek non-React hanya ditawari paket netral-framework; alat yang menggandakan alat proyek (ESLint/Prettier, Jest, Cypress) tidak ditawarkan.
- `SKILL.md` dan `AGENTS.md`: aturan "proyek yang sudah berjalan menang"; framework, UI kit, dan alat tidak diganti atau dimigrasi tanpa persetujuan pengguna.
- `--with-agents-md`: teks pengguna di luar blok dijamin tidak berubah (diverifikasi sebelum menulis), akhir baris CRLF dan berkas tanpa baris baru di akhir dijaga, penanda rusak menghentikan perubahan, symlink diikuti, dan `CLAUDE.md` yang sudah ada kini mendapat blok `@AGENTS.md` (ditambahkan, bukan diganti). `uninstall --with-agents-md` mengembalikan teks asli, tidak lagi merapikan baris kosong di seluruh berkas.
- Scaffold Next.js / Vite dibuat di folder sementara lalu digabung tanpa menimpa berkas yang sudah ada (menghindari `AGENTS.md` bawaan `create-next-app`). `.gitignore` yang sudah ada hanya ditambah entri yang kurang.
- Vite + React: Tailwind v4 (`@tailwindcss/vite`), alias `@/*`, dan Biome (menggantikan Oxlint) disiapkan otomatis.
- `AGENTS.md` kit tidak lagi memakai `pnpm` secara kaku dan menjelaskan deteksi stack.

## [0.9.1] - 2026-11-23

### Diubah
- `install` tidak lagi menimpa folder skill yang punya perubahan lokal, berkas tambahan, atau berasal dari skill lain dengan nama sama. Pemasang mencatat manifest hash (`.fvk-manifest.json`); gunakan `--force` untuk menimpa.
- `uninstall` menolak menghapus folder skill yang sudah diubah, kecuali `--force`.
- `install` yang berulang pada versi yang sama menampilkan "up to date" tanpa menulis apa pun.
- `setup` melewati paket yang sudah ada di `package.json` sehingga versi pengguna tidak berubah.
- Pesan galat `setup` tanpa `package.json` kini menjelaskan langkah berikutnya.

## [0.9.0] - 2026-11-23

Rilis awal (pra-rilis). Belum diuji pada proyek nyata; v1.0.0 menunggu hasil uji di `docs/PROMPTS.md`.

### Ditambahkan
- Skill `glass-motion-frontend` dengan `SKILL.md`, tiga referensi (`library-map`, `recipes`, `quality-gates`), dan `presets.json`.
- CLI lintas platform (`bin/cli.mjs`): `install`, `uninstall`, `doctor`, `setup`.
- Preset dependensi: `full`, `no-3d`, `lite`.
- `AGENTS.md` dan `CLAUDE.md` untuk alat tanpa dukungan skill.
- Dokumentasi: `WORKFLOW`, `ROADMAP`, `DEVELOPER`, `INTEGRATIONS`, `PROMPTS`.
- Validasi repo (`npm run validate`), tes CLI (`npm test`), dan CI GitHub Actions (Linux, macOS, Windows; Node 18, 20, 22).
