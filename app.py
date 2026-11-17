import datetime
from flask import Flask, render_template, jsonify, request, Response
from src.system_monitor import SystemMonitor
from src.camera_manager import CameraManager

app = Flask(
    __name__,
    template_folder="dashboard/templates",
    static_folder="dashboard/static"
)

monitor = SystemMonitor()
camera_manager = CameraManager()

# Daftar log aktivitas hardware yang dapat diperbarui dinamis
system_logs = [
    {
        "id": 1,
        "time": "09:30:12 WIB",
        "level": "INFO",
        "tag": "Kamera Terhubung",
        "message": "Logitech BRIO (/dev/video0) berhasil terhubung pada Port USB 3.0 Bus 002. Sinkronisasi UVC Stream siap."
    },
    {
        "id": 2,
        "time": "09:28:45 WIB",
        "level": "RESOLUSI",
        "tag": "Perubahan Resolusi",
        "message": "Stream Kamera 1 dinegosiasikan ulang ke format 1920x1080 @ 60FPS oleh daemon video lokal."
    },
    {
        "id": 3,
        "time": "09:15:02 WIB",
        "level": "INIT",
        "tag": "Inisialisasi Kamera",
        "message": "Sub-sistem V4L2 mendeteksi kernel driver UVC versi 1.1.1 siap; buffer memori dialokasikan."
    },
    {
        "id": 4,
        "time": "08:14:20 WIB",
        "level": "PERINGATAN",
        "tag": "Kamera Terputus",
        "message": "Perangkat Kamera 2 (Surveillance Left) kehilangan sinyal USB I/O. Paket handshake timeout setelah 3000ms."
    },
    {
        "id": 5,
        "time": "08:00:10 WIB",
        "level": "SISTEM",
        "tag": "Pemeriksaan Port",
        "message": "Host controller USB xHCI memindai 6 port periferal eksternal; enumerasi berkala selesai tanpa crash."
    },
    {
        "id": 6,
        "time": "Kemarin 16:30 WIB",
        "level": "PERINGATAN",
        "tag": "Kamera Terputus",
        "message": "Kamera 4 (Surveillance Right) terputus - sinyal VBUS daya drop di bawah ambang batas operasional."
    }
]


@app.route("/")
def dashboard():
    return render_template("index.html")


@app.route("/api/system")
def system_data():
    """Mengambil status telemetri beban sistem dan hardware."""
    return jsonify({
        "status": "success",
        "system": monitor.get_system_info(),
        "performance": monitor.get_performance()
    })


@app.route("/api/cameras")
def get_cameras():
    """Mengambil status semua kamera."""
    cameras = camera_manager.get_cameras()
    total = len(cameras)
    connected = sum(1 for c in cameras if c["status"] == "connected")
    disconnected = total - connected
    return jsonify({
        "status": "success",
        "cameras": cameras,
        "total": total,
        "connected": connected,
        "disconnected": disconnected
    })


@app.route("/api/scan-cameras", methods=["GET", "POST"])
def scan_cameras():
    """Memindai ulang port hardware kamera."""
    result = camera_manager.scan_all_ports()
    
    # Tambahkan catatan log baru
    now_str = datetime.datetime.now().strftime("%H:%M:%S WIB")
    log_entry = {
        "id": len(system_logs) + 1,
        "time": now_str,
        "level": "SISTEM",
        "tag": "Pindai Port USB",
        "message": f"Pemindaian ulang port hardware selesai. Terdeteksi {result['connected']} kamera aktif."
    }
    system_logs.insert(0, log_entry)

    return jsonify({
        "status": "success",
        "scan_result": result,
        "cameras": camera_manager.get_cameras(),
        "latest_log": log_entry
    })


@app.route("/api/cameras/<int:cam_id>/reconnect", methods=["POST"])
def reconnect_camera(cam_id):
    """Mencoba menghubungkan ulang kamera spesifik."""
    result = camera_manager.reconnect_camera(cam_id)
    
    now_str = datetime.datetime.now().strftime("%H:%M:%S WIB")
    level = "INFO" if result["success"] else "PERINGATAN"
    log_entry = {
        "id": len(system_logs) + 1,
        "time": now_str,
        "level": level,
        "tag": "Sambung Ulang",
        "message": result["message"]
    }
    system_logs.insert(0, log_entry)

    return jsonify({
        "status": "success" if result["success"] else "error",
        "result": result,
        "latest_log": log_entry,
        "cameras": camera_manager.get_cameras()
    })


@app.route("/api/cameras/<int:cam_id>/switch-index/<int:device_idx>", methods=["POST"])
def switch_camera_index_for_cam(cam_id, device_idx):
    """Mengalihkan perangkat kamera yang digunakan untuk ID kamera tertentu (1, 2, 3, 4)."""
    result = camera_manager.switch_camera_source(cam_id, device_idx)
    now_str = datetime.datetime.now().strftime("%H:%M:%S WIB")
    log_entry = {
        "id": len(system_logs) + 1,
        "time": now_str,
        "level": "INFO",
        "tag": "Ganti Port",
        "message": f"Kamera #{cam_id} dialihkan ke Port Hardware Index {device_idx}."
    }
    system_logs.insert(0, log_entry)
    return jsonify({
        "status": "success",
        "result": result,
        "camera_id": cam_id,
        "current_index": device_idx,
        "latest_log": log_entry
    })


@app.route("/api/cameras/<int:cam_id>/set-source", methods=["POST"])
def set_camera_source(cam_id):
    """Mengatur sumber kamera baik angka indeks (0, 1, 2, 3) maupun URL streaming IP/RTSP."""
    data = request.get_json(silent=True) or {}
    source = data.get("source")
    if source is None:
        return jsonify({"status": "error", "message": "Sumber tidak ditentukan"}), 400
    try:
        source_str = str(source).strip()
        if source_str.isdigit():
            source = int(source_str)
        else:
            if not (source_str.startswith("http://") or source_str.startswith("https://") or source_str.startswith("rtsp://")):
                source_str = f"http://{source_str}"
            if ":8080" in source_str and not source_str.endswith("/video"):
                source_str = source_str.rstrip("/") + "/video"
            source = source_str
    except Exception:
        pass
    
    result = camera_manager.switch_camera_source(cam_id, source)
    now_str = datetime.datetime.now().strftime("%H:%M:%S WIB")
    log_entry = {
        "id": len(system_logs) + 1,
        "time": now_str,
        "level": "INFO",
        "tag": "Sumber Kamera",
        "message": f"Kamera #{cam_id} dihubungkan ke sumber baru: {source}."
    }
    system_logs.insert(0, log_entry)
    return jsonify({
        "status": "success",
        "result": result,
        "camera_id": cam_id,
        "current_source": source,
        "latest_log": log_entry
    })


@app.route("/api/cameras/switch-index/<int:device_idx>", methods=["POST"])
def switch_camera_index(device_idx):
    """Fallback kompatibilitas: alihkan Kamera 1."""
    result = camera_manager.switch_camera_source(1, device_idx)
    return jsonify({
        "status": "success",
        "result": result,
        "camera_id": 1,
        "current_index": device_idx
    })



@app.route("/api/cameras/<int:cam_id>/test", methods=["GET"])
def test_camera_signal(cam_id):
    """Menguji kualitas sinyal, bitrate, dan latency kamera."""
    result = camera_manager.test_camera_signal(cam_id)
    return jsonify({
        "status": "success",
        "test": result
    })


@app.route("/api/logs")
def get_logs():
    """Mengambil riwayat log hardware sistem."""
    return jsonify({
        "status": "success",
        "logs": system_logs
    })


@app.route("/video_feed/<int:camera_id>")
def video_feed(camera_id):
    """Endpoint stream video MJPEG."""
    return Response(
        camera_manager.generate_mjpeg_stream(camera_id),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )


if __name__ == "__main__":
    app.run(
        debug=False,
        host="0.0.0.0",
        port=5000,
        threaded=True
    )
