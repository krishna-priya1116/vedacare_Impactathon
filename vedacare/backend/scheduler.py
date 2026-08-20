"""
VedaCare — Background scheduler (APScheduler).
- check_missed_doses: runs every 15 min, marks unconfirmed past-window dose_logs as missed, generates alerts
- check_repeated_misses: runs every hour, 3+ misses in a week → escalated alert
"""

import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from database import SessionLocal
from models import DoseLog, Medication, Alert, Patient

# How many minutes past the scheduled time before marking as "missed"
MISS_WINDOW_MINUTES = 60


def check_missed_doses():
    """Mark unconfirmed dose_logs past their window as 'missed' and generate alerts."""
    db: Session = SessionLocal()
    try:
        cutoff = datetime.datetime.utcnow() - datetime.timedelta(minutes=MISS_WINDOW_MINUTES)
        pending_logs = (
            db.query(DoseLog)
            .filter(
                DoseLog.status.in_(["pending", "snoozed"]),
                DoseLog.scheduled_time < cutoff,
            )
            .all()
        )
        for dl in pending_logs:
            dl.status = "missed"
            med = db.query(Medication).filter(Medication.id == dl.medication_id).first()
            if med:
                patient = db.query(Patient).filter(Patient.id == med.patient_id).first()
                if patient:
                    alert = Alert(
                        caregiver_id=patient.caregiver_id,
                        patient_id=patient.id,
                        type="missed_dose",
                        severity="orange",
                        related_id=dl.id,
                        message=f"Missed dose: {med.drug_name} was scheduled at {dl.scheduled_time.strftime('%H:%M')}",
                        status="active",
                    )
                    db.add(alert)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[Scheduler] check_missed_doses error: {e}")
    finally:
        db.close()


def check_repeated_misses():
    """Detect 3+ misses in a week → generate escalated repeated_miss alert."""
    db: Session = SessionLocal()
    try:
        week_ago = datetime.datetime.utcnow() - datetime.timedelta(days=7)
        # Get medications with 3+ misses in the last week
        from sqlalchemy import func
        results = (
            db.query(DoseLog.medication_id, func.count(DoseLog.id).label("miss_count"))
            .filter(DoseLog.status == "missed", DoseLog.scheduled_time >= week_ago)
            .group_by(DoseLog.medication_id)
            .having(func.count(DoseLog.id) >= 3)
            .all()
        )
        for med_id, miss_count in results:
            med = db.query(Medication).filter(Medication.id == med_id).first()
            if not med:
                continue
            patient = db.query(Patient).filter(Patient.id == med.patient_id).first()
            if not patient:
                continue
            # Check if we already sent this alert recently (avoid duplicates)
            recent = (
                db.query(Alert)
                .filter(
                    Alert.patient_id == patient.id,
                    Alert.type == "repeated_miss",
                    Alert.related_id == med_id,
                    Alert.sent_at >= week_ago,
                )
                .first()
            )
            if recent:
                continue
            alert = Alert(
                caregiver_id=patient.caregiver_id,
                patient_id=patient.id,
                type="repeated_miss",
                severity="red",
                related_id=med_id,
                message=f"Repeated misses: {med.drug_name} has been missed {miss_count} times this week.",
                status="active",
            )
            db.add(alert)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[Scheduler] check_repeated_misses error: {e}")
    finally:
        db.close()


def start_scheduler():
    """Start background scheduler with missed-dose and repeated-miss detection jobs."""
    scheduler = BackgroundScheduler()
    scheduler.add_job(check_missed_doses, "interval", minutes=15, id="check_missed_doses")
    scheduler.add_job(check_repeated_misses, "interval", hours=1, id="check_repeated_misses")
    scheduler.start()
    print("[Scheduler] Background scheduler started — missed-dose check every 15 min, repeated-miss check hourly")
    return scheduler
