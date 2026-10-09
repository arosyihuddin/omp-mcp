# PLAN.md — Perbaikan Dashboard OMP MCP (UI Workspace + Database)

> Dokumen ini ditulis SEBELUM implementasi. Agent lain harus bisa melanjutkan hanya dengan membaca file ini.
> Setiap tugas punya: konteks temuan, file yang disentuh, langkah, dan kriteria selesai (Acceptance).
> Centang `[ ]` → `[x]` setiap tugas selesai agar progres terlihat.

---

## STATUS (diperbarui agent terakhir — baca ini dulu)

Verifikasi terakhir: `bun test tests/workspace-api.test.ts` hijau (6 tes); `cd dashboard && bun run check && bun run build` bersih.
`tests/http-tools.test.ts` & `tests/mcp-client.test.ts` punya 4 kegagalan LAMA (butuh runtime `omp`; gagal juga tanpa perubahan ini) — bukan regresi.
Catatan shell: `bun` ada di `~/.bun/bin` (tidak di PATH non-interaktif): `export PATH=$HOME/.bun/bin:$PATH`.

- [x] **FASE A selesai** (A1 skema, A2 migrasi `0002_*`, A3 repository, A4 endpoint `src/dashboard/workspace-api.ts`, A5 klien API, A6 migrasi localStorage→DB di `preferences.svelte.ts`).
  - Sisa A: `tests/workspace-db.test.ts` (tes repository murni) belum ada; `workspace-api.test.ts` sudah menutup API + traversal.
- [x] **#5** Workspace default tertutup (`Sidebar.svelte`).
- [~] **FASE B**: B1 `ui/ContextMenu.svelte` selesai (belum ada long-press sentuh). B4 `ui/Avatar.svelte` selesai. B2 Logo belum. `ui/Menu` kini punya prop `placement` (`bottom`|`top`).
- [x] **#6 Profile selesai**: `layout/ProfileCard.svelte` (menggantikan blok "MCP server connected" di footer Sidebar; StatusDot di avatar + tooltip), `layout/ProfileModal.svelte`, `stores/profile.svelte.ts` (dimuat di `App.svelte`). Palet `avatarColor` backend diganti ke kunci token: `accent|info|success|warning|danger` (nilai lama `indigo` jatuh ke `accent` di Avatar).
- [~] **FASE C (#7/#8/#9)**: `FilesView` kini dipakai `App.svelte` (route `workspace-files`), begitu juga `FavoritesView` (`workspace-favorites`).
  Selesai: menu ⋮ di list & grid (satu `ItemMenuItems`), klik kanan item & area kosong (`ContextMenu`), rename inline (+F2), create inline (toolbar "New" & menu),
  duplicate, move, delete, properties, download, copy path, sort (name/size/modified), pin vs favorit terpisah (sidebar Files memakai `prefs.pins`).
  Sisa: **Paste** (clipboard copy/cut) belum; multi-select belum;
  "Open in new tab" belum; "Copy path" menyalin `~/path` (absolut ala home) dan path relatif-home (belum relatif ke folder aktif); Places hanya Home (Documents/Downloads/Desktop belum).
- [~] **App.svelte**: Files & Favorites sudah ke `features/workspace`; **mode editor masih memakai monolit `pages/Workspace.svelte`** (props legacy `loadWorkspace` dipertahankan hanya untuk itu).
- [x] **#3 PathPicker selesai**: `features/workspace/PathPicker.svelte` (mode `file`|`directory`, breadcrumb, filter, input path, toggle hidden, keyboard ↑↓/Enter/Backspace). Sudah dipakai oleh **Move** di `FilesView` (menggantikan `NameDialog`; `NameDialog.svelte` kini yatim → hapus di FASE G bila tetap tak terpakai). Belum dipakai untuk Open File / Open Folder (menunggu #2). `bun run check` & `bun run build` bersih.
- [~] #2 Editor: `EditorView.svelte` kini memakai design token/UI bersama, mendukung multi-tab, preview tab, save per tab/save all, keyboard shortcut dasar, picker Open File/Folder, dan restore session DB. Sisa: tree rekursif/expand inline, daftar Recent di welcome, menu tab Close Others/Close All, dan drag-reorder.
- [ ] Belum dimulai: #1 logo/favicon, #4 Favorites disamakan dengan Files (+ seksi Recent dari DB), FASE G cleanup.
- Urutan lanjut yang disarankan: #2 → #4 → #1 → G.

---

## 0. Temuan awal (hasil investigasi kode)

Stack: **Bun + TypeScript** (backend), **Svelte 5 + Vite + Tailwind** (dashboard), **Drizzle ORM + bun:sqlite**.

### 0.1 Frontend (`dashboard/`)
- `src/App.svelte` merender `src/pages/Workspace.svelte` untuk 3 mode: `favorites | files | editor`
  (route: `workspace-favorites`, `workspace-files`, `workspace-editor`; lihat `src/lib/routes.ts`, `src/lib/stores/router.svelte.ts`).
- **`pages/Workspace.svelte` (~40KB, 986 baris) adalah monolit LEGACY**: `runes={false}`, memakai hex mentah
  (`bg-[#5e6ad2]`, `dark:bg-[#0b0b0d]`, `border-[#1b1c1f]/[.10]`), ukuran font kecil (`text-[9px]`, `text-[10px]`),
  tidak memakai komponen UI bersama. Inilah penyebab tema editor / modal picker / halaman favorit tidak konsisten.
- **`src/features/workspace/*` sudah berisi versi refaktor yang bertoken & modular, tetapi TIDAK dipakai siapa pun**
  (tidak ada import ke `FilesView`/`FavoritesView`):
  `FilesView, FilesToolbar, FilesSidebar, FileList, FileGrid, FileItemMenu, FileIcon, FilePreview, FavoritesView,`
  `actions.ts, browser.svelte.ts, editor.svelte.ts, preferences.svelte.ts, preview.svelte.ts, file-utils.ts`.
  → **Strategi: pakai `features/workspace` sebagai basis, lalu hapus monolit `pages/Workspace.svelte`.**
- Design tokens ada di `src/lib/styles/tokens.css` (palet Linear-style: canvas/surface/line/fg*/accent indigo `94 106 210`,
  mode `.dark`). Aturan di file itu: **komponen hanya boleh memakai token semantik** (`bg-surface`, `text-fg-muted`,
  `border-line`, `bg-accent`, …), JANGAN hex mentah.
- Komponen UI bersama: `src/lib/components/ui/` (`Button, IconButton, Menu, MenuItem, Modal, ConfirmDialog, Input,`
  `SearchInput, SegmentedControl, Card, Panel, Skeleton, EmptyState, Switch, Badge, StatusDot, …`).
- State favorit/recents/view/hidden saat ini di **localStorage** (`preferences.svelte.ts`, `lib/utils/storage.ts`).
- `FileList.svelte` (mode list) belum punya tombol titik-3; `FileGrid` sudah (via `FileItemMenu.svelte`).
  Menu saat ini hanya: Add/Remove favorite, `Open folder`/`Edit`, Delete.
- `Sidebar.svelte`: `let workspaceOpen = $state(true)` (baris ~10) → selalu terbuka.
  Footer sidebar (baris ~114-125) berisi blok "MCP server connected / Streamable HTTP · local".
- Logo/favicon: `dashboard/public/favicon.svg` (gradient cokelat `#412d15→#000`, huruf krem) — tidak cocok tema indigo/Linear.
  Dipakai di `dashboard/index.html` dan 2× di `Sidebar.svelte` (`<img src="/favicon.svg">`).

### 0.2 Backend (`src/`)
- `src/dashboard/index.ts` menangani semua `/api/*` dengan if-chain `url.pathname`; sandbox file lewat
  `workspacePath()` (root = `homedir()`, tolak path di luar root). Endpoint workspace yang ada:
  `GET /api/workspace` (list), `DELETE /api/workspace`, `GET|PUT /api/workspace/file` (batas 512KB), `GET /api/workspace/preview`.
  Static dashboard dilayani dari `dashboard/dist/` (jadi perlu `bun run build` di `dashboard/` agar perubahan terlihat).
- **Database sudah ada**: `src/control-plane/db/{schema.ts,index.ts,migrations/}`; SQLite di
  `${OMP_DATA_DIR:-/var/lib/omp-mcp}/control-plane.db`, `migrate()` otomatis saat boot. Tabel sekarang:
  `tool_configs`, `tool_call_logs`. Migrasi: `0000_majestic_hiroim.sql`, `0001_add_tool_call_log_result.sql`.
  `drizzle.config.ts` → schema `./src/control-plane/db/schema.ts`, out `./src/control-plane/db/migrations`.
- Belum ada tabel untuk profile, pin, favorit, recent, preferensi workspace, maupun sesi editor.

---

## 1. Keputusan arsitektur (ikuti ini agar konsisten)

1. **Satu sumber UI**: `dashboard/src/features/workspace/*` (Svelte 5 runes). Hapus `pages/Workspace.svelte` di akhir.
   `pages/Workspace.svelte` diganti halaman tipis yang memilih view: `FavoritesView | FilesView | EditorView`.
2. **Hanya token warna**. Dilarang hex/`text-[9px]`. Pakai skala teks yang sama dengan komponen lain (`text-base`, `text-sm`, `text-xs`).
3. **Persistensi pindah ke database** lewat REST baru; localStorage hanya fallback/migrasi satu kali.
4. **Pin ≠ Favorit** (dua konsep & dua tabel terpisah):
   - **Pin** = jalan pintas folder di sidebar halaman Files (bagian "Pinned"), untuk navigasi cepat.
   - **Favorit** = koleksi di halaman Favorites (file/folder penting, tampil sebagai kartu).
5. **Semua operasi file lewat sandbox `workspacePath()`** (tidak boleh keluar dari home, tolak traversal `..`, tolak symlink keluar root jika memungkinkan).
6. Kode backend baru dipisah modul, jangan menumpuk di `src/dashboard/index.ts`:
   `src/control-plane/workspace/` (repository DB) + `src/dashboard/workspace-api.ts` (handler HTTP), dipanggil dari `index.ts`.

---

## 2. Urutan pengerjaan

| Fase | Isi | Tugas |
|------|-----|-------|
| A | Fondasi DB + API (backend) | #10, bagian backend #7/#8 |
| B | Komponen UI bersama baru (ContextMenu, Logo, Tabs) | #1, #8 |
| C | Files page | #7, #8, #9 |
| D | Favorites page | #4, #9 |
| E | Editor (multi-tab, tree, picker modal) | #2, #3 |
| F | Sidebar app (Workspace tertutup, Profile) | #5, #6 |
| G | Cleanup monolit, build, test, README | semua |

Kerjakan A dulu karena C–F bergantung pada endpoint/store-nya.

---

## 3. FASE A — Database & API (Tugas #10)

### A1. Skema Drizzle baru — `src/control-plane/db/schema.ts`
Tambahkan tabel (semua timestamp `text` ISO, konsisten dengan tabel lama):

```ts
profile            // singleton, id = 'default'
  id text PK ('default'), displayName text NOT NULL, role text, avatarColor text, createdAt, updatedAt

workspace_pins     // pin folder di sidebar Files
  path text PK, name text NOT NULL, sortOrder integer NOT NULL default 0, createdAt

workspace_favorites // halaman Favorites
  path text PK, name text NOT NULL, type text NOT NULL ('file'|'directory'), createdAt

workspace_recents
  path text PK, name text NOT NULL, openedAt text NOT NULL   // index pada openedAt; simpan max 20 (prune)

workspace_prefs    // key-value preferensi UI
  key text PK, value text NOT NULL, updatedAt            // key: view ('list'|'grid'), showHidden, sortBy, sortDir

editor_sessions    // state editor per root folder (restore tab saat reload)
  root text PK, tabs text NOT NULL (JSON array path[]), activePath text, updatedAt
```
Export tipe `$inferSelect` / `$inferInsert` seperti pola yang ada.

### A2. Migrasi
- Jalankan `bunx drizzle-kit generate --name workspace_profile_pins_favorites` → hasilkan `0002_*.sql` + update `meta/_journal.json` & snapshot.
- Jangan edit migrasi lama. Pastikan `migrate()` di `db/index.ts` menjalankannya otomatis saat boot.
- Seed profile default (idempotent) saat repository dipanggil pertama kali: `displayName = os.userInfo().username`, `role = "Administrator"` (bisa diedit), `avatarColor` dari palet accent.

### A3. Repository — `src/control-plane/workspace/index.ts`
Fungsi murni berbasis `db` (drizzle): `getProfile/updateProfile`, `listPins/addPin/removePin/reorderPins`,
`listFavorites/addFavorite/removeFavorite`, `listRecents/touchRecent/clearRecents` (prune ke 20),
`getPrefs/setPref`, `getEditorSession/saveEditorSession`. Validasi input (path string non-kosong, tipe enum).

### A4. Endpoint REST — `src/dashboard/workspace-api.ts` (dipanggil dari `src/dashboard/index.ts` sebelum `serveAsset`)

| Method & Path | Fungsi |
|---|---|
| `GET /api/profile` · `PUT /api/profile` | baca / ubah profile `{displayName, role, avatarColor}` |
| `GET /api/workspace/state` | satu panggilan: `{pins, favorites, recents, prefs}` untuk bootstrap UI |
| `POST /api/workspace/pins` `{path,name}` · `DELETE /api/workspace/pins?path=` · `PUT /api/workspace/pins/order` | pin |
| `POST /api/workspace/favorites` `{path,name,type}` · `DELETE /api/workspace/favorites?path=` | favorit |
| `POST /api/workspace/recents` `{path,name}` · `DELETE /api/workspace/recents` | recent |
| `PUT /api/workspace/prefs` `{key,value}` | preferensi |
| `GET|PUT /api/workspace/editor-session?root=` | restore/simpan tab editor |
| **FS baru** `POST /api/workspace/create` `{path,type:'file'|'directory'}` | buat file/folder (409 jika sudah ada) |
| `POST /api/workspace/rename` `{path,newName}` | rename (validasi nama: tanpa `/`, bukan `.`/`..`, 409 jika bentrok) |
| `POST /api/workspace/duplicate` `{path}` | salin dengan suffix ` copy` |
| `POST /api/workspace/move` `{path,destDir}` | pindah |
| `GET /api/workspace/stat?path=` | info/properties (size, mtime, ctime, mode, tipe, jumlah isi folder) |
| `GET /api/workspace/download?path=` | unduh file (`content-disposition: attachment`) |

Semua handler: `try/catch` → `Response.json({error}, {status})`; 400 input salah, 404 tidak ada, 409 konflik, header `cache-control: no-store`.
Setelah rename/move/delete: bersihkan/rewrite referensi di tabel pins/favorites/recents/editor_sessions
(update `path` bila rename, hapus bila delete) agar tidak ada entri yatim.

### A5. Klien API — `dashboard/src/lib/api/index.ts`
Tambah `profileApi`, perluas `workspaceApi` (create, rename, duplicate, move, stat, downloadUrl) dan
`workspaceStateApi` (state, pins, favorites, recents, prefs, editorSession). Tambah tipe di `src/lib/types/index.ts`.

### A6. Migrasi data localStorage → DB (sekali jalan)
Di `preferences.svelte.ts`: saat `init()`, jika key lama (`omp-workspace-favorites`, `omp-workspace-recents`,
`omp-workspace-view`, `omp-workspace-hidden`) ada dan DB kosong → POST ke DB lalu hapus key lama.
Store memakai **optimistic update + rollback** bila request gagal; render awal dari `GET /api/workspace/state`.

**Acceptance A:** `bun test` hijau (tambah `tests/workspace-db.test.ts` & `tests/workspace-api.test.ts` dengan DB temp via `OMP_DATA_DIR`);
restart server → pin/favorit/profile/prefs tetap ada; traversal (`../../etc/passwd`) ditolak.

---

## 4. FASE B — Komponen bersama baru (`dashboard/src/lib/components/`)

- **B1. `ui/ContextMenu.svelte`**: menu klik-kanan di posisi kursor; clamp ke viewport; tutup dengan Esc / klik luar / scroll / resize;
  navigasi keyboard (↑↓ Enter); dukung long-press di layar sentuh. Pakai ulang `MenuItem` (+ varian `separator`, `shortcut`, `tone="danger"`).
  Export lewat `ui/index.ts`.
- **B2. `layout/Logo.svelte`**: logo inline SVG (lihat #1) dengan prop `size` dan `mark | full`.
- **B3. `ui/Tabs`** (opsional bila dibuat generik; boleh langsung di `features/workspace/EditorTabs.svelte`).
- **B4. `ui/Avatar.svelte`**: lingkaran inisial dari `displayName` + `avatarColor`, dipakai Profile.

---

## 5. Tugas per item permintaan

### #1 Redesain logo & favicon agar sesuai tema  `[ ]`
Tema: Linear-style, aksen indigo `94 106 210` (`#5E6AD2`), canvas gelap `8 9 10`, teks `247 248 248`.
Langkah:
1. Rancang ulang mark baru (monogram **"O"/node-MCP**: cincin/kotak membulat + titik konektor, geometris, 2 warna) — gradien halus indigo
   (`#7C86E8 → #5E6AD2 → #4F5BC4`) di atas rounded-square gelap, atau mark putih di atas indigo. Hilangkan palet cokelat/krem lama.
2. Tulis ulang `dashboard/public/favicon.svg` (viewBox 64×64, tetap terbaca di 16×16; tambahkan `@media (prefers-color-scheme)`
   di dalam SVG bila perlu agar kontras di tab terang & gelap).
3. Buat `Logo.svelte` (inline SVG, memakai `currentColor`/CSS var `--c-accent`) dan ganti 2 `<img src="/favicon.svg">` di `Sidebar.svelte`;
   wordmark "OMP MCP" tetap di sebelah mark.
4. Tambah aset turunan di `dashboard/public/`: `favicon-32.png`, `apple-touch-icon.png` (180), dan update `dashboard/index.html`
   (`<link rel="icon" ...>`, `apple-touch-icon`, `<meta name="theme-color">` terang & gelap).
**Acceptance:** tab browser menampilkan ikon indigo baru; sidebar (expanded & collapsed rail) memakai komponen `Logo`; tidak ada sisa warna cokelat.

### #2 Refactor halaman Editor: sidebar kosong awalnya + multi-file view (tab) ala VS Code  `[ ]`
File: baru `features/workspace/EditorView.svelte`, `EditorTabs.svelte`, `EditorTree.svelte`, `EditorWelcome.svelte`;
ubah `editor.svelte.ts`; ubah `pages/Workspace.svelte`.
1. **Sidebar kosong saat awal**: jika `editor.root === ''` tampilkan `EditorWelcome` (empty state: tombol **Open Folder**, **Open File**, daftar
   Recent dari DB). Tree TIDAK memuat direktori apa pun sampai user memilih folder/file (tidak ada auto `loadDir('.')`).
   Perhatikan `App.svelte` — `loadWorkspace` hanya boleh jalan untuk Files, bukan Editor.
2. **Tree eksplorer sungguhan**: folder dapat di-expand/collapse inline (lazy-load anak saat expand, cache per path, indent per level),
   bukan sekadar daftar flat yang berganti direktori. Header sidebar = nama folder root + tombol refresh/collapse-all/new file/new folder.
   Klik kanan pada node → ContextMenu (New File, New Folder, Rename, Delete, Copy path).
3. **Multi-tab**: ganti state tunggal (`path/name/content/saved`) menjadi
   `tabs: {path, name, content, saved, language?, preview: boolean}[]` + `activePath`.
   - Klik 1× file di tree = **preview tab** (judul miring, diganti saat membuka file lain); klik 2× / mulai mengetik = tab permanen.
   - Tab: ikon file, nama, penanda dirty `●` yang berubah jadi `×` saat hover, scroll horizontal saat penuh, klik tengah = tutup,
     drag-reorder (opsional tahap 2), menu klik-kanan tab: Close, Close Others, Close Saved, Close All, Copy Path.
   - Menutup tab dirty → `ConfirmDialog` (Save / Don't save / Cancel) — ganti `window.confirm`.
   - Shortcut: `Ctrl/Cmd+S` simpan, `Ctrl/Cmd+W` tutup tab, `Ctrl+Tab`/`Ctrl+Shift+Tab` pindah tab, `Ctrl/Cmd+Shift+S` simpan semua.
   - Membuka file yang sudah terbuka → fokus ke tab itu (tanpa duplikasi).
   - Breadcrumb path di atas area editor; status bar bawah (baris:kolom, panjang, encoding UTF-8, dirty).
4. **Restore sesi**: simpan tab terbuka + tab aktif ke `editor_sessions` (debounce ~500 ms) dan pulihkan saat membuka folder yang sama.
5. **Binary/besar**: file non-teks atau >512KB → tab menampilkan pesan + tombol Download/Preview, bukan textarea (API sudah menolak >512KB).
6. Editor teks tetap `<textarea>` monospace bertoken (`font-mono text-sm bg-surface`); nomor baris sebagai gutter sederhana (opsional).
   Bila ingin lebih jauh (tahap 2): CodeMirror 6 — JANGAN tambah dependensi besar tanpa konfirmasi.
**Acceptance:** buka Editor pertama kali → sidebar kosong + welcome; pilih folder → tree muncul; buka ≥3 file → 3 tab, edit tab berbeda
mempertahankan isi masing-masing; Ctrl+S menyimpan tab aktif; tutup tab dirty memunculkan dialog; reload mengembalikan tab.

### #3 Refactor modal pilih file/folder (Open File / Open Folder) sesuai tema  `[ ]`
Sumber masalah: picker di monolit memakai hex mentah & `text-[9px]`.
Buat `features/workspace/PathPicker.svelte` di atas `ui/Modal.svelte` (token saja):
- Header: judul ("Open File"/"Open Folder"), tombol tutup (`IconButton`), **breadcrumb** klik-able dari Home, tombol Up/Back.
- Toolbar: `SearchInput` filter, toggle show hidden, opsional kolom input path (ketik lalu Enter).
- Daftar: baris tinggi 36px memakai `FileIcon`, nama, ukuran & tanggal (kolom redup `text-fg-faint`), hover `bg-surface-hover`, terpilih `bg-surface-active`
  + ring accent; folder diurutkan dulu; skeleton saat loading; `EmptyState`/error bertoken.
- Perilaku: mode **file** → klik folder = masuk, klik file = pilih, dobel-klik/Enter = buka; mode **folder** → klik = pilih baris,
  dobel-klik = masuk, tombol primer **"Open this folder"** membuka folder yang sedang ditelusuri (atau yang dipilih).
- Footer: path terpilih (mono, truncate) + `Button` Cancel (ghost) & Open (primary, disabled bila belum ada pilihan).
- Aksesibilitas: `role="dialog"`, focus trap & Esc dari `Modal`, navigasi panah.
- Gunakan komponen yang sama untuk dialog lain (Move to…).
**Acceptance:** modal terlihat identik gaya dengan `ConfirmDialog`/halaman Files di light & dark; nol hex mentah (`grep -n "#[0-9a-fA-F]\{3,6\}"` kosong).

### #4 Refactor halaman Favorites agar seperti Files (palet & kartu)  `[ ]`
Layout aplikasi (sidebar utama) TIDAK diubah. Ubah isi halaman:
- Pakai `features/workspace/FavoritesView.svelte` (sudah bertoken) sebagai basis, **samakan** dengan `FilesView`: header/toolbar yang sama
  (`SearchInput`, `SegmentedControl` list/grid, toggle hidden), item memakai `FileGrid`/`FileList` + `FileItemMenu` yang sama
  (komponen dipakai ulang, bukan duplikat).
- Kartu: gaya `Card` yang sama dengan grid Files (`bg-surface-raised border-line rounded-lg shadow-card`, hover `bg-surface-hover`, ikon `FileIcon`,
  badge tipe, path induk redup).
- Seksi: **Favorites** (dari DB `workspace_favorites`) dan **Recent folders** (dari `workspace_recents`); `EmptyState` bila kosong
  (teks petunjuk: "Klik kanan atau ⋮ pada file/folder → Add to favorites").
- Klik kartu: folder → buka di Files; file teks → buka di Editor (tab); file media → preview (pakai `FilePreview`).
- Hapus semua hex/`opacity-45`/`text-[10px]` dari versi lama.
**Acceptance:** Favorites & Files tampak satu keluarga (spacing, radius, warna, tipografi sama) di light & dark.

### #5 Menu Workspace default tertutup  `[x]`
`dashboard/src/lib/components/layout/Sidebar.svelte`: ubah `let workspaceOpen = $state(true)` → `$state(false)`.
Jangan auto-buka saat route workspace aktif (induk "Workspace" sudah menyorot dirinya saat tertutup — logika `router.inWorkspace && (collapsed || !workspaceOpen)` sudah ada).
Tidak dipersist: setiap load awal tertutup; user bisa membuka manual selama sesi.
**Acceptance:** reload di halaman mana pun → submenu Workspace tertutup; klik membuka/menutup; rail collapsed tetap lompat ke Files.

### #6 Ganti blok "MCP server connected" menjadi Profile  `[x]`
Lokasi: footer `Sidebar.svelte` (blok `div.rounded-md.border.border-line` berisi `StatusDot`, "MCP server connected", "Streamable HTTP · local").
1. Buat `layout/ProfileCard.svelte`: `Avatar` (inisial) + `displayName` + `role`; di avatar tetap ada **StatusDot kecil** (hijau = MCP connected,
   abu = offline) dengan `title="MCP server connected"` agar info koneksi tidak hilang.
2. Rail collapsed: hanya avatar (tengah). Klik card → `Menu` pop-up ke atas: **Edit profile**, **Theme** (toggle terang/gelap dari `theme.svelte.ts`),
   baris info status koneksi ("Streamable HTTP · local").
3. `ProfileModal.svelte` (di atas `Modal`): edit `displayName`, `role`, pilih `avatarColor` dari palet token; simpan via `PUT /api/profile`.
4. Store `lib/stores/profile.svelte.ts`: load saat mount (`App.svelte`), optimistic update.
**Acceptance:** footer sidebar menampilkan profile dari DB; edit nama → bertahan setelah reload; status koneksi masih terbaca lewat dot/tooltip.

### #7 Files — mode list punya menu ⋮ + menu lengkap ala file manager  `[~]` (lihat STATUS)
File: `FileList.svelte`, `FileGrid.svelte`, `FileItemMenu.svelte`, `actions.ts`, `browser.svelte.ts`, `FilesView.svelte`.
1. `FileList.svelte`: tambah kolom aksi di ujung kanan setiap baris berisi `FileItemMenu` (muncul saat hover/fokus pada desktop, selalu tampak di mobile).
2. Jadikan **satu definisi menu** dipakai bersama oleh ⋮ (list & grid) dan klik kanan item (#8) — satu fungsi `buildItemMenu(item)`.
3. **Ganti "Open folder" → "Rename"** (inline rename: nama berubah jadi `Input`, Enter simpan, Esc batal, sorot nama tanpa ekstensi; panggil `POST /api/workspace/rename`; 409 → pesan error inline). Shortcut `F2`.
4. Susunan menu (dengan separator):
   - **Open** (folder: masuk; file: preview/editor) · **Open in Editor** (file) / **Open as Project in Editor** (folder) · **Open in new tab**(bila ada)
   - **Rename** (F2) · **Duplicate** · **Move to…** (PathPicker mode folder) · **Copy path** · **Copy relative path**
   - **Pin to sidebar** / **Unpin** (hanya folder) · **Add to favorites** / **Remove from favorites**
   - **Download** (file) · **Properties** (modal bertoken memakai `GET /api/workspace/stat`: nama, tipe, lokasi, ukuran, dibuat, diubah, izin)
   - Khusus folder: **New file here**, **New folder here**
   - **Delete** (tone danger, `ConfirmDialog`, shortcut `Del`)
5. Seleksi item (klik = pilih, Ctrl/Shift multi-select) agar Delete/Move/Download massal bisa dipakai — tahap lanjutan, minimal single-select.
**Acceptance:** list & grid menampilkan ⋮ dengan menu identik; Rename memperbarui nama di disk & di pin/favorit; Properties menampilkan data benar.

### #8 Files — klik kanan menampilkan menu (create folder/file)  `[~]` (tanpa Paste)
1. Pasang handler `oncontextmenu` pada: (a) setiap item → menu item (#7), (b) **area kosong** daftar → menu latar:
   **New file…**, **New folder…**, **Paste** (bila ada clipboard copy/cut internal), **Refresh**, **Sort by** (Name/Size/Modified, Asc/Desc),
   **View** (List/Grid), **Show hidden files**, **Open in Editor as project**, **Properties** folder aktif.
2. **New file/New folder**: tambahkan baris sementara di daftar dengan `Input` aktif (gaya Explorer): Enter → `POST /api/workspace/create`,
   Esc batal, validasi nama + pesan error (nama kosong, mengandung `/`, sudah ada). Setelah sukses: refresh daftar & sorot item baru; file baru
   opsional langsung dibuka di Editor.
3. Pakai `ContextMenu` (B1). Cegah menu bawaan browser hanya di area daftar; tetap izinkan di input.
4. Tombol "New" di `FilesToolbar.svelte` (dropdown: New file / New folder) sebagai jalur non-klik-kanan & untuk mobile.
**Acceptance:** klik kanan area kosong → menu muncul di posisi kursor, buat folder/file berhasil dan langsung tampil; Esc/klik luar menutup.

### #9 Files sidebar: pisahkan **Pin** dan **Favorit**  `[x]`
Saat ini `FilesSidebar.svelte` menampilkan `prefs.favorites` di bawah "Places" (padahal itu favorit).
1. Sidebar Files: **Places** (Home, + folder umum seperti Documents/Downloads/Desktop jika ada) → **Pinned** (dari `workspace_pins`, folder saja,
   bisa di-unpin via hover ✕/menu, drag-reorder opsional).
2. **Favorit tidak lagi tampil di sidebar Files**; hanya di halaman Favorites.
3. Menu item: "Pin to sidebar"/"Unpin" untuk folder, dan "Add to favorites"/"Remove from favorites" untuk file & folder (dua aksi terpisah, ikon berbeda: `Pin` vs `Star`).
4. Migrasi: entri favorit lama bertipe folder TIDAK otomatis jadi pin (tetap favorit); pin mulai kosong.
5. Ganti `prefs.favorites` pada sidebar menjadi `prefs.pins`; tambahkan store `pins` + `favorites` terpisah di `preferences.svelte.ts`.
**Acceptance:** pin folder → muncul di sidebar Files, bertahan setelah reload (DB); favorit file → hanya muncul di halaman Favorites.

### #10 Integrasi database (lihat FASE A)  `[x]`
Selesai bila semua data persisten (profile, pins, favorites, recents, prefs view/hidden/sort, sesi editor) tersimpan di SQLite, bukan localStorage,
dan skema dimigrasi lewat Drizzle (`0002_*.sql`).

---

## 6. FASE G — Cleanup & verifikasi

1. Hapus `dashboard/src/pages/Workspace.svelte` (monolit) setelah semua mode memakai `features/workspace`.
   Perbarui `App.svelte`: hapus `loadWorkspace`/prop passing lama; `FilesView` memakai `browser.svelte.ts` (sudah punya `navigate`, `items`, `path`).
   Pastikan `fill` layout untuk editor/files tetap, dan `loadWorkspace` effect tidak memuat direktori saat di Editor.
2. Hapus util/key localStorage yang tidak terpakai setelah migrasi (`storageKeys.workspace*`) — sisakan kode migrasi sekali jalan.
3. Grep kebersihan: tidak ada `#[0-9a-fA-F]{3,6}` / `text-\[\d+px\]` di `features/workspace` & `layout`.
4. Build & cek tipe: `cd dashboard && bun run build` (dan `svelte-check` jika tersedia di `package.json`); root: `bun test`.
5. Uji manual (light & dark, desktop & mobile width): Files list/grid, klik kanan, rename/create/duplicate/move/delete, pin/favorit,
   Editor multi-tab + restore, modal picker, sidebar Workspace tertutup, Profile edit, favicon.
6. Update `README.md` (bagian dashboard & API baru) dan `dashboard/README.md` (struktur `features/workspace`, aturan token).
7. Jalankan ulang service (lihat `Makefile` / `deploy/systemd`) agar `dashboard/dist` baru dilayani.

## 7. Risiko & catatan
- `OMP_DATA_DIR` default `/var/lib/omp-mcp` — di dev set ke direktori yang bisa ditulis (lihat `.env`), jika tidak DB gagal dibuat.
- Operasi FS destruktif (rename/move/delete/create) wajib melewati `workspacePath()`; tambahkan tes traversal & symlink.
- Jangan ubah migrasi lama; hanya tambah baru. Backup `control-plane.db` sebelum menjalankan migrasi di mesin produksi.
- Jangan menambah dependensi berat (editor kode) tanpa konfirmasi pemilik proyek.
- Perubahan besar pada `App.svelte`/router: pertahankan route id (`workspace-favorites|files|editor`) agar link/bookmark lama tetap jalan.
