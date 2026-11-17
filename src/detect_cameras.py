"""
Modul Deteksi Kamera USB / UVC untuk Smart Class Room
"""
import sys

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False


def scan_available_cameras(max_devices_to_test=8):
    """
    Memeriksa port kamera yang tersedia menggunakan OpenCV (Port 0 hingga 7).
    Mengembalikan daftar kamera yang terdeteksi secara fisik / virtual driver (Camo Studio, OBS, dll).
    """
    detected = []
    if not CV2_AVAILABLE:
        return detected

    for index in range(max_devices_to_test):
        try:
            # Gunakan directshow pada Windows jika tersedia untuk deteksi cepat
            if sys.platform.startswith("win"):
                cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)
            else:
                cap = cv2.VideoCapture(index)

            if cap is not None and cap.isOpened():
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 640)
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 480)
                fps = round(cap.get(cv2.CAP_PROP_FPS) or 30.0, 1)

                detected.append({
                    "index": index,
                    "name": f"Kamera Hardware / Virtual Port {index}",
                    "resolution": f"{width} x {height}",
                    "fps": fps if fps > 0 else 30.0,
                    "is_connected": True
                })
                cap.release()
        except Exception:
            continue

    return detected


if __name__ == "__main__":
    print("Mendeteksi kamera terhubung...")
    cams = scan_available_cameras()
    if cams:
        print(f"Ditemukan {len(cams)} kamera:")
        for c in cams:
            print(f"- Index {c['index']}: {c['resolution']} @ {c['fps']} FPS")
    else:
        print("Tidak ada kamera fisik terdeteksi atau OpenCV belum dapat membuka port.")
