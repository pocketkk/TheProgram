"""
Tests for Gemini Voice Service

Unit tests for voice settings, conversation history, and service initialization.
Note: Actual Gemini API calls are mocked to avoid requiring API keys in tests.
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock, MagicMock

from app.services.gemini_voice_service import (
    GeminiVoiceService,
    VoiceSettings,
    VoiceMessage,
    GeminiVoice,
    LiveSession,
    get_gemini_voice_service,
)


class TestVoiceSettings:
    """Tests for VoiceSettings dataclass"""

    def test_default_voice_settings(self):
        """Should create settings with default values"""
        settings = VoiceSettings()

        assert settings.voice_name == GeminiVoice.KORE.value
        assert settings.personality == "mystical guide"
        assert settings.speaking_style == "warm and contemplative"
        assert settings.response_length == "medium"
        assert settings.custom_personality is None

    def test_custom_voice_settings(self):
        """Should accept custom values"""
        settings = VoiceSettings(
            voice_name=GeminiVoice.CHARON.value,
            personality="wise oracle",
            speaking_style="deep and mysterious",
            response_length="detailed",
            custom_personality="You are a cosmic oracle..."
        )

        assert settings.voice_name == "Charon"
        assert settings.personality == "wise oracle"
        assert settings.speaking_style == "deep and mysterious"
        assert settings.response_length == "detailed"
        assert settings.custom_personality == "You are a cosmic oracle..."

    def test_to_system_instruction_default(self):
        """Should generate system instruction from default settings"""
        settings = VoiceSettings()
        instruction = settings.to_system_instruction()

        assert "mystical guide" in instruction
        assert "warm and contemplative" in instruction
        assert "medium" in instruction

    def test_to_system_instruction_custom_personality(self):
        """Custom personality should override default instruction"""
        custom = "You are a cosmic guide with infinite wisdom."
        settings = VoiceSettings(custom_personality=custom)
        instruction = settings.to_system_instruction()

        assert instruction == custom


class TestGeminiVoice:
    """Tests for GeminiVoice enum"""

    def test_all_voices_defined(self):
        """Should have all expected voices"""
        assert GeminiVoice.PUCK.value == "Puck"
        assert GeminiVoice.CHARON.value == "Charon"
        assert GeminiVoice.KORE.value == "Kore"
        assert GeminiVoice.FENRIR.value == "Fenrir"
        assert GeminiVoice.AOEDE.value == "Aoede"

    def test_voice_count(self):
        """Should have exactly 5 voices"""
        assert len(GeminiVoice) == 5


class TestVoiceMessage:
    """Tests for VoiceMessage dataclass"""

    def test_create_voice_message(self):
        """Should create voice message with required fields"""
        msg = VoiceMessage(role="user", content="Hello")

        assert msg.role == "user"
        assert msg.content == "Hello"
        assert msg.audio_data is None
        assert msg.timestamp > 0

    def test_create_voice_message_with_audio(self):
        """Should create voice message with audio data"""
        audio = b"fake_audio_data"
        msg = VoiceMessage(role="model", content="Response", audio_data=audio)

        assert msg.role == "model"
        assert msg.content == "Response"
        assert msg.audio_data == audio


class TestGeminiVoiceService:
    """Tests for GeminiVoiceService"""

    def test_init_without_api_key_raises_error(self):
        """Should raise error if no API key provided"""
        with patch.dict('os.environ', {}, clear=True):
            with pytest.raises(ValueError, match="Google API key required"):
                GeminiVoiceService(api_key=None)

    def test_init_with_api_key(self):
        """Should initialize with provided API key"""
        service = GeminiVoiceService(api_key="test_key")
        assert service.api_key == "test_key"

    def test_init_with_env_api_key(self):
        """Should initialize with environment API key"""
        with patch.dict('os.environ', {'GOOGLE_API_KEY': 'env_key'}):
            service = GeminiVoiceService()
            assert service.api_key == "env_key"

    def test_init_with_voice_settings(self):
        """Should accept custom voice settings"""
        settings = VoiceSettings(voice_name="Charon")
        service = GeminiVoiceService(api_key="test_key", voice_settings=settings)

        assert service.voice_settings.voice_name == "Charon"

    def test_update_voice_settings(self):
        """Should update voice settings"""
        service = GeminiVoiceService(api_key="test_key")
        new_settings = VoiceSettings(voice_name="Puck")

        service.update_voice_settings(new_settings)

        assert service.voice_settings.voice_name == "Puck"

    def test_get_conversation_history_empty(self):
        """Should return empty list when no history"""
        service = GeminiVoiceService(api_key="test_key")
        history = service.get_conversation_history()

        assert history == []

    def test_set_and_get_conversation_history(self):
        """Should set and retrieve conversation history"""
        service = GeminiVoiceService(api_key="test_key")

        history = [
            {"role": "user", "content": "Hello", "timestamp": 123.0},
            {"role": "assistant", "content": "Hi there!", "timestamp": 124.0},
        ]
        service.set_conversation_history(history)

        retrieved = service.get_conversation_history()
        assert len(retrieved) == 2
        assert retrieved[0]["content"] == "Hello"
        assert retrieved[1]["content"] == "Hi there!"
        assert retrieved[0]["mode"] == "voice"

    def test_clear_history(self):
        """Should clear conversation history"""
        service = GeminiVoiceService(api_key="test_key")

        # Add some history
        service.set_conversation_history([
            {"role": "user", "content": "Hello", "timestamp": 123.0}
        ])
        assert len(service.get_conversation_history()) == 1

        # Clear it
        service.clear_history()
        assert len(service.get_conversation_history()) == 0

    def test_format_astrological_context(self):
        """Should format astrological context for system prompt"""
        service = GeminiVoiceService(api_key="test_key")

        context = {
            "planets": {
                "sun": {"sign_name": "Aries"},
                "moon": {"sign_name": "Cancer"},
            },
            "houses": {
                "ascendant": 15.5,
                "midheaven": 285.2,
            },
            "aspects": [
                {"planet1": "Sun", "planet2": "Moon", "type": "trine"},
                {"planet1": "Venus", "planet2": "Mars", "type": "conjunction"},
            ],
        }

        formatted = service._format_astrological_context(context)

        assert "Sun in Aries" in formatted
        assert "Moon in Cancer" in formatted
        assert "Ascendant: 15.5" in formatted
        assert "Midheaven: 285.2" in formatted
        assert "Sun-Moon trine" in formatted

    def test_format_empty_astrological_context(self):
        """Should handle empty context gracefully"""
        service = GeminiVoiceService(api_key="test_key")
        formatted = service._format_astrological_context({})

        assert "No chart currently loaded" in formatted

    def test_summarize_history(self):
        """Should summarize conversation history"""
        service = GeminiVoiceService(api_key="test_key")

        # Add history directly
        service._conversation_history = [
            VoiceMessage(role="user", content="Tell me about my chart"),
            VoiceMessage(role="model", content="Your chart shows great potential..."),
        ]

        summary = service._summarize_history()

        assert "User: Tell me about my chart" in summary
        assert "Guide: Your chart shows great potential" in summary


class TestGetGeminiVoiceService:
    """Tests for singleton factory function"""

    def test_returns_service_instance(self):
        """Should return a service instance"""
        with patch.dict('os.environ', {'GOOGLE_API_KEY': 'test_key'}):
            service = get_gemini_voice_service(force_new=True)
            assert isinstance(service, GeminiVoiceService)

    def test_returns_same_instance(self):
        """Should return same instance when not forced"""
        with patch.dict('os.environ', {'GOOGLE_API_KEY': 'test_key'}):
            service1 = get_gemini_voice_service(force_new=True)
            service2 = get_gemini_voice_service()
            assert service1 is service2

    def test_force_new_creates_new_instance(self):
        """Should create new instance when forced"""
        with patch.dict('os.environ', {'GOOGLE_API_KEY': 'test_key'}):
            service1 = get_gemini_voice_service(force_new=True)
            service2 = get_gemini_voice_service(force_new=True)
            assert service1 is not service2

    def test_updates_settings_on_existing_instance(self):
        """Should update settings on existing instance"""
        with patch.dict('os.environ', {'GOOGLE_API_KEY': 'test_key'}):
            service1 = get_gemini_voice_service(force_new=True)
            new_settings = VoiceSettings(voice_name="Puck")
            service2 = get_gemini_voice_service(voice_settings=new_settings)

            assert service2.voice_settings.voice_name == "Puck"


class TestLiveSession:
    """Tests for LiveSession class"""

    def test_init(self):
        """Should initialize with required parameters"""
        mock_client = Mock()
        mock_config = Mock()

        session = LiveSession(
            client=mock_client,
            config=mock_config,
        )

        assert session.client is mock_client
        assert session.config is mock_config
        assert session.conversation_history == []
        assert session._is_connected is False

    def test_is_connected_property(self):
        """Should return connection status"""
        session = LiveSession(
            client=Mock(),
            config=Mock(),
        )

        assert session.is_connected is False

        session._is_connected = True
        assert session.is_connected is True

    def test_callbacks_stored(self):
        """Should store callback functions"""
        on_audio = AsyncMock()
        on_text = AsyncMock()
        on_transcript = AsyncMock()

        session = LiveSession(
            client=Mock(),
            config=Mock(),
            on_audio=on_audio,
            on_text=on_text,
            on_transcript=on_transcript,
        )

        assert session.on_audio is on_audio
        assert session.on_text is on_text
        assert session.on_transcript is on_transcript
