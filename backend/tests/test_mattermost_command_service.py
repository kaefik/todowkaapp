import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.mattermost_command_service import MattermostCommandService


@pytest.fixture
def service():
    adapter = MagicMock()
    return MattermostCommandService(adapter)


def test_command_map_exists(service):
    """Service has command map"""
    assert '/today' in service.COMMAND_MAP
    assert '/add' in service.COMMAND_MAP
    assert '/search' in service.COMMAND_MAP


def test_inherits_base_command_service(service):
    """Service inherits from BaseCommandService"""
    from app.services.base_command_service import BaseCommandService
    assert isinstance(service, BaseCommandService)
