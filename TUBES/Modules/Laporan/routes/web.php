<?php

use Illuminate\Support\Facades\Route;
use Modules\Laporan\Http\Controllers\LaporanController;

/*
|--------------------------------------------------------------------------
| Modul Laporan — CRUD AJAX (admin + user)
|--------------------------------------------------------------------------
| index  → Inertia::render('Laporan::index')  (kerangka halaman React)
| lainnya → JSON, dipanggil dengan fetch() dari halaman React.
| Semua route: wajib login (auth) dan role admin/user.
*/
Route::middleware(['auth', 'role:admin,user'])
    ->prefix('laporan')
    ->name('laporan.')
    ->group(function () {
        Route::get('/', [LaporanController::class, 'index'])->name('index');
        Route::get('/data', [LaporanController::class, 'data'])->name('data');
        Route::post('/', [LaporanController::class, 'store'])->name('store');

        Route::get('/{laporan}', [LaporanController::class, 'show'])->whereNumber('laporan')->name('show');
        Route::put('/{laporan}', [LaporanController::class, 'update'])->whereNumber('laporan')->name('update');
        Route::delete('/{laporan}', [LaporanController::class, 'destroy'])->whereNumber('laporan')->name('destroy');

        // Berkas yang sudah diunggah dapat dibuka kembali.
        Route::get('/{laporan}/foto', [LaporanController::class, 'foto'])->whereNumber('laporan')->name('foto');

        // Verifikasi laporan: khusus admin (dilindungi middleware role:admin).
        Route::patch('/{laporan}/status', [LaporanController::class, 'status'])
            ->whereNumber('laporan')
            ->middleware('role:admin')
            ->name('status');
    });
