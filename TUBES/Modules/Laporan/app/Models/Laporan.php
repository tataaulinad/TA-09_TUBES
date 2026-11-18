<?php

namespace Modules\Laporan\Models;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Laporan extends Model
{
    use HasFactory;

    protected $table = 'laporan';

    protected $fillable = [
        'user_id',
        'nama_pelapor',
        'lokasi',
        'deskripsi',
        'foto',
        'status_verifikasi',
        'tingkat_kemacetan',
        'waktu_laporan',
    ];

    protected $casts = [
        'waktu_laporan' => 'datetime',
        'tingkat_kemacetan' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Aturan kepemilikan: admin boleh mengelola semua laporan,
     * user biasa hanya laporan miliknya sendiri.
     * Data lama (user_id kosong) dicocokkan lewat nama pelapor.
     */
    public function dapatDikelolaOleh(User $user): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($this->user_id !== null) {
            return $this->user_id === $user->id;
        }

        return $this->nama_pelapor === $user->name;
    }

    /** Foto berupa tautan eksternal (data seeder Unsplash)? */
    public function fotoEksternal(): bool
    {
        return $this->foto && str_starts_with($this->foto, 'http');
    }

    public function getTanggalAttribute(): string
    {
        return Carbon::parse($this->waktu_laporan ?? $this->created_at)->format('d');
    }

    public function getBulanAttribute(): string
    {
        return strtoupper(Carbon::parse($this->waktu_laporan ?? $this->created_at)->translatedFormat('M'));
    }

    public function getWaktuBerlaluAttribute(): string
    {
        return Carbon::parse($this->waktu_laporan ?? $this->created_at)->diffForHumans();
    }

    public function getFotoUrlAttribute(): string
    {
        // Berkas PDF tidak bisa ditampilkan sebagai gambar di kartu Blade → pakai gambar bawaan.
        if (! empty($this->foto) && strtolower(pathinfo($this->foto, PATHINFO_EXTENSION)) !== 'pdf') {
            if (str_starts_with($this->foto, 'http://') || str_starts_with($this->foto, 'https://')) {
                return $this->foto;
            }
            if (str_starts_with($this->foto, 'uploads/')) {
                return asset($this->foto);
            }

            return asset('storage/'.$this->foto);
        }

        return 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80';
    }
}
