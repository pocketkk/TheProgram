"""
Trial Provisioning API for TheProgram
Runs on port 8090, proxied via nginx at /api/trial
"""
import asyncio
import json
import re
import subprocess
from pathlib import Path
from datetime import datetime, timedelta

import httpx
from fastapi import FastAPI, HTTPException
from jose import jwt
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from timezonefinder import TimezoneFinder

_tf = TimezoneFinder()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://theprogram.us"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

STATE_FILE = Path("/home/silvia/Hardware/TheProgram/data/trial-state.json")
SCRIPTS_DIR = Path("/home/silvia/.claude/skills/theprogram/scripts")
TRIAL_MINUTES = 15


class TrialRequest(BaseModel):
    name: str = ""
    birth_date: str
    birth_time: str = ""
    city: str = ""
    lat: float | None = None
    lon: float | None = None


def load_state() -> dict:
    return json.loads(STATE_FILE.read_text())


def save_state(state: dict):
    STATE_FILE.write_text(json.dumps(state, indent=2))


def find_available_slot(state: dict) -> str | None:
    # Free up any expired slots
    now = datetime.utcnow().isoformat()
    changed = False
    for slot, info in state.items():
        if not info["available"] and info.get("expires") and info["expires"] < now:
            subprocess.Popen(
                ["bash", str(SCRIPTS_DIR / "end-trial.sh"), slot],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
            info["available"] = True
            info["expires"] = None
            changed = True
    if changed:
        save_state(state)

    for slot, info in state.items():
        if info["available"]:
            return slot
    return None


async def expire_slot_after(slot: str, delay_seconds: int):
    """Background task: stop the trial after delay."""
    await asyncio.sleep(delay_seconds)
    subprocess.run(
        ["bash", str(SCRIPTS_DIR / "end-trial.sh"), slot],
        capture_output=True
    )


def generate_trial_token(slot: str) -> str | None:
    """Generate a pre-authenticated JWT for the trial instance."""
    try:
        service_file = Path(f"/etc/systemd/system/theprogram-{slot}.service")
        content = service_file.read_text()
        match = re.search(r"SECRET_KEY=(\S+)", content)
        if not match:
            return None
        secret_key = match.group(1)
        now = datetime.utcnow()
        payload = {
            "session": True,
            "iat": now,
            "exp": now + timedelta(hours=24),
            "type": "session",
        }
        return jwt.encode(payload, secret_key, algorithm="HS256")
    except Exception:
        return None


async def geocode_city(city: str) -> dict:
    """Use Nominatim to get lat/lon/timezone for a city string."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": city, "format": "json", "limit": 1},
            headers={"User-Agent": "TheProgram/1.0 trial-provisioner"}
        )
        results = resp.json()
        if not results:
            raise HTTPException(400, f"Could not find location: {city}")

        lat = float(results[0]["lat"])
        lon = float(results[0]["lon"])
        timezone = _tf.timezone_at(lat=lat, lng=lon) or "UTC"
        display_name = results[0].get("display_name", city).split(",")[0]

        return {"lat": lat, "lon": lon, "timezone": timezone, "city": display_name}


@app.get("/api/trial/slots")
def slots_available():
    state = load_state()
    available = sum(1 for s in state.values() if s["available"])
    return {"available": available, "total": len(state)}


@app.post("/api/trial/start")
async def start_trial(req: TrialRequest):
    state = load_state()
    slot = find_available_slot(state)

    if not slot:
        raise HTTPException(503, "No trial slots available right now. Try again in a few minutes.")

    # Use pre-resolved coordinates from the form if available
    if req.lat is not None and req.lon is not None:
        timezone = _tf.timezone_at(lat=req.lat, lng=req.lon) or "UTC"
        geo = {"lat": req.lat, "lon": req.lon, "timezone": timezone, "city": req.city}
    else:
        geo = await geocode_city(req.city)

    # Mark slot taken immediately to prevent double-booking
    state[slot]["available"] = False
    state[slot]["expires"] = None
    save_state(state)

    cmd = [
        "bash", str(SCRIPTS_DIR / "start-trial.sh"),
        slot,
        req.name or "Explorer",
        req.birth_date,
        req.birth_time,
        str(geo["lat"]),
        str(geo["lon"]),
        geo["timezone"],
        geo["city"],
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

    if result.returncode != 0:
        state[slot]["available"] = True
        save_state(state)
        raise HTTPException(500, f"Failed to start trial: {result.stderr[-300:]}")

    # Update expiry in state
    expires = datetime.utcnow().isoformat()
    state = load_state()
    state[slot]["expires"] = expires
    save_state(state)

    # Schedule expiry via asyncio — no sudo needed
    asyncio.create_task(expire_slot_after(slot, TRIAL_MINUTES * 60))

    # Generate pre-authenticated token so user lands directly in the app
    token = generate_trial_token(slot)

    return {
        "url": f"https://{slot}.theprogram.us",
        "slot": slot,
        "expires_minutes": TRIAL_MINUTES,
        "token": token,
    }
