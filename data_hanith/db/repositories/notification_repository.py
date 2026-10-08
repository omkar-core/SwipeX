"""
Notification & Alert Preferences Repository for Job & Data Intelligence Service.
Handles Logical Notifications, Multi-Channel Outbound Deliveries, and Alert Preferences.
"""
import uuid
import json
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Union

from db.connection import get_dict_cursor
from db.cache import get_cache_service

logger = logging.getLogger("swipex_notifications")


class NotificationRepository:
    def __init__(self, conn, db_type: str):
        self.conn = conn
        self.db_type = db_type
        self.cache_service = get_cache_service()

    # -------------------------------------------------------------------------
    # ALERT PREFERENCES MANAGEMENT
    # -------------------------------------------------------------------------
    def get_alert_preferences(self, user_id: str) -> Dict[str, Any]:
        """
        Retrieves user alert preferences or returns default preferences if not yet configured.
        """
        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        sql = f"SELECT * FROM alert_preferences WHERE user_id = {param_placeholder}"
        cursor.execute(sql, (str(user_id),))
        row = cursor.fetchone()

        if row:
            r = dict(row)
            return {
                "id": str(r["id"]),
                "user_id": str(r["user_id"]),
                "instant_job": bool(r["instant_job"]),
                "startup_hiring": bool(r["startup_hiring"]),
                "high_match": bool(r["high_match"]),
                "low_competition": bool(r["low_competition"]),
                "channel_in_app": bool(r["channel_in_app"]),
                "channel_email": bool(r["channel_email"]),
                "channel_push": bool(r["channel_push"]),
                "match_threshold": float(r["match_threshold"]),
                "quiet_hours_enabled": bool(r["quiet_hours_enabled"]),
                "quiet_hours_start": str(r["quiet_hours_start"]) if r.get("quiet_hours_start") else None,
                "quiet_hours_end": str(r["quiet_hours_end"]) if r.get("quiet_hours_end") else None,
                "created_at": str(r["created_at"]),
                "updated_at": str(r["updated_at"])
            }

        # Return default alert preferences contract
        return {
            "id": None,
            "user_id": str(user_id),
            "instant_job": True,
            "startup_hiring": True,
            "high_match": True,
            "low_competition": True,
            "channel_in_app": True,
            "channel_email": True,
            "channel_push": False,
            "match_threshold": 70.0,
            "quiet_hours_enabled": False,
            "quiet_hours_start": None,
            "quiet_hours_end": None,
            "created_at": None,
            "updated_at": None
        }

    def upsert_alert_preferences(
        self,
        user_id: str,
        instant_job: bool = True,
        startup_hiring: bool = True,
        high_match: bool = True,
        low_competition: bool = True,
        channel_in_app: bool = True,
        channel_email: bool = True,
        channel_push: bool = False,
        match_threshold: float = 70.0,
        quiet_hours_enabled: bool = False,
        quiet_hours_start: Optional[str] = None,
        quiet_hours_end: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates or updates user alert preferences.
        """
        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"
        now_str = datetime.now(timezone.utc).isoformat()

        # Check existing
        sql_check = f"SELECT id FROM alert_preferences WHERE user_id = {param_placeholder}"
        cursor.execute(sql_check, (str(user_id),))
        row = cursor.fetchone()

        if row:
            pref_id = dict(row)["id"]
            if self.db_type == "postgres":
                sql_upd = f"""
                    UPDATE alert_preferences
                    SET instant_job = %s, startup_hiring = %s, high_match = %s, low_competition = %s,
                        channel_in_app = %s, channel_email = %s, channel_push = %s,
                        match_threshold = %s, quiet_hours_enabled = %s, quiet_hours_start = %s, quiet_hours_end = %s,
                        updated_at = %s
                    WHERE user_id = %s
                """
                cursor.execute(sql_upd, (instant_job, startup_hiring, high_match, low_competition,
                                         channel_in_app, channel_email, channel_push,
                                         match_threshold, quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
                                         now_str, str(user_id)))
            else:
                sql_upd = f"""
                    UPDATE alert_preferences
                    SET instant_job = ?, startup_hiring = ?, high_match = ?, low_competition = ?,
                        channel_in_app = ?, channel_email = ?, channel_push = ?,
                        match_threshold = ?, quiet_hours_enabled = ?, quiet_hours_start = ?, quiet_hours_end = ?,
                        updated_at = ?
                    WHERE user_id = ?
                """
                cursor.execute(sql_upd, (1 if instant_job else 0, 1 if startup_hiring else 0, 1 if high_match else 0, 1 if low_competition else 0,
                                         1 if channel_in_app else 0, 1 if channel_email else 0, 1 if channel_push else 0,
                                         match_threshold, 1 if quiet_hours_enabled else 0, quiet_hours_start, quiet_hours_end,
                                         now_str, str(user_id)))
        else:
            pref_id = str(uuid.uuid4())
            if self.db_type == "postgres":
                sql_ins = f"""
                    INSERT INTO alert_preferences (id, user_id, instant_job, startup_hiring, high_match, low_competition,
                                                   channel_in_app, channel_email, channel_push, match_threshold,
                                                   quiet_hours_enabled, quiet_hours_start, quiet_hours_end, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(sql_ins, (pref_id, str(user_id), instant_job, startup_hiring, high_match, low_competition,
                                         channel_in_app, channel_email, channel_push, match_threshold,
                                         quiet_hours_enabled, quiet_hours_start, quiet_hours_end, now_str, now_str))
            else:
                sql_ins = f"""
                    INSERT INTO alert_preferences (id, user_id, instant_job, startup_hiring, high_match, low_competition,
                                                   channel_in_app, channel_email, channel_push, match_threshold,
                                                   quiet_hours_enabled, quiet_hours_start, quiet_hours_end, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """
                cursor.execute(sql_ins, (pref_id, str(user_id), 1 if instant_job else 0, 1 if startup_hiring else 0, 1 if high_match else 0, 1 if low_competition else 0,
                                         1 if channel_in_app else 0, 1 if channel_email else 0, 1 if channel_push else 0, match_threshold,
                                         1 if quiet_hours_enabled else 0, quiet_hours_start, quiet_hours_end, now_str, now_str))

        self.conn.commit()
        return self.get_alert_preferences(user_id)

    # -------------------------------------------------------------------------
    # NOTIFICATION MANAGEMENT
    # -------------------------------------------------------------------------
    def create_notification(
        self,
        user_id: str,
        notification_type: str,
        title: str,
        message: str,
        payload: Optional[Dict[str, Any]] = None,
        related_job_id: Optional[str] = None,
        related_application_id: Optional[str] = None,
        target_channels: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Creates a logical notification and dispatches channel records into notification_deliveries based on alert preferences.
        """
        valid_types = {'INSTANT_JOB', 'STARTUP_HIRING', 'HIGH_MATCH', 'LOW_COMPETITION', 'APPLICATION_STATUS_CHANGE', 'SYSTEM'}
        clean_type = notification_type.upper().strip()
        if clean_type not in valid_types:
            raise ValueError(f"Invalid notification_type: '{notification_type}'. Allowed: {valid_types}")

        prefs = self.get_alert_preferences(user_id)

        # Determine channels to dispatch
        channels = []
        if target_channels:
            channels = [c.upper().strip() for c in target_channels if c.upper().strip() in ('IN_APP', 'EMAIL', 'PUSH')]
        else:
            if prefs["channel_in_app"]:
                channels.append("IN_APP")
            if prefs["channel_email"]:
                channels.append("EMAIL")
            if prefs["channel_push"]:
                channels.append("PUSH")

        if not channels:
            channels = ["IN_APP"]

        cursor = get_dict_cursor(self.conn, self.db_type)
        notif_id = str(uuid.uuid4())
        now_str = datetime.now(timezone.utc).isoformat()
        payload_str = json.dumps(payload) if payload else None

        # Insert logical notification
        if self.db_type == "postgres":
            sql_notif = f"""
                INSERT INTO notifications (id, user_id, notification_type, title, message, payload, related_job_id, related_application_id, is_read, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, FALSE, %s)
            """
            cursor.execute(sql_notif, (notif_id, str(user_id), clean_type, title, message, payload_str,
                                       str(related_job_id) if related_job_id else None,
                                       str(related_application_id) if related_application_id else None,
                                       now_str))
        else:
            sql_notif = f"""
                INSERT INTO notifications (id, user_id, notification_type, title, message, payload, related_job_id, related_application_id, is_read, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
            """
            cursor.execute(sql_notif, (notif_id, str(user_id), clean_type, title, message, payload_str,
                                       str(related_job_id) if related_job_id else None,
                                       str(related_application_id) if related_application_id else None,
                                       now_str))

        # Insert channel delivery records
        deliveries = []
        for ch in channels:
            deliv_id = str(uuid.uuid4())
            if self.db_type == "postgres":
                sql_deliv = f"""
                    INSERT INTO notification_deliveries (id, notification_id, channel, status, created_at)
                    VALUES (%s, %s, %s, 'PENDING', %s)
                """
                cursor.execute(sql_deliv, (deliv_id, notif_id, ch, now_str))
            else:
                sql_deliv = f"""
                    INSERT INTO notification_deliveries (id, notification_id, channel, status, created_at)
                    VALUES (?, ?, ?, 'PENDING', ?)
                """
                cursor.execute(sql_deliv, (deliv_id, notif_id, ch, now_str))
            deliveries.append({"id": deliv_id, "channel": ch, "status": "PENDING"})

        self.conn.commit()

        # Invalidate unread count cache
        try:
            cli = self.cache_service.client
            if cli:
                cli.delete(f"notifications:unread:{user_id}")
        except Exception:
            pass

        return {
            "id": notif_id,
            "user_id": str(user_id),
            "notification_type": clean_type,
            "title": title,
            "message": message,
            "payload": payload,
            "related_job_id": str(related_job_id) if related_job_id else None,
            "related_application_id": str(related_application_id) if related_application_id else None,
            "is_read": False,
            "created_at": now_str,
            "deliveries": deliveries
        }

    def get_user_notifications(self, user_id: str, unread_only: bool = False, limit: int = 50) -> List[Dict[str, Any]]:
        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        where_clauses = [f"user_id = {param_placeholder}"]
        params = [str(user_id)]

        if unread_only:
            if self.db_type == "postgres":
                where_clauses.append("is_read = FALSE")
            else:
                where_clauses.append("is_read = 0")

        where_sql = " WHERE " + " AND ".join(where_clauses)
        sql = f"""
            SELECT id, user_id, notification_type, title, message, payload, related_job_id, related_application_id, is_read, created_at, read_at
            FROM notifications
            {where_sql}
            ORDER BY created_at DESC
            LIMIT {param_placeholder}
        """
        params.append(limit)

        cursor.execute(sql, tuple(params))
        rows = cursor.fetchall()

        result = []
        for r_row in rows:
            r = dict(r_row)
            p_val = r["payload"]
            parsed_payload = json.loads(p_val) if p_val and isinstance(p_val, str) else p_val
            result.append({
                "id": str(r["id"]),
                "user_id": str(r["user_id"]),
                "notification_type": r["notification_type"],
                "title": r["title"],
                "message": r["message"],
                "payload": parsed_payload,
                "related_job_id": str(r["related_job_id"]) if r.get("related_job_id") else None,
                "related_application_id": str(r["related_application_id"]) if r.get("related_application_id") else None,
                "is_read": bool(r["is_read"]),
                "created_at": str(r["created_at"]),
                "read_at": str(r["read_at"]) if r.get("read_at") else None
            })
        return result

    def get_unread_count(self, user_id: str) -> int:
        """
        Returns count of unread notifications, cached in Redis (TTL: 120s) with SQL fallback.
        """
        cache_key = f"notifications:unread:{user_id}"
        try:
            cli = self.cache_service.client
            if cli and cli.exists(cache_key):
                val = cli.get(cache_key)
                if val is not None:
                    return int(val)
        except Exception:
            pass

        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"

        if self.db_type == "postgres":
            sql = f"SELECT COUNT(*) FROM notifications WHERE user_id = {param_placeholder} AND is_read = FALSE"
        else:
            sql = f"SELECT COUNT(*) FROM notifications WHERE user_id = {param_placeholder} AND is_read = 0"

        cursor.execute(sql, (str(user_id),))
        count = cursor.fetchone()[0]

        try:
            cli = self.cache_service.client
            if cli:
                cli.setex(cache_key, 120, count)
        except Exception:
            pass

        return int(count)

    def mark_notification_as_read(self, notification_id: str, user_id: str) -> bool:
        cursor = get_dict_cursor(self.conn, self.db_type)
        param_placeholder = "%s" if self.db_type == "postgres" else "?"
        now_str = datetime.now(timezone.utc).isoformat()

        if self.db_type == "postgres":
            sql = f"UPDATE notifications SET is_read = TRUE, read_at = %s WHERE id = %s AND user_id = %s"
            cursor.execute(sql, (now_str, str(notification_id), str(user_id)))
        else:
            sql = f"UPDATE notifications SET is_read = 1, read_at = ? WHERE id = ? AND user_id = ?"
            cursor.execute(sql, (now_str, str(notification_id), str(user_id)))

        self.conn.commit()

        try:
            cli = self.cache_service.client
            if cli:
                cli.delete(f"notifications:unread:{user_id}")
        except Exception:
            pass

        return cursor.rowcount > 0
