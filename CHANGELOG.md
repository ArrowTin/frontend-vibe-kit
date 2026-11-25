# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/) dan versi mengikuti [SemVer](https://semver.org/).

## [0.11.0] - 2026-11-25

### Diperbaiki
- `setup --stack next` gagal dengan `ERESOLVE` karena `create-next-app` memasang `@types/node@^20` sedangkan `vitest@5` meminta `^22` atau lebih baru, sehingga proyek tertinggal setengah terpasang. Di proyek baru yang baru dibuat, `@types/node` kini dinaikkan ke `^22` dalam perintah yang sama. Jika npm tetap menolak (ERESOLVE), proyek baru dicoba ulang sekali dengan `--legacy-peer-deps` dan itu diumumkan; proyek yang sudah berjalan tidak pernah dipaksa: penyebabnya dijelaskan dengan tiga pilihan untuk disetujui pengguna dan `package.json` tidak berubah.
- Proyek di luar JavaScript (Laravel, Django, Rails, WordPress, Go, .NET, Hugo, Jekyll, dll.) tidak lagi dianggap "tidak ada proyek": sebelumnya `setup --stack next` men-scaffold Next.js ke dalamnya.
- React Native / Expo tidak lagi ditawari pustaka web; root monorepo tidak lagi ditawari paket di root. Situs statis dengan `index.html` di `public/`, `src/`, dll. dikenali.
- Pustaka yang menggandakan fungsi pustaka proyek tidak lagi ditawarkan (sebelumnya hanya ESLint, Jest, Cypress): ikon, toast, form, validasi, data, tabel, virtualisasi, URL state, animasi, smooth scroll, 3D.
- Pesan penutup `setup` di proyek yang sudah ada tidak lagi menyuruh menjalankan `shadcn init`; `doctor` tidak lagi memberi peringatan untuk ESLint/Prettier, Tailwind v3, React 18, atau tanpa Tailwind.

### Ditambahkan
- `setup --detect [--json]` dan perintah `detect`: profil read-only proyek (jenis, package manager, styling, pustaka yang sudah dipakai per pekerjaan, skrip pengecekan milik proyek, status git). Dijalankan lebih dulu oleh agen.
- `--only a,b`: menyetujui hanya paket yang dibutuhkan rencana desain, bukan seluruh preset.
- Kode keluar 4 `NEEDS_CONFIRMATION`: menambahkan framework (`--stack next|vite`) ke folder yang sudah berisi proyek ditolak kecuali pengguna menyetujui dengan `--approve`. Folder berisi berkas tak dikenal diperlakukan sebagai proyek yang ada, bukan folder kosong.
- Package manager dibaca dari field `packageManager` dan lockfile di root monorepo.
- `references/adapt.md`: membaca profil, memetakan tiap pekerjaan ke pustaka proyek, token dan glass untuk Tailwind v3/v4, CSS Modules, styled-components, MUI, Vue, Svelte, Angular, template Laravel/Django/Rails/WordPress, protokol persetujuan, baseline dan verifikasi, monorepo.

### Diubah
- `SKILL.md`: dua jalur masuk (folder kosong vs proyek berjalan), tahap Deteksi, blok "Project fit" pada rencana desain, protokol persetujuan, bagian "Working in a running project". Compose, Behavior, Feel, dan Verify kini memakai pustaka dan skrip proyek; Biome/Vitest/Playwright hanya untuk proyek baru. `AGENTS.md` dan `quality-gates.md` diselaraskan.

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
