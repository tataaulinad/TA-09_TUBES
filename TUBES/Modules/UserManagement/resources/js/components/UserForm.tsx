import { Link } from '@inertiajs/react';
import { FormEvent } from 'react';

export interface UserFormData {
    name: string;
    email: string;
    telepon: string;
    lokasi: string;
    status_pengguna: string;
    role: 'admin' | 'user';
    password: string;
    password_confirmation: string;
}

interface Props {
    data: UserFormData;
    setData: <K extends keyof UserFormData>(key: K, value: UserFormData[K]) => void;
    errors: Partial<Record<keyof UserFormData, string>>;
    processing: boolean;
    onSubmit: (e: FormEvent) => void;
    cancelHref: string;
    submitLabel: string;
    passwordOpsional?: boolean;
}

const input = 'w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100';

/** Form bersama untuk halaman tambah dan ubah pengguna (state dikelola useForm Inertia di halaman). */
export default function UserForm({ data, setData, errors, processing, onSubmit, cancelHref, submitLabel, passwordOpsional }: Props) {
    const Field = ({ label, name, children }: { label: string; name: keyof UserFormData; children: React.ReactNode }) => (
        <div>
            <label className="mb-1 block text-xs font-bold text-gray-600">{label}</label>
            {children}
            {errors[name] && <p className="mt-1 text-xs font-semibold text-red-600">{errors[name]}</p>}
        </div>
    );

    return (
        <form onSubmit={onSubmit} className="max-w-2xl space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nama lengkap" name="name">
                    <input className={input} value={data.name} onChange={(e) => setData('name', e.target.value)} />
                </Field>
                <Field label="Email" name="email">
                    <input type="email" className={input} value={data.email} onChange={(e) => setData('email', e.target.value)} />
                </Field>
                <Field label="Telepon" name="telepon">
                    <input className={input} value={data.telepon} onChange={(e) => setData('telepon', e.target.value)} />
                </Field>
                <Field label="Lokasi" name="lokasi">
                    <input className={input} value={data.lokasi} onChange={(e) => setData('lokasi', e.target.value)} />
                </Field>
                <Field label="Status pengguna" name="status_pengguna">
                    <input className={input} value={data.status_pengguna} onChange={(e) => setData('status_pengguna', e.target.value)} placeholder="Pengguna Aktif" />
                </Field>
                <Field label="Role (hak akses)" name="role">
                    <select className={input} value={data.role} onChange={(e) => setData('role', e.target.value as 'admin' | 'user')}>
                        <option value="user">User — hanya kelola laporan sendiri</option>
                        <option value="admin">Admin — akses penuh</option>
                    </select>
                </Field>
                <Field label={passwordOpsional ? 'Password baru (kosongkan jika tidak diubah)' : 'Password'} name="password">
                    <input type="password" className={input} value={data.password} onChange={(e) => setData('password', e.target.value)} />
                </Field>
                <Field label="Konfirmasi password" name="password_confirmation">
                    <input type="password" className={input} value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} />
                </Field>
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Link href={cancelHref} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50">
                    Batal
                </Link>
                <button disabled={processing} className="rounded-xl bg-orange-600 px-5 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60">
                    {processing ? 'Menyimpan...' : submitLabel}
                </button>
            </div>
        </form>
    );
}
