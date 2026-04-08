import torch
import torch.nn as nn
import torchvision.transforms as transforms
import torchvision.models as models
from PIL import Image
import io
import numpy as np
from typing import Dict, List, Any

CLASSES = ["Normal", "Fire", "Smoke", "Fire+Smoke"]

SEVERITY_MAP = {
    "Normal": None,
    "Fire": "high",
    "Smoke": "medium",
    "Fire+Smoke": "critical",
}

RECOMMENDATIONS = {
    "Normal": "No fire or smoke detected. Area appears safe.",
    "Fire": "Fire detected! Evacuate immediately. Call fire services (101/911). Do not attempt to fight large fires.",
    "Smoke": "Smoke detected. Investigate source immediately. Prepare for evacuation. Alert building occupants.",
    "Fire+Smoke": "Active fire with smoke detected! EVACUATE IMMEDIATELY. Call fire services (101/911). Do not use elevators. Stay low to avoid smoke inhalation.",
}


class FireDetectorModel(nn.Module):
    def __init__(self, num_classes=4):
        super().__init__()
        self.backbone = models.resnet50(weights=models.ResNet50_Weights.DEFAULT)
        in_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(in_features, 512),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(512, num_classes),
        )

    def forward(self, x):
        return self.backbone(x)


class FireDetector:
    def __init__(self, model_path: str = None, device: str = "cuda"):
        self.device = torch.device(device if torch.cuda.is_available() else "cpu")
        print(f"[FireDetector] Using device: {self.device}")

        self.model = FireDetectorModel(num_classes=len(CLASSES))
        if model_path:
            try:
                state_dict = torch.load(model_path, map_location=self.device)
                self.model.load_state_dict(state_dict)
                print(f"[FireDetector] Loaded model from {model_path}")
            except FileNotFoundError:
                print(f"[FireDetector] Model file not found. Using pre-trained weights for demo.")

        self.model.to(self.device)
        self.model.eval()

        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])

        # Region detection using sliding window approach
        self.region_transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

    def _generate_regions(self, image: Image.Image, grid_size: int = 3) -> List[Dict]:
        """Generate candidate regions using grid-based approach."""
        w, h = image.size
        regions = []
        step_x = w // grid_size
        step_y = h // grid_size

        for i in range(grid_size):
            for j in range(grid_size):
                x1 = i * step_x
                y1 = j * step_y
                x2 = min(x1 + step_x + step_x // 2, w)
                y2 = min(y1 + step_y + step_y // 2, h)
                regions.append({"x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1})

        return regions

    def _classify_region(self, image: Image.Image, region: Dict) -> Dict:
        """Classify a single region."""
        crop = image.crop((
            region["x"], region["y"],
            region["x"] + region["w"],
            region["y"] + region["h"],
        ))
        tensor = self.region_transform(crop).unsqueeze(0).to(self.device)
        with torch.no_grad():
            output = self.model(tensor)
            probs = torch.softmax(output, dim=1)[0]
        class_idx = torch.argmax(probs).item()
        confidence = probs[class_idx].item()
        return {
            "class_idx": class_idx,
            "label": CLASSES[class_idx],
            "confidence": confidence,
        }

    def detect(self, image_bytes: bytes) -> Dict[str, Any]:
        """Detect fire and smoke in an image."""
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_width, img_height = image.size

        # Global classification
        tensor = self.transform(image).unsqueeze(0).to(self.device)
        with torch.no_grad():
            output = self.model(tensor)
            probs = torch.softmax(output, dim=1)[0]

        class_idx = torch.argmax(probs).item()
        confidence = round(probs[class_idx].item() * 100, 1)
        detected_class = CLASSES[class_idx]
        detected = detected_class != "Normal"

        regions = []
        severity = SEVERITY_MAP.get(detected_class)

        if detected:
            # Find regions with fire/smoke
            candidate_regions = self._generate_regions(image)
            for region in candidate_regions:
                result = self._classify_region(image, region)
                if result["class_idx"] != 0 and result["confidence"] > 0.4:
                    regions.append({
                        "x": region["x"],
                        "y": region["y"],
                        "width": region["w"],
                        "height": region["h"],
                        "confidence": round(result["confidence"] * 100, 1),
                        "label": result["label"],
                    })

            # Adjust severity based on region coverage
            if regions:
                total_area = img_width * img_height
                detected_area = sum(r["width"] * r["height"] for r in regions)
                area_pct = detected_area / total_area

                if area_pct > 0.5:
                    severity = "critical"
                elif area_pct > 0.3:
                    severity = "high"
                elif area_pct > 0.1:
                    severity = "medium"
                else:
                    severity = "low"

        return {
            "detected": detected,
            "type": detected_class if detected else None,
            "confidence": confidence,
            "severity": severity,
            "regions": regions,
            "recommendation": RECOMMENDATIONS[detected_class],
            "image_width": img_width,
            "image_height": img_height,
        }


# Singleton
_detector: FireDetector = None


def get_detector() -> FireDetector:
    global _detector
    if _detector is None:
        from ..core.config import settings
        _detector = FireDetector(
            model_path=settings.MODEL_PATH,
            device=settings.DEVICE,
        )
    return _detector
