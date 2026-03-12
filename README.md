# Sadhya AI Mentor 🌾

**Sadhya AI Mentor** is a state-of-the-art, real-time AI Agronomist application designed specifically for Indian farmers. It enables farmers to have natural, face-to-face conversations with an AI expert in **Telugu**, providing immediate solutions to crop diseases, pest control, and farming best practices.

---

<<<<<<< HEAD
## 🛠 How It Works (The System Flow)
=======
- Python 3.9+ (if running locally)
- Node.js 18+ (if running locally)
- Docker and Docker Compose (if using Docker)
- API keys:
  - Sarvam API Key
  - Gemini API Key
  - HeyGen API Key
>>>>>>> fcf6e451108a1bc4e44b14b908fce464e4eb2019

The application operates as a high-performance pipeline spanning your browser, a specialized backend, and several industry-leading AI APIs.

### 1. Human-to-Machine (Speech Input)
*   **Audio Capture**: The user clicks "Talk to Sadhya" and speaks their question in Telugu.
*   **WebAudio Pipeline**: The browser captures high-quality audio in `.webm` format.
*   **WebSocket Streaming**: Audio chunks are streamed instantly to the backend via **WebSockets** for zero-latency processing.

### 2. Processing (The Brain)
*   **Speech-to-Text (STT)**: The backend sends the audio to **Sarvam AI (Saarika model)**, which is specifically optimized for Indian regional languages like Telugu.
*   **AI Reasoning (LLM)**: The resulting text is sent to **Google Gemini 1.5 Flash**. Gemini acts as the "Agronomist Brain," processing the query and generating a detailed, helpful response entirely in Telugu.

### 3. Machine-to-Human (The Avatar)
*   **Avatar Orchestration**: Once the response text is ready, the backend triggers a "task" on an active **HeyGen Streaming Session**.
*   **Real-time Lip-Sync**: HeyGen's Streaming Avatar SDK uses WebRTC to deliver high-definition video of the avatar "Sadhya" speaking the answer.
*   **Audio Fallback**: If the video stream is unavailable, the system automatically uses **Sarvam AI (Bulbul model)** to generate high-quality Telugu voice synthesis so the farmer never loses the response.

---

## 🏗 Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js 15+, React 19, Tailwind CSS | Modern, responsive, and slick UI/UX. |
| **Backend** | FastAPI (Python 3.9) | High-concurrency orchestrator for API requests. |
| **Communication** | WebSockets & WebRTC | Real-time, peer-to-peer data and video streaming. |
| **STT** | Sarvam AI (Saarika) | Industry-leading Telugu speech recognition. |
| **Intelligence** | Gemini 1.5 Flash | Fast and accurate AI agronomist responses. |
| **Avatar** | HeyGen Streaming SDK | Hyper-realistic AI human with real-time lip-sync. |
| **TTS (Fallback)** | Sarvam AI (Bulbul) | Natural sounding Telugu text-to-speech. |

---

## 🚀 Getting Started

### 1. Environment Configuration
Create a `.env` file in the root directory and add your API keys:
```env
SARVAM_API_KEY=your_sarvam_key
GEMINI_API_KEY=your_gemini_key
HEYGEN_API_KEY=your_heygen_key
```

### 2. Launch with Docker (Recommended)
The easiest way to run the entire stack is using Docker Compose:
```bash
<<<<<<< HEAD
docker compose up --build -d
=======
export SARVAM_API_KEY="your_sarvam_api_key_here"
export GEMINI_API_KEY="your_gemini_api_key_here"
export HEYGEN_API_KEY="your_heygen_api_key_here"
# Note: For Windows, use `set` instead of `export` or create a `.env` file.
>>>>>>> fcf6e451108a1bc4e44b14b908fce464e4eb2019
```
*   **Frontend**: `http://localhost:3000`
*   **Backend**: `http://localhost:8000`

---

<<<<<<< HEAD
## 🌟 Key Features
*   **Zero-Latency Interactions**: No waiting for video rendering; the avatar speaks instantly via WebRTC.
*   **Premium Aesthetics**: A dark-mode, glassmorphic design tailored for a professional "mentor" feel.
*   **Cross-Service Failover**: Automatically switches to audio-only if the video stream fails.
*   **Telugu Native**: Deeply integrated with Sarvam AI's models for the best regional language support.
=======
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
>>>>>>> fcf6e451108a1bc4e44b14b908fce464e4eb2019
