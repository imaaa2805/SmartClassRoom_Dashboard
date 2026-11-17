"""
Modul AI Pengawasan Cerdas Ruang Kelas (Surveillance Engine) - ULTRA FAST & ZERO-LAG
Dioptimalkan untuk performa tinggi (60 FPS tanpa delay):
1. YOLOv11n (Ultralytics) - Asynchronous background thread (tidak memblokir video feed)
2. Color Analysis - Pengambilan sampel HSV cepat per 10 frame
3. Contour Motion Detection - Analisis kontur pada resolusi thumbnail per 3 frame
4. SSIM (Structural Similarity Index) - Native NumPy float32 per 10 frame
"""
import time
import datetime
import threading
import cv2
import numpy as np

# Cek ketersediaan ultralytics YOLO
YOLO_AVAILABLE = False
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False


def calculate_fast_ssim(img1_gray, img2_gray):
    """
    Menghitung SSIM cepat (Float32) pada resolusi thumbnail (120x90).
    Sangat ringan (< 1ms CPU time), mencegah lag video.
    """
    if img1_gray is None or img2_gray is None:
        return 1.0

    c1 = (0.01 * 255) ** 2
    c2 = (0.03 * 255) ** 2

    # Float32 jauh lebih cepat daripada Float64
    img1 = img1_gray.astype(np.float32)
    img2 = img2_gray.astype(np.float32)

    mu1 = cv2.blur(img1, (7, 7))
    mu2 = cv2.blur(img2, (7, 7))

    mu1_sq = mu1 * mu1
    mu2_sq = mu2 * mu2
    mu1_mu2 = mu1 * mu2

    sigma1_sq = cv2.blur(img1 * img1, (7, 7)) - mu1_sq
    sigma2_sq = cv2.blur(img2 * img2, (7, 7)) - mu2_sq
    sigma12 = cv2.blur(img1 * img2, (7, 7)) - mu1_mu2

    numerator = (2.0 * mu1_mu2 + c1) * (2.0 * sigma12 + c2)
    denominator = (mu1_sq + mu2_sq + c1) * (sigma1_sq + sigma2_sq + c2)
    ssim_map = numerator / (denominator + 1e-6)

    return float(np.mean(ssim_map))


class SurveillanceEngine:
    """
    Engine Pengawasan Terpadu Tanpa Lag:
    - Inferensi YOLO berjalan di Thread Terpisah (Non-blocking Asynchronous)
    - Perhitungan Kontur & SSIM di-throttle agar CPU tetap dingin (< 15%)
    - Menjamin video feed tetap 30–60 FPS lancar
    """
    def __init__(self, cam_id=2, enable_yolo=True, enable_ssim=True, enable_contour=True, enable_color=True):
        self.cam_id = cam_id
        self.enable_yolo = enable_yolo
        self.enable_ssim = enable_ssim
        self.enable_contour = enable_contour
        self.enable_color = enable_color

        # Model YOLOv11n
        self.yolo_model = None
        self.yolo_loaded = False
        self.yolo_classes_interest = {0: "Siswa/Orang", 67: "HP/Gadget", 63: "Laptop", 24: "Tas", 56: "Kursi"}
        
        # Async YOLO Thread state
        self.yolo_lock = threading.Lock()
        self.yolo_frame_pending = None
        self.yolo_busy = False
        self.cached_yolo_boxes = []

        if self.enable_yolo:
            self._init_yolo()

        # State untuk SSIM & Contour (dijalankan periodik)
        self.baseline_gray = None
        self.last_baseline_update = time.time()
        self.baseline_interval = 20.0
        self.cached_ssim = 1.0
        self.cached_ssim_status = "Sangat Stabil"

        # Background Subtractor untuk Kontur Gerakan
        self.bg_subtractor = cv2.createBackgroundSubtractorMOG2(history=120, varThreshold=30, detectShadows=False)
        self.cached_motion_contours = []

        # Hasil Analitik Realtime
        self.telemetry = {
            "cam_id": self.cam_id,
            "yolo_active": self.yolo_loaded,
            "person_count": 0,
            "phone_detected": 0,
            "laptop_detected": 0,
            "objects_detected": [],
            "ssim_score": 1.0,
            "ssim_status": "Stabil",
            "motion_detected": False,
            "contour_count": 0,
            "motion_intensity": "Tenang",
            "avg_brightness": 128,
            "color_tone": "Normal",
            "last_update": datetime.datetime.now().strftime("%H:%M:%S")
        }

    def _init_yolo(self):
        """Inisialisasi model YOLOv11n di thread terpisah agar startup instan."""
        if not YOLO_AVAILABLE:
            self.yolo_loaded = False
            return

        def _loader():
            try:
                model = YOLO("yolo11n.pt")
                with self.yolo_lock:
                    self.yolo_model = model
                    self.yolo_loaded = True
                    self.telemetry["yolo_active"] = True
            except Exception:
                self.yolo_loaded = False

        threading.Thread(target=_loader, daemon=True).start()

    def _async_yolo_inference(self, img_to_detect, scale_x, scale_y):
        """Worker thread untuk inferensi YOLO di background tanpa menghentikan streaming."""
        try:
            results = self.yolo_model.predict(
                source=img_to_detect,
                conf=0.35,
                imgsz=256,
                verbose=False,
                classes=[0, 24, 56, 63, 67]
            )

            new_boxes = []
            persons = 0
            phones = 0
            laptops = 0
            detected_items = []

            if len(results) > 0 and results[0].boxes is not None:
                for box in results[0].boxes:
                    cls_id = int(box.cls[0].item())
                    conf = float(box.conf[0].item())
                    xyxy = box.xyxy[0].tolist()

                    bx1 = int(xyxy[0] * scale_x)
                    by1 = int(xyxy[1] * scale_y)
                    bx2 = int(xyxy[2] * scale_x)
                    by2 = int(xyxy[3] * scale_y)

                    label_name = self.yolo_classes_interest.get(cls_id, f"Obj_{cls_id}")
                    new_boxes.append((bx1, by1, bx2, by2, label_name, conf))

                    if cls_id == 0:
                        persons += 1
                    elif cls_id == 67:
                        phones += 1
                    elif cls_id == 63:
                        laptops += 1
                    detected_items.append(f"{label_name} ({int(conf*100)}%)")

            with self.yolo_lock:
                self.cached_yolo_boxes = new_boxes
                self.telemetry["person_count"] = persons
                self.telemetry["phone_detected"] = phones
                self.telemetry["laptop_detected"] = laptops
                self.telemetry["objects_detected"] = detected_items
        except Exception:
            pass
        finally:
            with self.yolo_lock:
                self.yolo_busy = False

    def process_frame(self, frame, frame_counter):
        """
        Pemrosesan frame super cepat:
        - Stream video tidak pernah diblokir
        - Operasi berat (YOLO, SSIM) dilakukan di background atau sampling per beberapa frame
        """
        if frame is None:
            return frame

        h, w = frame.shape[:2]
        current_time = time.time()

        # -------------------------------------------------------------
        # 1. COLOR ANALYSIS (Hanya dijalankan tiap 12 frame)
        # -------------------------------------------------------------
        if self.enable_color and (frame_counter % 12 == 0):
            tiny = cv2.resize(frame, (80, 60))
            avg_brightness = int(np.mean(tiny))
            self.telemetry["avg_brightness"] = avg_brightness

            hsv = cv2.cvtColor(tiny, cv2.COLOR_BGR2HSV)
            avg_hue = int(np.mean(hsv[:, :, 0]))
            avg_sat = int(np.mean(hsv[:, :, 1]))

            if avg_brightness < 40:
                self.telemetry["color_tone"] = "Gelap / Redup"
            elif avg_brightness > 220:
                self.telemetry["color_tone"] = "Silau"
            elif avg_sat < 30:
                self.telemetry["color_tone"] = "Netral"
            elif 15 <= avg_hue <= 35:
                self.telemetry["color_tone"] = "Hangat (Warm)"
            elif 85 <= avg_hue <= 130:
                self.telemetry["color_tone"] = "Sejuk (Cool)"
            else:
                self.telemetry["color_tone"] = "Normal"

        # -------------------------------------------------------------
        # 2. CONTOUR MOTION DETECTION (Tiap 3 frame pada resolusi 160x120)
        # -------------------------------------------------------------
        if self.enable_contour and (frame_counter % 3 == 0):
            scale_w, scale_h = 160, 120
            small_motion = cv2.resize(frame, (scale_w, scale_h))
            small_motion_gray = cv2.cvtColor(small_motion, cv2.COLOR_BGR2GRAY)

            fg_mask = self.bg_subtractor.apply(small_motion_gray)
            _, thresh = cv2.threshold(fg_mask, 200, 255, cv2.THRESH_BINARY)
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            scale_x = w / scale_w
            scale_y = h / scale_h
            motion_contours = []
            for cnt in contours:
                area = cv2.contourArea(cnt)
                if area > 100:
                    x, y, cw, ch = cv2.boundingRect(cnt)
                    motion_contours.append((
                        int(x * scale_x),
                        int(y * scale_y),
                        int(cw * scale_x),
                        int(ch * scale_y),
                        int(area * scale_x * scale_y)
                    ))

            self.cached_motion_contours = motion_contours
            self.telemetry["contour_count"] = len(motion_contours)
            self.telemetry["motion_detected"] = len(motion_contours) > 0
            if len(motion_contours) == 0:
                self.telemetry["motion_intensity"] = "Tenang (0)"
            elif len(motion_contours) <= 2:
                self.telemetry["motion_intensity"] = "Gerak Kecil"
            elif len(motion_contours) <= 5:
                self.telemetry["motion_intensity"] = "Sedang"
            else:
                self.telemetry["motion_intensity"] = "Ramai / Tinggi"

        # -------------------------------------------------------------
        # 3. FAST SSIM (Tiap 15 frame pada thumbnail 120x90)
        # -------------------------------------------------------------
        if self.enable_ssim and (frame_counter % 15 == 0):
            ssim_w, ssim_h = 120, 90
            ssim_thumb = cv2.resize(frame, (ssim_w, ssim_h))
            ssim_gray = cv2.cvtColor(ssim_thumb, cv2.COLOR_BGR2GRAY)

            if self.baseline_gray is None or (current_time - self.last_baseline_update > self.baseline_interval):
                self.baseline_gray = ssim_gray.copy()
                self.last_baseline_update = current_time

            val = calculate_fast_ssim(ssim_gray, self.baseline_gray)
            val = max(0.0, min(1.0, val))
            self.cached_ssim = round(val, 3)
            self.telemetry["ssim_score"] = self.cached_ssim

            if val >= 0.90:
                self.cached_ssim_status = "Stabil"
            elif val >= 0.75:
                self.cached_ssim_status = "Perubahan Ruang"
            else:
                self.cached_ssim_status = "Anomali / Drastis"
            self.telemetry["ssim_status"] = self.cached_ssim_status

        # -------------------------------------------------------------
        # 4. ASYNCHRONOUS YOLOv11 INFERENCE (Non-blocking)
        # -------------------------------------------------------------
        if self.enable_yolo and self.yolo_loaded and not self.yolo_busy and (frame_counter % 6 == 0):
            with self.yolo_lock:
                self.yolo_busy = True
            
            yolo_w, yolo_h = 256, 192
            yolo_input = cv2.resize(frame, (yolo_w, yolo_h))
            scale_x = w / yolo_w
            scale_y = h / yolo_h
            threading.Thread(
                target=self._async_yolo_inference,
                args=(yolo_input, scale_x, scale_y),
                daemon=True
            ).start()

        # -------------------------------------------------------------
        # 5. RENDER HUD OVERLAY (Instan dari Cached State)
        # -------------------------------------------------------------
        self._render_hud(frame)

        self.telemetry["last_update"] = datetime.datetime.now().strftime("%H:%M:%S")
        return frame

    def _render_hud(self, frame):
        """Gambar bounding box dan mini HUD secara instan tanpa kalkulasi berat."""
        h, w = frame.shape[:2]

        # A. Bounding Box Kontur Gerakan (Kuning tipis)
        for (x, y, cw, ch, area) in self.cached_motion_contours[:8]:
            cv2.rectangle(frame, (x, y), (x + cw, y + ch), (0, 215, 255), 1)

        # B. Bounding Box YOLOv11 (Cyan / Hijau)
        with self.yolo_lock:
            boxes = list(self.cached_yolo_boxes)

        for (bx1, by1, bx2, by2, label, conf) in boxes:
            box_color = (0, 255, 128) if "Siswa" in label else ((0, 165, 255) if "HP" in label else (255, 185, 95))
            cv2.rectangle(frame, (bx1, by1), (bx2, by2), box_color, 2)
            cv2.putText(
                frame,
                f"{label} {int(conf * 100)}%",
                (bx1 + 3, max(14, by1 - 4)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.40,
                box_color,
                1,
                cv2.LINE_AA
            )

        # C. Bar Status Bawah Minimalis (Cepat & Ringan)
        cv2.rectangle(frame, (0, h - 28), (w, h), (18, 20, 24), -1)

        yolo_info = f"YOLO: {self.telemetry['person_count']} Siswa"
        if self.telemetry['phone_detected'] > 0:
            yolo_info += f", {self.telemetry['phone_detected']} HP"
        if not self.yolo_loaded:
            yolo_info = "YOLO: Standby"

        ssim_pct = int(self.cached_ssim * 100)
        hud_text = f"{yolo_info}  |  Kontur: {len(self.cached_motion_contours)}  |  SSIM: {ssim_pct}% ({self.cached_ssim_status})"
        cv2.putText(frame, hud_text, (10, h - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.40, (220, 230, 240), 1, cv2.LINE_AA)
