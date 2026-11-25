# Frontend Vibe Kit

Skill untuk AI coding agent yang membuat frontend **bersih, glossy, halus, interaktif, dan berkedalaman 3D**, dengan 13 pustaka yang bekerja bersama, bukan sendiri-sendiri.

Bekerja di **Claude Code, OpenCode, Codex, Antigravity**, dan alat lain lewat `AGENTS.md`. Pemasang berjalan di Windows, macOS, dan Linux, tanpa dependensi tambahan selain Node.js 18.3+.

> Status: **v0.11.0 (pra-rilis)**. Pemasang sudah dites otomatis; skill-nya sendiri menunggu uji pada proyek nyata (lihat [docs/PROMPTS.md](docs/PROMPTS.md)).

## Mulai cepat

Di folder proyek Anda (boleh juga folder kosong):

```bash
# 1. Pasang skill + aturan agen (aman: AGENTS.md yang sudah ada tidak ditimpa)
npx github:ArrowTin/frontend-vibe-kit install --with-agents-md

# 2. Siapkan proyek. Di folder kosong, setup menanyakan mau dibangun dengan apa:
#    Next.js, Vite + React, atau HTML/CSS/JS murni tanpa framework
npx github:ArrowTin/frontend-vibe-kit setup

# 3. Periksa semuanya
npx github:ArrowTin/frontend-vibe-kit doctor
```

Folder masih kosong dan tidak mau ditanya? Langsung tentukan: `setup --stack next`, `setup --stack vite`, atau `setup --stack vanilla`.

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
| `detect` | Profil **read-only** proyek: jenis, styling, pustaka yang sudah dipakai per pekerjaan (ikon, toast, form, data, animasi, tes), skrip pengecekan milik proyek. Tidak mengubah apa pun; `--json` untuk mesin |
| `setup` | Proyek sudah ada (stack apa pun): menyesuaikan diri, menampilkan paket opsional, dan **tidak memasang apa pun tanpa persetujuan** (`--approve`). Folder kosong: menanyakan stack (Next.js, Vite + React, HTML/CSS/JS murni), membuat proyeknya, lalu memasang paket |

| Opsi | Arti |
|---|---|
| `--agent claude,opencode,codex,antigravity` | Pilih alat tertentu (bawaan: `all`) |
| `--global` | Pasang di folder pengguna, berlaku untuk semua proyek |
| `--dir <path>` | Folder proyek (bawaan: folder saat ini) |
| `--stack next\|vite\|vanilla` | Stack untuk `setup` di folder kosong (`vanilla` = HTML, CSS, JS murni, tanpa npm). Tanpa opsi ini, `setup` bertanya |
| `--preset full\|no-3d\|lite` | Pilihan paket untuk `setup` dan `doctor` |
| `--pm npm\|pnpm\|yarn\|bun` | Manajer paket (bawaan: terdeteksi dari lockfile) |
| `--with-agents-md` | Tambah blok aturan ke `AGENTS.md` dan `CLAUDE.md` (tidak menimpa isi Anda) |
| `--approve` | Persetujuan Anda: memasang paket opsional yang ditampilkan `setup` di proyek yang sudah ada, atau (bersama `--stack next\|vite`) menambahkan framework ke folder yang sudah berisi proyek |
| `--only a,b` | Bersama `--approve`: pasang hanya paket ini dari daftar (yang benar-benar dibutuhkan rencana desain) |
| `--json` | Bersama `detect`: keluaran untuk mesin |
| `--no-backup` | Jangan buat `AGENTS.md.fvk-backup` / `CLAUDE.md.fvk-backup` sebelum mengubah berkas yang sudah ada |
| `--no-browsers` | Lewati unduhan browser Playwright |
| `--force` | Timpa atau hapus folder skill yang punya perubahan lokal |
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

## Aman untuk proyek Anda

Kit tidak menimpa berkas yang sudah ada.

| Yang dilakukan | Aturannya |
|---|---|
| `install` | Hanya menulis folder `glass-motion-frontend/` di dalam folder skill. Skill lain dan berkas proyek tidak disentuh |
| Folder skill sudah ada dan identik | Dilewati ("up to date") |
| Folder skill sudah ada tapi Anda mengubahnya, atau ada berkas tambahan, atau itu skill lain dengan nama sama | **Dilewati**, daftar berkas yang berbeda ditampilkan, tidak ada yang diubah. Pakai `--force` bila memang ingin menimpa |
| `--with-agents-md` | `AGENTS.md` yang sudah ada tidak ditimpa: kit menambahkan satu blok di antara penanda `<!-- glass-motion-frontend:start/end -->` di akhir berkas. Teks Anda di luar blok tidak diubah satu karakter pun (akhir baris CRLF dan teks tanpa baris baru di akhir ikut dijaga), dan sebelum mengubah berkas yang sudah ada kit menyimpan salinan `AGENTS.md.fvk-backup`. Menjalankan ulang hanya memperbarui isi blok. Penanda yang rusak (misalnya hanya ada `start`) membuat kit berhenti tanpa mengubah apa pun |
| `CLAUDE.md` | Dibuat dengan satu baris `@AGENTS.md` jika belum ada. Jika sudah ada, teks Anda tetap di atas dan blok `@AGENTS.md` ditambahkan di akhir (dilewati bila Anda sudah mengimpor `@AGENTS.md`, atau bila `CLAUDE.md` adalah symlink ke `AGENTS.md`) |
| `setup` | Paket yang sudah ada di `package.json` dilewati, versi Anda tidak diubah. `biome init` hanya jalan jika belum ada `biome.json`. Di folder kosong, proyek dibuat di folder sementara lalu hanya berkas yang **belum ada** yang disalin masuk; `AGENTS.md`, `CLAUDE.md`, `.claude/`, `README.md` Anda dan berkas lain tidak ditimpa. `.gitignore` yang sudah ada hanya ditambah entri yang kurang (misalnya `node_modules`), tidak ada yang dihapus |
| `uninstall` | Menolak menghapus folder skill yang sudah Anda ubah, kecuali `--force`. Dengan `--with-agents-md`, hanya blok kit yang dibuang dari `AGENTS.md` dan `CLAUDE.md`; teks Anda dikembalikan seperti semula |

Ingin mengubah skill? Edit di fork repo ini, bukan di folder hasil pemasangan, supaya pembaruan berikutnya tidak berbenturan. Cek dulu dengan `--dry-run` bila ragu.

## Pertanyaan umum

**Folder proyek masih kosong, apa yang terjadi?** `install` tetap jalan di folder kosong (skill dipasang di path saat ini). Lalu `setup` bertanya proyek mau dibangun dengan apa: Next.js (disarankan), Vite + React, atau HTML/CSS/JS murni. Pilihan HTML/CSS/JS murni membuat `index.html`, `css/styles.css`, `js/main.js` tanpa npm, dan skill memakai mode tanpa framework ([references/vanilla.md](skills/glass-motion-frontend/references/vanilla.md)): pustaka khusus React (coss ui, Magic UI, Tremor, dan lain-lain) tidak dipakai. Saat dijalankan agen AI (tanpa terminal interaktif), `setup` berhenti dengan kode 2 dan pesan `NEEDS_STACK`; agen diminta bertanya kepada Anda, lalu menjalankan ulang dengan `--stack`.

**Proyek saya sudah berjalan (Next.js, React, Vue, Svelte, Angular, dan lain-lain).** Kit menyesuaikan diri, bukan mengubah proyek Anda. `setup` tidak memasang framework, UI kit, linter, atau test runner apa pun sendiri: ia hanya menampilkan paket opsional (paket yang sudah ada dan alat yang menggandakan alat Anda, misalnya ESLint/Prettier vs Biome, Jest vs Vitest, Cypress vs Playwright, tidak ditawarkan) dan berhenti dengan kode 3 / `NEEDS_APPROVAL` sampai Anda setuju. Di terminal interaktif ia bertanya `[y/N]`; agen AI diminta menanyakannya kepada Anda lebih dulu. Proyek non-React hanya ditawari paket netral-framework (`motion`, `lenis`, `zod`, alat uji) dan mengikuti panduan CSS murni di `references/vanilla.md`; pustaka khusus React tidak dipakai.

**Sudah punya situs HTML biasa (ada `index.html`, tanpa `package.json`)?** `setup` mengenalinya sebagai proyek tanpa framework dan tidak memasang atau mengubah apa pun.

**Proyek saya bukan JavaScript (Laravel, Django, Rails, WordPress, Go, .NET, Hugo, Jekyll).** Dikenali sebagai proyek yang berjalan: skill menaruh token, glass, dan motion di template, stylesheet, dan skrip milik proyek (lihat [references/adapt.md](skills/glass-motion-frontend/references/adapt.md)), tanpa menambah npm atau framework. `setup --stack next` ke folder seperti ini ditolak dengan kode 4 / `NEEDS_CONFIRMATION` kecuali Anda menyetujui dengan `--approve`.

**Monorepo.** `detect` di root menampilkan paket-paketnya; jalankan di paket yang diubah dengan `--dir <paket>`. Tidak ada yang dipasang di root.

**`npm install` gagal dengan `ERESOLVE` saat `setup`?** Di proyek baru, `@types/node` otomatis dinaikkan ke `^22` (yang diminta `vitest@5`) dan bila masih bentrok dicoba ulang sekali dengan `--legacy-peer-deps`. Di proyek yang sudah berjalan, `setup` tidak memaksa: ia menjelaskan penyebabnya dan tiga pilihan, `package.json` tidak berubah.

**Skill sudah terpasang di folder yang salah.** Jalankan `uninstall` di folder tersebut, lalu `install` lagi di folder proyek yang benar.

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
├── bin/cli.mjs, lib.mjs            # CLI: install, uninstall, doctor, detect, setup
├── skills/glass-motion-frontend/
│   ├── SKILL.md                    # prinsip, kepemilikan pustaka, workflow, aturan rasa
│   ├── presets.json                # paket npm per preset
│   ├── references/                 # library-map, recipes, quality-gates, vanilla
│   └── scripts/                    # setup.mjs (pilih stack, buat proyek, pasang paket), lib/, templates/vanilla/
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
