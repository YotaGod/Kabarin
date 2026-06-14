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
    "Road Damage", "Flood", "Garbage", "Traffic", "Public Lighting",
    "Water Leak", "Crime", "Vandalism", "Public Facility Damage",
    "Environmental Issue", "Other"
]
URGENCY_LEVELS = ["Critical", "High", "Medium", "Low"]
SENTIMENTS = ["Emergency", "Complaint", "Suggestion", "Information"]

# Default routing: category -> department name
DEFAULT_ROUTING = {
    "Road Damage": "Public Works Department",
    "Flood": "Disaster Management Department",
    "Garbage": "Sanitation Department",
    "Public Lighting": "Electrical Infrastructure Department",
    "Water Leak": "Water Utility Department",
    "Crime": "Public Safety Department",
    "Traffic": "Traffic Management Department",
    "Vandalism": "Public Safety Department",
    "Public Facility Damage": "Public Works Department",
    "Environmental Issue": "Environmental Department",
    "Other": "General Affairs Department",
}

# SLA hours per category
SLA_HOURS = {
    "Road Damage": 48,
    "Flood": 2,
    "Garbage": 24,
    "Public Lighting": 24,
    "Water Leak": 6,
    "Crime": 1,
    "Traffic": 12,
    "Vandalism": 48,
    "Public Facility Damage": 72,
    "Environmental Issue": 48,
    "Other": 72,
}

SYSTEM_PROMPT = """You are an AI dispatcher for a Smart City public issue reporting platform.
Given a citizen's report (title + description, optionally an image), classify it.

Return ONLY valid JSON with this exact schema (no markdown, no prose):
{
  "category": "<one of: Road Damage, Flood, Garbage, Traffic, Public Lighting, Water Leak, Crime, Vandalism, Public Facility Damage, Environmental Issue, Other>",
  "urgency": "<one of: Critical, High, Medium, Low>",
  "sentiment": "<one of: Emergency, Complaint, Suggestion, Information>",
  "confidence": <integer 0-100>,
  "summary": "<one-sentence summary for the officer, max 200 chars>"
}

Be objective. Critical urgency only for life-safety risks (active flood, fire, crime, gas leak).
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
        ("Flood", ["flood", "water logging", "inundation", "submerged"]),
        ("Water Leak", ["leak", "burst pipe", "pipe leak", "water leak"]),
        ("Garbage", ["garbage", "trash", "waste", "rubbish", "litter"]),
        ("Road Damage", ["pothole", "road", "crack", "broken pavement"]),
        ("Public Lighting", ["street light", "lamp", "lighting", "dark street"]),
        ("Crime", ["robbery", "theft", "assault", "crime", "violence"]),
        ("Traffic", ["traffic", "jam", "signal", "congestion"]),
        ("Vandalism", ["graffiti", "vandalism", "damaged property"]),
        ("Environmental Issue", ["pollution", "smoke", "noise", "dump"]),
    ]
    category = "Other"
    for cat, kws in rules:
        if any(k in text for k in kws):
            category = cat
            break
    urgency = "Medium"
    if any(k in text for k in ["urgent", "emergency", "danger", "fire", "blood", "injury", "critical"]):
        urgency = "Critical"
    elif any(k in text for k in ["broken", "overflow", "leak", "flood", "crime"]):
        urgency = "High"
    return {
        "category": category,
        "urgency": urgency,
        "sentiment": "Complaint",
        "confidence": 55,
        "summary": (title or description or "Citizen report")[:200],
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
    return DEFAULT_ROUTING.get(category, "General Affairs Department")


def sla_hours_for(category: str) -> int:
    return SLA_HOURS.get(category, 72)


def calculate_priority_score(urgency: str, upvotes: int, nearby_count: int, confidence: int) -> int:
    """Priority 0-100 based on urgency, upvotes, nearby reports, confidence."""
    urgency_weight = {"Critical": 60, "High": 45, "Medium": 25, "Low": 10}.get(urgency, 20)
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
