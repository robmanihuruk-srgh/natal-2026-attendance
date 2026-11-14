/* Service worker aplikasi Absensi Natal 2026 — GKPS Tangerang
 * Menyimpan file aplikasi (index.html, logo, font) di perangkat supaya aplikasi
 * tetap bisa dibuka walau internet putus. Data acara disinkronkan oleh aplikasi sendiri.
 * Naikkan nomor VERSI setiap kali index.html diganti agar semua perangkat memakai versi terbaru.
 */
const VERSI = 'natal2026-v8';
const FILE_APLIKASI = ['./', './index.html', './LOGO-GKPS-ASLI-1.png', './logo-tema-gkps.jpg'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(VERSI).then((cache) =>
            // Satu file gagal (mis. logo tidak ada) tidak menggagalkan yang lain
            Promise.all(FILE_APLIKASI.map((u) => cache.add(u).catch(() => null)))
        ).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== VERSI).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

const simpan = (req, res) => {
    if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(VERSI).then((c) => c.put(req, copy)).catch(() => {});
    }
    return res;
};

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);

    // Halaman aplikasi: ambil versi terbaru dari internet, kalau gagal pakai salinan di perangkat
    if (req.mode === 'navigate' || (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname))) {
        event.respondWith(
            fetch(req).then((res) => simpan(req, res))
                .catch(() => caches.match(req)
                    .then((r) => r || caches.match('./index.html'))
                    .then((r) => r || caches.match('./'))
                    .then((r) => r || new Response('Aplikasi belum tersimpan di perangkat ini. Buka sekali saat online.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })))
        );
        return;
    }

    // Font Google: pakai salinan, perbarui di belakang layar
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
        event.respondWith(
            caches.match(req).then((cached) => {
                const net = fetch(req).then((res) => simpan(req, res)).catch(() => cached);
                return cached || net;
            })
        );
        return;
    }

    // File lain di folder aplikasi (logo dll): salinan dulu, internet bila belum ada
    if (url.origin === location.origin) {
        event.respondWith(caches.match(req).then((cached) => cached || fetch(req).then((res) => simpan(req, res))));
    }
    // Lainnya (Firebase, login) tidak disentuh — ditangani aplikasi.
});