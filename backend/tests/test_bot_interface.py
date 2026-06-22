import pytest
from app.interfaces.bot_interface import BotInterface


def test_bot_interface_is_abstract():
    """BotInterface cannot be instantiated directly"""
    with pytest.raises(TypeError):
        BotInterface()


def test_bot_interface_has_required_methods():
    """BotInterface defines all required abstract methods"""
    abstract_methods = BotInterface.__abstractmethods__
    expected_methods = {
        'send_message', 'edit_message', 'send_document',
        'answer_callback', 'remove_keyboard'
    }
    assert expected_methods == abstract_methods
