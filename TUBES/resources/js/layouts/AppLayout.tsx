import { Link, router, usePage } from '@inertiajs/react';
import { PropsWithChildren, useState } from 'react';
import type { SharedProps } from '@/types';

type NavItem = { href: string; label: string; icon: string; aktif: boolean; inertia: boolean };

/**
 * Kerangka halaman React — meniru navbar layout Blade (layouts/app.blade.php)
 * supaya tampilan konsisten. Dipakai oleh halaman di SEMUA modul.
 *
 * Halaman React (Laporan, Users) memakai <Link> Inertia;
 * halaman Blade (Beranda, Chat, Profil) memakai <a> biasa (muat ulang penuh).
 */
export default function AppLayout({ title, children }: PropsWithChildren<{ title: string }>) {
    const { auth, flash, nav: urls } = usePage<SharedProps>().props;
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const [tutup, setTutup] = useState<string[]>([]);

    const nav: NavItem[] = [
        { href: urls.beranda, label: 'Beranda', icon: 'fa-home', aktif: false, inertia: false },
        { href: urls.laporan, label: 'Laporan', icon: 'fa-bullhorn', aktif: path.includes('/laporan'), inertia: true },
        { href: urls.chat, label: 'Forum Chat', icon: 'fa-comments', aktif: false, inertia: false },
    ];
    if (urls.users) {
        nav.push({ href: urls.users, label: 'Kelola User', icon: 'fa-users-gear', aktif: path.includes('/users'), inertia: true });
    }

    const logout = () => {
        if (confirm('Apakah Anda yakin ingin keluar?')) router.post(urls.logout);
    };

    const notif = (['success', 'error', 'info'] as const).filter((k) => flash[k] && !tutup.includes(`${k}:${flash[k]}`));
    const warna = {
        success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800',
    };

    return (
        <div className="flex min-h-screen flex-col bg-[#f8fafc]">
            <header className="sticky top-0 z-30 border-b border-gray-100 bg-white shadow-sm">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center space-x-8">
                        <a href={urls.beranda} className="flex items-center space-x-2.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white shadow-md shadow-orange-500/30">
                                <i className="fas fa-traffic-light text-lg" />
                            </div>
                            <span className="text-xl font-extrabold tracking-tight text-gray-900">
                                Smart Traffic <span className="text-orange-600">Finder</span>
                            </span>
                        </a>
                        <nav className="hidden space-x-6 text-sm font-semibold md:flex">
                            {nav.map((n) => {
                                const kelas = n.aktif ? 'border-b-2 border-orange-600 pb-1 text-orange-600' : 'pb-1 text-gray-600 hover:text-orange-600';
                                const isi = (
                                    <>
                                        <i className={`fas ${n.icon} me-1`} /> {n.label}
                                    </>
                                );
                                return n.inertia ? (
                                    <Link key={n.label} href={n.href} className={kelas}>
                                        {isi}
                                    </Link>
                                ) : (
                                    <a key={n.label} href={n.href} className={kelas}>
                                        {isi}
                                    </a>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="flex items-center space-x-3">
                        <span
                            className={`hidden rounded-full px-2.5 py-1 text-[11px] font-bold uppercase sm:inline ${
                                auth.user.is_admin ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'
                            }`}
                        >
                            {auth.user.role}
                        </span>
                        <a
                            href={urls.profile}
                            className="flex items-center space-x-2.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 transition hover:bg-gray-100"
                        >
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white shadow-sm">
                                {auth.user.inisial}
                            </div>
                            <span className="max-w-[120px] truncate text-xs font-semibold text-gray-700 sm:text-sm">{auth.user.name}</span>
                        </a>
                        <button
                            type="button"
                            onClick={logout}
                            title="Keluar / Logout"
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                            <i className="fas fa-sign-out-alt text-base" />
                        </button>
                    </div>
                </div>
            </header>

            <div className="mx-auto mt-4 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                {notif.map((k) => (
                    <div key={k} className={`mb-4 flex items-center justify-between rounded-xl border p-4 text-sm shadow-sm ${warna[k]}`}>
                        <span>{flash[k]}</span>
                        <button type="button" className="text-lg leading-none" onClick={() => setTutup([...tutup, `${k}:${flash[k]}`])}>
                            &times;
                        </button>
                    </div>
                ))}
            </div>

            <main className="flex-1 pb-20 md:pb-8">
                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                    <h1 className="mb-6 text-2xl font-extrabold text-gray-900">{title}</h1>
                    {children}
                </div>
            </main>

            {/* Navigasi bawah (mobile) */}
            <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-gray-200 bg-white py-1 shadow-lg md:hidden">
                {nav.map((n) => (
                    <a
                        key={n.label}
                        href={n.href}
                        className={`flex flex-col items-center justify-center py-2 text-[11px] ${n.aktif ? 'font-bold text-orange-600' : 'text-slate-400'}`}
                    >
                        <i className={`fas ${n.icon} mb-0.5 text-base`} />
                        <span>{n.label}</span>
                    </a>
                ))}
            </nav>
        </div>
    );
}
