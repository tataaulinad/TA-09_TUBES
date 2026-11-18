<?php

namespace Modules\Laporan\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLaporanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'lokasi' => ['required', 'string', 'max:255'],
            'deskripsi' => ['required', 'string', 'min:10'],
            'tingkat_kemacetan' => ['required', 'integer', 'min:0', 'max:100'],
            'foto' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:4096'],
            // Hanya admin yang boleh menentukan status; untuk user diabaikan di controller.
            'status_verifikasi' => ['nullable', Rule::in(['pending', 'verified', 'rejected'])],
        ];
    }

    public function messages(): array
    {
        return [
            'lokasi.required' => 'Lokasi kejadian wajib diisi.',
            'deskripsi.required' => 'Deskripsi laporan wajib diisi.',
            'deskripsi.min' => 'Deskripsi minimal 10 karakter agar informasi jelas.',
            'tingkat_kemacetan.required' => 'Tingkat kemacetan wajib diisi (0-100).',
            'tingkat_kemacetan.max' => 'Tingkat kemacetan maksimal 100.',
            'foto.mimes' => 'Berkas harus berformat jpg, jpeg, png, webp, atau pdf.',
            'foto.max' => 'Ukuran berkas maksimal 4MB.',
        ];
    }
}
