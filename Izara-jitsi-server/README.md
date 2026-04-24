# 🎥 Izara Meeting Server

![Version](<https://img.shields.io/badge/version-1.5.10-blue.svg)>
![Node.js](<https://img.shields.io/badge/Node.js-22+-green.svg)>
![Socket.IO](<https://img.shields.io/badge/Socket.IO-4.x-black.svg)>
![License](<https://img.shields.io/badge/license-MIT-green.svg)>

> Central meeting server for Izara Telemedicine — Jitsi Meet video conferencing, real-time transcription, AI meeting summaries, and in-meeting chat.

---


## 🏗 Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                 Meeting Server (Port 3020)                    │
│  Express.js + Socket.IO + Jitsi Meet + Gemini AI             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Meeting Management ──── Create / Join / Status / End        │
│  Transcription ────────── Web Speech API (browser, FREE)     │
│  AI Summaries ─────────── Gemini 2.5 Flash Lite              │
│  In-Meeting Chat ──────── Socket.IO real-time messaging      │
│  Guest Invites ────────── External participant links          │
│  Patient Instructions ─── Auto-generated care sheets         │
│  Clinical Decision ────── AI pre-consultation summary        │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  Storage: PostgreSQL (primary) + In-memory fallback          │
│  Video: meet.jit.si (FREE, no licensing costs)               │
│  AI: Google Gemini 2.5 Flash Lite (FREE tier)                │
└──────────────────────────────────────────────────────────────┘
```

---


## ✨ Features

| Feature | Description | Cost |
| --------- | ------------- | ------ |
| 🎥 Video Conferencing | Jitsi Meet (meet.jit.si) | FREE |
| 🎙️ Live Transcription | Web Speech API (browser-native) | FREE |
| 🤖 AI Meeting Summary | Gemini-generated SOAP notes | FREE tier |
| 💬 In-Meeting Chat | Socket.IO real-time messaging | — |
| 👥 Guest Invites | External participants via invite links | — |
| 📋 Patient Instructions | Auto-generated post-visit care sheets | — |
| 🧠 Pre-consultation Summary | AI analysis before appointment | — |
| 📄 Document Analysis | AI analysis of uploaded medical documents | — |
| ✅ Man-in-the-Loop | Doctor validates all AI outputs | — |



---


## 🚀 Quick Start


### With Docker (Recommended)

```bash

# From the root Isara-Anywhere directory
docker compose up -d --build

# Meeting Server: <http://localhost:3020>
```


### Local Development

```bash
cd Izara-jitsi-server
npm install
cp .env.example .env   # Add your Gemini API key
npm run dev
```

---


## 📁 Project Structure

```text
Izara-jitsi-server/
├── server/
│   └── index.js              # Main server (Express + Socket.IO)
├── client/
│   ├── LiveTranscriptionService.ts  # Browser transcription service
│   └── MeetingTranscription.tsx     # React transcription component
├── Dockerfile                # Docker image
├── package.json              # Dependencies & scripts
└── cloudbuild.yaml           # Google Cloud Build config
```

---


## 📡 API Endpoints

| Endpoint | Method | Description |
| ---------- | -------- | ------------- |
| `/health` | GET | Health check |
| `/api/health` | GET | Detailed health with uptime |
| `/api/meeting/create` | POST | Create a new meeting room |
| `/api/meeting/:id/status` | GET | Get meeting status |
| `/api/meeting/:id/end` | POST | End a meeting |
| `/api/meeting/:id/transcript` | POST | Save transcript segment |
| `/api/meeting/:id/transcript` | GET | Get full transcript |
| `/api/meeting/:id/summary` | POST | Generate AI summary |
| `/api/meeting/:id/chat` | GET | Get chat messages |
| `/api/meeting/:id/invite` | POST | Create guest invite |
| `/api/meeting/:id/instructions` | POST | Generate patient instructions |
| `/api/meeting/:id/cds` | POST | Clinical decision support |
| `/api/meeting/:id/analyze-document` | POST | AI document analysis |




### Socket.IO Events

| Event | Direction | Description |
| ------- | ----------- | ------------- |
| `join-meeting` | Client → Server | Join a meeting room |
| `leave-meeting` | Client → Server | Leave a meeting room |
| `transcript-segment` | Client → Server | Send transcript text |
| `chat-message` | Client → Server | Send chat message |
| `transcript-update` | Server → Client | Broadcast transcript |
| `chat-update` | Server → Client | Broadcast chat message |
| `meeting-ended` | Server → Client | Meeting end notification |



---


## ⚙️ Configuration

| Variable | Default | Description |
| ---------- | --------- | ------------- |
| `PORT` | 3020 | Server port |
| `JITSI_DOMAIN` | meet.jit.si | Jitsi Meet domain |
| `GEMINI_API_KEY` | — | Google Gemini AI API key |
| `GEMINI_MODEL` | gemini-2.5-flash-lite | AI model |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_SECRET` | — | JWT signing secret |



---


## 📄 License

MIT License

---

**Izara Meeting Server v1.5.7** — Zero-cost video consultations with AI 🎥
