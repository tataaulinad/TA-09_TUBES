/**
 * Pembungkus fetch() untuk CRUD AJAX.
 * - Menyertakan token CSRF (meta tag dari app.blade.php) → tanpa ini Laravel membalas 419.
 * - Accept: application/json → error validasi datang sebagai JSON 422, bukan redirect.
 * - FormData dikirim apa adanya (browser mengatur boundary multipart sendiri).
 */
export class HttpError extends Error {
    constructor(
        message: string,
        public status: number,
        public errors: Record<string, string[]> = {},
    ) {
        super(message);
    }
}

const csrf = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

export async function http<T = any>(
    url: string,
    options: { method?: string; body?: FormData | Record<string, unknown> } = {},
): Promise<T> {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrf(),
    };

    let body: BodyInit | undefined;
    if (options.body instanceof FormData) {
        body = options.body;
    } else if (options.body) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(options.body);
    }

    const res = await fetch(url, { method: options.method ?? 'GET', headers, body, credentials: 'same-origin' });

    // Sesi habis → muat ulang supaya diarahkan ke halaman login.
    if (res.status === 401 || res.status === 419) {
        window.location.reload();
        throw new HttpError('Sesi berakhir, silakan login kembali.', res.status);
    }

    const text = await res.text();
    const json = text ? JSON.parse(text) : {};

    if (!res.ok) {
        throw new HttpError(json.message ?? `Terjadi kesalahan (${res.status}).`, res.status, json.errors ?? {});
    }

    return json as T;
}
