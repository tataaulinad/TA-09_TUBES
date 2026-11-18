<?php

use Illuminate\Support\Facades\Route;
use Modules\UserManagement\Http\Controllers\UserManagementController;

/*
|--------------------------------------------------------------------------
| Modul UserManagement — CRUD Inertia (khusus admin)
|--------------------------------------------------------------------------
| Wajib login (auth) + role admin. User biasa mendapat 403, tamu diarahkan ke login.
*/
Route::middleware(['auth', 'role:admin'])
    ->prefix('users')
    ->name('users.')
    ->group(function () {
        Route::get('/', [UserManagementController::class, 'index'])->name('index');
        Route::get('/create', [UserManagementController::class, 'create'])->name('create');
        Route::post('/', [UserManagementController::class, 'store'])->name('store');
        Route::get('/{user}/edit', [UserManagementController::class, 'edit'])->name('edit');
        Route::put('/{user}', [UserManagementController::class, 'update'])->name('update');
        Route::delete('/{user}', [UserManagementController::class, 'destroy'])->name('destroy');
    });
