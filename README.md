# Ardacs - Interactive Web Simulation

A standalone, interactive frontend-only simulation of the **Ardacs (Arduino Mouse Trap Client)** IoT application. This simulator is designed to demonstrate the complete workflow between the physical mouse trap, Firebase Realtime Database, and the Android mobile app, all running directly in the browser with dummy data.

## 🚀 Fitur Utama Simulasi

1. **Smartphone Mockup (Android)**
   - **Antarmuka Asli**: Desain visual yang menyerupai aplikasi Android Ardacs (M3 Design).
   - **Tiga Halaman Utama**:
     - *Home Screen*: Status pintu (Terbuka/Tertutup), counter tikus ke, nomor sesi, status baterai (Volt & %), dan tombol aksi untuk Buzzer dan Relay Kamera.
     - *History Screen*: Log aktivitas penangkapan dikelompokkan berdasarkan sesi, lengkap dengan tombol **Reset Semua History**.
     - *Kamera Screen*: Menampilkan streaming simulasi dari kamera ESP32-CAM dengan animasi tikus berjalan di dalam kandang dan tombol **Capture Foto**.
   - **Sidebar Pengaturan**: Berfungsi untuk menyalakan/mematikan **Notifikasi Lokal** dan toggle **Mode Gelap (Dark Mode)** yang secara dinamis mengubah tema warna smartphone mockup.

2. **Simulation Controller**
   - **Koneksi Alat**: Pengatur status Online/Offline perangkat ESP8266. Jika Offline, aplikasi Android akan menunjukkan "Offline" dan streaming kamera akan menampilkan gangguan sinyal (*noise* TV).
   - **Pemicu Sensor Perangkap**:
     - *Simulasikan Tikus Masuk*: Meniru tikus memicu sensor perangkap. Pintu akan menutup secara instan di visual kamera, counter tikus bertambah, log ditambahkan ke riwayat, dan notifikasi berbunyi & muncul di layar HP.
     - *Reset Pintu Terbuka*: Membuka kembali pintu perangkap untuk menunggu tikus berikutnya.
   - **Kapasitas Baterai**: Slider untuk mengubah persentase baterai. Tegangan baterai (Volt) akan dihitung secara otomatis. Jika baterai di bawah 15%, notifikasi peringatan baterai lemah akan muncul.
   - **Visualizer Buzzer**: Indikator equalizer suara yang bergerak dinamis saat buzzer diaktifkan dari HP.

3. **Dynamic Workflow Diagram (SVG)**
   - Alur komunikasi dinamis yang menghubungkan **Smart Mouse Trap (ESP8266/ESP32-CAM)** &harr; **Firebase RTDB** &harr; **Android App**.
   - Jalur data akan berkedip/berdenyut (*pulse animation*) secara real-time mengikuti arah pertukaran data saat Anda melakukan aksi (misal: menekan tombol buzzer, menyalakan kamera, atau menyimulasikan tikus masuk).

4. **Virtual Firebase RTDB Viewer**
   - Panel JSON real-time yang memperlihatkan struktur data Firebase yang sedang digunakan. Nilai yang berubah akan berkedip hijau untuk menunjukkan sinkronisasi data instan.

---

## 🛠️ Cara Menjalankan Secara Lokal

Cukup buka file `index.html` langsung di browser Anda:
1. Klik ganda file [index.html](file:///c:/Users/Arman/AndroidStudioProjects/ardacs2/ardacs-web/index.html) atau klik kanan lalu pilih **Open with browser** (Chrome, Edge, Firefox, Safari).
2. Anda juga dapat menggunakan live server extension jika menggunakan VS Code.

---

## 🌐 Cara Hosting Gratis di GitHub Pages

Karena web simulasi ini murni frontend (HTML, CSS, JS), Anda bisa meng-host-nya secara gratis di GitHub Pages dengan langkah berikut:

1. Buat repositori baru di GitHub (misal: `ardacs-simulation`).
2. Upload seluruh file di dalam folder ini (`index.html`, `styles.css`, `app.js`, `README.md`) ke repositori tersebut.
3. Di halaman repositori GitHub Anda:
   - Pergi ke menu **Settings** > **Pages** (di sidebar kiri).
   - Pada bagian **Build and deployment** > **Source**, pilih **Deploy from a branch**.
   - Di bawah **Branch**, pilih branch utama Anda (`main` atau `master`) dan folder root `/ (root)`.
   - Klik **Save**.
4. Dalam beberapa menit, GitHub akan memberikan link publik gratis seperti:  
   `https://username.github.io/ardacs-simulation/`

Link tersebut siap dimasukkan ke dalam README repositori utama atau dijadikan link demo proyek Anda!
