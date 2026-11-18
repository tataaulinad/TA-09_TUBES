import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEvent } from 'react';
import AppLayout from '@/layouts/AppLayout';
import type { SharedProps } from '@/types';
import UserForm, { UserFormData } from '../components/UserForm';

interface Props {
    user: {
        id: number;
        name: string;
        email: string;
        telepon: string | null;
        lokasi: string | null;
        status_pengguna: string | null;
        role: 'admin' | 'user';
    };
}

export default function UserEdit({ user }: Props) {
    const { nav } = usePage<SharedProps>().props;
    const { data, setData, put, processing, errors } = useForm<UserFormData>({
        name: user.name,
        email: user.email,
        telepon: user.telepon ?? '',
        lokasi: user.lokasi ?? '',
        status_pengguna: user.status_pengguna ?? '',
        role: user.role,
        password: '',
        password_confirmation: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(`${nav.users}/${user.id}`);
    };

    return (
        <AppLayout title={`Ubah Pengguna: ${user.name}`}>
            <Head title="Ubah Pengguna" />
            <UserForm
                data={data}
                setData={setData}
                errors={errors}
                processing={processing}
                onSubmit={submit}
                cancelHref={nav.users!}
                submitLabel="Simpan Perubahan"
                passwordOpsional
            />
        </AppLayout>
    );
}
