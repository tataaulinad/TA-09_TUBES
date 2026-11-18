<?php

namespace Modules\UserManagement\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Modules\UserManagement\Http\Requests\StoreUserRequest;
use Modules\UserManagement\Http\Requests\UpdateUserRequest;

/**
 * CRUD Inertia: setiap aksi berupa kunjungan halaman React (useForm / router)
 * dan diakhiri redirect + flash message, tanpa JSON manual.
 */
class UserManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $query = User::query()->orderBy('name');

        if ($request->filled('q')) {
            $q = $request->string('q')->toString();
            $query->where(fn ($sub) => $sub->where('name', 'like', "%{$q}%")->orWhere('email', 'like', "%{$q}%"));
        }

        if (in_array($request->role, ['admin', 'user'], true)) {
            $query->where('role', $request->role);
        }

        return Inertia::render('UserManagement::index', [
            'users' => $query->paginate(8)->withQueryString()->through(fn (User $u) => $this->transform($u)),
            'filters' => ['q' => $request->q ?? '', 'role' => $request->role ?? ''],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('UserManagement::create');
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['telepon'] = $data['telepon'] ?: '-';
        $data['status_pengguna'] = $data['status_pengguna'] ?: 'Pengguna Aktif';

        User::create($data);

        return redirect()->route('users.index')->with('success', 'Pengguna berhasil ditambahkan.');
    }

    public function edit(User $user): Response
    {
        return Inertia::render('UserManagement::edit', ['user' => $this->transform($user)]);
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $data = $request->validated();

        // Cegah admin mengunci dirinya sendiri dengan menurunkan role sendiri.
        if ($user->id === $request->user()->id && $data['role'] !== 'admin') {
            return back()->withErrors(['role' => 'Anda tidak dapat menurunkan role akun Anda sendiri.']);
        }

        if (empty($data['password'])) {
            unset($data['password']);
        }

        $user->update($data);

        return redirect()->route('users.index')->with('success', 'Data pengguna berhasil diperbarui.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($user->id === $request->user()->id) {
            return redirect()->route('users.index')->with('error', 'Anda tidak dapat menghapus akun Anda sendiri.');
        }

        $user->delete();

        return redirect()->route('users.index')->with('success', 'Pengguna berhasil dihapus.');
    }

    private function transform(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'telepon' => $u->telepon,
            'lokasi' => $u->lokasi,
            'status_pengguna' => $u->status_pengguna,
            'role' => $u->role,
            'dibuat' => optional($u->created_at)->format('d M Y'),
        ];
    }
}
