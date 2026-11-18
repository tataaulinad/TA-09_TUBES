import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';

// Vite mengumpulkan halaman React milik aplikasi utama DAN milik setiap modul HMVC.
const pages = import.meta.glob<{ default: React.ComponentType }>([
    './pages/**/*.tsx',
    '../../Modules/*/resources/js/pages/**/*.tsx',
]);

createInertiaApp({
    title: (title) => (title ? `${title} - Smart Traffic Finder` : 'Smart Traffic Finder'),

    // Nama halaman dari controller:
    //   Inertia::render('Laporan::index')  → Modules/Laporan/resources/js/pages/index.tsx
    //   Inertia::render('dashboard')       → resources/js/pages/dashboard.tsx
    resolve: async (name) => {
        const path = name.includes('::')
            ? (([module, page]) => `../../Modules/${module}/resources/js/pages/${page}.tsx`)(name.split('::'))
            : `./pages/${name}.tsx`;

        const loader = pages[path];
        if (!loader) {
            throw new Error(`Halaman React tidak ditemukan: ${name} (${path})`);
        }

        return (await loader()).default;
    },

    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },

    progress: { color: '#ea580c' },
});
