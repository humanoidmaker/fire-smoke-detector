# FireWatch - AI Fire & Smoke Detector

AI-powered fire and smoke detection system using computer vision. Analyzes images from uploaded photos or connected camera feeds to detect fire and smoke in real-time, providing severity assessments and action recommendations.

**By [Humanoid Maker](https://www.humanoidmaker.com)**

## Features

- **Real-time Detection**: Upload images or connect camera feeds for fire/smoke analysis
- **Severity Assessment**: Automatic severity classification (low/medium/high/critical) based on detected area
- **Region Detection**: Identifies specific regions within images where fire/smoke is present
- **Alert Management**: Alert log with acknowledgement workflow
- **Camera Management**: CRUD for camera sources with location tracking
- **Email Notifications**: Automatic email alerts for high/critical severity detections
- **Dashboard**: Comprehensive stats, recent detections, and camera status overview

## Tech Stack

- **Backend**: Python, FastAPI, PyTorch, torchvision (ResNet-50 classifier)
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Database**: MongoDB
- **ML Model**: ResNet-50 fine-tuned for fire/smoke classification (4 classes: Normal, Fire, Smoke, Fire+Smoke)

## GPU Requirements

| Level | GPU | VRAM | Notes |
|-------|-----|------|-------|
| Minimum | NVIDIA GTX 1650 | 4 GB | Inference only, batch size 1 |
| Recommended | NVIDIA RTX 3060 | 12 GB | Fast inference, small batch training |
| Production | NVIDIA RTX 4080+ | 16 GB+ | Real-time multi-camera feeds |

CPU-only mode is supported but significantly slower.

## Quick Start

### Docker (Recommended)

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your settings
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Manual Setup

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| PUT | /api/auth/settings | Update settings |
| POST | /api/detect/analyze | Analyze image for fire/smoke |
| GET | /api/detect/alerts | Get alert history |
| POST | /api/detect/alert/acknowledge/:id | Acknowledge alert |
| GET | /api/detect/stats | Get detection statistics |
| GET | /api/cameras/ | List cameras |
| POST | /api/cameras/ | Add camera |
| PUT | /api/cameras/:id | Update camera |
| DELETE | /api/cameras/:id | Delete camera |

## License

MIT License - see [LICENSE](LICENSE)
