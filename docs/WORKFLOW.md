# Workflow: dari brief sampai halaman yang nyaman dipakai

Alur ini dipakai berulang untuk setiap halaman atau fitur. Skill `glass-motion-frontend` menjalankan urutan yang sama secara otomatis.

## Gambaran besar

```
Brief → Design plan → Scaffold → Compose → Behavior → Feel → Verify → Report
  1         2            3          4          5         6       7        8
```

## Tahap demi tahap

| # | Tahap | Yang dikerjakan | Pustaka utama | Hasil (bukti) |
|---|---|---|---|---|
| 1 | Brief | Tentukan subjek, audiens, tugas utama halaman | - | Satu kalimat konteks |
| 2 | Design plan | Palet 4-6 warna, tipografi, model kedalaman, satu momen ikonik, anggaran gerak, wireframe ASCII | - | Rencana 10-15 baris, sudah direview |
| 3 | Scaffold | Proyek Next.js, Tailwind v4, Biome, shadcn dengan coss style | coss ui, Biome | `pnpm dev` jalan |
| 4 | Compose | Token + utilitas `glass`, kontrol dari coss ui, konten asli, efek Magic UI, blok data Tremor, ikon Lucide, ilustrasi unDraw | coss ui, Magic UI, Tremor, Lucide, unDraw | Halaman statis yang sudah rapi |
| 5 | Behavior | Form, data, tabel, state di URL, notifikasi | React Hook Form, TanStack, nuqs, Sonner | Semua alur jalan, ada state loading/kosong/error |
| 6 | Feel | Gerak mikro, transisi layout, scroll halus, momen 3D | motion, lenis, R3F | Terasa halus di mobile menengah |
| 7 | Verify | Lint, tipe, unit test, e2e + screenshot + aksesibilitas, profil render | Biome, Vitest, Playwright, React Scan | Semua gerbang lulus |
| 8 | Report | Ringkas apa yang dibuat, apa yang ditinggalkan, kenapa | - | Laporan singkat |

## Aturan kerja sama antar pustaka

```
coss ui        = tulang (kontrol aksesibel, konsisten)
Magic UI       = aksen (1-3 efek per layar, sesuai anggaran gerak)
Tremor         = data (grafik, KPI)
motion + lenis = rasa (respon sentuhan, transisi, scroll)
R3F            = kedalaman (satu momen, ada poster cadangan)
RHF + TanStack + nuqs + Sonner = perilaku (form, data, URL, umpan balik)
Biome + Vitest + Playwright + React Scan = gerbang mutu
```

Satu pekerjaan, satu pustaka. Jika ada dua kandidat (mis. toast coss vs Sonner), pilih yang ada di tabel kepemilikan dan jangan pasang keduanya.

## Siklus per fitur (pakai di prompt)

1. "Tulis design plan untuk <fitur>, jangan koding dulu."
2. Review dan setujui rencana (atau minta ubah satu bagian).
3. "Bangun sesuai rencana, jalankan semua gerbang mutu, tampilkan laporan."
4. Lihat screenshot, beri satu catatan perbaikan, ulangi tahap 6-7 saja.

## Aturan gerbang (stop rules)

- Gerbang gagal → perbaiki dulu, jangan lanjut menambah fitur.
- Dua kali gagal pada gerbang yang sama → berhenti, jelaskan penyebab, minta keputusan.
- Efek di luar anggaran gerak → hapus, bukan dipertahankan "karena bagus".
