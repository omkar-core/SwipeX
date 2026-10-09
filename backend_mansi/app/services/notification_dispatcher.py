import json
import logging
import os
from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy.orm import Session

from app.models import (
    Notification,
    NotificationType,
    NotificationChannel,
    AlertPreference,
    User,
)
from app.websocket_manager import manager

logger = logging.getLogger("notification_dispatcher")


def is_in_quiet_hours(start_str: Optional[str], end_str: Optional[str]) -> bool:
    """Checks if current time falls within user quiet hours (HH:MM)."""
    if not start_str or not end_str:
        return False
    try:
        now_time = datetime.utcnow().time()
        start_time = datetime.strptime(start_str, "%H:%M").time()
        end_time = datetime.strptime(end_str, "%H:%M").time()
        if start_time <= end_time:
            return start_time <= now_time <= end_time
        else:  # Quiet hours cross midnight (e.g. 22:00 to 08:00)
            return now_time >= start_time or now_time <= end_time
    except Exception:
        return False


def get_or_create_alert_preference(user_id: str, db: Session) -> AlertPreference:
    pref = db.query(AlertPreference).filter(AlertPreference.user_id == user_id).first()
    if not pref:
        pref = AlertPreference(user_id=user_id)
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return pref


async def dispatch_notification(
    user_id: str,
    title: str,
    message: str,
    notification_type: NotificationType,
    channel: NotificationChannel = NotificationChannel.IN_APP,
    metadata: Optional[Dict[str, Any]] = None,
    db: Session = None,
) -> Notification:
    """
    Dispatches a notification according to user alert preferences.
    Saves record to DB and emits via requested channels (In-App WebSocket, Email, Push).
    """
    meta_json = json.dumps(metadata) if metadata else None

    # Check alert preferences if DB session is available
    if db:
        pref = get_or_create_alert_preference(user_id, db)

        # Check quiet hours
        if is_in_quiet_hours(pref.quiet_hours_start, pref.quiet_hours_end):
            logger.info(f"Skipping notification for user {user_id} due to quiet hours.")
            # Still save notification to DB so user sees it in inbox later
            notif = Notification(
                user_id=user_id,
                title=title,
                message=message,
                type=notification_type,
                channel=channel,
                is_read=False,
                metadata_json=meta_json,
            )
            db.add(notif)
            db.commit()
            db.refresh(notif)
            return notif

        # Check notification type toggles
        if notification_type == NotificationType.INSTANT_JOB and not pref.instant_job:
            logger.info(f"User {user_id} disabled instant job notifications.")
        elif notification_type == NotificationType.STARTUP_HIRING and not pref.startup_hiring:
            logger.info(f"User {user_id} disabled startup hiring notifications.")
        elif notification_type == NotificationType.HIGH_MATCH and not pref.high_match:
            logger.info(f"User {user_id} disabled high match notifications.")
        elif notification_type == NotificationType.LOW_COMPETITION and not pref.low_competition:
            logger.info(f"User {user_id} disabled low competition notifications.")

    # Save to DB
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notification_type,
        channel=channel,
        is_read=False,
        metadata_json=meta_json,
    )
    if db:
        db.add(notif)
        db.commit()
        db.refresh(notif)

    # In-App WebSocket Push
    payload = {
        "event": "notification",
        "data": {
            "id": notif.id if hasattr(notif, "id") else "temp-id",
            "user_id": user_id,
            "title": title,
            "message": message,
            "type": notification_type.value,
            "channel": channel.value,
            "is_read": False,
            "metadata": metadata,
            "created_at": datetime.utcnow().isoformat(),
        }
    }
    await manager.send_personal_message(payload, user_id)

    # Channel-specific deliveries (Email & Push)
    if channel == NotificationChannel.EMAIL or (db and pref.email_enabled):
        send_email_alert(user_id, title, message, db)

    if channel == NotificationChannel.PUSH or (db and pref.push_enabled):
        send_push_alert(user_id, title, message)

    return notif


def send_email_alert(user_id: str, title: str, message: str, db: Optional[Session] = None):
    """Sends email alert via SMTP / Brevo or logs fallback."""
    user_email = "user@example.com"
    if db:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user_email = user.email
    logger.info(f"[EMAIL ALERT] To: {user_email} | Subject: {title} | Body: {message}")


def send_push_alert(user_id: str, title: str, message: str):
    """Sends FCM mobile push notification or logs fallback."""
    logger.info(f"[PUSH ALERT] User: {user_id} | Title: {title} | Message: {message}")
