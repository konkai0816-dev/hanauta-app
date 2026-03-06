from dotenv import load_dotenv
load_dotenv(dotenv_path="../.env")

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from recognizer import recognize, parse_results

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


@app.post("/recognize")
async def recognize_audio(audio: UploadFile = File(...)):
    audio_bytes = await audio.read()
    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="音声データが空です")

    filename = audio.filename or ""
    audio_format = "webm" if "webm" in filename else "wav"

    raw = recognize(audio_bytes, audio_format)
    return parse_results(raw)
