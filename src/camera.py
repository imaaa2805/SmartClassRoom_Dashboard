"""
Kelas representasi Kamera individual
"""

class Camera:
    def __init__(self, camera_id, name, location, device_path, status="connected"):
        self.camera_id = camera_id
        self.name = name
        self.location = location
        self.device_path = device_path
        self.status = status
        self.fps = 0.0
        self.resolution = "N/A"

    def to_dict(self):
        return {
            "id": self.camera_id,
            "name": self.name,
            "location": self.location,
            "device_path": self.device_path,
            "status": self.status,
            "fps": self.fps,
            "resolution": self.resolution
        }
