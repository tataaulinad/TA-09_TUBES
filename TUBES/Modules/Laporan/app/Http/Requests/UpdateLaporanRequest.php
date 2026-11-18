<?php

namespace Modules\Laporan\Http\Requests;

class UpdateLaporanRequest extends StoreLaporanRequest
{
    public function rules(): array
    {
        return array_merge(parent::rules(), [
            'hapus_foto' => ['nullable', 'boolean'],
        ]);
    }
}
