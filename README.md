# Frontend Vibe Kit

Skill untuk AI coding agent yang membuat frontend **bersih, glossy, halus, interaktif, dan berkedalaman 3D**, dengan 13 pustaka yang bekerja bersama, bukan sendiri-sendiri.

Bekerja di **Claude Code, OpenCode, Codex, Antigravity**, dan alat lain lewat `AGENTS.md`. Pemasang berjalan di Windows, macOS, dan Linux, tanpa dependensi tambahan selain Node.js 18.3+.

> Status: **v0.9.0 (pra-rilis)**. Pemasang sudah dites otomatis; skill-nya sendiri menunggu uji pada proyek nyata (lihat [docs/PROMPTS.md](docs/PROMPTS.md)).

## Mulai cepat

Di folder proyek Next.js Anda:

```bash
# 1. Pasang skill + aturan agen
npx github:ArrowTin/frontend-vibe-kit install --with-agents-md

# 2. Pasang dependensi (preset: full, no-3d, lite)
npx github:ArrowTin/frontend-vibe-kit setup

# 3. Periksa semuanya
npx github:ArrowTin/frontend-vibe-kit doctor
```

Lalu mulai ulang alat AI Anda dan minta:

```
Pakai skill glass-motion-frontend. Buat landing page untuk <produk>.
Tulis design plan dulu (palet, tipografi, momen ikonik, anggaran gerak), jangan koding.
```

Untuk semua proyek sekaligus (tanpa menyalin per proyek): `install --global`.

Alternatif tanpa `npx`: `git clone`, lalu `node bin/cli.mjs install --dir /path/ke/proyek`.

> Memakai fork atau repo sendiri? Jalankan `npm run set-owner -- <username-github-anda>` sekali untuk mengganti `OWNER` di seluruh dokumen.

## Perintah

| Perintah | Fungsi |
|---|---|
| `install` | Menyalin skill ke folder yang dibaca alat AI (menimpa versi lama = pembaruan) |
| `uninstall` | Menghapus skill (dan blok aturan di `AGENTS.md` dengan `--with-agents-md`) |
| `doctor` | Memeriksa instalasi, versi, dan kesiapan proyek (React 19, Tailwind v4, paket, Biome, coss ui) |
| `setup` | Memasang paket npm sesuai preset ke proyek |

| Opsi | Arti |
|---|---|
| `--agent claude,opencode,codex,antigravity` | Pilih alat tertentu (bawaan: `all`) |
| `--global` | Pasang di folder pengguna, berlaku untuk semua proyek |
| `--dir <path>` | Folder proyek (bawaan: folder saat ini) |
| `--preset full\|no-3d\|lite` | Pilihan paket untuk `setup` dan `doctor` |
| `--pm npm\|pnpm\|yarn\|bun` | Manajer paket (bawaan: terdeteksi dari lockfile) |
| `--with-agents-md` | Tambah blok aturan ke `AGENTS.md` dan `CLAUDE.md` (tidak menimpa isi Anda) |
| `--no-browsers` | Lewati unduhan browser Playwright |
| `--dry-run` | Tampilkan rencana tanpa mengubah apa pun |

### Preset

| Preset | Isi |
|---|---|
| `full` | Semua pustaka inti, scroll halus, 3D (three.js), Biome, Vitest, Playwright, React Scan |
| `no-3d` | Seperti `full`, tanpa three.js |
| `lite` | Pustaka inti dan Biome saja |

Daftar paket tiap preset ada di [`presets.json`](skills/glass-motion-frontend/presets.json); ubah di sana untuk menyesuaikan.

### Lokasi pemasangan

| Alat | Proyek | Global |
|---|---|---|
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| Codex, Antigravity | `.agents/skills/` | `~/.codex/skills/`, `~/.gemini/config/skills/` |
| OpenCode | membaca `.claude/skills/` dan `.agents/skills/` (salinan sendiri: `--agent opencode` → `.opencode/skills/`) | membaca `~/.claude/skills/`; salinan sendiri: `~/.config/opencode/skills/` |

Detail dan cara memasang manual: [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).

## Fungsi tiap pustaka

| Pustaka | Peran dalam kit | Kapan dipakai |
|---|---|---|
| [coss ui](https://coss.com/ui) | Tulang antarmuka: kontrol aksesibel (Base UI + Tailwind), dipasang lewat registry shadcn | Semua tombol, input, dialog, select, tab |
| [Magic UI](https://magicui.design/) | Aksen animasi: bento grid, marquee, border beam, tombol berkilau, globe | 1-3 efek per layar, sesuai anggaran gerak |
| [Tremor](https://www.tremor.so/) | Grafik, kartu KPI, blok dashboard | Bagian data |
| [Lucide](https://lucide.dev/) | Satu-satunya set ikon | Semua ikon |
| [unDraw](https://undraw.co/) | Ilustrasi SVG yang bisa diwarnai sesuai merek | Keadaan kosong, galat, onboarding |
| [React Hook Form](https://react-hook-form.com/) | Form ringan dengan validasi (bersama zod) | Semua form |
| [TanStack](https://tanstack.com/) | Query (data server), Table (tabel), Virtual (daftar panjang) | Pengambilan data, tabel |
| [Sonner](https://sonner.emilkowal.ski/) | Notifikasi toast tunggal | Umpan balik aksi |
| [nuqs](https://github.com/47ng/nuqs) | State di URL (filter, urutan, halaman, tab) | State yang harus bertahan saat refresh atau bisa dibagikan |
| [Vitest](https://vitest.dev/) | Tes unit dan komponen | Logika dan perilaku komponen |
| [Playwright](https://playwright.dev/) | Tes e2e, screenshot, aksesibilitas | Gerbang mutu visual dan alur |
| [React Scan](https://react-scan.com/) | Mendeteksi render berlebih (khusus dev) | Pemeriksaan performa render |
| [Biome](https://biomejs.dev/) | Lint dan format dalam satu alat | Sebelum setiap laporan selesai |

Tambahan minimum untuk "halus" dan "3D" (tidak ada di daftar awal): `motion` (spring, gestur, transisi layout), `lenis` (scroll halus), dan `three` + `@react-three/fiber` + `@react-three/drei` (momen 3D di hero). Semuanya opsional dan hanya dipasang bila rencana desain memintanya.

Coss ui, Magic UI, dan Tremor berupa kode sumber yang disalin ke proyek, jadi dipasang per komponen dari docs masing-masing; `setup` tidak memasangnya.

## Cara kolaborasinya

```
coss ui (tulang) → Magic UI (aksen) → Tremor (data)
        ↓
motion + lenis (rasa) → R3F (kedalaman, satu momen)
        ↓
RHF + TanStack + nuqs + Sonner (perilaku)
        ↓
Biome + Vitest + Playwright + React Scan (gerbang mutu)
```

1. **Satu momen ikonik per halaman.** Sisanya tenang.
2. **Satu pekerjaan, satu pustaka.** Tidak ada dua toast, dua set ikon, dua library form.
3. **Gerak menjawab aksi pengguna.** Animasi masuk otomatis dibuat jarang.
4. **Baca docs sebelum memakai komponen.** Agen tidak boleh mengarang nama komponen atau props.
5. **Gerbang mutu sebelum "selesai".** Lint, tipe, tes, screenshot, build.

## Isi repo

```
frontend-vibe-kit/
├── bin/cli.mjs, lib.mjs            # CLI: install, uninstall, doctor, setup
├── skills/glass-motion-frontend/
│   ├── SKILL.md                    # prinsip, kepemilikan pustaka, workflow, aturan rasa
│   ├── presets.json                # paket npm per preset
│   ├── references/                 # library-map, recipes, quality-gates
│   └── scripts/setup.mjs           # pemasang dependensi
├── docs/                           # WORKFLOW, ROADMAP, DEVELOPER, INTEGRATIONS, PROMPTS
├── test/, scripts/                 # tes CLI, validasi repo
├── AGENTS.md, CLAUDE.md            # aturan untuk alat tanpa dukungan skill
└── .github/                        # CI (Linux/macOS/Windows), template issue dan PR
```

## Dokumentasi

| Dokumen | Untuk siapa | Isi |
|---|---|---|
| [WORKFLOW](docs/WORKFLOW.md) | Pengguna | Alur 8 tahap dari brief sampai laporan |
| [ROADMAP](docs/ROADMAP.md) | Pengguna | Fase 0-7 dengan checklist |
| [INTEGRATIONS](docs/INTEGRATIONS.md) | Pengguna dan tim | Detail per alat AI, pemasangan manual, berbagi lewat repo |
| [PROMPTS](docs/PROMPTS.md) | Pemelihara | Prompt uji dan kriteria lulus |
| [DEVELOPER](docs/DEVELOPER.md) | Developer | Cara kerja, struktur, menambah pustaka/preset/aturan, rilis, pemecahan masalah |
| [CONTRIBUTING](CONTRIBUTING.md) | Kontributor | Aturan pull request |
| [CHANGELOG](CHANGELOG.md) | Semua | Riwayat versi |

## Pengembangan

```bash
git clone https://github.com/ArrowTin/frontend-vibe-kit.git
cd frontend-vibe-kit
npm run check      # validasi repo + tes CLI
```

## Catatan jujur

- `SKILL.md` berbahasa Inggris karena agen mengikuti instruksi itu lebih konsisten; agen tetap membalas dalam bahasa Anda.
- Perintah instal untuk pustaka kode-sumber (coss ui, Magic UI, Tremor) bisa berubah. Agen diminta membaca docs dulu sebelum memasang.
- Kode di `recipes.md` belum dikompilasi otomatis; uji di proyek kosong sebelum dipakai produksi.
- Efek kaca (`backdrop-filter`) dan 3D memakan sumber daya. Anggaran performa ada di [quality-gates.md](skills/glass-motion-frontend/references/quality-gates.md).

## Lisensi

[MIT](LICENSE)

## Dukungan

Kalau kit ini bermanfaat, Anda bisa mendukung pengembangan selanjutnya melalui PayPal:

[![Donasi lewat PayPal](https://img.shields.io/badge/PayPal-Donasi-00457C?logo=paypal&logoColor=white)](https://www.paypal.com/paypalme/andrianustinas)

Atau langsung: https://www.paypal.com/paypalme/andrianustinas
