# Smart Class Room - Hardware Monitor v2.4

Sistem dashboard pemantauan perangkat keras (hardware) dan kamera secara waktu nyata (*real-time*) untuk ruang kelas pintar (*smart classroom*).

---

## 🚀 Fitur Utama

1. **AI Surveillance Suite (Pengawasan Pintar Ruang Kelas)**:
   - **YOLOv11n (Ultralytics)**: Deteksi otomatis objek ruang kelas — Siswa/Orang, Smartphone/Gadget, Laptop, Tas, dan Kursi secara real-time.
   - **Deteksi Kontur Gerakan (OpenCV Contours)**: Pelacakan kontur dinamis (`cv2.findContours`) untuk mendeteksi pergerakan atau intrusi di kelas.
   - **SSIM (Structural Similarity Index)**: Pengukuran kemiripan struktural ruang kelas (0 - 100%) terhadap background baseline untuk mendeteksi anomali/perubahan ruang secara instan.
   - **Color & Lighting Analysis**: Analisis tone warna HSV dan pencahayaan (Gelap, Silau, Hangat, Sejuk, Normal).
   - **Live Telemetry Badges**: Tampilan indikator AI real-time pada kartu kamera pengawasan di dashboard.

2. **Pemantauan Performa Sistem Real-time**:
   - Beban Prosesor (CPU %), jumlah core, dan clock speed.
   - Grafik dinamis riwayat penggunaan CPU 60 detik terakhir (SVG curve update).
   - Penggunaan Memori RAM (Used, Available, Total GB).
   - Suhu prosesor dan waktu aktif sistem (*uptime*).
   - Spesifikasi perangkat host (OS, Prosesor, Arsitektur, Alokasi Port USB).

2. **Pemantauan Siaran & Status Kamera**:
   - Status 4 titik kamera kelas (Attendance Camera, Surveillance Left, Center, Right).
   - *Filter* cepat: Semua (4), Aktif (1), Terputus (3).
   - *Live stream* video MJPEG terintegrasi (`/video_feed/1`) yang mendukung webcam fisik OpenCV.
   - Mode Layar Penuh (*Fullscreen*) dengan fitur tangkapan layar (*screenshot*).
   - Uji Sinyal Kamera (latensi ms, bitrate, packet loss).
   - Diagnostik Kanal Port USB xHCI.
   - Tombol Sambung Ulang (*Reconnect*) dengan *feedback* otomatis ke terminal log.

3. **Log Aktivitas Hardware & Bus**:
   - Stream riwayat aktivitas deteksi V4L2/UVC dan periferal.
   - Filter tingkatan log (Semua, Peringatan, Info Hardware).
   - Fitur **Ekspor CSV** untuk mengunduh riwayat log ke file spreadsheet.

4. **Desain & Responsivitas**:
   - Tema gelap modern (*Dark Futuristic Cyber-Telemetry*).
   - Responsif untuk layar Desktop, Laptop, Tablet, dan Smartphone.
   - Menu *drawer* samping (*sidebar*) dengan tombol *hamburger* pada layar ponsel/tablet.
   - Sistem notifikasi *Toast* mengambang (*floating alerts*).

---

## 🛠️ Cara Menjalankan

1. Pastikan virtual environment aktif atau dependensi telah terpasang:
   ```bash
   pip install flask psutil opencv-python numpy ultralytics
   ```

2. Jalankan aplikasi Flask:
   ```bash
   python app.py
   ```

3. Buka peramban (*browser*) pada alamat:
   ```
   http://127.0.0.1:5000
   ```
   atau
   ```
   http://localhost:5000
   ```

---

## 📁 Struktur Direktori

```
SmartClassRoom_Hadrware/
├── app.py                      # Aplikasi Flask utama & REST API endpoints
├── dashboard/
│   ├── static/
│   │   ├── style.css           # Stylesheet tema cyber telemetry & responsif
│   │   ├── css/style.css       # Alias stylesheet
│   │   └── js/
│   │       └── dashboard.js    # Logika telemetri realtime, chart SVG, filter, & modal
│   └── templates/
│       └── index.html          # Template HTML utama dashboard
├── src/
│   ├── system_monitor.py       # Pengambil telemetri CPU, RAM, OS, Uptime (psutil)
│   ├── camera_manager.py       # Pengelola status 4 kamera & MJPEG video streaming
│   ├── detect_cameras.py       # Utilitas pemindaian port kamera (OpenCV)
│   ├── camera.py               # Representasi data objek kamera
│   └── test_camera.py          # Skrip pengujian kamera mandiri
└── README.md
```
