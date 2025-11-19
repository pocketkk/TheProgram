"""
Client management endpoints (single-user mode)

No user authentication - all clients belong to "the user"
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database_sqlite import get_db
from app.models_sqlite import BirthData, Chart, SessionNote
from app.schemas_sqlite import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientWithStats,
    Message,
)

router = APIRouter()


@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_in: ClientCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new client

    Creates a new client record. No user_id required - all data belongs to "the user".

    Args:
        client_in: Client creation data
        db: Database session

    Returns:
        Created client
    """
    client = Client(
        first_name=client_in.first_name,
        last_name=client_in.last_name,
        email=client_in.email,
        phone=client_in.phone,
        notes=client_in.notes
    )

    db.add(client)
    db.commit()
    db.refresh(client)

    return client


@router.get("/", response_model=List[ClientResponse])
async def list_clients(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    List all clients

    Returns a paginated list of all clients. No user filtering needed.

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        db: Database session

    Returns:
        List of clients
    """
    clients = db.query(Client).offset(skip).limit(limit).all()
    return clients


@router.get("/{client_id}", response_model=ClientWithStats)
async def get_client(
    client_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get client by ID

    Returns a specific client's information with statistics.
    No ownership check needed - all data belongs to "the user".

    Args:
        client_id: Client ID
        db: Database session

    Returns:
        Client information with statistics

    Raises:
        HTTPException 404: If client not found
    """
    client = db.query(Client).filter(Client.id == client_id).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    # Get statistics
    birth_data_count = db.query(BirthData).filter(BirthData.client_id == client_id).count()
    chart_count = db.query(Chart).filter(Chart.client_id == client_id).count()
    session_notes_count = db.query(SessionNote).filter(SessionNote.client_id == client_id).count()

    # Create response with stats
    client_dict = {
        "id": client.id,
        "first_name": client.first_name,
        "last_name": client.last_name,
        "email": client.email,
        "phone": client.phone,
        "notes": client.notes,
        "created_at": client.created_at,
        "updated_at": client.updated_at,
        "birth_data_count": birth_data_count,
        "chart_count": chart_count,
        "session_notes_count": session_notes_count
    }

    return client_dict


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: UUID,
    client_update: ClientUpdate,
    db: Session = Depends(get_db)
):
    """
    Update client information

    Updates a client's information. No ownership check needed.

    Args:
        client_id: Client ID
        client_update: Client update data
        db: Database session

    Returns:
        Updated client

    Raises:
        HTTPException 404: If client not found
    """
    client = db.query(Client).filter(Client.id == client_id).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    # Update fields
    if client_update.first_name is not None:
        client.first_name = client_update.first_name

    if client_update.last_name is not None:
        client.last_name = client_update.last_name

    if client_update.email is not None:
        client.email = client_update.email

    if client_update.phone is not None:
        client.phone = client_update.phone

    if client_update.notes is not None:
        client.notes = client_update.notes

    db.commit()
    db.refresh(client)

    return client


@router.delete("/{client_id}", response_model=Message)
async def delete_client(
    client_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Delete client

    Permanently deletes a client and all associated data (birth data, charts, notes).
    No ownership check needed.

    Args:
        client_id: Client ID
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException 404: If client not found
    """
    client = db.query(Client).filter(Client.id == client_id).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    db.delete(client)
    db.commit()

    return {
        "message": "Client deleted successfully",
        "detail": "Client and all associated data have been permanently removed"
    }
