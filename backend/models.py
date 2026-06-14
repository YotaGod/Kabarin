"""Pydantic models for Smart City app."""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime, timezone
import uuid


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def gen_id() -> str:
    return str(uuid.uuid4())


# ===== USER =====
Role = Literal["citizen", "officer", "admin"]


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Role = "citizen"
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: Role
    phone: Optional[str] = None
    department_id: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: str


# ===== DEPARTMENT =====
class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    contact_email: Optional[str] = None
    categories: List[str] = []


class DepartmentPublic(DepartmentCreate):
    id: str
    created_at: str


# ===== ROUTING RULE =====
class RoutingRuleCreate(BaseModel):
    category: str
    department_id: str
    sla_hours: int = 48


class RoutingRulePublic(RoutingRuleCreate):
    id: str


# ===== REPORT =====
ReportStatus = Literal[
    "Submitted", "AI Classified", "Assigned", "In Progress",
    "Under Review", "Resolved", "Closed"
]


class ReportCreate(BaseModel):
    title: str
    description: str
    category: Optional[str] = None  # Will be set by AI if not provided
    latitude: float
    longitude: float
    address: Optional[str] = ""
    media_urls: List[str] = []  # uploaded file paths
    image_base64: Optional[str] = None  # For AI classification preview only


class ReportStatusUpdate(BaseModel):
    status: ReportStatus
    note: Optional[str] = ""


class ReportAssign(BaseModel):
    officer_id: str
    note: Optional[str] = ""


class ReportPublic(BaseModel):
    id: str
    title: str
    description: str
    category: str
    urgency: str
    sentiment: str
    confidence: int
    summary: str
    status: ReportStatus
    latitude: float
    longitude: float
    address: str
    media_urls: List[str]
    citizen_id: str
    citizen_name: str
    department_id: Optional[str]
    department_name: Optional[str]
    assigned_officer_id: Optional[str]
    assigned_officer_name: Optional[str]
    priority_score: int
    upvote_count: int
    comment_count: int
    sla_hours: int
    sla_deadline: str
    created_at: str
    updated_at: str
    resolved_at: Optional[str] = None


# ===== COMMENT =====
class CommentCreate(BaseModel):
    body: str


class CommentPublic(BaseModel):
    id: str
    report_id: str
    user_id: str
    user_name: str
    user_role: str
    body: str
    created_at: str


# ===== NOTIFICATION =====
class NotificationPublic(BaseModel):
    id: str
    user_id: str
    title: str
    body: str
    type: str
    report_id: Optional[str] = None
    read: bool = False
    created_at: str


# ===== ANALYTICS =====
class KPIResponse(BaseModel):
    total_reports: int
    active_reports: int
    resolved_reports: int
    resolution_rate: float
    avg_response_time_hours: float
    critical_open: int
    sla_breaches: int
