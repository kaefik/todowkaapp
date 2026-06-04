import pytest
from datetime import UTC, date, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from zoneinfo import ZoneInfo

from app.services.telegram_command_service import (
    MAX_OVERDUE_DISPLAY,
    MAX_SEARCH_DISPLAY,
    MAX_TASKS_DISPLAY,
    TelegramCommandService,
    _pending_adds,
)


@pytest.fixture
def cmd_service():
    return TelegramCommandService()


@pytest.fixture(autouse=True)
def clear_pending():
    _pending_adds.clear()
    yield
    _pending_adds.clear()


@pytest.fixture
def mock_user():
    user = MagicMock()
    user.id = "test-user-id"
    user.telegram_chat_id = "12345"
    user.telegram_bot_token = "encrypted"
    user.decrypted_telegram_bot_token = "123456:ABC"
    user.timezone = "Europe/Moscow"
    user.language = "ru"
    return user


def _make_task(task_id="t1", title="Task", due_date=None, is_completed=False):
    task = MagicMock()
    task.id = task_id
    task.title = title
    task.due_date = due_date
    task.is_completed = is_completed
    return task


class TestCalendarKeyboard:
    def test_navigation_prev_next(self, cmd_service):
        kb = cmd_service._build_calendar_keyboard(2026, 6, "cal")
        nav = kb["inline_keyboard"][0]
        assert nav[0]["callback_data"] == "cal_nav:2026:5"
        assert nav[2]["callback_data"] == "cal_nav:2026:7"

    def test_add_prefix_has_nodate_button(self, cmd_service):
        kb = cmd_service._build_calendar_keyboard(2026, 6, "addcal")
        all_callbacks = [
            btn["callback_data"]
            for row in kb["inline_keyboard"]
            for btn in row
        ]
        assert "addcal:nodate" in all_callbacks

    def test_cal_prefix_no_nodate_button(self, cmd_service):
        kb = cmd_service._build_calendar_keyboard(2026, 6, "cal")
        for row in kb["inline_keyboard"]:
            for btn in row:
                assert "nodate" not in btn["callback_data"]

    def test_day_buttons_have_correct_callback(self, cmd_service):
        kb = cmd_service._build_calendar_keyboard(2026, 6, "cal")
        found = False
        for row in kb["inline_keyboard"][2:]:
            for btn in row:
                if btn["callback_data"].startswith("cal:2026:6:"):
                    found = True
        assert found

    def test_month_wrap_backward(self, cmd_service):
        kb = cmd_service._build_calendar_keyboard(2026, 1, "cal")
        assert kb["inline_keyboard"][0][0]["callback_data"] == "cal_nav:2026:0"

    def test_month_wrap_forward(self, cmd_service):
        kb = cmd_service._build_calendar_keyboard(2026, 12, "cal")
        assert kb["inline_keyboard"][0][2]["callback_data"] == "cal_nav:2026:13"

    def test_today_marked_with_dots(self, cmd_service):
        today = date.today()
        kb = cmd_service._build_calendar_keyboard(today.year, today.month, "cal")
        for row in kb["inline_keyboard"][2:]:
            for btn in row:
                if btn["callback_data"].endswith(f":{today.day}"):
                    assert btn["text"].startswith("·")
                    assert btn["text"].endswith("·")
                    return
        pytest.skip("Today not in calendar range")


class TestFormatTaskList:
    def test_empty_returns_no_tasks_text(self, cmd_service):
        text, markup = cmd_service._format_task_list(
            [], "Title", ZoneInfo("Europe/Moscow"), "ru"
        )
        assert "Нет задач" in text
        assert markup is None

    def test_task_with_due_date(self, cmd_service):
        task = _make_task(due_date=datetime(2026, 6, 15, tzinfo=ZoneInfo("Europe/Moscow")))
        text, markup = cmd_service._format_task_list(
            [task], "Title", ZoneInfo("Europe/Moscow"), "ru"
        )
        assert "15.06" in text
        assert markup is not None

    def test_completed_task_no_button(self, cmd_service):
        task = _make_task(is_completed=True)
        text, markup = cmd_service._format_task_list(
            [task], "Title", ZoneInfo("Europe/Moscow"), "ru"
        )
        assert markup is None

    def test_max_tasks_limit(self, cmd_service):
        tasks = [_make_task(task_id=f"t{i}", title=f"Task {i}") for i in range(30)]
        text, markup = cmd_service._format_task_list(
            tasks, "Title", ZoneInfo("Europe/Moscow"), "ru"
        )
        assert len(markup["inline_keyboard"]) <= MAX_TASKS_DISPLAY

    def test_text_truncated_at_3800(self, cmd_service):
        tasks = [_make_task(task_id=f"t{i}", title="A" * 200) for i in range(30)]
        text, _ = cmd_service._format_task_list(
            tasks, "Title", ZoneInfo("Europe/Moscow"), "ru"
        )
        assert len(text) <= 4096

    def test_overdue_shown_separately(self, cmd_service):
        yesterday = datetime(2020, 1, 1, tzinfo=ZoneInfo("Europe/Moscow"))
        overdue = _make_task(task_id="od1", title="Old", due_date=yesterday)
        today_task = _make_task(task_id="td1", title="Today")
        text, markup = cmd_service._format_task_list(
            [overdue, today_task], "Title", ZoneInfo("UTC"), "ru"
        )
        assert "Просроченные" in text


class TestCleanupExpiredStates:
    def test_removes_expired(self, cmd_service):
        _pending_adds["old"] = {
            "step": "waiting_title",
            "selected_date": None,
            "created_at": datetime.now(UTC) - timedelta(minutes=10),
        }
        cmd_service._cleanup_expired_states()
        assert "old" not in _pending_adds

    def test_keeps_fresh(self, cmd_service):
        _pending_adds["fresh"] = {
            "step": "waiting_title",
            "selected_date": date(2026, 6, 15),
            "created_at": datetime.now(UTC),
        }
        cmd_service._cleanup_expired_states()
        assert "fresh" in _pending_adds


class TestHandleCommand:
    @pytest.mark.asyncio
    async def test_help_sends_message(self, cmd_service, mock_user):
        with patch(
            "app.services.telegram_command_service.TelegramNotifierService"
        ) as mock_ns:
            mock_ns.send_message = AsyncMock()
            await cmd_service.handle_command(mock_user, "/help", AsyncMock())
            mock_ns.send_message.assert_called_once()
            call_text = mock_ns.send_message.call_args[0][2]
            assert "/today" in call_text

    @pytest.mark.asyncio
    async def test_command_clears_pending_state(self, cmd_service, mock_user):
        _pending_adds[mock_user.telegram_chat_id] = {
            "step": "waiting_title",
            "selected_date": date(2026, 6, 15),
            "created_at": datetime.now(UTC),
        }
        with patch(
            "app.services.telegram_command_service.TelegramNotifierService"
        ) as mock_ns:
            mock_ns.send_message = AsyncMock()
            await cmd_service.handle_command(mock_user, "/help", AsyncMock())
        assert mock_user.telegram_chat_id not in _pending_adds

    @pytest.mark.asyncio
    async def test_add_sets_pending_state(self, cmd_service, mock_user):
        with patch(
            "app.services.telegram_command_service.TelegramNotifierService"
        ) as mock_ns:
            mock_ns.send_message_with_buttons = AsyncMock()
            await cmd_service.handle_command(mock_user, "/add", AsyncMock())
        state = _pending_adds.get(mock_user.telegram_chat_id)
        assert state is not None
        assert state["step"] == "calendar"


class TestHandleText:
    @pytest.mark.asyncio
    async def test_quick_add_creates_inbox_task(self, cmd_service, mock_user):
        with patch(
            "app.services.telegram_command_service.TaskService"
        ) as mock_ts_cls:
            mock_ts = AsyncMock()
            mock_ts.create_task = AsyncMock(return_value=MagicMock(id="new-task"))
            mock_ts_cls.return_value = mock_ts

            with patch(
                "app.services.telegram_command_service.TelegramNotifierService"
            ) as mock_ns:
                mock_ns.send_message = AsyncMock(return_value=None)
                with patch("app.event_bus.event_bus", create=True) as mock_eb:
                    mock_eb.publish = AsyncMock()
                    await cmd_service.handle_text(
                        mock_user, "Купить молоко", AsyncMock()
                    )

            mock_ts.create_task.assert_called_once()
            call_data = mock_ts.create_task.call_args[0][1]
            assert call_data.gtd_status.value == "inbox"
            assert call_data.due_date is None

    @pytest.mark.asyncio
    async def test_pending_add_with_date_creates_active_task(self, cmd_service, mock_user):
        _pending_adds[mock_user.telegram_chat_id] = {
            "step": "waiting_title",
            "selected_date": date(2026, 6, 15),
            "created_at": datetime.now(UTC),
        }
        mock_db = AsyncMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = []
        mock_result = MagicMock()
        mock_result.scalars.return_value = mock_scalars
        mock_db.execute = AsyncMock(return_value=mock_result)

        with patch(
            "app.services.telegram_command_service.TaskService"
        ) as mock_ts_cls:
            mock_ts = AsyncMock()
            mock_ts.create_task = AsyncMock(return_value=MagicMock(id="new-task"))
            mock_ts_cls.return_value = mock_ts

            with patch(
                "app.services.telegram_command_service.TelegramNotifierService"
            ) as mock_ns:
                mock_ns.send_message = AsyncMock(return_value=None)
                with patch("app.event_bus.event_bus", create=True) as mock_eb:
                    mock_eb.publish = AsyncMock()
                    await cmd_service.handle_text(
                        mock_user, "Купить молоко", mock_db
                    )

            mock_ts.create_task.assert_called_once()
            call_data = mock_ts.create_task.call_args[0][1]
            assert call_data.gtd_status.value == "active"
            assert call_data.due_date is not None


class TestHandleCallback:
    @pytest.mark.asyncio
    async def test_ignore_callback(self, cmd_service, mock_user):
        with patch(
            "app.services.telegram_command_service.TelegramNotifierService"
        ) as mock_ns:
            mock_ns.answer_callback_query = AsyncMock()
            await cmd_service.handle_callback(
                mock_user,
                {"id": "cq1", "data": "ignore", "message": {}},
                AsyncMock(),
            )
            mock_ns.answer_callback_query.assert_called_once()

    @pytest.mark.asyncio
    async def test_done_callback_calls_complete(self, cmd_service, mock_user):
        with patch.object(cmd_service, "_complete_task", new_callable=AsyncMock) as mock_complete:
            with patch(
                "app.services.telegram_command_service.TelegramNotifierService"
            ) as mock_ns:
                mock_ns.answer_callback_query = AsyncMock()
                await cmd_service.handle_callback(
                    mock_user,
                    {
                        "id": "cq1",
                        "data": "done:task-123",
                        "message": {
                            "message_id": 42,
                            "text": "Title",
                            "reply_markup": {
                                "inline_keyboard": [
                                    [{"text": "✓ Task", "callback_data": "done:task-123"}]
                                ]
                            },
                        },
                    },
                    AsyncMock(),
                )
            mock_complete.assert_called_once()
            assert mock_complete.call_args[0][1] == "task-123"
            kwargs = mock_complete.call_args[1]
            assert kwargs["chat_id"] == mock_user.telegram_chat_id
            assert kwargs["message_id"] == 42

    @pytest.mark.asyncio
    async def test_complete_task_edits_message(self, cmd_service, mock_user):
        with patch(
            "app.services.telegram_command_service.TaskService"
        ) as mock_ts_cls:
            mock_ts = AsyncMock()
            mock_task = MagicMock()
            mock_task.id = "task-123"
            mock_task.title = "Купить молоко"
            mock_task.is_completed = False
            mock_ts.get_task = AsyncMock(return_value=mock_task)
            mock_ts.move_task = AsyncMock()
            mock_ts_cls.return_value = mock_ts

            reply_markup = {
                "inline_keyboard": [
                    [{"text": "✓ Task A", "callback_data": "done:task-123"}],
                    [{"text": "✓ Task B", "callback_data": "done:task-456"}],
                ]
            }

            with patch(
                "app.services.telegram_command_service.TelegramNotifierService"
            ) as mock_ns:
                mock_ns.answer_callback_query = AsyncMock()
                mock_ns.edit_message_text = AsyncMock(return_value=True)
                with patch("app.event_bus.event_bus", create=True) as mock_eb:
                    mock_eb.publish = AsyncMock()
                    await cmd_service._complete_task(
                        mock_user, "task-123", "cq1", AsyncMock(), "ru",
                        chat_id="12345",
                        message_id=42,
                        message_text="Задачи на сегодня\n\n• Task A\n• Task B",
                        reply_markup=reply_markup,
                    )

                mock_ns.edit_message_text.assert_called_once()
                call_args = mock_ns.edit_message_text.call_args
                updated_text = call_args[0][3]
                assert "✅ «Купить молоко» выполнена" in updated_text

                updated_markup = call_args[0][4]
                assert len(updated_markup["inline_keyboard"]) == 1
                assert updated_markup["inline_keyboard"][0][0]["callback_data"] == "done:task-456"

    @pytest.mark.asyncio
    async def test_complete_task_removes_all_buttons_when_empty(self, cmd_service, mock_user):
        with patch(
            "app.services.telegram_command_service.TaskService"
        ) as mock_ts_cls:
            mock_ts = AsyncMock()
            mock_task = MagicMock()
            mock_task.id = "task-123"
            mock_task.title = "One Task"
            mock_task.is_completed = False
            mock_ts.get_task = AsyncMock(return_value=mock_task)
            mock_ts.move_task = AsyncMock()
            mock_ts_cls.return_value = mock_ts

            reply_markup = {
                "inline_keyboard": [
                    [{"text": "✓ One Task", "callback_data": "done:task-123"}],
                ]
            }

            with patch(
                "app.services.telegram_command_service.TelegramNotifierService"
            ) as mock_ns:
                mock_ns.answer_callback_query = AsyncMock()
                mock_ns.edit_message_text = AsyncMock(return_value=True)
                with patch("app.event_bus.event_bus", create=True) as mock_eb:
                    mock_eb.publish = AsyncMock()
                    await cmd_service._complete_task(
                        mock_user, "task-123", "cq1", AsyncMock(), "ru",
                        chat_id="12345",
                        message_id=42,
                        message_text="Title\n\n• One Task",
                        reply_markup=reply_markup,
                    )

                mock_ns.edit_message_text.assert_called_once()
                call_args = mock_ns.edit_message_text.call_args
                assert call_args[0][4] is None


class TestSearch:
    def test_format_search_results_empty(self, cmd_service):
        text, markup = cmd_service._format_search_results(
            [], "отчёт", ZoneInfo("Europe/Moscow"), "ru"
        )
        assert "Ничего не найдено" in text
        assert markup is None

    def test_format_search_results_with_tasks(self, cmd_service):
        task = _make_task(task_id="s1", title="Отчёт за неделю")
        task.gtd_status = "active"
        text, markup = cmd_service._format_search_results(
            [task], "отчёт", ZoneInfo("Europe/Moscow"), "ru"
        )
        assert "Отчёт за неделю" in text
        assert "Активно" in text
        assert markup is not None

    def test_format_search_results_limit(self, cmd_service):
        tasks = []
        for i in range(15):
            t = _make_task(task_id=f"s{i}", title=f"Task {i}")
            t.gtd_status = "inbox"
            tasks.append(t)
        text, markup = cmd_service._format_search_results(
            tasks, "task", ZoneInfo("Europe/Moscow"), "ru"
        )
        assert "и ещё" in text
        assert len(markup["inline_keyboard"]) <= MAX_SEARCH_DISPLAY + 1

    def test_format_search_results_completed_no_button(self, cmd_service):
        task = _make_task(task_id="s1", title="Done", is_completed=True)
        task.gtd_status = "completed"
        text, markup = cmd_service._format_search_results(
            [task], "done", ZoneInfo("Europe/Moscow"), "ru"
        )
        assert markup is None

    @pytest.mark.asyncio
    async def test_search_command_with_query(self, cmd_service, mock_user):
        mock_db = AsyncMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = []
        mock_result = MagicMock()
        mock_result.scalars.return_value = mock_scalars
        mock_db.execute = AsyncMock(return_value=mock_result)

        with patch(
            "app.services.telegram_command_service.TelegramNotifierService"
        ) as mock_ns:
            mock_ns.send_message_with_buttons = AsyncMock()
            await cmd_service.handle_command(mock_user, "/search отчёт", mock_db)
            mock_ns.send_message_with_buttons.assert_called_once()
            call_text = mock_ns.send_message_with_buttons.call_args[0][2]
            assert "отчёт" in call_text

    @pytest.mark.asyncio
    async def test_search_command_without_query_sets_state(self, cmd_service, mock_user):
        with patch(
            "app.services.telegram_command_service.TelegramNotifierService"
        ) as mock_ns:
            mock_ns.send_message = AsyncMock()
            await cmd_service.handle_command(mock_user, "/search", AsyncMock())
            mock_ns.send_message.assert_called_once()
            state = _pending_adds.get(mock_user.telegram_chat_id)
            assert state is not None
            assert state["step"] == "waiting_search"

    @pytest.mark.asyncio
    async def test_search_short_alias(self, cmd_service, mock_user):
        mock_db = AsyncMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = []
        mock_result = MagicMock()
        mock_result.scalars.return_value = mock_scalars
        mock_db.execute = AsyncMock(return_value=mock_result)

        with patch(
            "app.services.telegram_command_service.TelegramNotifierService"
        ) as mock_ns:
            mock_ns.send_message_with_buttons = AsyncMock()
            await cmd_service.handle_command(mock_user, "/s тест", mock_db)
            mock_ns.send_message_with_buttons.assert_called_once()

    @pytest.mark.asyncio
    async def test_waiting_search_state_processes_query(self, cmd_service, mock_user):
        _pending_adds[mock_user.telegram_chat_id] = {
            "step": "waiting_search",
            "created_at": datetime.now(UTC),
        }
        mock_db = AsyncMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = []
        mock_result = MagicMock()
        mock_result.scalars.return_value = mock_scalars
        mock_db.execute = AsyncMock(return_value=mock_result)

        with patch(
            "app.services.telegram_command_service.TelegramNotifierService"
        ) as mock_ns:
            mock_ns.send_message_with_buttons = AsyncMock()
            await cmd_service.handle_text(mock_user, "отчёт", mock_db)
            mock_ns.send_message_with_buttons.assert_called_once()
            assert mock_user.telegram_chat_id not in _pending_adds


class TestMainKeyboard:
    def test_build_main_keyboard_ru(self, cmd_service):
        kb = cmd_service._build_main_keyboard("ru")
        assert "keyboard" in kb
        assert kb["resize_keyboard"] is True
        assert kb["one_time_keyboard"] is False
        all_texts = [btn["text"] for row in kb["keyboard"] for btn in row]
        assert "📥 Входящие" in all_texts
        assert "📅 Сегодня" in all_texts
        assert "✕ Скрыть меню" in all_texts

    def test_build_main_keyboard_en(self, cmd_service):
        kb = cmd_service._build_main_keyboard("en")
        all_texts = [btn["text"] for row in kb["keyboard"] for btn in row]
        assert "📥 Inbox" in all_texts
        assert "📅 Today" in all_texts
        assert "✕ Hide menu" in all_texts

    def test_keyboard_button_commands_mapping(self, cmd_service):
        mapping = cmd_service._keyboard_button_commands()
        assert mapping["📥 Входящие"] == "/inbox"
        assert mapping["📅 Сегодня"] == "/today"
        assert mapping["➕ Добавить"] == "/add"
        assert mapping["📊 Стат"] == "/stats"

    @pytest.mark.asyncio
    async def test_menu_command_sends_keyboard(self, cmd_service, mock_user):
        with patch(
            "app.services.telegram_command_service.TelegramNotifierService"
        ) as mock_ns:
            mock_ns.send_reply_keyboard = AsyncMock()
            await cmd_service.handle_command(mock_user, "/menu", AsyncMock())
            mock_ns.send_reply_keyboard.assert_called_once()
            call_keyboard = mock_ns.send_reply_keyboard.call_args[0][3]
            assert "keyboard" in call_keyboard

    @pytest.mark.asyncio
    async def test_hide_menu_button_sends_remove(self, cmd_service, mock_user):
        with patch(
            "app.services.telegram_command_service.TelegramNotifierService"
        ) as mock_ns:
            mock_ns.send_reply_keyboard_remove = AsyncMock()
            await cmd_service.handle_text(mock_user, "✕ Скрыть меню", AsyncMock())
            mock_ns.send_reply_keyboard_remove.assert_called_once()

    @pytest.mark.asyncio
    async def test_search_keyboard_button_sets_state(self, cmd_service, mock_user):
        with patch(
            "app.services.telegram_command_service.TelegramNotifierService"
        ) as mock_ns:
            mock_ns.send_message = AsyncMock()
            await cmd_service.handle_text(mock_user, "🔍 Поиск", AsyncMock())
            state = _pending_adds.get(mock_user.telegram_chat_id)
            assert state is not None
            assert state["step"] == "waiting_search"

    @pytest.mark.asyncio
    async def test_inbox_keyboard_button_routes_to_command(self, cmd_service, mock_user):
        with patch.object(cmd_service, "handle_command", new_callable=AsyncMock) as mock_cmd:
            mock_db = AsyncMock()
            await cmd_service.handle_text(mock_user, "📥 Входящие", mock_db)
            mock_cmd.assert_called_once()
            assert mock_cmd.call_args[0][1] == "/inbox"
