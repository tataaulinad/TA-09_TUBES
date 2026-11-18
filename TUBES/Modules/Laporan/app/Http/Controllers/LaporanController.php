<?php

namespace Modules\Laporan\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Modules\Laporan\Http\Requests\StoreLaporanRequest;
use Modules\Laporan\Http\Requests\UpdateLaporanRequest;
use Modules\Laporan\Models\Laporan;
use Symfony\Component\HttpFoundation\Response;

/**
 * CRUD AJAX: halaman React hanya dimuat sekali (index),
 * seluruh operasi data setelah itu berupa JSON lewat fetch().
 */
class LaporanController extends Controller
{
    /** Kerangka halaman React 'Laporan::index'. */
    public function index(Request $request): InertiaResponse
    {
        return Inertia::render('Laporan::index', [
            'endpoints' => [
                'data' => route('laporan.data'),
                'store' => route('laporan.store'),
                // __ID__ diganti id laporan di sisi React.
                'show' => route('laporan.show', '__ID__'),
                'update' => route('laporan.update', '__ID__'),
                'destroy' => route('laporan.destroy', '__ID__'),
                'status' => route('laporan.status', '__ID__'),
            ],
            // ?baru=1 → buka form tambah, ?lihat=ID → buka detail (dipakai link dari halaman Blade).
            'buka' => [
                'baru' => $request->boolean('baru'),
                'lihat' => $request->integer('lihat') ?: null,
            ],
        ]);
    }

    /** GET /laporan/data — daftar laporan (JSON, paginasi + filter). */
    public function data(Request $request): JsonResponse
    {
        $query = Laporan::query()->orderByDesc('waktu_laporan');

        if ($request->filled('q')) {
            $q = $request->string('q')->toString();
            $query->where(function ($sub) use ($q) {
                $sub->where('lokasi', 'like', "%{$q}%")
                    ->orWhere('deskripsi', 'like', "%{$q}%")
                    ->orWhere('nama_pelapor', 'like', "%{$q}%");
            });
        }

        if ($request->filled('status') && in_array($request->status, ['pending', 'verified', 'rejected'], true)) {
            $query->where('status_verifikasi', $request->status);
        }

        $page = $query->paginate(8)->withQueryString();
        $user = $request->user();

        return response()->json([
            'data' => $page->getCollection()->map(fn (Laporan $l) => $this->transform($l, $user))->values(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    /** GET /laporan/{id} — detail satu laporan (JSON). */
    public function show(Request $request, Laporan $laporan): JsonResponse
    {
        return response()->json(['data' => $this->transform($laporan, $request->user())]);
    }

    /** POST /laporan — tambah laporan + upload berkas (multipart/form-data). */
    public function store(StoreLaporanRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        $laporan = Laporan::create([
            'user_id' => $user->id,
            'nama_pelapor' => $user->name,
            'lokasi' => $data['lokasi'],
            'deskripsi' => $data['deskripsi'],
            'tingkat_kemacetan' => $data['tingkat_kemacetan'],
            'foto' => $request->hasFile('foto') ? $request->file('foto')->store('laporan', 'public') : null,
            // Admin menentukan status; laporan user menunggu verifikasi admin.
            'status_verifikasi' => $user->isAdmin() ? ($data['status_verifikasi'] ?? 'verified') : 'pending',
            'waktu_laporan' => now(),
        ]);

        return response()->json([
            'message' => 'Laporan berhasil ditambahkan.',
            'data' => $this->transform($laporan, $user),
        ], 201);
    }

    /** PUT /laporan/{id} (dikirim sebagai POST + _method=PUT agar FormData bisa memuat file). */
    public function update(UpdateLaporanRequest $request, Laporan $laporan): JsonResponse
    {
        $user = $request->user();
        abort_unless($laporan->dapatDikelolaOleh($user), 403, 'Anda hanya boleh mengubah laporan milik sendiri.');

        $data = $request->validated();

        $laporan->fill([
            'lokasi' => $data['lokasi'],
            'deskripsi' => $data['deskripsi'],
            'tingkat_kemacetan' => $data['tingkat_kemacetan'],
        ]);

        if ($user->isAdmin() && isset($data['status_verifikasi'])) {
            $laporan->status_verifikasi = $data['status_verifikasi'];
        }

        if ($request->hasFile('foto')) {
            $this->hapusBerkas($laporan);
            $laporan->foto = $request->file('foto')->store('laporan', 'public');
        } elseif ($request->boolean('hapus_foto')) {
            $this->hapusBerkas($laporan);
            $laporan->foto = null;
        }

        $laporan->save();

        return response()->json([
            'message' => 'Laporan berhasil diperbarui.',
            'data' => $this->transform($laporan->fresh(), $user),
        ]);
    }

    /** PATCH /laporan/{id}/status — verifikasi cepat, khusus admin. */
    public function status(Request $request, Laporan $laporan): JsonResponse
    {
        $validated = $request->validate([
            'status_verifikasi' => ['required', 'in:pending,verified,rejected'],
        ]);

        $laporan->update($validated);

        return response()->json([
            'message' => 'Status laporan diperbarui.',
            'data' => $this->transform($laporan->fresh(), $request->user()),
        ]);
    }

    /** DELETE /laporan/{id} */
    public function destroy(Request $request, Laporan $laporan): JsonResponse
    {
        abort_unless($laporan->dapatDikelolaOleh($request->user()), 403, 'Anda hanya boleh menghapus laporan milik sendiri.');

        $this->hapusBerkas($laporan);
        $laporan->delete();

        return response()->json(['message' => 'Laporan berhasil dihapus.']);
    }

    /** GET /laporan/{id}/foto — buka kembali berkas yang sudah diunggah (inline di browser). */
    public function foto(Laporan $laporan): Response|RedirectResponse
    {
        abort_if(empty($laporan->foto), 404, 'Laporan ini tidak memiliki berkas.');

        // Data seeder lama berupa tautan eksternal.
        if ($laporan->fotoEksternal()) {
            return redirect()->away($laporan->foto);
        }

        abort_unless(Storage::disk('public')->exists($laporan->foto), 404, 'Berkas tidak ditemukan.');

        return Storage::disk('public')->response($laporan->foto);
    }

    private function hapusBerkas(Laporan $laporan): void
    {
        if ($laporan->foto && ! $laporan->fotoEksternal()) {
            Storage::disk('public')->delete($laporan->foto);
        }
    }

    /** Bentuk JSON yang dibaca halaman React. */
    private function transform(Laporan $l, $user): array
    {
        $tipe = null;
        if ($l->foto) {
            $tipe = $l->fotoEksternal() ? 'image' : (strtolower(pathinfo($l->foto, PATHINFO_EXTENSION)) === 'pdf' ? 'pdf' : 'image');
        }

        return [
            'id' => $l->id,
            'nama_pelapor' => $l->nama_pelapor,
            'lokasi' => $l->lokasi,
            'deskripsi' => $l->deskripsi,
            'tingkat_kemacetan' => $l->tingkat_kemacetan,
            'status_verifikasi' => $l->status_verifikasi,
            'waktu_laporan' => optional($l->waktu_laporan)->format('d M Y H:i'),
            'waktu_berlalu' => $l->waktu_berlalu,
            'foto_url' => $l->foto ? route('laporan.foto', $l->id) : null,
            'foto_tipe' => $tipe,
            'dapat_dikelola' => $l->dapatDikelolaOleh($user),
        ];
    }
}
