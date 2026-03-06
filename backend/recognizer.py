import base64
import hashlib
import hmac
import io
import os
import subprocess
import time

import requests


def convert_to_wav(audio_bytes: bytes) -> bytes:
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", "pipe:0", "-ar", "16000", "-ac", "1", "-f", "wav", "pipe:1"],
        input=audio_bytes,
        capture_output=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg error: {result.stderr.decode()}")
    return result.stdout


def recognize(audio_bytes: bytes, audio_format: str = "wav") -> dict:
    if audio_format != "wav":
        audio_bytes = convert_to_wav(audio_bytes)
        audio_format = "wav"

    host = os.getenv("ACRCLOUD_HOST")
    access_key = os.getenv("ACRCLOUD_ACCESS_KEY")
    access_secret = os.getenv("ACRCLOUD_ACCESS_SECRET")

    http_method = "POST"
    http_uri = "/v1/identify"
    data_type = "humming"
    signature_version = "1"
    timestamp = str(time.time())

    string_to_sign = "\n".join([http_method, http_uri, access_key, data_type, signature_version, timestamp])
    sign = base64.b64encode(
        hmac.new(access_secret.encode("utf-8"), string_to_sign.encode("utf-8"), hashlib.sha1).digest()
    ).decode("utf-8")

    files = {"sample": ("audio." + audio_format, audio_bytes, "audio/" + audio_format)}
    data = {
        "access_key": access_key,
        "sample_bytes": len(audio_bytes),
        "timestamp": timestamp,
        "signature": sign,
        "data_type": data_type,
        "signature_version": signature_version,
    }

    url = f"https://{host}{http_uri}"
    response = requests.post(url, files=files, data=data, timeout=30)
    response.raise_for_status()
    return response.json()


def parse_results(raw: dict) -> dict:
    status_code = raw.get("status", {}).get("code", -1)

    if status_code == 0:
        musics = raw.get("metadata", {}).get("humming", []) or raw.get("metadata", {}).get("music", [])
        results = []
        for i, item in enumerate(musics[:3], start=1):
            score = round(item.get("score", 0) * 100)
            results.append({
                "rank": i,
                "title": item.get("title", "不明"),
                "artist": item.get("artists", [{}])[0].get("name", "不明") if item.get("artists") else "不明",
                "album": item.get("album", {}).get("name", ""),
                "score": score,
            })
        results = [r for r in results if r["score"] >= 30]
        if results:
            return {"status": "success", "results": results}
        return {"status": "no_result", "results": []}

    if status_code == 1001:
        return {"status": "no_result", "results": []}

    return {"status": "error", "message": raw.get("status", {}).get("msg", "認識に失敗しました")}
