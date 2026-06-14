"""Seed database with departments, officers, citizens, and sample reports."""
import os
import random
from datetime import datetime, timedelta, timezone
from auth import hash_password
from ai_service import DEFAULT_ROUTING, SLA_HOURS, CATEGORIES, calculate_priority_score


def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()


# Cities of mock coordinates (centered on Jakarta, Indonesia)
CENTER_LAT, CENTER_LON = -6.2088, 106.8456


def random_coords(radius_km: float = 8):
    # Random point within radius_km
    r_deg = radius_km / 111.0
    dlat = random.uniform(-r_deg, r_deg)
    dlon = random.uniform(-r_deg, r_deg)
    return CENTER_LAT + dlat, CENTER_LON + dlon


SAMPLE_REPORTS = [
    ("Lubang besar di Jalan Sudirman menyebabkan kecelakaan", "Ada lubang besar yang terbentuk setelah hujan deras. Dua motor sudah terperosok hari ini.", "Kerusakan Jalan", "Tinggi"),
    ("Tong sampah meluap di dekat pasar", "Tong sampah sudah tidak dikosongkan selama 5 hari. Anjing liar membuang sampah berserakan.", "Sampah", "Sedang"),
    ("Lampu jalan mati di Kelurahan Menteng", "Tiga lampu berturut-turut mati. Seluruh jalan gelap gulita di malam hari.", "Penerangan Jalan", "Tinggi"),
    ("Genangan air parah setelah hujan deras", "Air sudah setinggi lutut di seluruh kompleks, warga terisolasi.", "Banjir", "Kritis"),
    ("Pipa air utama pecah dan membanjiri jalan", "Pipa pecah pagi ini, air mengalir berjam-jam.", "Kebocoran Air", "Kritis"),
    ("Aktivitas mencurigakan di dekat gerbang taman", "Sekelompok orang mengintimidasi pengunjung taman selama berhari-hari.", "Kriminalitas", "Tinggi"),
    ("Lampu lalu lintas tidak berfungsi di persimpangan", "Persimpangan besar tidak ada lampu yang menyala sudah satu hari.", "Lalu Lintas", "Tinggi"),
    ("Coretan di dinding sekolah", "Coretan tidak pantas dibuat semalam di pagar sekolah.", "Vandalisme", "Rendah"),
    ("Toilet umum rusak dan tidak bisa digunakan", "Toilet umum pintunya rusak dan tidak ada air.", "Kerusakan Fasilitas Umum", "Sedang"),
    ("Pembuangan sampah ilegal di bantaran sungai", "Truk membuang sampah konstruksi ke sungai setiap hari.", "Masalah Lingkungan", "Tinggi"),
    ("Lubang di jalan tol layanan", "Beberapa lubang muncul setelah hujan minggu lalu.", "Kerusakan Jalan", "Sedang"),
    ("Sampah menumpuk di halte bus", "Para penumpang harus melangkahi sampah.", "Sampah", "Rendah"),
    ("Lampu jalan berkedip sepanjang malam", "Kedipan terus menerus mengganggu warga.", "Penerangan Jalan", "Rendah"),
    ("Saluran tersumbat menyebabkan banjir kecil", "Saluran air hujan tersumbat.", "Banjir", "Sedang"),
    ("Kebocoran air kecil dari keran umum", "Kebocoran kecil terus menerus membuang air.", "Kebocoran Air", "Rendah"),
    ("Vandalisme di taman kota", "Bangku-bangku disemprot cat.", "Vandalisme", "Rendah"),
    ("Lalu lintas padat di zona sekolah", "Kemacetan jam sibuk membahayakan anak-anak.", "Lalu Lintas", "Sedang"),
    ("Peralatan taman bermain rusak", "Perosotan retak dan tidak aman untuk anak-anak.", "Kerusakan Fasilitas Umum", "Tinggi"),
    ("Asap dari pembakaran sampah", "Pembakaran sampah terbuka menciptakan bahaya kesehatan.", "Masalah Lingkungan", "Sedang"),
    ("Trotoar retak di dekat rumah sakit", "Pasien lansia kesulitan berjalan dengan aman.", "Kerusakan Jalan", "Sedang"),
]

CITIZEN_NAMES = [
    "Budi Santoso", "Siti Nurhaliza", "Ahmad Dhani", "Rina Pratiwi", "Dedi Susanto",
    "Maya Sari", "Eko Prabowo", "Fitri Handayani", "Hendra Gunawan", "Lia Amalia",
    "Agus Wijaya", "Dewi Lestari", "Bambang Suryanto", "Citra Kirana", "Fauzi Rahman",
    "Indah Permata", "Joko Widodo", "Kartika Putri", "Lukman Hakim", "Nisa Sabrina",
]

OFFICER_NAMES = [
    "Bambang Hermanto", "Sri Wahyuni", "Imam Santoso", "Retno Wulandari", "Agung Prasetyo",
    "Lestari Rahayu", "Dwi Atmojo", "Yuni Astuti", "Sugeng Riyadi", "Dian Pertiwi",
]

ADDRESSES = [
    "Jl. Sudirman, Jakarta Selatan", "Jl. Thamrin, Jakarta Pusat", "Jl. Gatot Subroto, Kuningan",
    "Jl. Asia Afrika, Senayan", "Jl. Casablanca, Tebet", "Jl. HR Rasuna Said, Setiabudi",
    "Jl. Sisingamangaraja, Kebayoran Baru", "Jl. Supomo, Menteng", "Jl. Mampang Prapatan",
    "Jl. MT Haryono, Cawang",
]


async def seed_all(db):
    # 1) Departments — based on DEFAULT_ROUTING values
    dept_names = list(set(DEFAULT_ROUTING.values()))
    dept_objs = []
    for name in dept_names:
        d = {
            "id": _id(),
            "name": name,
            "description": f"{name} Pemerintah Kota",
            "contact_email": f"{name.lower().replace(' ', '.')}@kotapintar.id",
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
        "name": "Admin Kota",
        "email": "admin@kotapintar.id",
        "password_hash": hash_password("Admin@12345"),
        "role": "admin",
        "phone": "+62-811-9999-0001",
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
            "email": f"petugas{i+1}@kotapintar.id",
            "password_hash": hash_password("Petugas@123"),
            "role": "officer",
            "phone": f"+62-812-9999-{1000+i:04d}",
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
        "name": "Demo Warga",
        "email": "warga@kotapintar.id",
        "password_hash": hash_password("Warga@123"),
        "role": "citizen",
        "phone": "+62-813-0000-0000",
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
            "email": f"warga{i+1}@contoh.com",
            "password_hash": hash_password("Warga@123"),
            "role": "citizen",
            "phone": f"+62-821-8765-{4000+i:04d}",
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
            dept = await db.departments.find_one({"name": "Dinas Umum"}, {"_id": 0})
            if not dept:
                dept = {
                    "id": _id(),
                    "name": "Dinas Umum",
                    "description": "Dinas untuk semua keperluan umum",
                    "contact_email": "umum@kotapintar.id",
                    "categories": [],
                    "created_at": utc_now_iso(),
                }
                await db.departments.insert_one(dept)
                dept_by_name["Dinas Umum"] = dept
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
            "sentiment": random.choice(["Keluhan", "Darurat", "Informasi"]),
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
