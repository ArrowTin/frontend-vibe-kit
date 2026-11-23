# Panduan developer

Untuk Anda yang ingin memahami, mengubah, atau memperluas kit ini.

## 1. Cara kerja

Alat AI yang mendukung Agent Skills memuat skill secara bertahap:

```
Selalu dimuat      → name + description (frontmatter SKILL.md)       ± 100 token
Saat skill dipicu  → isi SKILL.md                                    ± 2.500 token
Saat dibutuhkan    → references/*.md dan scripts/*                   sesuai kebutuhan
```

Akibatnya:
- `description` menentukan **kapan** skill dipakai. Tulis dengan kata kunci yang akan muncul di permintaan pengguna ("landing page", "dashboard", "form", "polish UI").
- `SKILL.md` harus ringkas. Detail panjang dan kode contoh ditaruh di `references/` supaya tidak memenuhi konteks.
- Skill tidak "menjalankan" apa pun sendiri. Agen membaca instruksinya lalu bekerja dengan alat yang dimilikinya (shell, editor, browser).

## 2. Struktur repo

```
frontend-vibe-kit/
├── bin/
│   ├── cli.mjs                  # perintah: install, uninstall, doctor, setup
│   └── lib.mjs                  # helper bersama (lokasi folder tiap alat, parser frontmatter)
├── skills/glass-motion-frontend/
│   ├── SKILL.md                 # prinsip, kepemilikan pustaka, workflow, aturan rasa
│   ├── presets.json             # daftar paket npm per preset (satu-satunya sumber kebenaran)
│   ├── references/              # library-map, recipes, quality-gates
│   └── scripts/
│       ├── setup.mjs            # memasang dependensi preset ke proyek
│       └── lib/preset.mjs       # penerjemah preset → daftar paket
├── scripts/
│   ├── validate.mjs             # validasi format skill, preset, tautan, sinkron versi
│   └── set-owner.mjs            # mengganti placeholder OWNER dengan username GitHub
├── test/cli.test.mjs            # tes CLI (node:test, tanpa dependensi)
├── docs/                        # WORKFLOW, ROADMAP, DEVELOPER, INTEGRATIONS, PROMPTS
├── AGENTS.md, CLAUDE.md         # aturan untuk alat tanpa dukungan skill
└── .github/                     # CI, template issue dan PR, FUNDING
```

Kit tidak punya dependensi npm sama sekali. Seluruh CLI memakai modul bawaan Node (18.3+).

## 3. Perintah pengembangan

```bash
npm run validate     # format skill, preset, tautan relatif, sinkron versi
npm test             # tes CLI di folder sementara (tidak menyentuh home Anda)
npm run check        # keduanya (dipakai CI)
node bin/cli.mjs doctor --dir /path/ke/proyek
```

Semua tes memakai `--home` ke folder sementara, jadi aman dijalankan di komputer Anda.

## 4. Tugas umum

### Menambah pustaka
1. Tambahkan baris di tabel "Who owns what" pada `SKILL.md` (satu pekerjaan, satu pustaka; jika tumpang tindih, ganti, jangan tambah).
2. Tambahkan perintah instal dan jebakan di `references/library-map.md`.
3. Jika berupa paket npm: tambahkan ke grup yang sesuai di `presets.json`. Jika kode sumber yang disalin (seperti Magic UI): cukup dokumentasikan.
4. Tambahkan ke tabel di README dan catat di `CHANGELOG.md`.
5. `npm run check`.

### Menambah preset
Edit `presets.json`: buat grup baru bila perlu, lalu tambahkan entri di `presets`. Preset `full` wajib ada. `validate` memeriksa bahwa setiap grup yang dirujuk ada.

### Menambah aturan di SKILL.md
Tulis sebagai aturan yang bisa diperiksa dan sertakan alasannya dalam satu klausa.

| Kurang baik | Baik |
|---|---|
| Buat animasi yang halus | Animasikan hanya `transform` dan `opacity`; properti layout memicu reflow di tiap frame |
| Jangan terlalu banyak efek | Maksimal tiga efek Magic UI per layar, semuanya tercantum di anggaran gerak |

Jika sebuah aturan perlu lebih dari lima baris, pindahkan ke `references/` dan tautkan dari `SKILL.md`.

### Mendukung alat AI baru
1. Cari lokasi folder skill di dokumentasi alat itu (proyek dan global).
2. Tambahkan ke `skillsDirFor` di `bin/lib.mjs` dan ke daftar `AGENTS`.
3. Tambahkan tes di `test/cli.test.mjs` dan baris di `docs/INTEGRATIONS.md`.

Jika alat tidak mendukung skill, arahkan penggunanya ke `AGENTS.md` atau format aturan bawaan alat itu.

### Memperbarui kode di recipes.md
Kode di `recipes.md` belum dikompilasi otomatis. Saat mengubahnya, uji di proyek Next.js kosong (`full` preset) sebelum membuat PR.

## 5. Merilis

1. Naikkan versi di `package.json` **dan** `metadata.version` pada `SKILL.md` (validasi memastikan keduanya sama).
2. Tulis catatan di `CHANGELOG.md`.
3. `npm run check`.
4. ```bash
   git tag v0.9.0 && git push --tags
   ```
5. Pengguna memperbarui dengan menjalankan `install` lagi (menimpa salinan lama). `doctor` memberi peringatan bila versi terpasang berbeda dari versi kit.

Menerbitkan ke npm itu opsional. Tanpa npm, pengguna tetap bisa memakai `npx github:ArrowTin/frontend-vibe-kit ...`.

## 6. Pemecahan masalah

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| Skill tidak muncul di alat AI | Alat belum dimulai ulang; nama berkas bukan `SKILL.md` huruf besar; frontmatter tanpa `name` atau `description` | Mulai ulang alat, jalankan `doctor` |
| `install` menampilkan "skip ... differs from the kit" | Folder skill diubah lokal, ada berkas tambahan, atau skill lain bernama sama | Periksa daftar berkas yang ditampilkan; tambahkan `--force` hanya bila boleh ditimpa |
| `setup` keluar dengan kode 2 dan `NEEDS_STACK` | Folder belum berisi proyek dan tidak ada terminal interaktif | Jalankan `setup --stack next`, `--stack vite`, atau `--stack vanilla` (HTML/CSS/JS murni) |
| `doctor` memberi "version differs" | Salinan lama di proyek atau global | Jalankan `install` lagi |
| OpenCode melaporkan nama skill ganda | Skill ada di `.claude/skills` dan `.opencode/skills` sekaligus | Pasang tanpa `--agent opencode`, atau hapus salah satu salinan |
| Agen tidak memakai skill | `description` kurang cocok dengan permintaan | Sebut nama skill di prompt, atau perluas kata kunci di `description` |
| Agen mengarang nama komponen | Tidak membaca docs | Periksa apakah aturan "baca docs/registry dulu" masih ada; tambahkan sebagai anti-pola |
| `setup` gagal di Windows | `.cmd` shim tidak ditemukan | Jalankan dari PowerShell/Terminal biasa; pastikan manajer paket ada di PATH |
| Unduhan browser Playwright gagal | Jaringan atau dependensi sistem | Jalankan `setup --no-browsers`, lalu `npx playwright install --with-deps chromium` |

## 7. Pertanyaan umum

**Kenapa `SKILL.md` berbahasa Inggris?** Agen mengikuti instruksi berbahasa Inggris secara lebih konsisten, dan skill bisa dipakai komunitas luas. Agen tetap membalas dalam bahasa pengguna.

**Kenapa tidak ESLint dan Prettier?** Biome menggabungkan lint dan format dalam satu alat yang cepat. Dua toolchain memberi konflik aturan yang membingungkan agen.

**Kenapa ada `AGENTS.md` dan skill?** Skill memuat panduan lengkap secara bertahap. `AGENTS.md` adalah versi ringkas yang selalu dibaca, dan menjadi cadangan untuk alat yang belum mendukung skill.

**Bagaimana kit tahu folder skill sudah diubah?** Saat `install`, kit menulis `.fvk-manifest.json` di folder skill berisi hash SHA-256 tiap berkas. Saat dijalankan lagi, kit membandingkan isi folder dengan manifest; berbeda berarti ada perubahan lokal. Tanpa manifest (disalin manual), isi folder dibandingkan langsung dengan sumber.

**Boleh dipakai selain Next.js?** Skill ditulis dengan contoh Next.js App Router. Prinsip dan sebagian besar pustaka bekerja di Vite + React juga; adaptor `nuqs` dan impor `next/dynamic` perlu diganti.
