import cv2

# 1. Mengakses kamera bawaan laptop
camera = cv2.VideoCapture(0)
# Mengambil informasi resolusi kamera
width = camera.get(cv2.CAP_PROP_FRAME_WIDTH)
height = camera.get(cv2.CAP_PROP_FRAME_HEIGHT)
# Menampilkan resolusi kamera
fps = camera.get(cv2.CAP_PROP_FPS)
print("=== INFORMASI KAMERA ===")
print(f"Resolusi: {int(width)} x {int(height)}")
print(f"FPS: {int(fps)}")

# 2. Memeriksa apakah kamera berhasil dibuka
if not camera.isOpened():
    print("Kamera gagal dibuka!")
else:
    print("Kamera berhasil dibuka!")

    # 3. Mengambil gambar secara terus-menerus
    while True:
        ret, frame = camera.read()

        if not ret:
            print("Gagal mengambil gambar!")
            break

        # 4. Menampilkan gambar kamera
        cv2.imshow("Smart Class Room - Camera Test", frame)

        # 5. Tekan Q untuk menghentikan program
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

# 6. Menutup koneksi kamera
camera.release()
cv2.destroyAllWindows()
