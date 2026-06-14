"""Seed database with departments, officers, citizens, and sample reports."""
import os
import random
from datetime import datetime, timedelta, timezone
from auth import hash_password
from ai_service import DEFAULT_ROUTING, SLA_HOURS, CATEGORIES, calculate_priority_score


def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()


# Cities of mock coordinates (centered on a city — using New Delhi as anchor)
CENTER_LAT, CENTER_LON = 28.6139, 77.2090


def random_coords(radius_km: float = 8):
    # Random point within radius_km
    r_deg = radius_km / 111.0
    dlat = random.uniform(-r_deg, r_deg)
    dlon = random.uniform(-r_deg, r_deg)
    return CENTER_LAT + dlat, CENTER_LON + dlon


SAMPLE_REPORTS = [
    ("Massive pothole on MG Road causing accidents", "There's a deep crater forming after recent rains. Two bikes have already crashed today.", "Road Damage", "High"),
    ("Overflowing garbage bin near market", "The community bin hasn't been emptied for 5 days. Stray dogs scatter the trash.", "Garbage", "Medium"),
    ("Broken street light on Sector 21", "Three consecutive lights are out. The whole stretch is pitch dark at night.", "Public Lighting", "High"),
    ("Severe waterlogging after heavy rains", "Water has risen knee-deep in the entire colony, residents stranded.", "Flood", "Critical"),
    ("Burst water main flooding the street", "Pipe ruptured this morning, water flowing for hours.", "Water Leak", "Critical"),
    ("Suspicious activity near park gate", "A group has been intimidating evening walkers for days.", "Crime", "High"),
    ("Traffic signal not working at junction", "Major intersection has no working signal for over a day.", "Traffic", "High"),
    ("Graffiti on school wall", "Inappropriate graffiti painted overnight on school boundary.", "Vandalism", "Low"),
    ("Public toilet damaged and unusable", "The community toilet has broken doors and no water supply.", "Public Facility Damage", "Medium"),
    ("Illegal garbage dumping along river", "Trucks dumping construction waste into the river daily.", "Environmental Issue", "High"),
    ("Pothole on highway service road", "Multiple potholes appeared after last week's rain.", "Road Damage", "Medium"),
    ("Garbage piling up at bus stop", "Commuters have to step over trash.", "Garbage", "Low"),
    ("Street light flickering all night", "Constant flickering disturbing residents.", "Public Lighting", "Low"),
    ("Drainage clogged causing minor flooding", "Stormwater drain blocked.", "Flood", "Medium"),
    ("Slow water leak from public tap", "Minor leak wasting water continuously.", "Water Leak", "Low"),
    ("Vandalism in city park", "Benches have been spray-painted.", "Vandalism", "Low"),
    ("Heavy traffic at school zone", "Daily peak-hour congestion endangering kids.", "Traffic", "Medium"),
    ("Damaged playground equipment", "Slide is cracked and unsafe for children.", "Public Facility Damage", "High"),
    ("Smoke from burning garbage", "Open burning of waste creating health hazard.", "Environmental Issue", "Medium"),
    ("Cracked sidewalk near hospital", "Elderly patients struggling to walk safely.", "Road Damage", "Medium"),
]

CITIZEN_NAMES = [
    "Aarav Sharma", "Priya Patel", "Rohan Verma", "Sneha Reddy", "Karan Singh",
    "Anjali Mehta", "Vikram Iyer", "Pooja Nair", "Aditya Kumar", "Riya Joshi",
    "Arjun Desai", "Kavya Rao", "Manish Gupta", "Ishita Bose", "Siddharth Roy",
    "Meera Pillai", "Nikhil Khanna", "Tanvi Shah", "Dev Malhotra", "Naina Chopra",
]

OFFICER_NAMES = [
    "Rajesh Kumar", "Sunita Devi", "Amit Verma", "Geeta Singh", "Vinod Yadav",
    "Lakshmi Iyer", "Prakash Joshi", "Anita Rao", "Suresh Patel", "Deepa Nair",
]

ADDRESSES = [
    "MG Road, Sector 18", "Connaught Place", "Karol Bagh Market", "Lajpat Nagar",
    "Saket District Centre", "Nehru Place", "Hauz Khas Village", "Greater Kailash",
    "Dwarka Sector 21", "Rohini Sector 11",
]


async def seed_all(db):
    # 1) Departments — based on DEFAULT_ROUTING values
    dept_names = list(set(DEFAULT_ROUTING.values()))
    dept_objs = []
    for name in dept_names:
        d = {
            "id": _id(),
            "name": name,
            "description": f"{name} of the city government",
            "contact_email": f"{name.lower().replace(' ', '.')}@city.gov",
            "categories": [c for c, dn in DEFAULT_ROUTING.items() if dn == name],
            "created_at": utc_now_iso(),
        }
        await db.departments.insert_one(d)
        dept_objs.append(d)

    # Map department name -> id
    dept_by_name = {d["name"]: d for d in dept_objs}

    # 2) Routing rules
    for category, dept_name in DEFAULT_ROUTING.items():
        await db.routing_rules.insert_one({
            "id": _id(),
            "category": category,
            "department_id": dept_by_name[dept_name]["id"],
            "sla_hours": SLA_HOURS.get(category, 48),
        })

    # 3) Admin (single)
    admin = {
        "id": _id(),
        "name": "City Admin",
        "email": "admin@smartcity.gov",
        "password_hash": hash_password("Admin@12345"),
        "role": "admin",
        "phone": "+91-9999900001",
        "department_id": None,
        "avatar_url": None,
        "created_at": utc_now_iso(),
    }
    await db.users.insert_one(admin)

    # 4) Officers (10)
    officers = []
    for i, oname in enumerate(OFFICER_NAMES):
        dept = dept_objs[i % len(dept_objs)]
        o = {
            "id": _id(),
            "name": oname,
            "email": f"officer{i+1}@smartcity.gov",
            "password_hash": hash_password("Officer@123"),
            "role": "officer",
            "phone": f"+91-99999{1000+i:04d}",
            "department_id": dept["id"],
            "avatar_url": None,
            "created_at": utc_now_iso(),
        }
        await db.users.insert_one(o)
        officers.append(o)

    # 5) Citizens (20) — one demo
    citizens = []
    demo_citizen = {
        "id": _id(),
        "name": "Demo Citizen",
        "email": "citizen@smartcity.gov",
        "password_hash": hash_password("Citizen@123"),
        "role": "citizen",
        "phone": "+91-9000000000",
        "department_id": None,
        "avatar_url": None,
        "created_at": utc_now_iso(),
    }
    await db.users.insert_one(demo_citizen)
    citizens.append(demo_citizen)
    for i, cname in enumerate(CITIZEN_NAMES):
        c = {
            "id": _id(),
            "name": cname,
            "email": f"citizen{i+1}@example.com",
            "password_hash": hash_password("Citizen@123"),
            "role": "citizen",
            "phone": f"+91-98765{4000+i:04d}",
            "department_id": None,
            "avatar_url": None,
            "created_at": utc_now_iso(),
        }
        await db.users.insert_one(c)
        citizens.append(c)

    # 6) Reports (50)
    statuses = ["AI Classified", "Assigned", "In Progress", "Under Review", "Resolved", "Closed"]
    now = datetime.now(timezone.utc)
    for i in range(50):
        title, desc, category, urgency = random.choice(SAMPLE_REPORTS)
        # Slight variation
        title = f"{title}" + ("" if i % 4 else f" — incident #{i+1}")
        lat, lon = random_coords(10)
        dept = dept_by_name.get(DEFAULT_ROUTING.get(category, "General Affairs Department"))
        # ensure dept exists
        if not dept:
            dept = await db.departments.find_one({"name": "General Affairs Department"}, {"_id": 0})
            if not dept:
                dept = {
                    "id": _id(),
                    "name": "General Affairs Department",
                    "description": "Catch-all department",
                    "contact_email": "general@city.gov",
                    "categories": [],
                    "created_at": utc_now_iso(),
                }
                await db.departments.insert_one(dept)
                dept_by_name["General Affairs Department"] = dept
        sla_h = SLA_HOURS.get(category, 48)
        days_ago = random.randint(0, 25)
        created = now - timedelta(days=days_ago, hours=random.randint(0, 23))
        deadline = created + timedelta(hours=sla_h)
        status = random.choices(statuses, weights=[5, 15, 20, 10, 30, 20])[0]
        resolved_at = None
        if status in ("Resolved", "Closed"):
            resolved_at = (created + timedelta(hours=random.randint(2, sla_h + 6))).isoformat()
        citizen = random.choice(citizens)
        # Officer from same dept
        dept_officers = [o for o in officers if o["department_id"] == dept["id"]]
        officer = random.choice(dept_officers) if dept_officers else None
        upvotes = random.randint(0, 25)
        confidence = random.randint(60, 95)
        nearby = random.randint(0, 3)
        priority = calculate_priority_score(urgency, upvotes, nearby, confidence)
        report = {
            "id": _id(),
            "title": title,
            "description": desc,
            "category": category,
            "urgency": urgency,
            "sentiment": random.choice(["Complaint", "Emergency", "Information"]),
            "confidence": confidence,
            "summary": (desc[:180] + ".") if desc else title,
            "status": status,
            "latitude": lat,
            "longitude": lon,
            "address": random.choice(ADDRESSES),
            "media_urls": [],
            "citizen_id": citizen["id"],
            "citizen_name": citizen["name"],
            "department_id": dept["id"],
            "department_name": dept["name"],
            "assigned_officer_id": officer["id"] if officer and status != "AI Classified" else None,
            "assigned_officer_name": officer["name"] if officer and status != "AI Classified" else None,
            "priority_score": priority,
            "upvote_count": upvotes,
            "comment_count": 0,
            "upvoters": [],
            "sla_hours": sla_h,
            "sla_deadline": deadline.isoformat(),
            "created_at": created.isoformat(),
            "updated_at": (created + timedelta(hours=random.randint(0, 10))).isoformat(),
            "resolved_at": resolved_at,
        }
        await db.reports.insert_one(report)


def _id():
    import uuid
    return str(uuid.uuid4())
