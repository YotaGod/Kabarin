# Panduan Pemeliharaan (MAINTENANCE_GUIDE) 🔧

Panduan ini ditujukan bagi Administrator Sistem dan tim DevOps untuk memelihara aplikasi **Kota Pintar** agar tetap berjalan secara optimal di lingkungan produksi (*production*).

---

## 📈 1. Pemantauan Sistem (Monitoring)

### Pemantauan Proses (Supervisor)
Aplikasi backend dan frontend dikelola menggunakan Supervisor. Untuk memeriksa status proses:
```bash
sudo supervisorctl status all
```

### Log File
Jika terjadi error atau performa melambat, periksa berkas log berikut secara berkala:
- **Backend Error Log**: `/var/log/supervisor/backend.err.log`
- **Backend Access Log**: `/var/log/supervisor/backend.out.log`
- **Frontend Error Log**: `/var/log/supervisor/frontend.err.log`

### Pemantauan Disk & Database (MongoDB)
- Pastikan kapasitas penyimpanan sisa pada disk minimal **20%** dari total kapasitas.
- Gunakan perintah `mongostat` atau UI Compass untuk memonitor performa query MongoDB secara berkala.

---

## 💾 2. Kebijakan Pencadangan (Backup)

Lakukan pencadangan database MongoDB secara berkala (direkomendasikan setiap minggu) menggunakan tool `mongodump`.

### Perintah Backup Otomatis
Buat script cron job untuk menjalankan backup secara berkala:
```bash
mongodump --uri="mongodb://localhost:27017/smartcity" --out=/app/backups/db-$(date +%F)
```
Simpan arsip backup di server penyimpanan terpisah (*off-site storage*) untuk mencegah kehilangan data akibat kerusakan server fisik.

---

## 🔄 3. Pemulihan Bencana (Disaster Recovery)

Jika terjadi kegagalan sistem atau kerusakan basis data, lakukan pemulihan data menggunakan berkas cadangan terakhir dengan perintah `mongorestore`:

```bash
mongorestore --uri="mongodb://localhost:27017/smartcity" --drop /app/backups/db-[TANGGAL_BACKUP]/smartcity
```
> [!CAUTION]
> Flag `--drop` akan menghapus koleksi aktif saat ini sebelum melakukan restorasi. Pastikan Anda merestorasi berkas cadangan yang tepat.

---

## 📦 4. Pembaruan Dependensi (Dependency Updates)

Untuk menjaga keamanan aplikasi dari kerentanan (*security vulnerabilities*), lakukan audit dan pembaruan dependensi setiap bulan:

### Backend (Python)
Periksa dependensi usang menggunakan `pip-review`:
```bash
pip install pip-review
pip-review --local --interactive
```

### Frontend (npm/React)
Gunakan perintah audit npm bawaan untuk mendeteksi kerentanan keamanan dan memperbaruinya:
```bash
npm audit
npm audit fix
```

---

## 🛡️ 5. Penanganan Insiden (Incident Response)

Jika backend mati atau port tidak merespons:
1. Pastikan port `8001` tidak digunakan oleh proses lain:
   ```bash
   sudo lsof -i :8001
   ```
2. Restart layanan backend via Supervisor:
   ```bash
   sudo supervisorctl restart backend
   ```
3. Periksa konektivitas ke database MongoDB. Pastikan server MongoDB berjalan:
   ```bash
   sudo systemctl status mongod
   ```
