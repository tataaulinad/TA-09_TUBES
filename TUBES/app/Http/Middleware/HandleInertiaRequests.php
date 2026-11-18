<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * Root view Inertia (resources/views/app.blade.php).
     */
    protected $rootView = 'app';

    /**
     * Shared props — otomatis tersedia di SEMUA halaman React.
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'is_admin' => $user->isAdmin(),
                    'inisial' => $user->inisial,
                ] : null,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'info' => fn () => $request->session()->get('info'),
            ],
            // URL dibuat dari route() supaya tetap benar walau app berjalan di subfolder (XAMPP).
            'nav' => [
                'beranda' => route('beranda'),
                'laporan' => route('laporan.index'),
                'chat' => route('chat'),
                'profile' => route('profile'),
                'logout' => route('logout'),
                'users' => $user?->isAdmin() ? route('users.index') : null,
            ],
        ]);
    }
}
