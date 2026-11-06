from datetime import datetime, date, time
import pytz

IST = pytz.timezone("Asia/Kolkata")

LATE_THRESHOLD_TIME = time(10, 30, 0)      # 10:30 AM IST
STANDARD_OUT_TIME = time(17, 30, 0)        # 05:30 PM IST

def get_ist_now() -> datetime:
    """Return the current localized datetime in Asia/Kolkata."""
    return datetime.now(IST)

def get_ist_today() -> date:
    """Return today's date in Asia/Kolkata."""
    return get_ist_now().date()

def is_late_arrival(dt: datetime) -> bool:
    """Returns True if the check-in time is strictly after 10:30 AM IST."""
    if dt.tzinfo is None:
        dt = pytz.utc.localize(dt).astimezone(IST)
    else:
        dt = dt.astimezone(IST)
    return dt.time() > LATE_THRESHOLD_TIME

def is_early_departure(dt: datetime) -> bool:
    """Returns True if the check-out time is strictly before 5:30 PM IST."""
    if dt.tzinfo is None:
        dt = pytz.utc.localize(dt).astimezone(IST)
    else:
        dt = dt.astimezone(IST)
    return dt.time() < STANDARD_OUT_TIME

def calculate_working_hours(in_time: datetime, out_time: datetime) -> float:
    """Calculate working hours between in_time and out_time."""
    if not in_time or not out_time:
        return 0.0
    # Handle mixed offset-naive / offset-aware (e.g. SQLite storage)
    if in_time.tzinfo is None and out_time.tzinfo is not None:
        in_time = IST.localize(in_time)
    elif in_time.tzinfo is not None and out_time.tzinfo is None:
        out_time = IST.localize(out_time)
    elif in_time.tzinfo is not None and out_time.tzinfo is not None:
        in_time = in_time.astimezone(IST)
        out_time = out_time.astimezone(IST)
    diff = out_time - in_time
    total_seconds = diff.total_seconds()
    if total_seconds < 0:
        return 0.0
    return round(total_seconds / 3600.0, 2)
