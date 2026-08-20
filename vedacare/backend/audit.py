"""
VedaCare — Audit log helper.
Append-only: every state-changing action writes one row.
"""

import datetime
from sqlalchemy.orm import Session
from models import AuditLog


def write_audit(
    db: Session,
    patient_id: int,
    actor: str,          # "caregiver" | "patient" | "system"
    actor_id: int | None,
    action: str,
    detail: str | None = None,
):
    """Create an audit log entry — never update or delete existing rows."""
    entry = AuditLog(
        patient_id=patient_id,
        actor=actor,
        actor_id=actor_id,
        action=action,
        detail=detail,
        time=datetime.datetime.utcnow(),
    )
    db.add(entry)
    db.commit()
