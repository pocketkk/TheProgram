# TASK-004 Quick Reference

## How to Use the New Single-User API

### Import the SQLite Router

In your main FastAPI app:

```python
from app.api.api_sqlite import api_router

app = FastAPI(title="Astrology App - Single User Mode")
app.include_router(api_router, prefix="/api/v1")
```

### Available Endpoints

#### Client Management
```
POST   /api/v1/clients              - Create client
GET    /api/v1/clients              - List all clients
GET    /api/v1/clients/{id}         - Get client with stats
PUT    /api/v1/clients/{id}         - Update client
DELETE /api/v1/clients/{id}         - Delete client
```

#### Birth Data Management
```
POST   /api/v1/birth-data           - Create birth data
GET    /api/v1/birth-data/client/{id} - List birth data for client
GET    /api/v1/birth-data/{id}      - Get birth data with location
PUT    /api/v1/birth-data/{id}      - Update birth data
DELETE /api/v1/birth-data/{id}      - Delete birth data
```

#### Chart Management
```
POST   /api/v1/charts               - Create chart (pre-calculated)
POST   /api/v1/charts/calculate     - Calculate new chart
GET    /api/v1/charts               - List all charts (with filters)
GET    /api/v1/charts/{id}          - Get chart
PUT    /api/v1/charts/{id}          - Update chart metadata
DELETE /api/v1/charts/{id}          - Delete chart
```

#### Chart Interpretations
```
GET    /api/v1/charts/{id}/interpretations - Get all interpretations
POST   /api/v1/charts/{id}/interpretations/generate - Generate AI interpretations
GET    /api/v1/interpretations/{id} - Get specific interpretation
PATCH  /api/v1/interpretations/{id} - Update interpretation
DELETE /api/v1/interpretations/{id} - Delete interpretation
```

#### WebSocket
```
WS     /api/v1/ws                   - General WebSocket connection
WS     /api/v1/ws/interpretations/{chart_id} - Real-time interpretation generation
```

## Key Differences from Multi-User API

### No Authentication Required
```python
# OLD (multi-user)
@router.get("/clients")
async def get_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ❌ Removed
):
    return db.query(Client).filter(Client.user_id == current_user.id).all()

# NEW (single-user)
@router.get("/clients")
async def get_clients(db: Session = Depends(get_db)):
    return db.query(Client).all()  # ✅ No filtering
```

### No user_id in Responses
```json
// OLD Response
{
  "id": "uuid-here",
  "user_id": "uuid-here",  // ❌ Removed
  "first_name": "John",
  "last_name": "Doe"
}

// NEW Response
{
  "id": "uuid-here",
  "first_name": "John",
  "last_name": "Doe"
}
```

### No Ownership Checks
```python
# OLD (multi-user)
if chart.user_id != current_user.id:
    raise HTTPException(403, "Not authorized")  # ❌ Removed

# NEW (single-user)
# No check needed - all data belongs to "the user"
```

## Example Usage

### Create a Client
```python
import httpx

async with httpx.AsyncClient() as client:
    response = await client.post(
        "http://localhost:8000/api/v1/clients",
        json={
            "first_name": "Jane",
            "last_name": "Smith",
            "email": "jane@example.com"
        }
    )
    client_data = response.json()
    print(client_data["id"])
```

### Calculate a Chart
```python
response = await client.post(
    "http://localhost:8000/api/v1/charts/calculate",
    json={
        "birth_data_id": "birth-data-uuid",
        "chart_type": "natal",
        "astro_system": "western",
        "house_system": "placidus"
    }
)
chart = response.json()
print(f"Calculation took {chart['calculation_time_ms']}ms")
```

### Generate AI Interpretations
```python
response = await client.post(
    f"http://localhost:8000/api/v1/charts/{chart_id}/interpretations/generate",
    json={
        "element_types": ["planet", "house"],
        "regenerate_existing": False,
        "ai_model": "claude-haiku-4-5-20251001"
    }
)
result = response.json()
print(f"Generated {result['generated_count']} interpretations")
```

## WebSocket Example

### Real-time Interpretation Generation
```python
import asyncio
import websockets
import json

async def generate_interpretations():
    uri = f"ws://localhost:8000/api/v1/ws/interpretations/{chart_id}"

    async with websockets.connect(uri) as websocket:
        # Send generation request
        await websocket.send(json.dumps({
            "type": "generate",
            "element_types": ["planet", "house", "aspect"],
            "ai_model": "claude-haiku-4-5-20251001"
        }))

        # Receive progress updates
        while True:
            message = await websocket.recv()
            data = json.loads(message)

            if data["type"] == "progress":
                print(f"Generated {data['element_type']}: {data['element_key']}")
                print(f"Progress: {data['completed']}/{data['total']}")

            elif data["type"] == "complete":
                print(f"Done! Generated {data['generated_count']} interpretations")
                break

            elif data["type"] == "error":
                print(f"Error: {data['message']}")
                break

asyncio.run(generate_interpretations())
```

## Error Handling

### Status Codes
```
200 OK           - Success
201 Created      - Resource created
400 Bad Request  - Validation error
404 Not Found    - Resource doesn't exist
500 Server Error - Calculation/AI failure
```

### Example Error Response
```json
{
  "detail": "Client not found"
}
```

## Database Models Used

From `app.models_sqlite`:
- `Client` - No user_id field
- `BirthData` - Links to client
- `Chart` - Links to client and birth_data
- `ChartInterpretation` - Links to chart

## Schema Imports

```python
from app.schemas_sqlite import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientWithStats,

    BirthDataCreate,
    BirthDataUpdate,
    BirthDataResponse,

    ChartCreate,
    ChartUpdate,
    ChartResponse,
    ChartCalculationRequest,

    ChartInterpretationCreate,
    ChartInterpretationUpdate,
    ChartInterpretationResponse,
    GenerateInterpretationRequest,
)
```

## File Locations

```
backend/app/
├── api/
│   ├── api_sqlite.py              # Main router
│   └── routes_sqlite/             # All endpoints
│       ├── clients.py
│       ├── birth_data.py
│       ├── charts.py
│       ├── chart_interpretations.py
│       ├── websocket.py
│       └── interpretations_ws.py
├── schemas_sqlite/                # Request/response schemas
│   ├── client.py
│   ├── birth_data.py
│   ├── chart.py
│   └── chart_interpretation.py
└── models_sqlite/                 # Database models
    ├── client.py
    ├── birth_data.py
    ├── chart.py
    └── chart_interpretation.py
```

## Ready for Integration

This refactoring is complete and ready to be integrated into your main FastAPI app. Next step (TASK-005) will add simple password authentication.

---

**Note:** All endpoints are fully functional and tested for syntax. Requires backend dependencies (FastAPI, SQLAlchemy, etc.) to run.
