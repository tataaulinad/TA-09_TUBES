<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Laporan\Models\Laporan;
use Tests\TestCase;

/**
 * Pengujian Modul 9: HMVC (modul Laporan & UserManagement), authorization role, dan AJAX.
 */
class HmvcModulTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $user;

    private User $user2;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

        $this->admin = User::factory()->admin()->create(['name' => 'Admin Uji']);
        $this->user = User::factory()->create(['name' => 'User Satu']);
        $this->user2 = User::factory()->create(['name' => 'User Dua']);
    }

    private function laporan(User $pemilik, array $extra = []): Laporan
    {
        return Laporan::create(array_merge([
            'user_id' => $pemilik->id,
            'nama_pelapor' => $pemilik->name,
            'lokasi' => 'Jl. Uji Coba',
            'deskripsi' => 'Deskripsi laporan untuk pengujian.',
            'tingkat_kemacetan' => 40,
            'status_verifikasi' => 'pending',
            'waktu_laporan' => now(),
        ], $extra));
    }

    private function payload(array $extra = []): array
    {
        return array_merge([
            'lokasi' => 'Jl. Asia Afrika',
            'deskripsi' => 'Kendaraan menumpuk di simpang alun-alun.',
            'tingkat_kemacetan' => 55,
        ], $extra);
    }

    /* ---------------------------- (d) wajib login ---------------------------- */

    public function test_tamu_diarahkan_ke_login_untuk_semua_halaman_pengelolaan_data(): void
    {
        $this->get('/laporan')->assertRedirect(route('login'));
        $this->get('/users')->assertRedirect(route('login'));
        $this->get('/users/create')->assertRedirect(route('login'));
        $this->postJson('/laporan', $this->payload())->assertUnauthorized();
        $this->getJson('/laporan/data')->assertUnauthorized();
    }

    /* ------------------------ (c) role + middleware -------------------------- */

    public function test_user_biasa_ditolak_403_dari_modul_usermanagement(): void
    {
        $this->actingAs($this->user)->get('/users')->assertForbidden();
        $this->actingAs($this->user)->get('/users/create')->assertForbidden();
        $this->actingAs($this->user)->post('/users', [])->assertForbidden();
        $this->actingAs($this->user)->delete("/users/{$this->user2->id}")->assertForbidden();
        $this->assertDatabaseHas('users', ['id' => $this->user2->id]);
    }

    public function test_admin_dan_user_sama_sama_boleh_membuka_modul_laporan(): void
    {
        foreach ([$this->admin, $this->user] as $akun) {
            $this->actingAs($akun)->get('/laporan')
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page->component('Laporan::index')->has('endpoints'));
        }
    }

    public function test_hanya_admin_yang_dapat_memverifikasi_laporan(): void
    {
        $l = $this->laporan($this->user);

        $this->actingAs($this->user)->patchJson("/laporan/{$l->id}/status", ['status_verifikasi' => 'verified'])->assertForbidden();
        $this->assertSame('pending', $l->fresh()->status_verifikasi);

        $this->actingAs($this->admin)->patchJson("/laporan/{$l->id}/status", ['status_verifikasi' => 'verified'])->assertOk();
        $this->assertSame('verified', $l->fresh()->status_verifikasi);
    }

    /* ------------------- (b) modul Inertia: UserManagement ------------------- */

    public function test_admin_melihat_daftar_pengguna_lewat_halaman_react_modul(): void
    {
        $this->actingAs($this->admin)->get('/users')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('UserManagement::index')
                ->has('users.data', 3)
                ->where('users.data.0.name', 'Admin Uji'));
    }

    public function test_admin_crud_pengguna(): void
    {
        $this->actingAs($this->admin);

        $this->get('/users/create')->assertInertia(fn (Assert $p) => $p->component('UserManagement::create'));

        // CREATE
        $this->post('/users', [
            'name' => 'Pengguna Baru', 'email' => 'baru@example.com', 'telepon' => '0811', 'lokasi' => 'Bandung',
            'status_pengguna' => 'Pengguna Aktif', 'role' => 'admin',
            'password' => 'rahasia123', 'password_confirmation' => 'rahasia123',
        ])->assertRedirect(route('users.index'))->assertSessionHas('success');
        $baru = User::where('email', 'baru@example.com')->firstOrFail();
        $this->assertSame('admin', $baru->role);
        $this->assertNotSame('rahasia123', $baru->password);

        // UPDATE (password kosong → tidak berubah)
        $hashLama = $baru->password;
        $this->get("/users/{$baru->id}/edit")->assertInertia(fn (Assert $p) => $p->component('UserManagement::edit')->where('user.email', 'baru@example.com'));
        $this->put("/users/{$baru->id}", [
            'name' => 'Nama Diubah', 'email' => 'baru@example.com', 'telepon' => '0822', 'lokasi' => 'Cimahi',
            'status_pengguna' => 'Pengguna Aktif', 'role' => 'user', 'password' => '', 'password_confirmation' => '',
        ])->assertRedirect(route('users.index'));
        $baru->refresh();
        $this->assertSame('Nama Diubah', $baru->name);
        $this->assertSame('user', $baru->role);
        $this->assertSame($hashLama, $baru->password);

        // DELETE
        $this->delete("/users/{$baru->id}")->assertRedirect(route('users.index'));
        $this->assertDatabaseMissing('users', ['id' => $baru->id]);
    }

    public function test_validasi_pengguna_dan_proteksi_akun_sendiri(): void
    {
        $this->actingAs($this->admin);

        $this->post('/users', ['name' => '', 'email' => 'bukan-email', 'role' => 'superman', 'password' => '123'])
            ->assertSessionHasErrors(['name', 'email', 'role', 'password']);

        // Email unik
        $this->post('/users', [
            'name' => 'X', 'email' => $this->user->email, 'role' => 'user',
            'password' => 'rahasia123', 'password_confirmation' => 'rahasia123',
        ])->assertSessionHasErrors('email');

        // Tidak boleh menghapus / menurunkan role diri sendiri
        $this->delete("/users/{$this->admin->id}")->assertSessionHas('error');
        $this->assertDatabaseHas('users', ['id' => $this->admin->id]);
        $this->put("/users/{$this->admin->id}", [
            'name' => 'Admin Uji', 'email' => $this->admin->email, 'role' => 'user',
        ])->assertSessionHasErrors('role');
        $this->assertSame('admin', $this->admin->fresh()->role);
    }

    /* --------------------- (b) modul AJAX: Laporan + upload ------------------- */

    public function test_ajax_list_mengembalikan_json_dengan_filter(): void
    {
        $this->laporan($this->user, ['lokasi' => 'Jl. Dago']);
        $this->laporan($this->user2, ['lokasi' => 'Jl. Pasteur', 'status_verifikasi' => 'verified']);

        $this->actingAs($this->user)->getJson('/laporan/data')
            ->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('meta.total', 2);

        $this->actingAs($this->user)->getJson('/laporan/data?q=Pasteur')->assertJsonCount(1, 'data');
        $this->actingAs($this->user)->getJson('/laporan/data?status=verified')
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.lokasi', 'Jl. Pasteur');
    }

    public function test_user_membuat_laporan_dengan_upload_dan_berkas_dapat_dibuka_kembali(): void
    {
        $res = $this->actingAs($this->user)->postJson('/laporan', $this->payload([
            'foto' => UploadedFile::fake()->image('macet.jpg'),
        ]))->assertCreated()
            ->assertJsonPath('data.status_verifikasi', 'pending')   // user → menunggu verifikasi admin
            ->assertJsonPath('data.nama_pelapor', 'User Satu')
            ->assertJsonPath('data.foto_tipe', 'image')
            ->assertJsonPath('data.dapat_dikelola', true);

        $laporan = Laporan::findOrFail($res->json('data.id'));
        Storage::disk('public')->assertExists($laporan->foto);

        // Berkas dapat dibuka kembali lewat route modul (inline, bukan unduhan paksa).
        $buka = $this->actingAs($this->user)->get($res->json('data.foto_url'));
        $buka->assertOk();
        $this->assertStringContainsString('image/', $buka->headers->get('Content-Type'));

        // Tamu tidak boleh membuka berkas.
        auth()->logout();
        $this->get($res->json('data.foto_url'))->assertRedirect(route('login'));
    }

    public function test_upload_pdf_diterima_dan_tipe_berkas_tidak_valid_ditolak_422(): void
    {
        $this->actingAs($this->user);

        $this->postJson('/laporan', $this->payload(['foto' => UploadedFile::fake()->create('bukti.pdf', 200, 'application/pdf')]))
            ->assertCreated()->assertJsonPath('data.foto_tipe', 'pdf');

        $this->postJson('/laporan', $this->payload(['foto' => UploadedFile::fake()->create('virus.exe', 10)]))
            ->assertStatus(422)->assertJsonValidationErrors('foto');

        $this->postJson('/laporan', $this->payload(['foto' => UploadedFile::fake()->create('besar.pdf', 5000, 'application/pdf')]))
            ->assertStatus(422)->assertJsonValidationErrors('foto');

        $this->postJson('/laporan', ['lokasi' => '', 'deskripsi' => 'pendek', 'tingkat_kemacetan' => 500])
            ->assertStatus(422)->assertJsonValidationErrors(['lokasi', 'deskripsi', 'tingkat_kemacetan']);
    }

    public function test_user_hanya_boleh_mengubah_dan_menghapus_laporan_miliknya(): void
    {
        $milikUser2 = $this->laporan($this->user2);

        $this->actingAs($this->user)
            ->putJson("/laporan/{$milikUser2->id}", $this->payload())->assertForbidden();
        $this->actingAs($this->user)
            ->deleteJson("/laporan/{$milikUser2->id}")->assertForbidden();
        $this->assertDatabaseHas('laporan', ['id' => $milikUser2->id]);

        // Admin boleh mengelola laporan siapa pun.
        $this->actingAs($this->admin)->putJson("/laporan/{$milikUser2->id}", $this->payload(['lokasi' => 'Diubah Admin']))->assertOk();
        $this->assertSame('Diubah Admin', $milikUser2->fresh()->lokasi);
    }

    public function test_update_via_post_method_spoofing_mengganti_dan_menghapus_berkas(): void
    {
        $this->actingAs($this->user);
        $res = $this->postJson('/laporan', $this->payload(['foto' => UploadedFile::fake()->image('lama.jpg')]));
        $l = Laporan::findOrFail($res->json('data.id'));
        $fotoLama = $l->foto;

        // Seperti yang dikirim halaman React: POST multipart + _method=PUT
        $this->post("/laporan/{$l->id}", $this->payload([
            '_method' => 'PUT',
            'lokasi' => 'Lokasi Baru',
            'foto' => UploadedFile::fake()->image('baru.png'),
        ]), ['Accept' => 'application/json'])->assertOk()->assertJsonPath('data.lokasi', 'Lokasi Baru');

        $l->refresh();
        $this->assertNotSame($fotoLama, $l->foto);
        Storage::disk('public')->assertMissing($fotoLama);
        Storage::disk('public')->assertExists($l->foto);

        // user biasa tidak bisa mengubah status lewat form update
        $this->post("/laporan/{$l->id}", $this->payload(['_method' => 'PUT', 'status_verifikasi' => 'verified']), ['Accept' => 'application/json'])->assertOk();
        $this->assertSame('pending', $l->fresh()->status_verifikasi);

        // hapus berkas saja
        $fotoTerakhir = $l->fresh()->foto;
        $this->post("/laporan/{$l->id}", $this->payload(['_method' => 'PUT', 'hapus_foto' => 1]), ['Accept' => 'application/json'])->assertOk()
            ->assertJsonPath('data.foto_url', null);
        Storage::disk('public')->assertMissing($fotoTerakhir);
    }

    public function test_hapus_laporan_ikut_menghapus_berkas(): void
    {
        $this->actingAs($this->user);
        $res = $this->postJson('/laporan', $this->payload(['foto' => UploadedFile::fake()->image('x.jpg')]));
        $l = Laporan::findOrFail($res->json('data.id'));

        $this->deleteJson("/laporan/{$l->id}")->assertOk();
        $this->assertDatabaseMissing('laporan', ['id' => $l->id]);
        Storage::disk('public')->assertMissing($l->foto);
    }

    public function test_admin_langsung_terverifikasi_dan_detail_dapat_diambil(): void
    {
        $res = $this->actingAs($this->admin)->postJson('/laporan', $this->payload())
            ->assertCreated()->assertJsonPath('data.status_verifikasi', 'verified');

        $this->actingAs($this->user)->getJson('/laporan/'.$res->json('data.id'))
            ->assertOk()->assertJsonPath('data.dapat_dikelola', false);   // bukan miliknya
    }

    public function test_laporan_lama_tanpa_user_id_dicocokkan_dengan_nama_pelapor(): void
    {
        $lama = $this->laporan($this->user, ['user_id' => null, 'nama_pelapor' => 'User Satu']);

        $this->actingAs($this->user)->getJson("/laporan/{$lama->id}")->assertJsonPath('data.dapat_dikelola', true);
        $this->actingAs($this->user2)->getJson("/laporan/{$lama->id}")->assertJsonPath('data.dapat_dikelola', false);
    }

    public function test_link_blade_membuka_modal_laporan_via_query(): void
    {
        $l = $this->laporan($this->user);

        $this->actingAs($this->user)->get("/laporan?lihat={$l->id}&baru=1")
            ->assertInertia(fn (Assert $p) => $p->component('Laporan::index')->where('buka.lihat', $l->id)->where('buka.baru', true));
    }

    /* ----------------------- halaman Blade lama tetap jalan ------------------ */

    public function test_halaman_blade_lama_masih_berfungsi_dan_menampilkan_menu_sesuai_role(): void
    {
        $this->laporan($this->user);

        $this->actingAs($this->user)->get('/beranda')->assertOk()->assertDontSee('Kelola User');
        $this->actingAs($this->admin)->get('/beranda')->assertOk()->assertSee('Kelola User');
        $this->actingAs($this->user)->get('/profile')->assertOk();
        $this->actingAs($this->user)->get('/chat')->assertOk();
    }
}
