import pytest

from app.services.base_command_service import BaseCommandService


def test_base_command_service_is_abstract():
    """BaseCommandService cannot be instantiated directly"""
    with pytest.raises(TypeError):
        BaseCommandService()


def test_base_command_service_has_required_methods():
    """BaseCommandService defines required abstract methods"""
    abstract_methods = BaseCommandService.__abstractmethods__
    assert 'handle_command' in abstract_methods
    assert 'handle_callback' in abstract_methods
    assert 'handle_text' in abstract_methods
