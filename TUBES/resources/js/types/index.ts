export interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'user';
    is_admin: boolean;
    inisial: string;
}

/** Shared props dari App\Http\Middleware\HandleInertiaRequests. */
export interface SharedProps {
    auth: { user: AuthUser };
    flash: { success?: string | null; error?: string | null; info?: string | null };
    nav: {
        beranda: string;
        laporan: string;
        chat: string;
        profile: string;
        logout: string;
        users: string | null;
    };
    [key: string]: unknown;
}

export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}
