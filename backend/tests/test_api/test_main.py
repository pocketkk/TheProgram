"""
Integration tests for FastAPI application
Tests main endpoints and application configuration
"""
import pytest
from fastapi import status


class TestRootEndpoints:
    """Test root and health check endpoints"""

    @pytest.mark.integration
    def test_root_endpoint(self, client):
        """Test root endpoint returns correct information"""
        response = client.get("/")

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "status" in data
        assert "environment" in data
        assert "message" in data

        assert data["name"] == "The Program"
        assert data["status"] == "operational"

    @pytest.mark.integration
    def test_health_check_endpoint(self, client):
        """Test health check endpoint"""
        response = client.get("/health")

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert "status" in data
        assert "environment" in data

        assert data["status"] == "healthy"

    @pytest.mark.integration
    def test_root_endpoint_response_structure(self, client):
        """Test that root endpoint has expected structure"""
        response = client.get("/")

        data = response.json()
        required_fields = ["name", "version", "status", "environment", "docs", "message"]

        for field in required_fields:
            assert field in data, f"Missing required field: {field}"

    @pytest.mark.integration
    def test_health_check_response_structure(self, client):
        """Test health check response structure"""
        response = client.get("/health")

        data = response.json()
        required_fields = ["status", "environment", "database", "ephemeris"]

        for field in required_fields:
            assert field in data, f"Missing required field: {field}"


class TestAPIDocumentation:
    """Test API documentation endpoints"""

    @pytest.mark.integration
    def test_openapi_json_endpoint(self, client):
        """Test OpenAPI JSON schema is accessible"""
        response = client.get("/openapi.json")

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert "openapi" in data
        assert "info" in data
        assert "paths" in data

        # Check basic info
        assert data["info"]["title"] == "The Program"

    @pytest.mark.integration
    def test_docs_endpoint_accessible(self, client):
        """Test that Swagger docs endpoint is accessible"""
        response = client.get("/docs")

        # Should return HTML page (200) or redirect (307)
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_307_TEMPORARY_REDIRECT
        ]

    @pytest.mark.integration
    def test_redoc_endpoint_accessible(self, client):
        """Test that ReDoc endpoint is accessible"""
        response = client.get("/redoc")

        # Should return HTML page (200) or redirect (307)
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_307_TEMPORARY_REDIRECT
        ]


class TestCORSConfiguration:
    """Test CORS middleware configuration"""

    @pytest.mark.integration
    def test_cors_headers_present(self, client):
        """Test that CORS headers are present in response"""
        response = client.get("/")

        # CORS headers should be present
        assert "access-control-allow-origin" in response.headers or \
               "Access-Control-Allow-Origin" in response.headers

    @pytest.mark.integration
    def test_cors_preflight_request(self, client):
        """Test CORS preflight request"""
        headers = {
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type"
        }

        response = client.options("/", headers=headers)

        # Should allow OPTIONS request
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_204_NO_CONTENT
        ]


class TestErrorHandling:
    """Test error handling"""

    @pytest.mark.integration
    def test_404_error_handling(self, client):
        """Test 404 error for non-existent endpoint"""
        response = client.get("/nonexistent-endpoint")

        assert response.status_code == status.HTTP_404_NOT_FOUND

        data = response.json()
        assert "detail" in data

    @pytest.mark.integration
    def test_405_method_not_allowed(self, client):
        """Test 405 error for wrong HTTP method"""
        # Root endpoint only accepts GET, not POST
        response = client.post("/")

        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED


class TestApplicationConfiguration:
    """Test application configuration"""

    @pytest.mark.integration
    def test_application_instance(self, test_app):
        """Test that application instance is properly configured"""
        assert test_app is not None
        assert test_app.title == "The Program"
        assert "Professional Astrology" in test_app.description

    @pytest.mark.integration
    def test_application_version(self, test_app):
        """Test application version"""
        assert test_app.version == "0.1.0"

    @pytest.mark.integration
    def test_application_routes(self, test_app):
        """Test that expected routes are registered"""
        routes = [route.path for route in test_app.routes]

        # Check for expected routes
        assert "/" in routes
        assert "/health" in routes
        assert "/openapi.json" in routes


class TestResponseHeaders:
    """Test response headers"""

    @pytest.mark.integration
    def test_content_type_json(self, client):
        """Test that JSON endpoints return correct content-type"""
        response = client.get("/")

        assert "application/json" in response.headers["content-type"]

    @pytest.mark.integration
    def test_server_header_present(self, client):
        """Test that server header is present"""
        response = client.get("/")

        # Server header should be present
        assert "server" in response.headers


class TestSecurityHeaders:
    """Test security-related headers"""

    @pytest.mark.integration
    def test_no_sensitive_info_in_headers(self, client):
        """Test that sensitive information is not exposed in headers"""
        response = client.get("/")

        # Should not expose database details, internal paths, etc.
        sensitive_keywords = ["postgres", "mysql", "password", "secret"]

        for header, value in response.headers.items():
            value_lower = str(value).lower()
            for keyword in sensitive_keywords:
                assert keyword not in value_lower, \
                    f"Sensitive keyword '{keyword}' found in header {header}"


class TestPerformance:
    """Test API performance"""

    @pytest.mark.integration
    @pytest.mark.slow
    def test_root_endpoint_performance(self, client):
        """Test that root endpoint responds quickly"""
        import time

        start = time.time()
        response = client.get("/")
        duration = time.time() - start

        assert response.status_code == status.HTTP_200_OK
        assert duration < 0.1, f"Root endpoint took {duration:.3f}s (> 100ms)"

    @pytest.mark.integration
    @pytest.mark.slow
    def test_health_check_performance(self, client):
        """Test that health check responds quickly"""
        import time

        start = time.time()
        response = client.get("/health")
        duration = time.time() - start

        assert response.status_code == status.HTTP_200_OK
        assert duration < 0.1, f"Health check took {duration:.3f}s (> 100ms)"


class TestApplicationLifecycle:
    """Test application startup and shutdown events"""

    @pytest.mark.integration
    def test_application_starts_successfully(self, test_app):
        """Test that application starts without errors"""
        # If we got here, app started successfully
        assert test_app is not None

    @pytest.mark.integration
    def test_application_accepts_requests_after_startup(self, client):
        """Test that app accepts requests after startup"""
        # Multiple requests should work
        for _ in range(5):
            response = client.get("/")
            assert response.status_code == status.HTTP_200_OK


class TestInputValidation:
    """Test input validation (placeholder for future endpoints)"""

    @pytest.mark.integration
    def test_query_parameter_validation(self, client):
        """Test query parameter validation"""
        # Example: Testing with invalid query params
        # This will be expanded when we have actual endpoints with params
        response = client.get("/?invalid_param=test")

        # Should either ignore or handle gracefully
        assert response.status_code == status.HTTP_200_OK


class TestJSONResponseFormat:
    """Test JSON response formatting"""

    @pytest.mark.integration
    def test_json_response_is_valid(self, client):
        """Test that JSON responses are valid"""
        response = client.get("/")

        # Should not raise exception
        data = response.json()
        assert isinstance(data, dict)

    @pytest.mark.integration
    def test_json_response_encoding(self, client):
        """Test JSON response encoding"""
        response = client.get("/")

        # Should use UTF-8 encoding
        assert "charset=utf-8" in response.headers.get("content-type", "").lower() or \
               response.encoding == "utf-8"


class TestConcurrentRequests:
    """Test handling of concurrent requests"""

    @pytest.mark.integration
    @pytest.mark.slow
    def test_concurrent_requests_handling(self, client):
        """Test that application handles concurrent requests"""
        import concurrent.futures

        def make_request():
            response = client.get("/")
            return response.status_code

        # Make 10 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]

        # All should succeed
        assert all(status == 200 for status in results)
        assert len(results) == 10
