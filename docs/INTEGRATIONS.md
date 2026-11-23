# Integrasi per alat

Cara termudah: `npx github:ArrowTin/frontend-vibe-kit install`. Halaman ini menjelaskan apa yang terjadi di tiap alat dan cara memasang manual.

> Lokasi folder bisa berubah antarversi alat. Jika sesuatu tidak cocok, periksa dokumentasi resmi alat tersebut, lalu perbarui `bin/lib.mjs`.

## Alat yang mendukung Agent Skills

| Alat | Folder proyek | Folder global | Cara memastikan terbaca |
|---|---|---|---|
| Claude Code | `.claude/skills/glass-motion-frontend/` | `~/.claude/skills/glass-motion-frontend/` | Mulai ulang, lalu minta: "daftar skill yang tersedia" |
| OpenCode | `.opencode/skills/`, juga membaca `.claude/skills/` dan `.agents/skills/` | `~/.config/opencode/skills/`, juga `~/.claude/skills/` dan `~/.agents/skills/` | Agen memuat skill lewat alat `skill`; cek daftar skill yang tersedia |
| Codex | `.agents/skills/glass-motion-frontend/` | `~/.codex/skills/glass-motion-frontend/` | Mulai ulang, minta daftar skill |
| Antigravity | `.agents/skills/` (lama: `.agent/skills/`) | `~/.gemini/config/skills/` | Menu Customizations di panel agen, atau ketik `/glass-motion-frontend` |

Perilaku bawaan `install` tanpa `--agent`: menyalin ke `.claude/skills/` dan `.agents/skills/`. Itu sudah mencakup Claude Code, Codex, Antigravity, dan OpenCode (yang membaca keduanya). Gunakan `--agent opencode` hanya bila Anda ingin salinan di `.opencode/skills/`.

### Memasang manual

Salin folder `skills/glass-motion-frontend/` utuh (termasuk `references/`, `scripts/`, `presets.json`) ke salah satu folder di atas. Menyalin `SKILL.md` saja tidak cukup, karena referensinya ikut dibutuhkan.

## Memicu skill

Kebanyakan alat memilih skill otomatis berdasarkan `description`. Agar pasti, sebut namanya:

```
Pakai skill glass-motion-frontend untuk membuat halaman <apa>.
```

## Alat tanpa dukungan skill

Gunakan `AGENTS.md` (dibaca oleh banyak agen) atau format aturan bawaan alat:

| Alat | Cara |
|---|---|
| Alat yang membaca `AGENTS.md` | `install --with-agents-md` menambahkan blok aturan ke `AGENTS.md` proyek tanpa menimpa isi Anda |
| Cursor | Buat `.cursor/rules/glass-motion-frontend.mdc`, salin isi `SKILL.md` (tanpa frontmatter) dan tambahkan frontmatter aturan Cursor |
| GitHub Copilot | Salin isi `AGENTS.md` ke `.github/copilot-instructions.md` |
| Windsurf | Salin isi `AGENTS.md` ke `.windsurf/rules/` |

Pada cara-cara ini, `references/` tidak ikut dimuat otomatis. Salin juga berkas yang Anda perlukan, atau minta agen membacanya dari `skills/glass-motion-frontend/references/`.

## Tim: membagikan lewat repo proyek

1. Jalankan `install --with-agents-md` di repo proyek.
2. Commit folder `.claude/skills/`, `.agents/skills/`, dan `AGENTS.md`, `CLAUDE.md`.
3. Anggota tim yang membuka proyek di alat AI apa pun langsung mendapatkan skill yang sama.
4. Perbarui dengan menjalankan `install` lagi, lalu commit selisihnya.

## Menghapus

```bash
npx github:ArrowTin/frontend-vibe-kit uninstall                      # proyek
npx github:ArrowTin/frontend-vibe-kit uninstall --global             # global
npx github:ArrowTin/frontend-vibe-kit uninstall --with-agents-md     # sekaligus blok aturan di AGENTS.md
```
