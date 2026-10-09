from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session
from jose import JWTError

from app.database import get_db
from app.models import Notification, AlertPreference, User, NotificationType, NotificationChannel
from app.deps import get_current_user, require_role
from app.security import decode_access_token
from app.schemas import (
    NotificationResponse,
    UnreadCountResponse,
    AlertPreferenceRequest,
    AlertPreferenceResponse,
    TriggerNotificationRequest,
)
from app.websocket_manager import manager
from app.services.notification_dispatcher import (
    dispatch_notification,
    get_or_create_alert_preference,
)

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationResponse], summary="List user notifications")
def list_notifications(
    unread_only: bool = Query(False, description="Filter only unread notifications"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        query = query.filter(Notification.is_read == False)
    notifications = query.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()
    return notifications


@router.get("/unread-count", response_model=UnreadCountResponse, summary="Get unread notification count")
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).count()
    return UnreadCountResponse(unread_count=count)


@router.patch("/{notification_id}/read", response_model=NotificationResponse, summary="Mark notification as read")
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.post("/mark-all-read", summary="Mark all notifications as read")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


@router.get("/preferences", response_model=AlertPreferenceResponse, summary="Get alert preferences")
def get_alert_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pref = get_or_create_alert_preference(current_user.id, db)
    return pref


@router.put("/preferences", response_model=AlertPreferenceResponse, summary="Update alert preferences")
def update_alert_preferences(
    payload: AlertPreferenceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pref = get_or_create_alert_preference(current_user.id, db)
    if payload.instant_job is not None:
        pref.instant_job = payload.instant_job
    if payload.startup_hiring is not None:
        pref.startup_hiring = payload.startup_hiring
    if payload.high_match is not None:
        pref.high_match = payload.high_match
    if payload.low_competition is not None:
        pref.low_competition = payload.low_competition
    if payload.email_enabled is not None:
        pref.email_enabled = payload.email_enabled
    if payload.push_enabled is not None:
        pref.push_enabled = payload.push_enabled
    if payload.in_app_enabled is not None:
        pref.in_app_enabled = payload.in_app_enabled
    if payload.match_threshold is not None:
        pref.match_threshold = payload.match_threshold
    if payload.quiet_hours_start is not None:
        pref.quiet_hours_start = payload.quiet_hours_start
    if payload.quiet_hours_end is not None:
        pref.quiet_hours_end = payload.quiet_hours_end

    db.commit()
    db.refresh(pref)
    return pref


@router.post("/trigger", response_model=NotificationResponse, summary="Trigger a notification alert")
async def trigger_notification(
    payload: TriggerNotificationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Only Admin or internal triggers can target other users; regular users target themselves
    target_user_id = payload.user_id
    if target_user_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Cannot trigger notifications for other users")

    notif = await dispatch_notification(
        user_id=target_user_id,
        title=payload.title,
        message=payload.message,
        notification_type=payload.type,
        channel=payload.channel,
        metadata=payload.metadata,
        db=db,
    )
    return notif


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    WebSocket endpoint for real-time notifications.
    Accepts token via query param `?token=...`.
    """
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(user_id, websocket)
    try:
        # Send initial unread count on connect
        unread_count = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False,
        ).count()
        await websocket.send_json({
            "event": "connected",
            "user_id": user_id,
            "unread_count": unread_count,
        })
        while True:
            # Keep connection alive and listen for ping/messages
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
    except Exception:
        manager.disconnect(user_id, websocket)
