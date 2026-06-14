"""AI service: Report classification, summary, duplicate detection using Gemini."""
import os
import json
import logging
import base64
import re
from typing import Optional
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

CATEGORIES = [
    "Kerusakan Jalan", "Banjir", "Sampah", "Lalu Lintas", "Penerangan Jalan",
    "Kebocoran Air", "Kriminalitas", "Vandalisme", "Kerusakan Fasilitas Umum",
    "Masalah Lingkungan", "Lainnya"
]
URGENCY_LEVELS = ["Kritis", "Tinggi", "Sedang", "Rendah"]
SENTIMENTS = ["Darurat", "Keluhan", "Saran", "Informasi"]

# Default routing: category -> department name
DEFAULT_ROUTING = {
    "Kerusakan Jalan": "Dinas Pekerjaan Umum",
    "Banjir": "Dinas Penanggulangan Bencana",
    "Sampah": "Dinas Kebersihan",
    "Penerangan Jalan": "Dinas Infrastruktur Listrik",
    "Kebocoran Air": "Dinas Air Bersih",
    "Kriminalitas": "Dinas Keamanan Publik",
    "Lalu Lintas": "Dinas Perhubungan",
    "Vandalisme": "Dinas Keamanan Publik",
    "Kerusakan Fasilitas Umum": "Dinas Pekerjaan Umum",
    "Masalah Lingkungan": "Dinas Lingkungan Hidup",
    "Lainnya": "Dinas Umum",
}

# SLA hours per category
SLA_HOURS = {
    "Kerusakan Jalan": 48,
    "Banjir": 2,
    "Sampah": 24,
    "Penerangan Jalan": 24,
    "Kebocoran Air": 6,
    "Kriminalitas": 1,
    "Lalu Lintas": 12,
    "Vandalisme": 48,
    "Kerusakan Fasilitas Umum": 72,
    "Masalah Lingkungan": 48,
    "Lainnya": 72,
}

SYSTEM_PROMPT = """Anda adalah AI dispatcher untuk platform pelaporan masalah publik Kota Pintar.
Diberikan laporan warga (judul + deskripsi, opsional gambar), klasifikasikan laporan tersebut.

Kembalikan HANYA JSON valid dengan skema yang tepat ini (tanpa markdown, tanpa prosa):
{
  "category": "<salah satu dari: Kerusakan Jalan, Banjir, Sampah, Lalu Lintas, Penerangan Jalan, Kebocoran Air, Kriminalitas, Vandalisme, Kerusakan Fasilitas Umum, Masalah Lingkungan, Lainnya>",
  "urgency": "<salah satu dari: Kritis, Tinggi, Sedang, Rendah>",
  "sentiment": "<salah satu dari: Darurat, Keluhan, Saran, Informasi>",
  "confidence": <integer 0-100>,
  "summary": "<ringkasan satu kalimat untuk petugas, maksimal 200 karakter>"
}

Bersikap objektif. Urgensi Kritis hanya untuk risiko keselamatan jiwa (banjir aktif, kebakaran, kriminalitas, kebocoran gas).
"""


def _extract_json(text: str) -> Optional[dict]:
    if not text:
        return None
    # Try fenced code block first
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    candidate = m.group(1) if m else None
    if not candidate:
        m = re.search(r"\{[\s\S]*\}", text)
        candidate = m.group(0) if m else None
    if not candidate:
        return None
    try:
        return json.loads(candidate)
    except Exception:
        return None


def _fallback_classification(title: str, description: str) -> dict:
    text = f"{title} {description}".lower()
    rules = [
        ("Banjir", ["banjir", "genangan", "terendam", "air meluap"]),
        ("Kebocoran Air", ["bocor", "pipa bocor", "pipa pecah", "kebocoran air"]),
        ("Sampah", ["sampah", "limbah", "kotoran", "tong sampah"]),
        ("Kerusakan Jalan", ["lubang", "jalan rusak", "retak", "aspal rusak"]),
        ("Penerangan Jalan", ["lampu jalan", "lampu mati", "penerangan", "gelap"]),
        ("Kriminalitas", ["perampokan", "pencurian", "kejahatan", "kekerasan"]),
        ("Lalu Lintas", ["lalu lintas", "macet", "rambu", "kemacetan"]),
        ("Vandalisme", ["coret-coret", "vandalisme", "rusak properti"]),
        ("Masalah Lingkungan", ["polusi", "asap", "kebisingan", "pembuangan"]),
    ]
    category = "Lainnya"
    for cat, kws in rules:
        if any(k in text for k in kws):
            category = cat
            break
    urgency = "Sedang"
    if any(k in text for k in ["mendesak", "darurat", "bahaya", "kebakaran", "darah", "luka", "kritis"]):
        urgency = "Kritis"
    elif any(k in text for k in ["rusak", "meluap", "bocor", "banjir", "kejahatan"]):
        urgency = "Tinggi"
    return {
        "category": category,
        "urgency": urgency,
        "sentiment": "Keluhan",
        "confidence": 55,
        "summary": (title or description or "Laporan warga")[:200],
    }


async def classify_report(
    title: str,
    description: str,
    image_base64: Optional[str] = None,
    session_id: str = "classify",
) -> dict:
    """Classify a citizen report using Gemini. Falls back to heuristics on failure."""
    user_text = f"Title: {title}\n\nDescription: {description}\n\nClassify per the JSON schema."
    api_key = GEMINI_API_KEY or EMERGENT_LLM_KEY
    if not api_key:
        return _fallback_classification(title, description)
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=SYSTEM_PROMPT,
        ).with_model("gemini", "gemini-3-flash-preview")

        file_contents = None
        if image_base64:
            file_contents = [ImageContent(image_base64=image_base64)]

        msg = UserMessage(text=user_text, file_contents=file_contents)
        response = await chat.send_message(msg)
        text = response if isinstance(response, str) else str(response)
        data = _extract_json(text)
        if not data:
            logger.warning("AI returned non-JSON, falling back")
            return _fallback_classification(title, description)

        # Validate & sanitize
        result = {
            "category": data.get("category") if data.get("category") in CATEGORIES else "Other",
            "urgency": data.get("urgency") if data.get("urgency") in URGENCY_LEVELS else "Medium",
            "sentiment": data.get("sentiment") if data.get("sentiment") in SENTIMENTS else "Complaint",
            "confidence": int(data.get("confidence", 60)) if isinstance(data.get("confidence"), (int, float, str)) and str(data.get("confidence")).isdigit() else 60,
            "summary": str(data.get("summary", ""))[:200] or (title or description)[:200],
        }
        return result
    except Exception as e:
        logger.exception(f"AI classification failed: {e}")
        return _fallback_classification(title, description)


def route_to_department(category: str) -> str:
    return DEFAULT_ROUTING.get(category, "Dinas Umum")


def sla_hours_for(category: str) -> int:
    return SLA_HOURS.get(category, 72)


def calculate_priority_score(urgency: str, upvotes: int, nearby_count: int, confidence: int) -> int:
    """Priority 0-100 based on urgency, upvotes, nearby reports, confidence."""
    urgency_weight = {"Kritis": 60, "Tinggi": 45, "Sedang": 25, "Rendah": 10}.get(urgency, 20)
    upvote_score = min(upvotes * 2, 20)
    nearby_score = min(nearby_count * 3, 15)
    confidence_score = int(confidence * 0.05)  # 0-5
    total = urgency_weight + upvote_score + nearby_score + confidence_score
    return max(0, min(100, total))


def text_similarity(a: str, b: str) -> float:
    """Simple Jaccard similarity over word sets."""
    sa = set(re.findall(r"\w+", (a or "").lower()))
    sb = set(re.findall(r"\w+", (b or "").lower()))
    if not sa or not sb:
        return 0.0
    inter = len(sa & sb)
    union = len(sa | sb)
    return inter / union if union else 0.0


def haversine_meters(lat1, lon1, lat2, lon2) -> float:
    from math import radians, sin, cos, sqrt, atan2
    R = 6371000
    p1, p2 = radians(lat1), radians(lat2)
    dp = radians(lat2 - lat1)
    dl = radians(lon2 - lon1)
    a = sin(dp/2)**2 + cos(p1) * cos(p2) * sin(dl/2)**2
    return 2 * R * atan2(sqrt(a), sqrt(1-a))
