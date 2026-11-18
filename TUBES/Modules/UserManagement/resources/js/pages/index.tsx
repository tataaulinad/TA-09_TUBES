import { Head, Link, router, usePage } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import AppLayout from '@/layouts/AppLayout';
import type { Paginated, SharedProps } from '@/types';

interface UserRow {
    id: number;
    name: string;
    email: string;
    telepon: string | null;
    lokasi: string | null;
    status_pengguna: string | null;
    role: 'admin' | 'user';
    dibuat: string;
}

interface Props extends SharedProps {
    users: Paginated<UserRow>;
    filters: { q: string; role: string };
}

/**
 * Modul UserManagement — CRUD Inertia.
 * Tidak ada fetch() manual: pindah halaman, hapus, dan filter semuanya lewat router/Link Inertia.
 */
export default function UserIndex() {
    const { users, filters, auth, nav } = usePage<Props>().props;
    const [q, setQ] = useState(filters.q);
    const [role, setRole] = useState(filters.role);

    const terapkan = (e?: FormEvent) => {
        e?.preventDefault();
        router.get(nav.users!, { q, role }, { preserveState: true, replace: true });
    };

    const hapus = (u: UserRow) => {
        if (confirm(`Hapus pengguna "${u.name}"? Tindakan ini tidak dapat dibatalkan.`)) {
            router.delete(`${nav.users}/${u.id}`, { preserveScroll: true });
        }
    };

    return (
        <AppLayout title="Kelola Pengguna">
            <Head title="Kelola Pengguna" />

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <form onSubmit={terapkan} className="flex flex-1 flex-wrap gap-2">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Cari nama atau email..."
                        className="min-w-[200px] flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    />
                    <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
                        <option value="">Semua role</option>
                        <option value="admin">Admin</option>
                        <option value="user">User</option>
                    </select>
                    <button className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-gray-700">Filter</button>
                </form>
                <Link href={`${nav.users}/create`} className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 hover:bg-orange-700">
                    <i className="fas fa-user-plus me-2" />
                    Tambah Pengguna
                </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="px-4 py-3">Pengguna</th>
                                <th className="px-4 py-3">Kontak</th>
                                <th className="px-4 py-3">Lokasi</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                                        Tidak ada pengguna yang cocok.
                                    </td>
                                </tr>
                            )}
                            {users.data.map((u) => (
                                <tr key={u.id} className="hover:bg-gray-50/60">
                                    <td className="px-4 py-3">
                                        <p className="font-bold text-gray-900">
                                            {u.name} {u.id === auth.user.id && <span className="text-xs font-semibold text-orange-600">(Anda)</span>}
                                        </p>
                                        <p className="text-xs text-gray-400">{u.email}</p>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">{u.telepon}</td>
                                    <td className="px-4 py-3 text-gray-600">{u.lokasi}</td>
                                    <td className="px-4 py-3 text-gray-600">{u.status_pengguna}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${u.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-1.5">
                                            <Link href={`${nav.users}/${u.id}/edit`} className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100" title="Ubah">
                                                <i className="fas fa-pen" />
                                            </Link>
                                            {u.id !== auth.user.id && (
                                                <button onClick={() => hapus(u)} className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100" title="Hapus">
                                                    <i className="fas fa-trash" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
                    <span>
                        {users.total} pengguna &middot; halaman {users.current_page} dari {users.last_page}
                    </span>
                    <div className="flex flex-wrap gap-1">
                        {users.links.map((l, i) =>
                            l.url ? (
                                <Link
                                    key={i}
                                    href={l.url}
                                    preserveState
                                    className={`rounded-lg border px-3 py-1.5 font-bold ${l.active ? 'border-orange-600 bg-orange-600 text-white' : 'border-gray-200 hover:bg-gray-50'}`}
                                    dangerouslySetInnerHTML={{ __html: l.label }}
                                />
                            ) : (
                                <span key={i} className="rounded-lg border border-gray-100 px-3 py-1.5 font-bold text-gray-300" dangerouslySetInnerHTML={{ __html: l.label }} />
                            ),
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
