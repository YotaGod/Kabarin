"""Comprehensive backend tests for Smart City app."""
import io
import os
import time
import requests
import pytest

from conftest import API


# -------- Auth --------
class TestAuth:
    def test_login_admin(self, admin_auth):
        assert admin_auth["user"]["role"] == "admin"
        assert admin_auth["user"]["email"] == "admin@smartcity.gov"
        assert isinstance(admin_auth["token"], str) and len(admin_auth["token"]) > 20

    def test_login_officer(self, officer_auth):
        assert officer_auth["user"]["role"] == "officer"

    def test_login_citizen(self, citizen_auth):
        assert citizen_auth["user"]["role"] == "citizen"

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": "x@y.z", "password": "bad"})
        assert r.status_code == 401

    def test_me_authorized(self, admin_headers):
        r = requests.get(f"{API}/auth/me", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_me_unauthorized(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code in (401, 403)

    def test_register_citizen(self):
        email = f"TEST_{int(time.time()*1000)}@example.com"
        r = requests.post(f"{API}/auth/register", json={
            "name": "Test User", "email": email, "password": "TestPass@123",
            "role": "citizen", "phone": "+91-9000000000"
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and data["user"]["email"] == email


# -------- Departments / Routing --------
class TestDeptRouting:
    def test_list_departments(self, admin_headers):
        r = requests.get(f"{API}/departments", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 10, f"expected >=10 depts, got {len(data)}"

    def test_list_routing_rules(self, admin_headers):
        r = requests.get(f"{API}/routing-rules", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 11, f"expected >=11 routing rules, got {len(data)}"

    def test_non_admin_cannot_create_dept(self, citizen_headers):
        r = requests.post(f"{API}/departments", headers=citizen_headers, json={
            "name": "TEST_Dept", "description": "x", "contact_email": "x@y.z", "categories": []
        })
        assert r.status_code == 403


# -------- Reports listing --------
class TestReportsList:
    def test_list_reports(self, citizen_headers):
        r = requests.get(f"{API}/reports", headers=citizen_headers)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 50
        sample = data[0]
        for k in ("urgency", "category", "priority_score", "sla_deadline"):
            assert k in sample

    def test_mine_filter(self, citizen_headers, citizen_auth):
        r = requests.get(f"{API}/reports?mine=true", headers=citizen_headers)
        assert r.status_code == 200
        data = r.json()
        for rep in data:
            assert rep["citizen_id"] == citizen_auth["user"]["id"]

    def test_assigned_to_me(self, officer_headers, officer_auth):
        r = requests.get(f"{API}/reports?assigned_to_me=true", headers=officer_headers)
        assert r.status_code == 200
        data = r.json()
        for rep in data:
            assert rep["assigned_officer_id"] == officer_auth["user"]["id"]


# -------- AI Preview & Duplicate --------
class TestAI:
    def test_classify_preview(self, citizen_headers):
        r = requests.post(f"{API}/ai/classify-preview", headers=citizen_headers, json={
            "title": "Massive pothole on Main Street",
            "description": "Deep crater forming after rain",
            "latitude": 28.6, "longitude": 77.2,
        }, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("category", "urgency", "confidence", "summary"):
            assert k in data
        assert 0 <= data["confidence"] <= 100

    def test_check_duplicate(self, citizen_headers):
        r = requests.post(f"{API}/reports/check-duplicate", headers=citizen_headers, json={
            "title": "pothole", "description": "deep crater",
            "latitude": 28.6139, "longitude": 77.2090
        })
        assert r.status_code == 200
        assert "duplicates" in r.json()


# -------- Report CRUD flow --------
class TestReportFlow:
    created_id = None

    def test_create_report(self, citizen_headers):
        r = requests.post(f"{API}/reports", headers=citizen_headers, json={
            "title": "TEST_Large pothole near park",
            "description": "Deep pothole forming after rains, dangerous to bikes.",
            "latitude": 28.6200, "longitude": 77.2100,
            "address": "Test Road"
        }, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["category"]
        assert d["urgency"]
        assert d["priority_score"] >= 0
        assert d["sla_deadline"]
        assert d["status"] in ("AI Classified", "Assigned")
        TestReportFlow.created_id = d["id"]

    def test_get_report(self, citizen_headers):
        rid = TestReportFlow.created_id
        assert rid
        r = requests.get(f"{API}/reports/{rid}", headers=citizen_headers)
        assert r.status_code == 200
        assert r.json()["id"] == rid

    def test_upvote_toggle(self, citizen_headers):
        rid = TestReportFlow.created_id
        r1 = requests.post(f"{API}/reports/{rid}/upvote", headers=citizen_headers)
        assert r1.status_code == 200
        d1 = r1.json()
        assert d1["upvoted"] is True and d1["upvote_count"] >= 1
        r2 = requests.post(f"{API}/reports/{rid}/upvote", headers=citizen_headers)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["upvoted"] is False

    def test_comment_create_and_list(self, citizen_headers):
        rid = TestReportFlow.created_id
        r = requests.post(f"{API}/reports/{rid}/comments", headers=citizen_headers, json={"body": "TEST comment"})
        assert r.status_code == 200, r.text
        r2 = requests.get(f"{API}/reports/{rid}/comments", headers=citizen_headers)
        assert r2.status_code == 200
        assert any(c["body"] == "TEST comment" for c in r2.json())

    def test_status_update_as_officer(self, officer_headers):
        rid = TestReportFlow.created_id
        r = requests.put(f"{API}/reports/{rid}/status", headers=officer_headers,
                         json={"status": "In Progress", "note": "working"})
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "In Progress"

    def test_status_update_forbidden_for_citizen(self, citizen_headers):
        rid = TestReportFlow.created_id
        r = requests.put(f"{API}/reports/{rid}/status", headers=citizen_headers,
                         json={"status": "Resolved"})
        assert r.status_code == 403


# -------- Uploads --------
class TestUploads:
    def test_upload_and_serve(self, citizen_headers, citizen_auth):
        # Real JPEG with features (small 8x8 patterned PNG converted to JPEG)
        try:
            from PIL import Image
        except ImportError:
            pytest.skip("Pillow not installed")
        img = Image.new("RGB", (32, 32))
        for x in range(32):
            for y in range(32):
                img.putpixel((x, y), ((x*8) % 255, (y*8) % 255, ((x+y)*4) % 255))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)
        files = {"file": ("test.jpg", buf, "image/jpeg")}
        headers = {"Authorization": citizen_headers["Authorization"]}
        r = requests.post(f"{API}/uploads", headers=headers, files=files)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "path" in d and d["content_type"] == "image/jpeg"
        token = citizen_auth["token"]
        r2 = requests.get(f"{API}/files/{d['path']}?auth={token}")
        assert r2.status_code == 200
        assert len(r2.content) > 100


# -------- Analytics --------
class TestAnalytics:
    def test_kpis(self, admin_headers):
        r = requests.get(f"{API}/analytics/kpis", headers=admin_headers)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_reports", "active_reports", "resolved_reports",
                  "resolution_rate", "avg_response_time_hours",
                  "critical_open", "sla_breaches"):
            assert k in d, f"missing {k}"

    @pytest.mark.parametrize("path", ["by-category", "by-status", "by-department", "trends?days=30"])
    def test_analytics_arrays(self, admin_headers, path):
        r = requests.get(f"{API}/analytics/{path}", headers=admin_headers)
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_officer_performance(self, admin_headers):
        r = requests.get(f"{API}/analytics/officer-performance", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# -------- Notifications --------
class TestNotifications:
    def test_list(self, citizen_headers):
        r = requests.get(f"{API}/notifications", headers=citizen_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
