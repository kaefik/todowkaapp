import re
from dataclasses import dataclass, field
from datetime import date, time, timedelta

_WEEKDAYS_RU = {
    "понедельник": 0,
    "вторник": 1,
    "среду": 2,
    "четверг": 3,
    "пятницу": 4,
    "субботу": 5,
    "воскресенье": 6,
}

_WEEKDAYS_EN = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6,
}

_MONTHS_RU = {
    "января": 1, "февраля": 2, "марта": 3, "апреля": 4,
    "мая": 5, "июня": 6, "июля": 7, "августа": 8,
    "сентября": 9, "октября": 10, "ноября": 11, "декабря": 12,
}

_MONTHS_EN = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
}

_MONTHS_EN_SHORT = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4,
    "jun": 6, "jul": 7, "aug": 8, "sep": 9,
    "oct": 10, "nov": 11, "dec": 12,
}

_RE_TAG = re.compile(r"#([\wа-яА-ЯёЁ]+)")
_RE_TIME = re.compile(r"\b(?:в\s+)?(\d{1,2}:\d{2})\b", re.IGNORECASE)
_RE_TIME_RU = re.compile(r"\bв\s+(\d{1,2})\s+час(?:ов|а)?\b", re.IGNORECASE)
_RE_TIME_PERIOD = re.compile(
    r"\b(?:в\s+)?(\d{1,2})(?::(\d{2}))?\s*(утра|вечера|дня|ночи)\b",
    re.IGNORECASE,
)
_RE_TIME_EN = re.compile(r"\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b", re.IGNORECASE)

_RE_TODAY = re.compile(r"\b(?:сегодня|today)\b", re.IGNORECASE)
_RE_TOMORROW = re.compile(r"\b(?:завтра|tomorrow)\b", re.IGNORECASE)

_RE_WEEKDAY_RU = re.compile(
    r"\bв\s+(понедельник|вторник|среду|четверг|пятницу|субботу|воскресенье)\b",
    re.IGNORECASE,
)
_RE_WEEKDAY_EN = re.compile(
    r"\b(?:on\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
    re.IGNORECASE,
)

_RE_DATE_MONTH_RU = re.compile(
    r"\b(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\b",
    re.IGNORECASE,
)
_RE_DATE_MONTH_EN = re.compile(
    r"\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})\b",
    re.IGNORECASE,
)

_RE_RELATIVE_RU = re.compile(
    r"\bчерез\s+(\d+)\s+(день|дня|дней|неделю|недели|недель)\b",
    re.IGNORECASE,
)
_RE_RELATIVE_EN = re.compile(
    r"\bin\s+(\d+)\s+(day|days|week|weeks)\b",
    re.IGNORECASE,
)

_RE_NEXT_WEEK_RU = re.compile(r"\bна\s+следующей\s+неделе\b", re.IGNORECASE)
_RE_NEXT_WEEK_EN = re.compile(r"\bnext\s+week\b", re.IGNORECASE)


@dataclass
class ParsedTask:
    title: str
    due_date: date | None = None
    due_time: time | None = None
    tags: list[str] = field(default_factory=list)


def _next_weekday(today: date, target: int) -> date:
    days_ahead = target - today.weekday()
    if days_ahead <= 0:
        days_ahead += 7
    return today + timedelta(days=days_ahead)


def _parse_time(text: str) -> tuple[time | None, re.Pattern | None, re.Match | None]:
    m = _RE_TIME_PERIOD.search(text)
    if m:
        hour = int(m.group(1))
        minute = int(m.group(2)) if m.group(2) else 0
        period = m.group(3).lower()
        if period in ("вечера", "дня") and hour < 12:
            hour += 12
        if period in ("ночи",) and hour == 12:
            hour = 0
        if 0 <= hour <= 23 and 0 <= minute <= 59:
            return time(hour, minute), _RE_TIME_PERIOD, m

    m = _RE_TIME_RU.search(text)
    if m:
        hour = int(m.group(1))
        if 0 <= hour <= 23:
            return time(hour, 0), _RE_TIME_RU, m

    m = _RE_TIME_EN.search(text)
    if m:
        hour = int(m.group(1))
        minute = int(m.group(2)) if m.group(2) else 0
        period = m.group(3).lower()
        if period == "pm" and hour < 12:
            hour += 12
        if period == "am" and hour == 12:
            hour = 0
        if 0 <= hour <= 23 and 0 <= minute <= 59:
            return time(hour, minute), _RE_TIME_EN, m

    m = _RE_TIME.search(text)
    if m:
        parts = m.group(1).split(":")
        hour = int(parts[0])
        minute = int(parts[1])
        if 0 <= hour <= 23 and 0 <= minute <= 59:
            return time(hour, minute), _RE_TIME, m

    return None, None, None


def parse(text: str, locale: str = "ru", today: date | None = None) -> ParsedTask:
    result = ParsedTask(title=text)
    remaining = text
    parsed_any = False

    tags = _RE_TAG.findall(remaining)
    if tags:
        result.tags = tags
        remaining = _RE_TAG.sub("", remaining)
        parsed_any = True

    due_time, time_re, time_match = _parse_time(remaining)
    if due_time:
        result.due_time = due_time
        remaining = remaining[: time_match.start()] + remaining[time_match.end() :]
        parsed_any = True

    if today is None:
        today = date.today()

    m = _RE_TODAY.search(remaining)
    if m:
        result.due_date = today
        remaining = remaining[: m.start()] + remaining[m.end() :]
        parsed_any = True
    else:
        m = _RE_TOMORROW.search(remaining)
        if m:
            result.due_date = today + timedelta(days=1)
            remaining = remaining[: m.start()] + remaining[m.end() :]
            parsed_any = True

    if result.due_date is None:
        m = _RE_DATE_MONTH_RU.search(remaining)
        if m:
            day = int(m.group(1))
            month = _MONTHS_RU.get(m.group(2).lower())
            if month:
                year = today.year
                try:
                    candidate = date(year, month, day)
                    if candidate < today:
                        candidate = date(year + 1, month, day)
                    result.due_date = candidate
                except ValueError:
                    pass
                remaining = remaining[: m.start()] + remaining[m.end() :]
                parsed_any = True

    if result.due_date is None:
        m = _RE_DATE_MONTH_EN.search(remaining)
        if m:
            month_name = m.group(1).lower()
            month = _MONTHS_EN.get(month_name) or _MONTHS_EN_SHORT.get(month_name)
            day = int(m.group(2))
            if month:
                year = today.year
                try:
                    candidate = date(year, month, day)
                    if candidate < today:
                        candidate = date(year + 1, month, day)
                    result.due_date = candidate
                except ValueError:
                    pass
                remaining = remaining[: m.start()] + remaining[m.end() :]
                parsed_any = True

    if result.due_date is None:
        m = _RE_WEEKDAY_RU.search(remaining)
        if m:
            target = _WEEKDAYS_RU.get(m.group(1).lower())
            if target is not None:
                result.due_date = _next_weekday(today, target)
            remaining = remaining[: m.start()] + remaining[m.end() :]
            parsed_any = True

    if result.due_date is None:
        m = _RE_WEEKDAY_EN.search(remaining)
        if m:
            target = _WEEKDAYS_EN.get(m.group(1).lower())
            if target is not None:
                result.due_date = _next_weekday(today, target)
            remaining = remaining[: m.start()] + remaining[m.end() :]
            parsed_any = True

    if result.due_date is None:
        m = _RE_RELATIVE_RU.search(remaining)
        if m:
            n = int(m.group(1))
            unit = m.group(2)
            if unit.startswith("недел"):
                result.due_date = today + timedelta(weeks=n)
            else:
                result.due_date = today + timedelta(days=n)
            remaining = remaining[: m.start()] + remaining[m.end() :]
            parsed_any = True

    if result.due_date is None:
        m = _RE_RELATIVE_EN.search(remaining)
        if m:
            n = int(m.group(1))
            unit = m.group(2)
            if unit.startswith("week"):
                result.due_date = today + timedelta(weeks=n)
            else:
                result.due_date = today + timedelta(days=n)
            remaining = remaining[: m.start()] + remaining[m.end() :]
            parsed_any = True

    if result.due_date is None:
        if _RE_NEXT_WEEK_RU.search(remaining):
            days_ahead = 7 - today.weekday()
            if days_ahead == 0:
                days_ahead = 7
            result.due_date = today + timedelta(days=days_ahead)
            remaining = _RE_NEXT_WEEK_RU.sub("", remaining)
            parsed_any = True
        elif _RE_NEXT_WEEK_EN.search(remaining):
            days_ahead = 7 - today.weekday()
            if days_ahead == 0:
                days_ahead = 7
            result.due_date = today + timedelta(days=days_ahead)
            remaining = _RE_NEXT_WEEK_EN.sub("", remaining)
            parsed_any = True

    cleaned = " ".join(remaining.split()).strip()
    result.title = cleaned if cleaned else text

    if not parsed_any:
        result.title = text
        result.due_date = None
        result.due_time = None
        result.tags = []

    return result
