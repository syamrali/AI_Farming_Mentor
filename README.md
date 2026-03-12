# Sadhya AI Mentor

Real-time AI agronomist avatar web application.

## Prerequisites

- Python 3.9+ (if running locally)
- Node.js 18+ (if running locally)
- Docker and Docker Compose (if using Docker)
- API keys:
  - Sarvam API Key
  - Gemini API Key
  - HeyGen API Key

## Project Structure

- `frontend/`: Next.js application representing the UI
- `backend/`: FastAPI backend for handling WebSocket connections, STT, AI matching, TTS and Wav2Lip integration.

## Setup Instructions

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Set Environment Variables:
```bash
export SARVAM_API_KEY="your_sarvam_api_key_here"
export GEMINI_API_KEY="your_gemini_api_key_here"
export HEYGEN_API_KEY="your_heygen_api_key_here"
# Note: For Windows, use `set` instead of `export` or create a `.env` file.
```

Run FastAPI backend:
```bash
python main.py
```
Backend runs on `http://localhost:8000`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`

### 3. Deploy using Docker

If you prefer to run both the frontend and backend using Docker, you can use `docker-compose`.

1. **Verify `.env` keys**: Make sure `SARVAM_API_KEY` and `GEMINI_API_KEY` are exported in your terminal or stored in a `.env` file at the root.
   ```bash
   export SARVAM_API_KEY="your_sarvam_api_key"
   export GEMINI_API_KEY="your_gemini_api_key"
   export HEYGEN_API_KEY="your_heygen_api_key"
   ```

2. **Build and Run**:
   ```bash
   docker-compose up --build
   ```

3. **Access the application**: the frontend will be available at `http://localhost:3000` and the backend will be linked automatically.

### 4. Voice & Avatar Configuration
- **Wav2Lip**: You need to have Wav2Lip repository cloned to the project root and configured with its pre-trained models. Set `WAV2LIP_DIR` env variable if it is stored elsewhere.
- Place `farmer.png` inside the `avatar/` directory.

## Features
- Real-time WebRTC audio capture from Browser
- Audio sent over WebSocket to Backend
- Speech to text conversion using Sarvam Saarika in Telugu
- Conversational Agronomist AI powered by Gemini 2.5
- Text to speech generated with Sarvam Bulbul TTS
- Real-time generation of speaking avatar via Wav2Lip (simulated out-of-box, requires actual heavy local ML execution)

## Usage
1. Open the App in the browser.
2. Allow Microphone Permissions.
3. Click "Start Talking".
4. Speak in Telugu about your crop issues.
5. Hit "Stop Listening" and wait for Sadhya to respond via video and audio.
