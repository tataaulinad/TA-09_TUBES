import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEvent } from 'react';
import AppLayout from '@/layouts/AppLayout';
import type { SharedProps } from '@/types';
import UserForm, { UserFormData } from '../components/UserForm';

export default function UserCreate() {
    const { nav } = usePage<SharedProps>().props;
    // useForm: menyimpan isi input, mengirim ke server, dan menampung error validasi.
    const { data, setData, post, processing, errors } = useForm<UserFormData>({
        name: '',
        email: '',
        telepon: '',
        lokasi: '',
        status_pengguna: 'Pengguna Aktif',
        role: 'user',
        password: '',
        password_confirmation: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(nav.users!);
    };

    return (
        <AppLayout title="Tambah Pengguna">
            <Head title="Tambah Pengguna" />
            <UserForm
                data={data}
                setData={setData}
                errors={errors}
                processing={processing}
                onSubmit={submit}
                cancelHref={nav.users!}
                submitLabel="Simpan Pengguna"
            />
        </AppLayout>
    );
}
