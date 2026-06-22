from abc import ABC, abstractmethod
from calendar import monthcalendar
from datetime import UTC, date, datetime, timedelta

from app.i18n import t as i18n_t

MONTH_NAMES_RU = {
    1: "Январь", 2: "Февраль", 3: "Март", 4: "Апрель",
    5: "Май", 6: "Июнь", 7: "Июль", 8: "Август",
    9: "Сентябрь", 10: "Октябрь", 11: "Ноябрь", 12: "Декабрь",
}

MONTH_NAMES_EN = {
    1: "January", 2: "February", 3: "March", 4: "April",
    5: "May", 6: "June", 7: "July", 8: "August",
    9: "September", 10: "October", 11: "November", 12: "December",
}


class BaseCommandService(ABC):
    """Base class with shared command logic for all platforms"""

    def __init__(self):
        self._pending_adds: dict[str, dict] = {}
        self._pending_add_timeout = timedelta(minutes=5)

    @abstractmethod
    async def handle_command(self, command: str, args: str, user_id: str):
        """Handle a slash command"""
        ...

    @abstractmethod
    async def handle_callback(self, callback_data: str, user_id: str):
        """Handle a callback from inline button"""
        ...

    @abstractmethod
    async def handle_text(self, text: str, user_id: str):
        """Handle plain text message"""
        ...

    def cleanup_expired_states(self):
        """Remove expired add-task states"""
        now = datetime.now(UTC)
        expired = [
            k for k, v in self._pending_adds.items()
            if now - v.get("created_at", now) > self._pending_add_timeout
        ]
        for k in expired:
            del self._pending_adds[k]

    def clear_user_state(self, user_id: str):
        """Clear pending state for a user"""
        self._pending_adds.pop(user_id, None)

    @staticmethod
    def month_name(month: int, lang: str) -> str:
        names = MONTH_NAMES_RU if lang == "ru" else MONTH_NAMES_EN
        return names.get(month, str(month))

    def build_calendar_keyboard(
        self, year: int, month: int, prefix: str, lang: str = "ru"
    ) -> list[list[dict]]:
        """Build calendar keyboard as list of rows"""
        weeks = monthcalendar(year, month)
        month_name = self.month_name(month, lang)

        buttons = []

        # Navigation header
        buttons.append([
            {"text": "◀️", "callback_data": f"{prefix}_nav:{year}:{month - 1}"},
            {"text": f"{month_name} {year}", "callback_data": "ignore"},
            {"text": "▶️", "callback_data": f"{prefix}_nav:{year}:{month + 1}"},
        ])

        # Day names
        day_names = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] if lang == "ru" \
            else ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
        buttons.append([{"text": d, "callback_data": "ignore"} for d in day_names])

        # Calendar days
        today = date.today()
        for week in weeks:
            row = []
            for day in week:
                if day == 0:
                    row.append({"text": " ", "callback_data": "ignore"})
                else:
                    cell_date = date(year, month, day)
                    text = f"·{day}·" if cell_date == today else str(day)
                    row.append({
                        "text": text,
                        "callback_data": f"{prefix}:{year}:{month}:{day}",
                    })
            buttons.append(row)

        # Add task specific buttons
        if prefix == "addcal":
            buttons.append([{"text": i18n_t("telegramAddNoDate", lang), "callback_data": f"{prefix}:nodate"}])
            buttons.append([{"text": i18n_t("telegramAddCancel", lang), "callback_data": "addcancel"}])

        return buttons
