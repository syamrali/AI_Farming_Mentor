# Sadhya AI Mentor 🌾

**Sadhya AI Mentor** is a state-of-the-art, real-time AI Agronomist application designed specifically for Indian farmers. It enables farmers to have natural, face-to-face conversations with an AI expert in **multiple Indian languages (Hindi, Telugu, Tamil, Malayalam, Kannada, Bengali, Gujarati, Marathi, Punjabi, Odia) and English**, providing immediate solutions to crop diseases, pest control, and farming best practices.

---

## 🛠 How It Works (The System Flow)

The application operates as a high-performance pipeline spanning your browser, a specialized backend, and several industry-leading AI APIs.

### 1. Human-to-Machine (Speech Input)
*   **Audio Capture**: The user selects their preferred language, clicks "Talk to Sadhya", and speaks their question.
*   **WebAudio Pipeline**: The browser captures high-quality audio in `.webm` format.
*   **WebSocket Streaming**: Audio chunks are streamed instantly to the backend via **WebSockets** for zero-latency processing.

### 2. Processing (The Brain)
*   **Speech-to-Text (STT)**: The backend sends the audio to **Sarvam AI (Saarika model)**, which is specifically optimized for Indian regional languages.
*   **AI Reasoning (LLM)**: The resulting text is sent to **Google Gemini 1.5 Flash**. Gemini acts as the "Agronomist Brain," processing the query and generating a detailed, helpful response entirely in the requested language.

### 3. Machine-to-Human (The Avatar)
*   **Avatar Orchestration**: Once the response text is ready, the backend triggers a "task" on an active **HeyGen Streaming Session**.
*   **Real-time Lip-Sync**: HeyGen's Streaming Avatar SDK uses WebRTC to deliver high-definition video of the avatar "Sadhya" speaking the answer.
*   **Audio Fallback**: If the video stream is unavailable, the system automatically uses **Sarvam AI (Bulbul model)** to generate high-quality multi-lingual voice synthesis so the farmer never loses the response.

---

## 🏗 Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js 15+, React 19, Tailwind CSS | Modern, responsive, and slick UI/UX. |
| **Backend** | FastAPI (Python 3.9) | High-concurrency orchestrator for API requests. |
| **Communication** | WebSockets & WebRTC | Real-time, peer-to-peer data and video streaming. |
| **STT** | Sarvam AI (Saarika) | Industry-leading Indian multi-language speech recognition. |
| **Intelligence** | Gemini 1.5 Flash | Fast and accurate AI agronomist responses. |
| **Avatar** | HeyGen Streaming SDK | Hyper-realistic AI human with real-time lip-sync. |
| **TTS (Fallback)** | Sarvam AI (Bulbul) | Natural sounding Indian text-to-speech across 11+ languages. |

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
docker compose up --build -d
```
*   **Frontend**: `http://localhost:3000`
*   **Backend**: `http://localhost:8000`

---

## 🌟 Key Features
*   **Zero-Latency Interactions**: No waiting for video rendering; the avatar speaks instantly via WebRTC.
*   **Premium Aesthetics**: A dark-mode, glassmorphic design tailored for a professional "mentor" feel.
*   **Cross-Service Failover**: Automatically switches to audio-only if the video stream fails.
*   **Multi-Language Native**: Deeply integrated with Sarvam AI's models for the best regional Indian language support (11 languages).
