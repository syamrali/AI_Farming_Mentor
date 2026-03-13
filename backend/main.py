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

# Load environment variables from .env file explicitly
# so it works locally across Windows/VS Code without Docker Compose
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

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
async def sarvam_speech_to_text(audio_bytes: bytes, language_code: str = "te-IN") -> str:
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
                data  = {"language_code": language_code, "model": "saarika:v2.5"}
                headers = {"api-subscription-key": SARVAM_API_KEY}

                if SARVAM_API_KEY == "your_sarvam_api_key":
                    mock_transcripts = {
                        "te-IN": "నమస్కారం, నా పంటలో పురుగులు ఉన్నాయి, నేను ఏమి చేయాలి?",
                        "hi-IN": "नमस्ते, मेरी फसल में कीड़े हैं, मुझे क्या करना चाहिए?",
                        "ta-IN": "வணக்கம், எனது பயிரில் பூச்சிகள் உள்ளன, நான் என்ன செய்வது?",
                        "en-IN": "Hello, there are pests in my crop, what should I do?"
                    }
                    return mock_transcripts.get(language_code, f"[Mock transcript for {language_code}] Pests in my crop.")

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
async def generate_agronomist_response(transcript: str, language_name: str = "Telugu") -> str:
    t0 = time.time()
    # Explicitly instruct the AI to use the requested language name and script.
    prompt = f"""You are Sadhya, a specialized and knowledgeable AI agronomist for Indian farmers. 
    Current Language Mode: {language_name}
    
    The farmer/user spoke in {language_name} and said: "{transcript}"

    INSTRUCTIONS:
    1. Respond naturally and helpfully ONLY in the {language_name} language.
    2. USE THE NATIVE SCRIPT for {language_name} (e.g., if Tamil, use Tamil characters; if Hindi, use Devanagari).
    3. Provide a practical solution (4-6 sentences) for the farmer's problem.
    4. If they ask about pests, diseases, or fertilizers, give specific recommendations.
    5. STRICTLY FORBIDDEN: Do not use English, and do not use Telugu if the requested language is {language_name}.
    6. Output only the pure {language_name} response text without any labels or prefixes."""

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
    fallback_messages = {
        "Telugu": "క్షమించండి, సర్వర్‌లో సమస్య ఏర్పడింది. దయచేసి మళ్ళీ ప్రయత్నించండి.",
        "Hindi": "क्षमा करें, सर्वर में कोई समस्या है। कृपया पुनः प्रयास करें।",
        "Tamil": "மன்னிக்கவும், சர்வரில் சிக்கல் உள்ளது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.",
        "English": "Sorry, there is an issue with the server. Please try again."
    }
    return fallback_messages.get(language_name, f"Sorry, the server encountered an error while processing your request in {language_name}.")


# ─────────────────────────────────────────────────────────────
# Sarvam TTS
# ─────────────────────────────────────────────────────────────
async def sarvam_text_to_speech(text: str, language_code: str = "te-IN") -> bytes:
    async with httpx.AsyncClient() as client:
        headers = {
            "api-subscription-key": SARVAM_API_KEY,
            "Content-Type": "application/json",
        }
        
        # Bulbul v3 supports over 35 speakers. We use male voices like 'aditya' as default.
        speaker_map = {
            "te-IN": "aditya",
            "hi-IN": "rahul", 
            "en-IN": "amit",
        }
        speaker_name = speaker_map.get(language_code, "aditya")
        
        payload = {
            "text": text,
            "target_language_code": language_code,
            "speaker": speaker_name,
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
    language_code = websocket.query_params.get("language_code", "te-IN")
    language_name = websocket.query_params.get("language_name", "Telugu")
    print(f"\n[NEW WS CONNECTION] Session: {session_id}")
    print(f"  > Requested Language Code: {language_code}")
    print(f"  > Requested Language Name: {language_name}")
    print(f"  > Keys Configured: STT({'OK' if SARVAM_API_KEY != 'your_sarvam_api_key' else 'MOCK'}), Gemini({'OK' if GEMINI_API_KEY != 'your_gemini_api_key' else 'MOCK'})\n")

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
            transcript = await sarvam_speech_to_text(data, language_code=language_code)
            print(f"[{session_id}] Transcript: {transcript}")
            await websocket.send_json({"status": "transcribed", "text": transcript})

            # 3. Gemini AI
            response_text = await generate_agronomist_response(transcript, language_name=language_name)
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
                    audio_bytes = await sarvam_text_to_speech(response_text, language_code=language_code)
                    audio_b64 = base64.b64encode(audio_bytes).decode()
                    await websocket.send_json({"status": "complete", "audio_base64": audio_b64, "text": response_text})

            else:
                # Fallback: Just audio
                print(f"[{session_id}] No HeyGen session, using raw audio fallback.")
                await websocket.send_json({"status": "generating_audio", "message": "Generating voice..."})
                audio_bytes = await sarvam_text_to_speech(response_text, language_code=language_code)
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
