# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/) dan versi mengikuti [SemVer](https://semver.org/).

## [0.9.0] - 2026-11-23

Rilis awal (pra-rilis). Belum diuji pada proyek nyata; v1.0.0 menunggu hasil uji di `docs/PROMPTS.md`.

### Ditambahkan
- Skill `glass-motion-frontend` dengan `SKILL.md`, tiga referensi (`library-map`, `recipes`, `quality-gates`), dan `presets.json`.
- CLI lintas platform (`bin/cli.mjs`): `install`, `uninstall`, `doctor`, `setup`.
- Preset dependensi: `full`, `no-3d`, `lite`.
- `AGENTS.md` dan `CLAUDE.md` untuk alat tanpa dukungan skill.
- Dokumentasi: `WORKFLOW`, `ROADMAP`, `DEVELOPER`, `INTEGRATIONS`, `PROMPTS`.
- Validasi repo (`npm run validate`), tes CLI (`npm test`), dan CI GitHub Actions (Linux, macOS, Windows; Node 18, 20, 22).
