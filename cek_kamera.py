"""
Skrip Pengecekan Lengkap Port Kamera (DirectShow + Media Foundation)
Mendeteksi Iriun Webcam, Camo Studio, OBS, dan Kamera Internal.
"""
import time
import sys

try:
    import cv2
except ImportError:
    print("Error: opencv-python belum terinstall.")
    sys.exit(1)

print("=" * 70)
print("🔍 MEMINDAI SEMUA PORT KAMERA (DIRECTSHOW & MEDIA FOUNDATION)...")
print("=" * 70)

backends = []
if sys.platform.startswith("win"):
    backends = [
        ("DirectShow (Iriun / OBS)", cv2.CAP_DSHOW),
        ("Media Foundation (Camo / Windows)", cv2.CAP_MSMF)
    ]
else:
    backends = [("Default", cv2.CAP_ANY)]

found = []

for backend_name, backend_api in backends:
    print(f"\n--- Memeriksa Jalur {backend_name} ---")
    for idx in range(6):
        try:
            cap = cv2.VideoCapture(idx, backend_api)
            if cap is not None and cap.isOpened():
                # Coba baca 1 frame untuk memastikan sinyal video aktif
                ret, frame = cap.read()
                if ret and frame is not None and frame.size > 0:
                    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or frame.shape[1])
                    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or frame.shape[0])
                    fps = round(cap.get(cv2.CAP_PROP_FPS) or 30.0, 1)
                    mean_val = float(frame.mean())
                    status_frame = "Frame Gambar Jelas" if mean_val > 5.0 else "Frame Hitam/Standby"
                    print(f"  👉 Port [{idx}]: AKTIF! ({w}x{h} @ {fps} FPS) - {status_frame}")
                    found.append((idx, backend_name, w, h, status_frame))
                else:
                    print(f"  ⚠️ Port [{idx}]: Terbuka tapi tidak mengirim frame.")
                cap.release()
                time.sleep(0.15)
            else:
                print(f"  ❌ Port [{idx}]: Tidak aktif.")
        except Exception as e:
            print(f"  ❌ Port [{idx}]: Error ({e})")

print("\n" + "=" * 70)
if found:
    print(f"🎉 HASIL PEMINDAIAN: Ditemukan {len(found)} perangkat aktif:")
    for (port, bname, w, h, st) in found:
        print(f"   • Port [{port}] via {bname} -> {w}x{h} ({st})")
    print("=" * 70)
else:
    print("⚠️ Tidak ada kamera aktif yang terdeteksi.")
print("=" * 70)
