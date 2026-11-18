import { Head, usePage } from '@inertiajs/react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { http, HttpError } from '@/lib/http';
import type { SharedProps } from '@/types';

/**
 * Modul Laporan — CRUD AJAX.
 * Halaman ini hanya dimuat sekali oleh Inertia; semua operasi data (list, tambah,
 * ubah, hapus, verifikasi, upload berkas) memakai fetch() ke endpoint JSON modul.
 */

type Status = 'pending' | 'verified' | 'rejected';

interface Laporan {
    id: number;
    nama_pelapor: string;
    lokasi: string;
    deskripsi: string;
    tingkat_kemacetan: number;
    status_verifikasi: Status;
    waktu_laporan: string;
    waktu_berlalu: string;
    foto_url: string | null;
    foto_tipe: 'image' | 'pdf' | null;
    dapat_dikelola: boolean;
}

interface Meta {
    current_page: number;
    last_page: number;
    total: number;
}

interface Props extends SharedProps {
    endpoints: { data: string; store: string; show: string; update: string; destroy: string; status: string };
    buka: { baru: boolean; lihat: number | null };
}

const badge: Record<Status, string> = {
    pending: 'bg-amber-100 text-amber-700',
    verified: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
};
const labelStatus: Record<Status, string> = { pending: 'Menunggu', verified: 'Terverifikasi', rejected: 'Ditolak' };

const warnaMacet = (n: number) => (n >= 70 ? 'bg-red-500' : n >= 40 ? 'bg-amber-500' : 'bg-emerald-500');

export default function LaporanIndex() {
    const { endpoints: urls, buka, auth } = usePage<Props>().props;
    const isAdmin = auth.user.is_admin;
    const url = (tpl: string, id: number) => tpl.replace('__ID__', String(id));

    const [items, setItems] = useState<Laporan[]>([]);
    const [meta, setMeta] = useState<Meta>({ current_page: 1, last_page: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [cari, setCari] = useState('');
    const [qAktif, setQAktif] = useState('');
    const [status, setStatus] = useState('');
    const [form, setForm] = useState<{ item: Laporan | null } | null>(null);
    const [detail, setDetail] = useState<Laporan | null>(null);
    const [toast, setToast] = useState<{ tipe: 'ok' | 'err'; teks: string } | null>(null);

    const notif = (tipe: 'ok' | 'err', teks: string) => {
        setToast({ tipe, teks });
        setTimeout(() => setToast(null), 3500);
    };

    // READ — GET /laporan/data
    const muat = useCallback(async () => {
        setLoading(true);
        try {
            const qs = new URLSearchParams({ page: String(page), q: qAktif, status });
            const res = await http<{ data: Laporan[]; meta: Meta }>(`${urls.data}?${qs}`);
            setItems(res.data);
            setMeta(res.meta);
        } catch (e) {
            notif('err', (e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [page, qAktif, status, urls.data]);

    useEffect(() => {
        muat();
    }, [muat]);

    // Link dari halaman Blade: /laporan?baru=1 dan /laporan?lihat=ID
    useEffect(() => {
        if (buka.baru) setForm({ item: null });
        if (buka.lihat) {
            http<{ data: Laporan }>(url(urls.show, buka.lihat))
                .then((r) => setDetail(r.data))
                .catch((e) => notif('err', e.message));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submitCari = (e: FormEvent) => {
        e.preventDefault();
        setPage(1);
        setQAktif(cari);
    };

    // DELETE — DELETE /laporan/{id}
    const hapus = async (l: Laporan) => {
        if (!confirm(`Hapus laporan di "${l.lokasi}"? Berkas yang diunggah juga ikut terhapus.`)) return;
        try {
            const res = await http<{ message: string }>(url(urls.destroy, l.id), { method: 'DELETE' });
            notif('ok', res.message);
            // Halaman terakhir yang kosong → mundur satu halaman.
            if (items.length === 1 && page > 1) setPage(page - 1);
            else muat();
        } catch (e) {
            notif('err', (e as Error).message);
        }
    };

    // UPDATE status — PATCH /laporan/{id}/status (khusus admin)
    const verifikasi = async (l: Laporan, s: Status) => {
        try {
            const res = await http<{ message: string; data: Laporan }>(url(urls.status, l.id), {
                method: 'PATCH',
                body: { status_verifikasi: s },
            });
            setItems((prev) => prev.map((x) => (x.id === l.id ? res.data : x)));
            notif('ok', res.message);
        } catch (e) {
            notif('err', (e as Error).message);
        }
    };

    const selesaiSimpan = (pesan: string) => {
        setForm(null);
        notif('ok', pesan);
        setPage(1);
        muat();
    };

    return (
        <AppLayout title="Laporan Lalu Lintas">
            <Head title="Laporan" />

            {toast && (
                <div
                    className={`fixed right-4 top-20 z-[60] rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${
                        toast.tipe === 'ok' ? 'bg-emerald-600' : 'bg-red-600'
                    }`}
                >
                    {toast.teks}
                </div>
            )}

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <form onSubmit={submitCari} className="flex flex-1 flex-wrap gap-2">
                    <input
                        value={cari}
                        onChange={(e) => setCari(e.target.value)}
                        placeholder="Cari lokasi, deskripsi, atau pelapor..."
                        className="min-w-[200px] flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    />
                    <select
                        value={status}
                        onChange={(e) => {
                            setPage(1);
                            setStatus(e.target.value);
                        }}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                    >
                        <option value="">Semua status</option>
                        <option value="pending">Menunggu</option>
                        <option value="verified">Terverifikasi</option>
                        <option value="rejected">Ditolak</option>
                    </select>
                    <button className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-gray-700">Cari</button>
                </form>
                <button
                    onClick={() => setForm({ item: null })}
                    className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 hover:bg-orange-700"
                >
                    <i className="fas fa-plus me-2" />
                    Laporkan Insiden
                </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="px-4 py-3">Lokasi &amp; Deskripsi</th>
                                <th className="px-4 py-3">Pelapor</th>
                                <th className="px-4 py-3">Kemacetan</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Berkas</th>
                                <th className="px-4 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                                        <i className="fas fa-spinner fa-spin me-2" />
                                        Memuat data...
                                    </td>
                                </tr>
                            )}
                            {!loading && items.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                                        Belum ada laporan yang cocok.
                                    </td>
                                </tr>
                            )}
                            {!loading &&
                                items.map((l) => (
                                    <tr key={l.id} className="align-top hover:bg-gray-50/60">
                                        <td className="max-w-xs px-4 py-3">
                                            <button onClick={() => setDetail(l)} className="text-left font-bold text-gray-900 hover:text-orange-600">
                                                {l.lokasi}
                                            </button>
                                            <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{l.deskripsi}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-gray-700">{l.nama_pelapor}</p>
                                            <p className="text-xs text-gray-400">{l.waktu_berlalu}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-100">
                                                    <div className={`h-full ${warnaMacet(l.tingkat_kemacetan)}`} style={{ width: `${l.tingkat_kemacetan}%` }} />
                                                </div>
                                                <span className="text-xs font-bold text-gray-600">{l.tingkat_kemacetan}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${badge[l.status_verifikasi]}`}>
                                                {labelStatus[l.status_verifikasi]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {l.foto_url ? (
                                                <a
                                                    href={l.foto_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:underline"
                                                >
                                                    <i className={`fas ${l.foto_tipe === 'pdf' ? 'fa-file-pdf' : 'fa-image'}`} />
                                                    Buka
                                                </a>
                                            ) : (
                                                <span className="text-xs text-gray-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1.5">
                                                {isAdmin && l.status_verifikasi !== 'verified' && (
                                                    <button
                                                        onClick={() => verifikasi(l, 'verified')}
                                                        title="Verifikasi"
                                                        className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                                                    >
                                                        <i className="fas fa-check" />
                                                    </button>
                                                )}
                                                {isAdmin && l.status_verifikasi !== 'rejected' && (
                                                    <button
                                                        onClick={() => verifikasi(l, 'rejected')}
                                                        title="Tolak"
                                                        className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100"
                                                    >
                                                        <i className="fas fa-xmark" />
                                                    </button>
                                                )}
                                                {l.dapat_dikelola && (
                                                    <>
                                                        <button
                                                            onClick={() => setForm({ item: l })}
                                                            title="Ubah"
                                                            className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100"
                                                        >
                                                            <i className="fas fa-pen" />
                                                        </button>
                                                        <button
                                                            onClick={() => hapus(l)}
                                                            title="Hapus"
                                                            className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100"
                                                        >
                                                            <i className="fas fa-trash" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
                    <span>
                        {meta.total} laporan &middot; halaman {meta.current_page} dari {meta.last_page}
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 font-bold disabled:opacity-40"
                        >
                            Sebelumnya
                        </button>
                        <button
                            disabled={page >= meta.last_page}
                            onClick={() => setPage(page + 1)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 font-bold disabled:opacity-40"
                        >
                            Berikutnya
                        </button>
                    </div>
                </div>
            </div>

            {form && <FormModal item={form.item} isAdmin={isAdmin} urls={urls} onClose={() => setForm(null)} onSaved={selesaiSimpan} />}
            {detail && <DetailModal item={detail} onClose={() => setDetail(null)} />}
        </AppLayout>
    );
}

/* -------------------------------------------------------------------------- */
/*  Modal tambah / ubah — mengirim FormData (mendukung upload berkas)         */
/* -------------------------------------------------------------------------- */

function FormModal(props: {
    item: Laporan | null;
    isAdmin: boolean;
    urls: Props['endpoints'];
    onClose: () => void;
    onSaved: (pesan: string) => void;
}) {
    const { item, isAdmin, urls } = props;
    const [lokasi, setLokasi] = useState(item?.lokasi ?? '');
    const [deskripsi, setDeskripsi] = useState(item?.deskripsi ?? '');
    const [macet, setMacet] = useState(item?.tingkat_kemacetan ?? 30);
    const [statusV, setStatusV] = useState<Status>(item?.status_verifikasi ?? 'verified');
    const [berkas, setBerkas] = useState<File | null>(null);
    const [hapusFoto, setHapusFoto] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [kirim, setKirim] = useState(false);

    const simpan = async (e: FormEvent) => {
        e.preventDefault();
        setKirim(true);
        setErrors({});

        const fd = new FormData();
        fd.append('lokasi', lokasi);
        fd.append('deskripsi', deskripsi);
        fd.append('tingkat_kemacetan', String(macet));
        if (isAdmin) fd.append('status_verifikasi', statusV);
        if (berkas) fd.append('foto', berkas);
        if (item && hapusFoto) fd.append('hapus_foto', '1');

        try {
            let res: { message: string };
            if (item) {
                // fetch tidak bisa PUT + multipart langsung → POST dengan _method=PUT (method spoofing Laravel).
                fd.append('_method', 'PUT');
                res = await http(urls.update.replace('__ID__', String(item.id)), { method: 'POST', body: fd });
            } else {
                res = await http(urls.store, { method: 'POST', body: fd });
            }
            props.onSaved(res.message);
        } catch (err) {
            if (err instanceof HttpError && err.status === 422) setErrors(err.errors);
            else alert((err as Error).message);
        } finally {
            setKirim(false);
        }
    };

    const err = (k: string) => errors[k]?.[0] && <p className="mt-1 text-xs font-semibold text-red-600">{errors[k][0]}</p>;
    const input = 'w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100';

    return (
        <Modal judul={item ? 'Ubah Laporan' : 'Laporkan Insiden'} onClose={props.onClose}>
            <form onSubmit={simpan} className="space-y-4">
                <div>
                    <label className="mb-1 block text-xs font-bold text-gray-600">Lokasi kejadian</label>
                    <input value={lokasi} onChange={(e) => setLokasi(e.target.value)} className={input} placeholder="Contoh: Jl. Buah Batu, Simpang Kordon" />
                    {err('lokasi')}
                </div>
                <div>
                    <label className="mb-1 block text-xs font-bold text-gray-600">Deskripsi</label>
                    <textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={4} className={input} placeholder="Jelaskan kondisi lalu lintas (min. 10 karakter)" />
                    {err('deskripsi')}
                </div>
                <div>
                    <label className="mb-1 block text-xs font-bold text-gray-600">
                        Tingkat kemacetan: <span className="text-orange-600">{macet}%</span>
                    </label>
                    <input type="range" min={0} max={100} value={macet} onChange={(e) => setMacet(Number(e.target.value))} className="w-full accent-orange-600" />
                    {err('tingkat_kemacetan')}
                </div>
                {isAdmin && (
                    <div>
                        <label className="mb-1 block text-xs font-bold text-gray-600">Status verifikasi</label>
                        <select value={statusV} onChange={(e) => setStatusV(e.target.value as Status)} className={input}>
                            <option value="pending">Menunggu</option>
                            <option value="verified">Terverifikasi</option>
                            <option value="rejected">Ditolak</option>
                        </select>
                        {err('status_verifikasi')}
                    </div>
                )}
                <div>
                    <label className="mb-1 block text-xs font-bold text-gray-600">Berkas pendukung (jpg, png, webp, pdf — maks. 4MB)</label>
                    {item?.foto_url && !berkas && (
                        <div className="mb-2 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs">
                            <a href={item.foto_url} target="_blank" rel="noreferrer" className="font-bold text-orange-600 hover:underline">
                                <i className={`fas ${item.foto_tipe === 'pdf' ? 'fa-file-pdf' : 'fa-image'} me-1.5`} />
                                Buka berkas saat ini
                            </a>
                            <label className="flex items-center gap-1.5 font-semibold text-red-600">
                                <input type="checkbox" checked={hapusFoto} onChange={(e) => setHapusFoto(e.target.checked)} />
                                Hapus berkas
                            </label>
                        </div>
                    )}
                    <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        onChange={(e) => setBerkas(e.target.files?.[0] ?? null)}
                        className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:font-bold file:text-orange-600"
                    />
                    {item?.foto_url && <p className="mt-1 text-[11px] text-gray-400">Pilih berkas baru untuk menggantinya; kosongkan untuk mempertahankan berkas lama.</p>}
                    {err('foto')}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={props.onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50">
                        Batal
                    </button>
                    <button disabled={kirim} className="rounded-xl bg-orange-600 px-5 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60">
                        {kirim ? 'Menyimpan...' : item ? 'Simpan Perubahan' : 'Kirim Laporan'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

/* -------------------------------------------------------------------------- */
/*  Modal detail — menampilkan kembali berkas yang sudah diunggah             */
/* -------------------------------------------------------------------------- */

function DetailModal({ item, onClose }: { item: Laporan; onClose: () => void }) {
    return (
        <Modal judul="Detail Laporan" onClose={onClose}>
            <div className="space-y-3 text-sm">
                <div>
                    <p className="text-lg font-extrabold text-gray-900">{item.lokasi}</p>
                    <p className="text-xs text-gray-400">
                        Oleh {item.nama_pelapor} &middot; {item.waktu_laporan}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${badge[item.status_verifikasi]}`}>{labelStatus[item.status_verifikasi]}</span>
                    <span className="text-xs font-bold text-gray-600">Kemacetan {item.tingkat_kemacetan}%</span>
                </div>
                <p className="whitespace-pre-line text-gray-700">{item.deskripsi}</p>

                {item.foto_url ? (
                    <div className="rounded-xl border border-gray-100 p-2">
                        {item.foto_tipe === 'pdf' ? (
                            <iframe src={item.foto_url} title="Berkas PDF" className="h-72 w-full rounded-lg" />
                        ) : (
                            <img src={item.foto_url} alt={item.lokasi} className="max-h-72 w-full rounded-lg object-cover" />
                        )}
                        <a href={item.foto_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-orange-600 hover:underline">
                            <i className="fas fa-up-right-from-square me-1.5" />
                            Buka berkas di tab baru
                        </a>
                    </div>
                ) : (
                    <p className="text-xs text-gray-400">Tidak ada berkas yang diunggah.</p>
                )}
            </div>
        </Modal>
    );
}

function Modal({ judul, onClose, children }: { judul: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
            <div className="mt-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-extrabold text-gray-900">{judul}</h2>
                    <button onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-gray-700">
                        &times;
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
