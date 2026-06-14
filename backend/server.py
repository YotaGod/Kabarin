"""Smart City & Public — FastAPI backend."""
import os
import logging
import uuid
import base64
import asyncio
import json
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any

from fastapi import (
    FastAPI, APIRouter, HTTPException, Depends, UploadFile, File,
    Header, Query, WebSocket, WebSocketDisconnect, Response, Request
)
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_roles, decode_token,
)
from ai_service import (
    classify_report, route_to_department, sla_hours_for,
    calculate_priority_score, text_similarity, haversine_meters,
    CATEGORIES, URGENCY_LEVELS, DEFAULT_ROUTING,
)
from storage_client import init_storage, put_object, get_object, APP_NAME
from models import (
    UserCreate, UserLogin, UserPublic,
    DepartmentCreate, DepartmentPublic,
    RoutingRuleCreate, RoutingRulePublic,
    ReportCreate, ReportStatusUpdate, ReportAssign, ReportPublic,
    CommentCreate, CommentPublic, NotificationPublic, KPIResponse,
    utc_now_iso, gen_id,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ===== Mongo =====
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ===== App / Router =====
app = FastAPI(title="Smart City & Public API")
api = APIRouter(prefix="/api")


# ===== WebSocket Manager =====
class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(user_id, []).append(ws)

    def disconnect(self, user_id: str, ws: WebSocket):
        if user_id in self.active:
            try:
                self.active[user_id].remove(ws)
            except ValueError:
                pass

    async def send(self, user_id: str, payload: dict):
        for ws in list(self.active.get(user_id, [])):
            try:
                await ws.send_json(payload)
            except Exception:
                self.disconnect(user_id, ws)

    async def broadcast(self, payload: dict):
        for uid, conns in list(self.active.items()):
            for ws in list(conns):
                try:
                    await ws.send_json(payload)
                except Exception:
                    self.disconnect(uid, ws)


manager = ConnectionManager()


# ===== Helpers =====
async def get_user_doc(user_id: str) -> Optional[dict]:
    return await db.users.find_one({"id": user_id}, {"_id": 0})


async def create_notification(user_id: str, title: str, body: str, ntype: str, report_id: Optional[str] = None):
    notif = {
        "id": gen_id(),
        "user_id": user_id,
        "title": title,
        "body": body,
        "type": ntype,
        "report_id": report_id,
        "read": False,
        "created_at": utc_now_iso(),
    }
    await db.notifications.insert_one(notif)
    await manager.send(user_id, {"event": "notification", "data": notif})


async def get_or_create_department(name: str, categories: List[str] = None) -> dict:
    existing = await db.departments.find_one({"name": name}, {"_id": 0})
    if existing:
        return existing
    dept = {
        "id": gen_id(),
        "name": name,
        "description": f"{name} of the city administration",
        "contact_email": f"{name.lower().replace(' ', '.')}@city.gov",
        "categories": categories or [],
        "created_at": utc_now_iso(),
    }
    await db.departments.insert_one(dept)
    dept.pop("_id", None)
    return dept


async def resolve_department_for_category(category: str) -> Optional[dict]:
    # Check routing_rules table first
    rule = await db.routing_rules.find_one({"category": category}, {"_id": 0})
    if rule:
        dept = await db.departments.find_one({"id": rule["department_id"]}, {"_id": 0})
        if dept:
            return dept
    # Fall back to default routing
    name = route_to_department(category)
    dept = await get_or_create_department(name, [category])
    # Auto-create rule
    await db.routing_rules.insert_one({
        "id": gen_id(),
        "category": category,
        "department_id": dept["id"],
        "sla_hours": sla_hours_for(category),
    })
    return dept


async def count_nearby_duplicates(latitude: float, longitude: float, title: str, description: str, exclude_id: Optional[str] = None) -> int:
    """Count reports within 300m that are textually similar."""
    cursor = db.reports.find({"status": {"$nin": ["Resolved", "Closed"]}}, {"_id": 0})
    count = 0
    async for r in cursor:
        if exclude_id and r.get("id") == exclude_id:
            continue
        try:
            dist = haversine_meters(latitude, longitude, r["latitude"], r["longitude"])
        except Exception:
            continue
        if dist <= 300:
            sim = text_similarity(f"{title} {description}", f"{r.get('title','')} {r.get('description','')}")
            if sim >= 0.25:
                count += 1
    return count


def public_user(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "name": doc.get("name", ""),
        "email": doc.get("email", ""),
        "role": doc.get("role", "citizen"),
        "phone": doc.get("phone"),
        "department_id": doc.get("department_id"),
        "avatar_url": doc.get("avatar_url"),
        "created_at": doc.get("created_at", utc_now_iso()),
    }


def public_report(r: dict) -> dict:
    return {
        "id": r["id"],
        "title": r["title"],
        "description": r["description"],
        "category": r.get("category", "Other"),
        "urgency": r.get("urgency", "Medium"),
        "sentiment": r.get("sentiment", "Complaint"),
        "confidence": r.get("confidence", 0),
        "summary": r.get("summary", ""),
        "status": r.get("status", "Submitted"),
        "latitude": r["latitude"],
        "longitude": r["longitude"],
        "address": r.get("address", ""),
        "media_urls": r.get("media_urls", []),
        "citizen_id": r.get("citizen_id", ""),
        "citizen_name": r.get("citizen_name", ""),
        "department_id": r.get("department_id"),
        "department_name": r.get("department_name"),
        "assigned_officer_id": r.get("assigned_officer_id"),
        "assigned_officer_name": r.get("assigned_officer_name"),
        "priority_score": r.get("priority_score", 0),
        "upvote_count": r.get("upvote_count", 0),
        "comment_count": r.get("comment_count", 0),
        "sla_hours": r.get("sla_hours", 48),
        "sla_deadline": r.get("sla_deadline", utc_now_iso()),
        "created_at": r.get("created_at", utc_now_iso()),
        "updated_at": r.get("updated_at", utc_now_iso()),
        "resolved_at": r.get("resolved_at"),
    }


# ============================================================
# AUTH ROUTES
# ============================================================
@api.post("/auth/register")
async def register(body: UserCreate):
    existing = await db.users.find_one({"email": body.email}, {"_id": 0})
    if existing:
        raise HTTPException(400, "Email already registered")
    user = {
        "id": gen_id(),
        "name": body.name,
        "email": body.email,
        "password_hash": hash_password(body.password),
        "role": body.role,
        "phone": body.phone,
        "department_id": None,
        "avatar_url": None,
        "created_at": utc_now_iso(),
    }
    await db.users.insert_one(user)
    token = create_access_token(user["id"], user["role"], user["email"])
    return {"token": token, "user": public_user(user)}


@api.post("/auth/login")
async def login(body: UserLogin):
    user = await db.users.find_one({"email": body.email}, {"_id": 0})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(401, "Invalid credentials")
    token = create_access_token(user["id"], user["role"], user["email"])
    return {"token": token, "user": public_user(user)}


@api.get("/auth/me")
async def me(current = Depends(get_current_user)):
    user = await get_user_doc(current["sub"])
    if not user:
        raise HTTPException(404, "User not found")
    return public_user(user)


# ============================================================
# DEPARTMENTS (admin manage, others read)
# ============================================================
@api.get("/departments")
async def list_departments(_: dict = Depends(get_current_user)):
    docs = await db.departments.find({}, {"_id": 0}).to_list(500)
    return docs


@api.post("/departments")
async def create_department(body: DepartmentCreate, _: dict = Depends(require_roles("admin"))):
    dept = {
        "id": gen_id(),
        **body.model_dump(),
        "created_at": utc_now_iso(),
    }
    await db.departments.insert_one(dept)
    dept.pop("_id", None)
    return dept


@api.put("/departments/{dept_id}")
async def update_department(dept_id: str, body: DepartmentCreate, _: dict = Depends(require_roles("admin"))):
    update = body.model_dump()
    res = await db.departments.update_one({"id": dept_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Department not found")
    doc = await db.departments.find_one({"id": dept_id}, {"_id": 0})
    return doc


@api.delete("/departments/{dept_id}")
async def delete_department(dept_id: str, _: dict = Depends(require_roles("admin"))):
    await db.departments.delete_one({"id": dept_id})
    return {"ok": True}


# ============================================================
# OFFICERS
# ============================================================
@api.get("/officers")
async def list_officers(department_id: Optional[str] = None, _: dict = Depends(get_current_user)):
    q = {"role": "officer"}
    if department_id:
        q["department_id"] = department_id
    docs = await db.users.find(q, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [public_user(d) for d in docs]


@api.post("/officers")
async def create_officer(body: UserCreate, dept_id: Optional[str] = Query(None), _: dict = Depends(require_roles("admin"))):
    existing = await db.users.find_one({"email": body.email}, {"_id": 0})
    if existing:
        raise HTTPException(400, "Email already in use")
    user = {
        "id": gen_id(),
        "name": body.name,
        "email": body.email,
        "password_hash": hash_password(body.password),
        "role": "officer",
        "phone": body.phone,
        "department_id": dept_id,
        "avatar_url": None,
        "created_at": utc_now_iso(),
    }
    await db.users.insert_one(user)
    return public_user(user)


@api.put("/officers/{officer_id}/department")
async def assign_officer_dept(officer_id: str, dept_id: str = Query(...), _: dict = Depends(require_roles("admin"))):
    res = await db.users.update_one({"id": officer_id, "role": "officer"}, {"$set": {"department_id": dept_id}})
    if res.matched_count == 0:
        raise HTTPException(404, "Officer not found")
    user = await get_user_doc(officer_id)
    return public_user(user)


# ============================================================
# ROUTING RULES
# ============================================================
@api.get("/routing-rules")
async def list_routing_rules(_: dict = Depends(get_current_user)):
    docs = await db.routing_rules.find({}, {"_id": 0}).to_list(500)
    return docs


@api.post("/routing-rules")
async def create_routing_rule(body: RoutingRuleCreate, _: dict = Depends(require_roles("admin"))):
    # Upsert by category
    existing = await db.routing_rules.find_one({"category": body.category}, {"_id": 0})
    if existing:
        await db.routing_rules.update_one(
            {"category": body.category},
            {"$set": {"department_id": body.department_id, "sla_hours": body.sla_hours}},
        )
        doc = await db.routing_rules.find_one({"category": body.category}, {"_id": 0})
        return doc
    rule = {"id": gen_id(), **body.model_dump()}
    await db.routing_rules.insert_one(rule)
    rule.pop("_id", None)
    return rule


@api.delete("/routing-rules/{rule_id}")
async def delete_routing_rule(rule_id: str, _: dict = Depends(require_roles("admin"))):
    await db.routing_rules.delete_one({"id": rule_id})
    return {"ok": True}


# ============================================================
# AI CLASSIFICATION PREVIEW (for citizen submit form)
# ============================================================
@api.post("/ai/classify-preview")
async def classify_preview(body: ReportCreate, current = Depends(get_current_user)):
    result = await classify_report(
        body.title, body.description, body.image_base64,
        session_id=f"preview-{current['sub']}",
    )
    return result


# ============================================================
# DUPLICATE DETECTION (pre-submit)
# ============================================================
@api.post("/reports/check-duplicate")
async def check_duplicate(body: ReportCreate, current = Depends(get_current_user)):
    matches = []
    cursor = db.reports.find({"status": {"$nin": ["Resolved", "Closed"]}}, {"_id": 0})
    async for r in cursor:
        try:
            dist = haversine_meters(body.latitude, body.longitude, r["latitude"], r["longitude"])
        except Exception:
            continue
        if dist <= 300:
            sim = text_similarity(f"{body.title} {body.description}", f"{r.get('title','')} {r.get('description','')}")
            if sim >= 0.25:
                matches.append({**public_report(r), "distance_m": int(dist), "similarity": round(sim, 2)})
    matches.sort(key=lambda m: (-m["similarity"], m["distance_m"]))
    return {"duplicates": matches[:5]}


# ============================================================
# REPORTS
# ============================================================
@api.post("/reports")
async def create_report(body: ReportCreate, current = Depends(get_current_user)):
    citizen = await get_user_doc(current["sub"])
    if not citizen:
        raise HTTPException(404, "User not found")

    # AI classification (optional image)
    ai = await classify_report(
        body.title, body.description, body.image_base64,
        session_id=f"report-{citizen['id']}",
    )
    category = body.category or ai["category"]
    urgency = ai["urgency"]

    # Route to department
    dept = await resolve_department_for_category(category)
    rule = await db.routing_rules.find_one({"category": category}, {"_id": 0})
    sla_h = rule["sla_hours"] if rule else sla_hours_for(category)

    # Priority
    nearby = await count_nearby_duplicates(body.latitude, body.longitude, body.title, body.description)
    priority = calculate_priority_score(urgency, 0, nearby, ai["confidence"])

    now = datetime.now(timezone.utc)
    deadline = (now + timedelta(hours=sla_h)).isoformat()

    report = {
        "id": gen_id(),
        "title": body.title,
        "description": body.description,
        "category": category,
        "urgency": urgency,
        "sentiment": ai["sentiment"],
        "confidence": ai["confidence"],
        "summary": ai["summary"],
        "status": "AI Classified",
        "latitude": body.latitude,
        "longitude": body.longitude,
        "address": body.address or "",
        "media_urls": body.media_urls or [],
        "citizen_id": citizen["id"],
        "citizen_name": citizen["name"],
        "department_id": dept["id"] if dept else None,
        "department_name": dept["name"] if dept else None,
        "assigned_officer_id": None,
        "assigned_officer_name": None,
        "priority_score": priority,
        "upvote_count": 0,
        "comment_count": 0,
        "upvoters": [],
        "sla_hours": sla_h,
        "sla_deadline": deadline,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "resolved_at": None,
    }
    await db.reports.insert_one(report)

    # Status history
    await db.report_status_history.insert_one({
        "id": gen_id(),
        "report_id": report["id"],
        "from_status": None,
        "to_status": "AI Classified",
        "changed_by": citizen["id"],
        "changed_by_name": citizen["name"],
        "note": f"Auto-classified: {category} / {urgency}",
        "created_at": now.isoformat(),
    })

    # Notify citizen
    await create_notification(
        citizen["id"], "Report received",
        f"Your report '{body.title}' has been classified as {category}.",
        "report_received", report["id"],
    )

    # Auto-assign to least loaded officer in dept
    if dept:
        officers = await db.users.find(
            {"role": "officer", "department_id": dept["id"]}, {"_id": 0, "password_hash": 0}
        ).to_list(100)
        if officers:
            loads = []
            for o in officers:
                load = await db.reports.count_documents({
                    "assigned_officer_id": o["id"],
                    "status": {"$nin": ["Resolved", "Closed"]},
                })
                loads.append((load, o))
            loads.sort(key=lambda x: x[0])
            chosen = loads[0][1]
            await db.reports.update_one(
                {"id": report["id"]},
                {"$set": {
                    "assigned_officer_id": chosen["id"],
                    "assigned_officer_name": chosen["name"],
                    "status": "Assigned",
                    "updated_at": utc_now_iso(),
                }},
            )
            await db.report_status_history.insert_one({
                "id": gen_id(),
                "report_id": report["id"],
                "from_status": "AI Classified",
                "to_status": "Assigned",
                "changed_by": "system",
                "changed_by_name": "System",
                "note": f"Auto-assigned to {chosen['name']}",
                "created_at": utc_now_iso(),
            })
            await create_notification(
                chosen["id"], "New assignment",
                f"You've been assigned report: {body.title}",
                "new_assignment", report["id"],
            )
            report["assigned_officer_id"] = chosen["id"]
            report["assigned_officer_name"] = chosen["name"]
            report["status"] = "Assigned"

    await manager.broadcast({"event": "report_created", "data": public_report(report)})
    return public_report(report)


@api.get("/reports")
async def list_reports(
    status: Optional[str] = None,
    category: Optional[str] = None,
    urgency: Optional[str] = None,
    department_id: Optional[str] = None,
    mine: bool = False,
    assigned_to_me: bool = False,
    limit: int = 200,
    current = Depends(get_current_user),
):
    q: Dict[str, Any] = {}
    if status:
        q["status"] = status
    if category:
        q["category"] = category
    if urgency:
        q["urgency"] = urgency
    if department_id:
        q["department_id"] = department_id
    if mine:
        q["citizen_id"] = current["sub"]
    if assigned_to_me:
        q["assigned_officer_id"] = current["sub"]
    docs = await db.reports.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return [public_report(d) for d in docs]


@api.get("/reports/{report_id}")
async def get_report(report_id: str, _: dict = Depends(get_current_user)):
    r = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Report not found")
    return public_report(r)


@api.put("/reports/{report_id}/status")
async def update_status(report_id: str, body: ReportStatusUpdate, current = Depends(require_roles("officer", "admin"))):
    r = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Report not found")
    updates = {"status": body.status, "updated_at": utc_now_iso()}
    if body.status == "Resolved":
        updates["resolved_at"] = utc_now_iso()
    await db.reports.update_one({"id": report_id}, {"$set": updates})
    user = await get_user_doc(current["sub"])
    await db.report_status_history.insert_one({
        "id": gen_id(),
        "report_id": report_id,
        "from_status": r.get("status"),
        "to_status": body.status,
        "changed_by": current["sub"],
        "changed_by_name": user["name"] if user else "Officer",
        "note": body.note or "",
        "created_at": utc_now_iso(),
    })
    # Notify citizen
    await create_notification(
        r["citizen_id"], f"Report status: {body.status}",
        f"Your report '{r['title']}' is now {body.status}.",
        "status_update", report_id,
    )
    new_r = await db.reports.find_one({"id": report_id}, {"_id": 0})
    await manager.broadcast({"event": "report_updated", "data": public_report(new_r)})
    return public_report(new_r)


@api.put("/reports/{report_id}/assign")
async def assign_report(report_id: str, body: ReportAssign, current = Depends(require_roles("admin"))):
    officer = await get_user_doc(body.officer_id)
    if not officer or officer["role"] != "officer":
        raise HTTPException(404, "Officer not found")
    r = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Report not found")
    await db.reports.update_one({"id": report_id}, {"$set": {
        "assigned_officer_id": officer["id"],
        "assigned_officer_name": officer["name"],
        "status": "Assigned",
        "updated_at": utc_now_iso(),
    }})
    await db.report_status_history.insert_one({
        "id": gen_id(),
        "report_id": report_id,
        "from_status": r.get("status"),
        "to_status": "Assigned",
        "changed_by": current["sub"],
        "changed_by_name": "Admin",
        "note": body.note or f"Assigned to {officer['name']}",
        "created_at": utc_now_iso(),
    })
    await create_notification(officer["id"], "New assignment", f"You've been assigned report: {r['title']}", "new_assignment", report_id)
    new_r = await db.reports.find_one({"id": report_id}, {"_id": 0})
    await manager.broadcast({"event": "report_updated", "data": public_report(new_r)})
    return public_report(new_r)


@api.post("/reports/{report_id}/upvote")
async def upvote_report(report_id: str, current = Depends(get_current_user)):
    r = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Report not found")
    user_id = current["sub"]
    upvoters = set(r.get("upvoters", []))
    if user_id in upvoters:
        upvoters.discard(user_id)
        delta = -1
    else:
        upvoters.add(user_id)
        delta = 1
    new_count = max(0, r.get("upvote_count", 0) + delta)
    # Recalculate priority
    nearby = await count_nearby_duplicates(r["latitude"], r["longitude"], r["title"], r["description"], exclude_id=r["id"])
    priority = calculate_priority_score(r.get("urgency", "Medium"), new_count, nearby, r.get("confidence", 50))
    await db.reports.update_one({"id": report_id}, {"$set": {
        "upvoters": list(upvoters),
        "upvote_count": new_count,
        "priority_score": priority,
        "updated_at": utc_now_iso(),
    }})
    new_r = await db.reports.find_one({"id": report_id}, {"_id": 0})
    await manager.broadcast({"event": "report_updated", "data": public_report(new_r)})
    return {"upvoted": user_id in upvoters, "upvote_count": new_count, "priority_score": priority}


@api.get("/reports/{report_id}/history")
async def report_history(report_id: str, _: dict = Depends(get_current_user)):
    docs = await db.report_status_history.find({"report_id": report_id}, {"_id": 0}).sort("created_at", 1).to_list(200)
    return docs


# ===== COMMENTS =====
@api.get("/reports/{report_id}/comments")
async def list_comments(report_id: str, _: dict = Depends(get_current_user)):
    docs = await db.report_comments.find({"report_id": report_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return docs


@api.post("/reports/{report_id}/comments")
async def create_comment(report_id: str, body: CommentCreate, current = Depends(get_current_user)):
    user = await get_user_doc(current["sub"])
    if not user:
        raise HTTPException(404, "User not found")
    comment = {
        "id": gen_id(),
        "report_id": report_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "user_role": user["role"],
        "body": body.body,
        "created_at": utc_now_iso(),
    }
    await db.report_comments.insert_one(comment)
    await db.reports.update_one({"id": report_id}, {"$inc": {"comment_count": 1}, "$set": {"updated_at": utc_now_iso()}})
    comment.pop("_id", None)
    return comment


# ============================================================
# UPLOADS
# ============================================================
@api.post("/uploads")
async def upload_file(file: UploadFile = File(...), current = Depends(get_current_user)):
    allowed = {"image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "video/quicktime"}
    if file.content_type not in allowed:
        raise HTTPException(400, f"Unsupported content type: {file.content_type}")
    data = await file.read()
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(413, "File too large (max 25MB)")
    ext = (file.filename or "").split(".")[-1].lower() if "." in (file.filename or "") else "bin"
    path = f"{APP_NAME}/uploads/{current['sub']}/{uuid.uuid4()}.{ext}"
    result = put_object(path, data, file.content_type)
    await db.files.insert_one({
        "id": gen_id(),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result.get("size", len(data)),
        "owner_id": current["sub"],
        "is_deleted": False,
        "created_at": utc_now_iso(),
    })
    return {"path": result["path"], "content_type": file.content_type}


@api.get("/files/{path:path}")
async def serve_file(path: str, authorization: Optional[str] = Header(None), auth: Optional[str] = Query(None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    elif auth:
        token = auth
    if not token:
        raise HTTPException(401, "Missing auth")
    decode_token(token)  # raises if invalid
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(404, "File not found")
    data, content_type = get_object(path)
    return Response(content=data, media_type=record.get("content_type") or content_type)


# ============================================================
# NOTIFICATIONS
# ============================================================
@api.get("/notifications")
async def list_notifications(current = Depends(get_current_user)):
    docs = await db.notifications.find({"user_id": current["sub"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return docs


@api.post("/notifications/{nid}/read")
async def mark_read(nid: str, current = Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": current["sub"]}, {"$set": {"read": True}})
    return {"ok": True}


@api.post("/notifications/read-all")
async def mark_all_read(current = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": current["sub"]}, {"$set": {"read": True}})
    return {"ok": True}


# ============================================================
# ANALYTICS
# ============================================================
@api.get("/analytics/kpis")
async def kpis(_: dict = Depends(require_roles("admin", "officer"))):
    total = await db.reports.count_documents({})
    resolved = await db.reports.count_documents({"status": {"$in": ["Resolved", "Closed"]}})
    active = total - resolved
    critical_open = await db.reports.count_documents({"urgency": "Critical", "status": {"$nin": ["Resolved", "Closed"]}})
    now = datetime.now(timezone.utc)
    breached = 0
    avg_hours = 0.0
    resolved_total_hours = 0.0
    resolved_count = 0
    async for r in db.reports.find({}, {"_id": 0}):
        try:
            deadline = datetime.fromisoformat(r["sla_deadline"])
            if r.get("status") not in ("Resolved", "Closed") and now > deadline:
                breached += 1
        except Exception:
            pass
        if r.get("resolved_at") and r.get("created_at"):
            try:
                d = datetime.fromisoformat(r["resolved_at"]) - datetime.fromisoformat(r["created_at"])
                resolved_total_hours += d.total_seconds() / 3600.0
                resolved_count += 1
            except Exception:
                pass
    if resolved_count:
        avg_hours = resolved_total_hours / resolved_count
    return {
        "total_reports": total,
        "active_reports": active,
        "resolved_reports": resolved,
        "resolution_rate": round((resolved / total * 100) if total else 0.0, 1),
        "avg_response_time_hours": round(avg_hours, 1),
        "critical_open": critical_open,
        "sla_breaches": breached,
    }


@api.get("/analytics/by-category")
async def by_category(_: dict = Depends(require_roles("admin", "officer"))):
    pipeline = [{"$group": {"_id": "$category", "count": {"$sum": 1}}}]
    docs = await db.reports.aggregate(pipeline).to_list(50)
    return [{"category": d["_id"] or "Other", "count": d["count"]} for d in docs]


@api.get("/analytics/by-status")
async def by_status(_: dict = Depends(require_roles("admin", "officer"))):
    pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    docs = await db.reports.aggregate(pipeline).to_list(50)
    return [{"status": d["_id"] or "Submitted", "count": d["count"]} for d in docs]


@api.get("/analytics/by-department")
async def by_department(_: dict = Depends(require_roles("admin", "officer"))):
    pipeline = [{"$group": {"_id": "$department_name", "count": {"$sum": 1}}}]
    docs = await db.reports.aggregate(pipeline).to_list(50)
    return [{"department": d["_id"] or "Unassigned", "count": d["count"]} for d in docs]


@api.get("/analytics/trends")
async def trends(days: int = 30, _: dict = Depends(require_roles("admin", "officer"))):
    """Daily counts of created vs resolved reports for past N days."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    buckets: Dict[str, Dict[str, int]] = {}
    async for r in db.reports.find({"created_at": {"$gte": cutoff}}, {"_id": 0, "created_at": 1, "resolved_at": 1}):
        try:
            d_created = r["created_at"][:10]
            buckets.setdefault(d_created, {"created": 0, "resolved": 0})["created"] += 1
            if r.get("resolved_at"):
                d_resolved = r["resolved_at"][:10]
                buckets.setdefault(d_resolved, {"created": 0, "resolved": 0})["resolved"] += 1
        except Exception:
            continue
    return [{"date": d, **v} for d, v in sorted(buckets.items())]


@api.get("/analytics/officer-performance")
async def officer_performance(_: dict = Depends(require_roles("admin"))):
    officers = await db.users.find({"role": "officer"}, {"_id": 0, "password_hash": 0}).to_list(500)
    result = []
    for o in officers:
        assigned = await db.reports.count_documents({"assigned_officer_id": o["id"]})
        resolved = await db.reports.count_documents({"assigned_officer_id": o["id"], "status": {"$in": ["Resolved", "Closed"]}})
        result.append({
            "officer_id": o["id"],
            "officer_name": o["name"],
            "department_id": o.get("department_id"),
            "assigned": assigned,
            "resolved": resolved,
            "resolution_rate": round((resolved / assigned * 100) if assigned else 0.0, 1),
        })
    return sorted(result, key=lambda x: -x["resolved"])


# ============================================================
# WEBSOCKET
# ============================================================
@app.websocket("/api/ws")
async def websocket_endpoint(ws: WebSocket, token: str = Query(...)):
    try:
        payload = decode_token(token)
        user_id = payload["sub"]
    except HTTPException:
        await ws.close(code=4401)
        return
    await manager.connect(user_id, ws)
    try:
        await ws.send_json({"event": "connected", "user_id": user_id})
        while True:
            # Keep-alive: wait for client pings
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, ws)
    except Exception:
        manager.disconnect(user_id, ws)


# ============================================================
# HEALTH
# ============================================================
@api.get("/")
async def root():
    return {"app": "Smart City & Public", "ok": True}


@api.get("/meta/options")
async def meta_options():
    return {
        "categories": CATEGORIES,
        "urgency_levels": URGENCY_LEVELS,
        "default_routing": DEFAULT_ROUTING,
        "statuses": [
            "Submitted", "AI Classified", "Assigned", "In Progress",
            "Under Review", "Resolved", "Closed",
        ],
    }


# ============================================================
# STARTUP
# ============================================================
@app.on_event("startup")
async def on_startup():
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.warning(f"Storage init failed (will retry on first upload): {e}")

    # Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.reports.create_index("id", unique=True)
    await db.reports.create_index("citizen_id")
    await db.reports.create_index("assigned_officer_id")
    await db.reports.create_index("status")
    await db.reports.create_index("category")
    await db.reports.create_index([("latitude", 1), ("longitude", 1)])
    await db.departments.create_index("name", unique=True)
    await db.routing_rules.create_index("category", unique=True)
    await db.notifications.create_index("user_id")

    # Auto-seed if empty
    count = await db.users.count_documents({})
    if count == 0:
        logger.info("Database empty — seeding initial data...")
        from seed import seed_all
        await seed_all(db)
        logger.info("Seeding complete")


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
