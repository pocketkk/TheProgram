"""
Tests for Palm Reading Service

Tests the palm reading service with mocked AI responses.
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock
import base64


class TestPalmReadingService:
    """Test palm reading service functionality"""

    @pytest.fixture
    def mock_anthropic_response(self):
        """Create a mock Anthropic API response"""
        mock_response = Mock()
        mock_response.content = [Mock(text="""
1. HAND SHAPE & ELEMENT

Your hand shows characteristics of an Earth Hand with a square palm and shorter fingers. This connects you to the grounded energy of Taurus, Virgo, and Capricorn. You are practical, reliable, and value stability.

2. THE MAJOR LINES

HEART LINE
Your heart line is deep and curves upward toward the index finger, indicating emotional expressiveness and idealistic love. This suggests strong Venus and Moon influences in your chart.

HEAD LINE
Your head line is long and slightly curved, showing analytical thinking balanced with creativity. Mercury's influence here suggests strong communication skills.

LIFE LINE
Your life line is clear and sweeping wide around the thumb mount, indicating vitality and enthusiasm for life. This reflects Sun and Mars energy.

FATE LINE
A clear fate line rises from the base of your palm, suggesting a strong sense of purpose. Saturn's influence indicates discipline and career focus.

3. THE MOUNTS

Mount of Jupiter is prominent, suggesting leadership abilities.
Mount of Venus is well-developed, indicating warmth and passion.

4. FINGER ANALYSIS

Your fingers show balanced proportions with a slightly longer ring finger, suggesting creative abilities.

5. SPECIAL MARKINGS

A small star near the Mount of Apollo suggests potential for recognition.

6. ASTROLOGICAL SYNTHESIS

Your palm suggests strong Earth element dominance with supporting Fire energy. Cardinal and Fixed modalities appear prominent.

7. GUIDANCE & POTENTIAL

Focus on developing your natural leadership abilities while maintaining your practical foundation.
""")]
        mock_response.usage = Mock(input_tokens=1500, output_tokens=800)
        return mock_response

    @pytest.fixture
    def sample_image_bytes(self):
        """Create sample image bytes for testing"""
        # Create a minimal valid JPEG header
        return b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'

    @patch('app.services.palm_reading_service.Anthropic')
    @patch('app.services.palm_reading_service.AsyncAnthropic')
    def test_service_initialization(self, mock_async_anthropic, mock_anthropic):
        """Test service initializes correctly with API key"""
        from app.services.palm_reading_service import PalmReadingService

        service = PalmReadingService(api_key="test-key")

        assert service.api_key == "test-key"
        assert service.model == "claude-sonnet-4-20250514"
        mock_anthropic.assert_called_once_with(api_key="test-key")
        mock_async_anthropic.assert_called_once_with(api_key="test-key")

    @patch('app.services.palm_reading_service.Anthropic')
    @patch('app.services.palm_reading_service.AsyncAnthropic')
    def test_service_initialization_custom_model(self, mock_async_anthropic, mock_anthropic):
        """Test service can be initialized with custom model"""
        from app.services.palm_reading_service import PalmReadingService

        service = PalmReadingService(api_key="test-key", model="claude-opus-4-20250514")

        assert service.model == "claude-opus-4-20250514"

    def test_service_requires_api_key(self):
        """Test service raises error without API key"""
        from app.services.palm_reading_service import PalmReadingService

        with patch.dict('os.environ', {}, clear=True):
            with patch('app.services.palm_reading_service.os.getenv', return_value=None):
                with pytest.raises(ValueError, match="Anthropic API key required"):
                    PalmReadingService()

    @patch('app.services.palm_reading_service.Anthropic')
    @patch('app.services.palm_reading_service.AsyncAnthropic')
    def test_encode_image(self, mock_async_anthropic, mock_anthropic, sample_image_bytes):
        """Test image encoding to base64"""
        from app.services.palm_reading_service import PalmReadingService

        service = PalmReadingService(api_key="test-key")
        encoded = service._encode_image(sample_image_bytes)

        # Verify it's valid base64
        decoded = base64.standard_b64decode(encoded)
        assert decoded == sample_image_bytes

    @patch('app.services.palm_reading_service.Anthropic')
    @patch('app.services.palm_reading_service.AsyncAnthropic')
    def test_get_palm_reading_prompt_both_hands(self, mock_async_anthropic, mock_anthropic):
        """Test prompt generation for both hands"""
        from app.services.palm_reading_service import PalmReadingService

        service = PalmReadingService(api_key="test-key")
        prompt = service._get_palm_reading_prompt("both")

        assert "both hands" in prompt
        assert "HAND SHAPE" in prompt
        assert "HEART LINE" in prompt
        assert "ASTROLOGICAL SYNTHESIS" in prompt

    @patch('app.services.palm_reading_service.Anthropic')
    @patch('app.services.palm_reading_service.AsyncAnthropic')
    def test_get_palm_reading_prompt_left_hand(self, mock_async_anthropic, mock_anthropic):
        """Test prompt generation for left hand"""
        from app.services.palm_reading_service import PalmReadingService

        service = PalmReadingService(api_key="test-key")
        prompt = service._get_palm_reading_prompt("left")

        assert "left hand" in prompt
        assert "inherited traits" in prompt

    @patch('app.services.palm_reading_service.Anthropic')
    @patch('app.services.palm_reading_service.AsyncAnthropic')
    def test_get_palm_reading_prompt_right_hand(self, mock_async_anthropic, mock_anthropic):
        """Test prompt generation for right hand"""
        from app.services.palm_reading_service import PalmReadingService

        service = PalmReadingService(api_key="test-key")
        prompt = service._get_palm_reading_prompt("right")

        assert "right hand" in prompt
        assert "active hand" in prompt

    @patch('app.services.palm_reading_service.Anthropic')
    @patch('app.services.palm_reading_service.AsyncAnthropic')
    def test_analyze_palm_sync(
        self, mock_async_anthropic, mock_anthropic,
        mock_anthropic_response, sample_image_bytes
    ):
        """Test synchronous palm analysis"""
        from app.services.palm_reading_service import PalmReadingService

        # Setup mock
        mock_client = Mock()
        mock_client.messages.create.return_value = mock_anthropic_response
        mock_anthropic.return_value = mock_client

        service = PalmReadingService(api_key="test-key")
        result = service.analyze_palm(
            image_data=sample_image_bytes,
            media_type="image/jpeg",
            hand_type="both"
        )

        assert result["success"] is True
        assert result["full_reading"] is not None
        assert result["hand_type"] == "both"
        assert result["model_used"] == "claude-sonnet-4-20250514"
        assert result["tokens_used"]["input"] == 1500
        assert result["tokens_used"]["output"] == 800

    @patch('app.services.palm_reading_service.Anthropic')
    @patch('app.services.palm_reading_service.AsyncAnthropic')
    def test_analyze_palm_with_context(
        self, mock_async_anthropic, mock_anthropic,
        mock_anthropic_response, sample_image_bytes
    ):
        """Test palm analysis with additional context"""
        from app.services.palm_reading_service import PalmReadingService

        mock_client = Mock()
        mock_client.messages.create.return_value = mock_anthropic_response
        mock_anthropic.return_value = mock_client

        service = PalmReadingService(api_key="test-key")
        result = service.analyze_palm(
            image_data=sample_image_bytes,
            media_type="image/jpeg",
            hand_type="both",
            additional_context="I'm interested in career insights"
        )

        # Verify the context was included in the API call
        call_args = mock_client.messages.create.call_args
        message_content = call_args.kwargs["messages"][0]["content"]
        # The text content should include the additional context
        text_content = [c for c in message_content if c["type"] == "text"][0]["text"]
        assert "career insights" in text_content

    @patch('app.services.palm_reading_service.Anthropic')
    @patch('app.services.palm_reading_service.AsyncAnthropic')
    def test_analyze_palm_error_handling(
        self, mock_async_anthropic, mock_anthropic, sample_image_bytes
    ):
        """Test error handling in palm analysis"""
        from app.services.palm_reading_service import PalmReadingService

        mock_client = Mock()
        mock_client.messages.create.side_effect = Exception("API Error")
        mock_anthropic.return_value = mock_client

        service = PalmReadingService(api_key="test-key")
        result = service.analyze_palm(
            image_data=sample_image_bytes,
            media_type="image/jpeg",
            hand_type="both"
        )

        assert result["success"] is False
        assert "API Error" in result["error"]
        assert result["full_reading"] is None

    @patch('app.services.palm_reading_service.Anthropic')
    @patch('app.services.palm_reading_service.AsyncAnthropic')
    def test_parse_reading_sections(self, mock_async_anthropic, mock_anthropic):
        """Test parsing of reading text into sections"""
        from app.services.palm_reading_service import PalmReadingService

        service = PalmReadingService(api_key="test-key")

        sample_text = """
1. HAND SHAPE & ELEMENT
Your hand is an Earth hand.

2. HEART LINE
Deep and clear heart line.

3. HEAD LINE
Long head line indicating analytical mind.

4. LIFE LINE
Strong life line.

5. FATE LINE
Clear fate line.

6. THE MOUNTS
Mount of Jupiter is prominent.

7. FINGER ANALYSIS
Balanced fingers.

8. SPECIAL MARKINGS
A star on Apollo mount.

9. ASTROLOGICAL SYNTHESIS
Strong Earth energy.

10. GUIDANCE & POTENTIAL
Focus on practical matters.
"""
        sections = service._parse_reading_sections(sample_text)

        assert "hand_shape" in sections
        assert "heart_line" in sections
        assert "head_line" in sections
        assert "life_line" in sections
        assert "guidance" in sections

    @pytest.mark.asyncio
    @patch('app.services.palm_reading_service.Anthropic')
    @patch('app.services.palm_reading_service.AsyncAnthropic')
    async def test_analyze_palm_async(
        self, mock_async_anthropic, mock_anthropic,
        mock_anthropic_response, sample_image_bytes
    ):
        """Test asynchronous palm analysis"""
        from app.services.palm_reading_service import PalmReadingService

        # Setup async mock
        mock_async_client = AsyncMock()
        mock_async_client.messages.create.return_value = mock_anthropic_response
        mock_async_anthropic.return_value = mock_async_client

        service = PalmReadingService(api_key="test-key")
        result = await service.analyze_palm_async(
            image_data=sample_image_bytes,
            media_type="image/jpeg",
            hand_type="left"
        )

        assert result["success"] is True
        assert result["hand_type"] == "left"

    @pytest.mark.asyncio
    @patch('app.services.palm_reading_service.Anthropic')
    @patch('app.services.palm_reading_service.AsyncAnthropic')
    async def test_quick_insight_async(
        self, mock_async_anthropic, mock_anthropic, sample_image_bytes
    ):
        """Test quick insight generation"""
        from app.services.palm_reading_service import PalmReadingService

        mock_response = Mock()
        mock_response.content = [Mock(text="Your palm shows strong creative energy and natural leadership abilities.")]

        mock_async_client = AsyncMock()
        mock_async_client.messages.create.return_value = mock_response
        mock_async_anthropic.return_value = mock_async_client

        service = PalmReadingService(api_key="test-key")
        result = await service.generate_quick_insight_async(
            image_data=sample_image_bytes,
            media_type="image/jpeg"
        )

        assert result["success"] is True
        assert "creative energy" in result["insight"]


class TestPalmReadingServiceValidation:
    """Test input validation for palm reading service"""

    @patch('app.services.palm_reading_service.Anthropic')
    @patch('app.services.palm_reading_service.AsyncAnthropic')
    def test_accepts_jpeg(self, mock_async_anthropic, mock_anthropic):
        """Test service accepts JPEG images"""
        from app.services.palm_reading_service import PalmReadingService

        mock_response = Mock()
        mock_response.content = [Mock(text="Test reading")]
        mock_response.usage = Mock(input_tokens=100, output_tokens=50)

        mock_client = Mock()
        mock_client.messages.create.return_value = mock_response
        mock_anthropic.return_value = mock_client

        service = PalmReadingService(api_key="test-key")
        result = service.analyze_palm(
            image_data=b"test",
            media_type="image/jpeg",
            hand_type="both"
        )

        # Verify the correct media type was passed
        call_args = mock_client.messages.create.call_args
        image_content = call_args.kwargs["messages"][0]["content"][0]
        assert image_content["source"]["media_type"] == "image/jpeg"

    @patch('app.services.palm_reading_service.Anthropic')
    @patch('app.services.palm_reading_service.AsyncAnthropic')
    def test_accepts_png(self, mock_async_anthropic, mock_anthropic):
        """Test service accepts PNG images"""
        from app.services.palm_reading_service import PalmReadingService

        mock_response = Mock()
        mock_response.content = [Mock(text="Test reading")]
        mock_response.usage = Mock(input_tokens=100, output_tokens=50)

        mock_client = Mock()
        mock_client.messages.create.return_value = mock_response
        mock_anthropic.return_value = mock_client

        service = PalmReadingService(api_key="test-key")
        result = service.analyze_palm(
            image_data=b"test",
            media_type="image/png",
            hand_type="both"
        )

        call_args = mock_client.messages.create.call_args
        image_content = call_args.kwargs["messages"][0]["content"][0]
        assert image_content["source"]["media_type"] == "image/png"
