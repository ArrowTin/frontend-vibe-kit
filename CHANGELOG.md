# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/) dan versi mengikuti [SemVer](https://semver.org/).

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
