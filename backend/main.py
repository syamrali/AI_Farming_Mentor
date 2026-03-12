import asyncio
import os
import tempfile
import base64
import json
import httpx
import time
import shutil
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import google.generativeai as genai
import io
from PIL import Image

app = FastAPI(title="Sadhya AI Mentor Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────
# API Keys & Endpoints
# ─────────────────────────────────────────────────────────────
SARVAM_API_KEY  = os.getenv("SARVAM_API_KEY",  "your_sarvam_api_key")
GEMINI_API_KEY  = os.getenv("GEMINI_API_KEY",  "your_gemini_api_key")
HEYGEN_API_KEY  = os.getenv("HEYGEN_API_KEY",  "your_heygen_api_key")

# Gemini Setup
if GEMINI_API_KEY != "your_gemini_api_key":
    genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel('gemini-flash-latest')

SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text"
SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"
HEYGEN_BASE_URL = "https://api.heygen.com"

# ─────────────────────────────────────────────────────────────
# Sarvam STT
# ─────────────────────────────────────────────────────────────
async def sarvam_speech_to_text(audio_bytes: bytes) -> str:
    """
    FIX: Browser records audio/webm. We must save & send as .webm with the
    correct MIME type.
    """
    t0 = time.time()
    # Save with correct .webm extension
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        async with httpx.AsyncClient() as client:
            with open(tmp_path, "rb") as f:
                # Send as audio/webm — Sarvam supports it
                files = {"file": ("audio.webm", f, "audio/webm")}
                data  = {"language_code": "te-IN", "model": "saarika:v2.5"}
                headers = {"api-subscription-key": SARVAM_API_KEY}

                if SARVAM_API_KEY == "your_sarvam_api_key":
                    return "నమస్కారం, నా పంటలో పురుగులు ఉన్నాయి, నేను ఏమి చేయాలి?"

                resp = await client.post(
                    SARVAM_STT_URL, files=files, data=data,
                    headers=headers, timeout=45.0
                )
                resp.raise_for_status()
                result = resp.json().get("transcript", "")
                print(f"  [STT] done in {time.time()-t0:.2f}s → '{result[:60]}...'")
                return result
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


# ─────────────────────────────────────────────────────────────
# AI Agronomist Response (Gemini Only)
# ─────────────────────────────────────────────────────────────
async def generate_agronomist_response(transcript: str) -> str:
    t0 = time.time()
    prompt = f"""You are Sadhya, a specialized and knowledgeable AI agronomist (వ్యవసాయ నిపుణులు) for Indian farmers. 
    The farmer said in Telugu: "{transcript}"

    Respond naturally in Telugu. provide a helpful, practical, and detailed solution (around 4-6 sentences) to the farmer's problem. 
    If they are asking about pests, diseases, or fertilizers, give specific recommendations.
    Do NOT include any English or labels like 'Sadhya:'. Only output the pure Telugu response."""

    if GEMINI_API_KEY not in (None, "", "your_gemini_api_key"):
        try:
            print(f"  [LLM] Requesting Gemini (flash-latest)...")
            response = await gemini_model.generate_content_async(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.8,
                    max_output_tokens=1000,
                ),
            )
            text = response.text.strip()
            print(f"  [Gemini] success in {time.time()-t0:.2f}s")
            return text
        except Exception as e:
            print(f"  [Gemini] CRITICAL ERROR: {type(e).__name__}: {str(e)}")

    # Fallback message
    return "క్షమించండి, సర్వర్‌లో సమస్య ఏర్పడింది. దయచేసి మళ్ళీ ప్రయత్నించండి."


# ─────────────────────────────────────────────────────────────
# Sarvam TTS
# ─────────────────────────────────────────────────────────────
async def sarvam_text_to_speech(text: str) -> bytes:
    async with httpx.AsyncClient() as client:
        headers = {
            "api-subscription-key": SARVAM_API_KEY,
            "Content-Type": "application/json",
        }
        payload = {
            "text": text,
            "target_language_code": "te-IN",
            "speaker": "kavitha",
            "pace": 1.0,
            "sample_rate": 8000,
            "enable_preprocessing": True,
            "model": "bulbul:v3",
        }

        if SARVAM_API_KEY == "your_sarvam_api_key":
            return b"MOCK_AUDIO_DATA"

        resp = await client.post(SARVAM_TTS_URL, json=payload, headers=headers, timeout=30.0)
        resp.raise_for_status()
        result = resp.json()
        return base64.b64decode(result["audios"][0])


# ─────────────────────────────────────────────────────────────
# HTTP Endpoints
# ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "heygen_configured": HEYGEN_API_KEY != "your_heygen_api_key"
    }


# ─────────────────────────────────────────────────────────────
# HeyGen Helpers & Endpoints
# ─────────────────────────────────────────────────────────────

@app.post("/heygen/token")
async def get_heygen_token():
    """Get a temporary access token for HeyGen Streaming SDK."""
    if HEYGEN_API_KEY == "your_heygen_api_key":
        raise HTTPException(status_code=400, detail="HeyGen API key not configured")
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{HEYGEN_BASE_URL}/v1/streaming.create_token",
            headers={"x-api-key": HEYGEN_API_KEY}
        )
        if resp.status_code != 200:
            print(f"  [HeyGen] Token generation failed: {resp.status_code} - {resp.text}")
            raise HTTPException(status_code=resp.status_code, detail=f"HeyGen token failed: {resp.text}")
        token_data = resp.json()
        print(f"  [HeyGen] Token generated successfully.")
        return token_data["data"]["token"]

@app.post("/heygen/task")
async def heygen_task(session_id: str, text: str):
    """Send a 'repeat' task to HeyGen avatar."""
    print(f"  [HeyGen] Sending task to session {session_id}: {text[:50]}...")
    async with httpx.AsyncClient() as client:
        payload = {
            "session_id": session_id,
            "text": text,
            "task_type": "repeat"
        }
        resp = await client.post(
            f"{HEYGEN_BASE_URL}/v1/streaming.task",
            headers={"x-api-key": HEYGEN_API_KEY, "Content-Type": "application/json"},
            json=payload
        )
        if resp.status_code != 200:
            print(f"  [HeyGen] Task error: {resp.status_code} - {resp.text}")
        else:
            print(f"  [HeyGen] Task sent successfully.")
        return resp.json()


# ─────────────────────────────────────────────────────────────
# WebSocket — Main Conversation Loop
# ─────────────────────────────────────────────────────────────
@app.websocket("/ws/audio")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket connection established.")

    # Each WS connection gets a unique session ID
    session_id = websocket.query_params.get("session_id", "default")
    print(f"Session ID: {session_id}")

    # HeyGen Streaming info
    heygen_session_id = websocket.query_params.get("heygen_session_id")

    try:
        while True:
            # 1. Receive audio from browser
            data = await websocket.receive_bytes()
            if not data:
                break
            
            print(f"[{session_id}] Received audio: {len(data)} bytes")
            await websocket.send_json({"status": "processing", "message": "Listening..."})

            # 2. Sarvam STT
            transcript = await sarvam_speech_to_text(data)
            print(f"[{session_id}] Transcript: {transcript}")
            await websocket.send_json({"status": "transcribed", "text": transcript})

            # 3. Gemini AI
            response_text = await generate_agronomist_response(transcript)
            print(f"[{session_id}] AI Response: {response_text[:80]}...")
            await websocket.send_json({"status": "ai_response", "text": response_text})

            # 5. Avatar Logic: HeyGen or Fallback
            heygen_configured = HEYGEN_API_KEY != "your_heygen_api_key"
            
            if heygen_configured and heygen_session_id:
                # OPTION H: HEYGEN REAL-TIME STREAMING
                print(f"[{session_id}] Using HeyGen Real-time (session: {heygen_session_id})")
                try:
                    await heygen_task(heygen_session_id, response_text)
                    await websocket.send_json({ "status": "complete", "mode": "heygen", "text": response_text })
                except Exception as e:
                    print(f"[{session_id}] HeyGen streaming error: {e}")
                    # Fallback to Sarvam + Base64
                    audio_bytes = await sarvam_text_to_speech(response_text)
                    audio_b64 = base64.b64encode(audio_bytes).decode()
                    await websocket.send_json({"status": "complete", "audio_base64": audio_b64, "text": response_text})

            else:
                # Fallback: Just audio
                print(f"[{session_id}] No HeyGen session, using raw audio fallback.")
                await websocket.send_json({"status": "generating_audio", "message": "Generating voice..."})
                audio_bytes = await sarvam_text_to_speech(response_text)
                audio_b64 = base64.b64encode(audio_bytes).decode()
                await websocket.send_json({ "status": "complete", "mode": "audio", "audio_base64": audio_b64, "text": response_text })

    except WebSocketDisconnect:
        print(f"[{session_id}] Client disconnected")
    except Exception as e:
        print(f"[{session_id}] Error: {e}")
        try:
            await websocket.send_json({"status": "error", "message": str(e)})
        except:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
