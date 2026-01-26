# 🎥 Izara Jitsi Meeting Server

Custom Jitsi Meet server for Izara Telemedicine with integrated:

- Google Speech-to-Text transcription
- Gemini AI meeting summarization
- PostgreSQL data persistence
- Thai language support

## 📋 Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Video Meeting** | Jitsi Meet integration | ✅ |
| **Host Controls** | Doctor as meeting host with lobby control | ✅ |
| **Live Transcription** | Google Speech-to-Text API | ✅ |
| **AI Summary** | Gemini 2.5 Flash meeting summary | ✅ |
| **PostgreSQL Storage** | Meeting records, transcripts, summaries | ✅ |
| **Thai Language** | Native Thai language support | ✅ |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Izara Jitsi Server                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │   Jitsi Meet     │    │  Transcription   │                   │
│  │   (Video/Audio)  │───▶│  Service         │                   │
│  └──────────────────┘    └────────┬─────────┘                   │
│                                   │                              │
│                                   ▼                              │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │   PostgreSQL     │◀───│  AI Summary      │                   │
│  │   Storage        │    │  (Gemini)        │                   │
│  └──────────────────┘    └──────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Google Cloud account with:
  - Speech-to-Text API enabled
  - Gemini API key
- PostgreSQL database (shared with Izara portals)

### Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Run Locally

```bash
docker-compose up -d
```

### Access

- **Meeting Room**: <http://localhost:8443/{room-name}>
- **API Server**: <http://localhost:3020>

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/meetings/create` | Create new meeting room |
| GET | `/api/meetings/:id` | Get meeting info |
| POST | `/api/meetings/:id/start-transcription` | Start live transcription |
| POST | `/api/meetings/:id/stop-transcription` | Stop transcription |
| POST | `/api/meetings/:id/generate-summary` | Generate AI summary |
| GET | `/api/meetings/:id/transcript` | Get meeting transcript |
| GET | `/api/meetings/:id/summary` | Get AI summary |

## 🗄️ Database Schema

Meetings data is stored in shared `izara_phase1` PostgreSQL database:

- `meeting_records` - Meeting metadata
- `meeting_transcripts` - Real-time transcripts
- `emr` - AI summaries linked to EMR

## 🔧 Configuration

### Jitsi Config

Located in `config/`:

- `config.js` - Jitsi Meet UI configuration
- `interface_config.js` - Interface customization

### Transcription Config

Speech-to-Text settings in `.env`:

- `GOOGLE_STT_ENABLED=true`
- `GOOGLE_STT_LANGUAGE=th-TH`
- `GOOGLE_STT_MODEL=latest_long`

## 📦 Docker Services

| Service | Port | Description |
|---------|------|-------------|
| jitsi-web | 8443 | Jitsi Meet Web Interface |
| jitsi-prosody | 5222 | XMPP Server |
| jitsi-jicofo | 5347 | Focus Component |
| jitsi-jvb | 10000 | Video Bridge |
| izara-meeting-api | 3020 | Transcription & AI API |

## 🔗 Integration with Izara Portals

### Doctor Portal

- Meeting links generated when appointment confirmed
- Host controls available in meeting
- Transcription start/stop buttons
- AI summary displayed in EMR

### Patient Portal

- Join meeting via appointment link
- Lobby waiting for doctor admission
- Post-meeting summary in Health Records

## 📄 License

MIT License - Izara Telemedicine Platform
