# Rencana Pengembangan (ROADMAP) 📍

Dokumen ini memaparkan visi pengembangan jangka panjang, fitur-fitur terencana, dan arah pengembangan teknologi untuk platform **Kota Pintar**.

---

## 👁️ Visi Jangka Panjang
Menjadikan **Kota Pintar** sebagai platform open-source terdepan untuk pelaporan masalah publik yang efisien, transparan, dan berbasis kecerdasan buatan, yang siap diimplementasikan oleh pemerintah daerah di seluruh Indonesia maupun skala global.

---

## 🛠️ Fase Pengembangan

### 🟢 Fase 1 (Rilis Saat Ini) - ✅ SELESAI
- [x] Sistem pelaporan masalah publik dasar (Citizen frontend, submit form, detail status).
- [x] Otomatisasi klasifikasi kategori, urgensi, sentimen, dan ringkasan dengan Google Gemini AI.
- [x] Smart routing otomatis laporan ke dinas/departemen terkait berdasarkan kategori.
- [x] Penghitungan batas penyelesaian secara dinamis (SLA) berdasarkan jenis keluhan.
- [x] Dashboard interaktif khusus untuk 3 Role: Warga, Petugas, dan Admin.
- [x] Visualisasi laporan real-time pada Peta Kota menggunakan Leaflet Map.
- [x] Integrasi WebSocket untuk update notifikasi, komentar, dan upvote tanpa reload.

### 🟡 Fase 2 (Terencana - Jangka Pendek)
- [ ] **Aplikasi Mobile**: Pembuatan client mobile cross-platform menggunakan React Native untuk Android dan iOS guna memudahkan pelaporan langsung di lapangan.
- [ ] **Notifikasi Push (FCM)**: Integrasi dengan Firebase Cloud Messaging agar warga mendapat pemberitahuan langsung di ponsel saat status laporan diperbarui.
- [ ] **Notifikasi Multi-Channel**: Pengiriman status update via Email dan SMS (terutama untuk laporan berkategori kritis/darurat).
- [ ] **Ekspor Laporan PDF**: Fitur bagi admin untuk mengekspor rekapitulasi data laporan bulanan ke format PDF/Excel untuk bahan rapat dinas.
- [ ] **Gamifikasi Warga**: Sistem reputasi dan lencana (*badges*) untuk warga yang aktif berpartisipasi menjaga kebersihan/ketertiban kota.

### 🔵 Fase 3 (Masa Depan - Jangka Panjang)
- [ ] **Asisten Chatbot AI**: Integrasi Chatbot interaktif berbasis LLM untuk membantu memandu warga saat melakukan registrasi atau menanyakan status laporan mereka.
- [ ] **Dukungan Multi-Bahasa**: Implementasi i18n di frontend untuk mendukung berbagai bahasa daerah maupun bahasa internasional.
- [ ] **Analisis Prediktif (Machine Learning)**: Menganalisis riwayat penumpukan laporan untuk mendeteksi area kota rawan banjir atau kerusakan jalan secara preventif.
- [ ] **Integrasi API Sistem Pemerintahan**: Membuka integrasi REST API dengan platform e-Government lainnya milik pemerintah kota.
