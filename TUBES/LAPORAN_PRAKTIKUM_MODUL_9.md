# Laporan Praktikum Modul 9 — HMVC, Authorization, dan AJAX (Laravel + React)

**Nama:** M. Raihan Revansyah  |  **NIM:** 102012400270  |  **Project:** Smart Traffic Finder

## 1. Ringkasan
Project Tugas Akhir (Modul 6, Blade) dikembangkan dengan arsitektur **HMVC** memakai `nwidart/laravel-modules`. Halaman dua modul ditulis dengan **React** (Inertia.js), akses dibatasi **role admin/user** dengan middleware, dan satu modul memakai **CRUD AJAX** dengan upload berkas.

## 2. Modul dan jenis CRUD
| Modul | Jenis | Akses | Item data |
| :--- | :--- | :--- | :--- |
| UserManagement | CRUD **Inertia** (`useForm`) | admin | nama, email, telepon, lokasi, status pengguna, role, password |
| Laporan | CRUD **AJAX** (`fetch` + `FormData`) | admin + user | pelapor, lokasi, deskripsi, tingkat kemacetan, status verifikasi, berkas |

## 3. Authorization
- Middleware `EnsureUserHasRole` (alias `role`) didaftarkan di `bootstrap/app.php`.
- `Modules/UserManagement/routes/web.php`: `['auth', 'role:admin']`. `Modules/Laporan/routes/web.php`: `['auth', 'role:admin,user']`; endpoint verifikasi tambahan `role:admin`.
- Otorisasi tingkat data: user hanya boleh mengubah/menghapus laporan miliknya (`Laporan::dapatDikelolaOleh`), admin semua.
- Menu React disembunyikan untuk non-admin, tetapi penjaga sebenarnya tetap middleware di server (403).

## 4. AJAX dan upload
- `index` memuat kerangka halaman React sekali; list/tambah/ubah/hapus/verifikasi memakai `fetch()` ke endpoint JSON dengan token CSRF (`resources/js/lib/http.ts`).
- Upload memakai `FormData`; ubah memakai `POST` + `_method=PUT` karena `fetch` tidak dapat mengirim PUT multipart langsung.
- Berkas disimpan di disk `public` (`storage/app/public/laporan`) dan dibuka kembali lewat `GET /laporan/{id}/foto` (hanya untuk yang login) serta modal Detail.
- Validasi gagal dikembalikan sebagai HTTP 422 dan ditampilkan di bawah field.

## 5. Pengujian
Dijalankan pada 17 Nov 2026:
- `php artisan test`: 31 tes lulus (223 assertion): login wajib, 403 untuk user di `/users`, CRUD user, CRUD AJAX Laporan, upload, buka ulang berkas, ganti/hapus berkas, validasi 422, kepemilikan laporan.
- Uji browser (Chrome headless, sqlite): admin tambah/ubah/hapus laporan + upload tanpa reload, buka berkas, CRUD user; user biasa mendapat 403 di `/users`, tombol verifikasi tidak muncul, laporan baru berstatus Menunggu. Seluruh skenario lulus.

> Tambahkan tangkapan layar halaman Laporan, Kelola User, dan halaman 403 sebelum dikumpulkan.
