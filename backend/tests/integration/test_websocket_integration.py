"""
Integration tests for WebSocket endpoints

Tests WebSocket-based interpretation generation with real-time progress updates.
"""
import pytest
import json
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4

from app.models_sqlite import Client, BirthData, Chart
from datetime import datetime, date, time as dt_time


# =============================================================================
# Test WebSocket Interpretation Generation
# =============================================================================

class TestWebSocketInterpretations:
    """Test WebSocket-based interpretation generation"""

    @pytest.fixture
    def test_chart(self, test_db: Session):
        """Create a test chart for interpretation"""
        # Create client
        client = Client(
            first_name="Test",
            last_name="Client",
            email="test@example.com"
        )
        test_db.add(client)
        test_db.commit()

        # Create birth data
        birth_data = BirthData(
            client_id=client.id,
            birth_date=date(1990, 1, 15),
            birth_time=dt_time(14, 30),
            latitude=40.7128,
            longitude=-74.0060,
            timezone="America/New_York",
            utc_offset=-5 * 60,
            city="New York",
            country="USA"
        )
        test_db.add(birth_data)
        test_db.commit()

        # Create chart with minimal data
        chart = Chart(
            client_id=client.id,
            birth_data_id=birth_data.id,
            chart_name="Test Chart",
            chart_type="natal",
            astro_system="western",
            house_system="placidus",
            chart_data={
                "planets": {
                    "sun": {"longitude": 294.5, "sign": "Capricorn"},
                    "moon": {"longitude": 120.0, "sign": "Cancer"}
                },
                "houses": {
                    "1": {"cusp": 0.0},
                    "10": {"cusp": 270.0}
                },
                "aspects": []
            }
        )
        test_db.add(chart)
        test_db.commit()

        return chart

    @pytest.mark.skip(reason="Requires WebSocket test client setup and AI API access")
    def test_websocket_connection(self, client_with_db: TestClient, test_chart):
        """Test WebSocket connection establishment"""
        with client_with_db.websocket_connect(
            f"/api/ws/interpretations/{test_chart.id}"
        ) as websocket:
            # Connection should be established
            assert websocket is not None

    @pytest.mark.skip(reason="Requires WebSocket test client and AI API")
    def test_websocket_generate_request(self, client_with_db: TestClient, test_chart):
        """Test sending generation request via WebSocket"""
        with client_with_db.websocket_connect(
            f"/api/ws/interpretations/{test_chart.id}"
        ) as websocket:
            # Send generation request
            request = {
                "type": "generate",
                "element_types": ["planet"],
                "regenerate_existing": True,
                "ai_model": "claude-haiku-4-5-20251001"
            }
            websocket.send_json(request)

            # Should receive progress updates
            response = websocket.receive_json()
            assert "type" in response
            assert response["type"] in ["progress", "complete", "error"]

    @pytest.mark.skip(reason="Requires WebSocket test client and AI API")
    def test_websocket_progress_updates(self, client_with_db: TestClient, test_chart):
        """Test receiving progress updates during generation"""
        with client_with_db.websocket_connect(
            f"/api/ws/interpretations/{test_chart.id}"
        ) as websocket:
            request = {
                "type": "generate",
                "element_types": ["planet"],
                "regenerate_existing": True
            }
            websocket.send_json(request)

            # Collect all messages
            messages = []
            try:
                while True:
                    msg = websocket.receive_json(timeout=30)
                    messages.append(msg)
                    if msg.get("type") == "complete":
                        break
            except Exception:
                pass

            # Should have received progress updates
            progress_messages = [m for m in messages if m["type"] == "progress"]
            assert len(progress_messages) > 0

            # Each progress message should have required fields
            for msg in progress_messages:
                assert "element_type" in msg
                assert "element_key" in msg
                assert "completed" in msg
                assert "total" in msg

    @pytest.mark.skip(reason="Requires WebSocket test client and AI API")
    def test_websocket_completion_message(self, client_with_db: TestClient, test_chart):
        """Test completion message structure"""
        with client_with_db.websocket_connect(
            f"/api/ws/interpretations/{test_chart.id}"
        ) as websocket:
            request = {
                "type": "generate",
                "element_types": ["planet"],
                "regenerate_existing": True
            }
            websocket.send_json(request)

            # Wait for completion
            completion = None
            try:
                while True:
                    msg = websocket.receive_json(timeout=30)
                    if msg.get("type") == "complete":
                        completion = msg
                        break
            except Exception:
                pass

            assert completion is not None
            assert "generated_count" in completion
            assert "skipped_count" in completion
            assert completion["generated_count"] >= 0

    @pytest.mark.skip(reason="Requires WebSocket test client")
    def test_websocket_invalid_request_type(self, client_with_db: TestClient, test_chart):
        """Test error handling for invalid request type"""
        with client_with_db.websocket_connect(
            f"/api/ws/interpretations/{test_chart.id}"
        ) as websocket:
            # Send invalid request type
            request = {
                "type": "invalid_type",
                "element_types": ["planet"]
            }
            websocket.send_json(request)

            # Should receive error message
            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "Expected 'generate'" in response["message"]

    @pytest.mark.skip(reason="Requires WebSocket test client")
    def test_websocket_invalid_chart_id(self, client_with_db: TestClient):
        """Test WebSocket with non-existent chart ID"""
        fake_chart_id = uuid4()

        with client_with_db.websocket_connect(
            f"/api/ws/interpretations/{fake_chart_id}"
        ) as websocket:
            request = {
                "type": "generate",
                "element_types": ["planet"]
            }
            websocket.send_json(request)

            # Should receive error about chart not found
            response = websocket.receive_json()
            assert response["type"] == "error"

    @pytest.mark.skip(reason="Requires WebSocket test client and AI API")
    def test_websocket_regenerate_vs_skip(self, client_with_db: TestClient, test_chart, test_db: Session):
        """Test regenerate_existing flag behavior"""
        # First generation with regenerate=True
        with client_with_db.websocket_connect(
            f"/api/ws/interpretations/{test_chart.id}"
        ) as websocket:
            request = {
                "type": "generate",
                "element_types": ["planet"],
                "regenerate_existing": True
            }
            websocket.send_json(request)

            completion = None
            while True:
                msg = websocket.receive_json(timeout=30)
                if msg.get("type") == "complete":
                    completion = msg
                    break

            first_generated = completion["generated_count"]

        # Second generation with regenerate=False (should skip existing)
        with client_with_db.websocket_connect(
            f"/api/ws/interpretations/{test_chart.id}"
        ) as websocket:
            request = {
                "type": "generate",
                "element_types": ["planet"],
                "regenerate_existing": False
            }
            websocket.send_json(request)

            completion = None
            while True:
                msg = websocket.receive_json(timeout=30)
                if msg.get("type") == "complete":
                    completion = msg
                    break

            # Should have skipped all interpretations
            assert completion["skipped_count"] == first_generated
            assert completion["generated_count"] == 0

    @pytest.mark.skip(reason="Requires WebSocket test client and AI API")
    def test_websocket_selective_element_types(self, client_with_db: TestClient, test_chart):
        """Test generating only specific element types"""
        with client_with_db.websocket_connect(
            f"/api/ws/interpretations/{test_chart.id}"
        ) as websocket:
            # Request only planets
            request = {
                "type": "generate",
                "element_types": ["planet"],
                "regenerate_existing": True
            }
            websocket.send_json(request)

            # Collect progress messages
            progress_messages = []
            while True:
                msg = websocket.receive_json(timeout=30)
                if msg.get("type") == "progress":
                    progress_messages.append(msg)
                elif msg.get("type") == "complete":
                    break

            # All progress messages should be for planets
            for msg in progress_messages:
                assert msg["element_type"] == "planet"

    @pytest.mark.skip(reason="Requires WebSocket test client and AI API")
    def test_websocket_disconnection_handling(self, client_with_db: TestClient, test_chart):
        """Test graceful handling of client disconnection"""
        with client_with_db.websocket_connect(
            f"/api/ws/interpretations/{test_chart.id}"
        ) as websocket:
            request = {
                "type": "generate",
                "element_types": ["planet"],
                "regenerate_existing": True
            }
            websocket.send_json(request)

            # Receive a few messages then disconnect
            websocket.receive_json()
            # Disconnection should be handled gracefully by server


# =============================================================================
# Test WebSocket Connection Management
# =============================================================================

class TestWebSocketConnectionManagement:
    """Test WebSocket connection lifecycle"""

    @pytest.mark.skip(reason="Requires WebSocket test client")
    def test_multiple_concurrent_connections(self, client_with_db: TestClient, test_chart):
        """Test multiple WebSocket connections to same chart"""
        # Open two connections
        with client_with_db.websocket_connect(
            f"/api/ws/interpretations/{test_chart.id}"
        ) as ws1, client_with_db.websocket_connect(
            f"/api/ws/interpretations/{test_chart.id}"
        ) as ws2:
            # Both should be connected
            assert ws1 is not None
            assert ws2 is not None

    @pytest.mark.skip(reason="Requires WebSocket test client")
    def test_connection_cleanup_after_error(self, client_with_db: TestClient, test_chart):
        """Test connection cleanup after error"""
        try:
            with client_with_db.websocket_connect(
                f"/api/ws/interpretations/{test_chart.id}"
            ) as websocket:
                # Send malformed data
                websocket.send_text("invalid json")

                # Should receive error
                response = websocket.receive_json()
                assert response.get("type") == "error"
        except Exception:
            # Connection should be cleaned up
            pass


# =============================================================================
# Test WebSocket Error Handling
# =============================================================================

class TestWebSocketErrorHandling:
    """Test WebSocket error scenarios"""

    @pytest.mark.skip(reason="Requires WebSocket test client")
    def test_malformed_json_request(self, client_with_db: TestClient, test_chart):
        """Test handling of malformed JSON"""
        with client_with_db.websocket_connect(
            f"/api/ws/interpretations/{test_chart.id}"
        ) as websocket:
            # Send invalid JSON
            websocket.send_text("{invalid json")

            # Should receive error or disconnect gracefully
            try:
                response = websocket.receive_json()
                assert response.get("type") == "error"
            except Exception:
                # Connection closed is acceptable
                pass

    @pytest.mark.skip(reason="Requires WebSocket test client and AI API")
    def test_ai_api_error_handling(self, client_with_db: TestClient, test_chart):
        """Test handling of AI API errors during generation"""
        with client_with_db.websocket_connect(
            f"/api/ws/interpretations/{test_chart.id}"
        ) as websocket:
            # Request with invalid AI model
            request = {
                "type": "generate",
                "element_types": ["planet"],
                "ai_model": "invalid-model"
            }
            websocket.send_json(request)

            # Should receive error message
            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "model" in response["message"].lower()


# =============================================================================
# Notes on WebSocket Testing
# =============================================================================

"""
WebSocket Integration Testing Notes:

1. **Why Tests Are Skipped:**
   - FastAPI TestClient WebSocket support requires special setup
   - AI API access is needed for actual interpretation generation
   - Real-time testing requires async WebSocket client

2. **Testing WebSockets Manually:**

   Using JavaScript in browser:
   ```javascript
   const ws = new WebSocket('ws://localhost:8000/api/ws/interpretations/{chart_id}');

   ws.onopen = () => {
       ws.send(JSON.stringify({
           type: 'generate',
           element_types: ['planet', 'house'],
           regenerate_existing: true
       }));
   };

   ws.onmessage = (event) => {
       const data = JSON.parse(event.data);
       console.log('Progress:', data);
   };
   ```

   Using Python websockets library:
   ```python
   import asyncio
   import websockets
   import json

   async def test_ws():
       uri = f"ws://localhost:8000/api/ws/interpretations/{chart_id}"
       async with websockets.connect(uri) as websocket:
           await websocket.send(json.dumps({
               'type': 'generate',
               'element_types': ['planet'],
               'regenerate_existing': True
           }))

           while True:
               msg = await websocket.recv()
               data = json.loads(msg)
               print(data)
               if data['type'] == 'complete':
                   break
   ```

3. **Required Setup for WebSocket Tests:**
   - Install: `pip install websockets pytest-asyncio`
   - Use async test client: `from httpx import AsyncClient`
   - Mock AI interpreter service
   - Use in-memory database with test data

4. **Coverage Without WebSocket Tests:**
   - WebSocket endpoint logic is tested indirectly through:
     - Chart interpretation generation tests
     - AI interpreter unit tests
     - Database CASCADE tests
   - Missing coverage: Real-time progress streaming

5. **Recommended for Production:**
   - Set up dedicated WebSocket test suite with:
     - Real WebSocket client (not TestClient)
     - Mocked AI service
     - Load testing with multiple concurrent connections
     - Timeout and error injection tests
"""
