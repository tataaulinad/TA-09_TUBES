<?php

namespace Modules\UserManagement\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($this->route('user'))],
            'telepon' => ['nullable', 'string', 'max:30'],
            'lokasi' => ['nullable', 'string', 'max:100'],
            'status_pengguna' => ['nullable', 'string', 'max:100'],
            'role' => ['required', Rule::in(['admin', 'user'])],
            // Kosong = password tidak diubah.
            'password' => ['nullable', 'confirmed', Password::min(6)],
        ];
    }

    public function messages(): array
    {
        return (new StoreUserRequest())->messages();
    }
}
