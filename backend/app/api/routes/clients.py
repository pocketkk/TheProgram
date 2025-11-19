"""
Client management endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models import User, BirthData, Chart, SessionNote
from app.schemas import (
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new client

    Creates a new client record for the authenticated user.

    Args:
        client_in: Client creation data
        db: Database session
        current_user: Current authenticated user

    Returns:
        Created client
    """
    client = Client(
        user_id=current_user.id,
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all clients for current user

    Returns a paginated list of clients belonging to the authenticated user.

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        db: Database session
        current_user: Current authenticated user

    Returns:
        List of clients
    """
    clients = db.query(Client).filter(
        Client.user_id == current_user.id
    ).offset(skip).limit(limit).all()

    return clients


@router.get("/{client_id}", response_model=ClientWithStats)
async def get_client(
    client_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get client by ID

    Returns a specific client's information with statistics.

    Args:
        client_id: Client ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        Client information with statistics

    Raises:
        HTTPException 404: If client not found
        HTTPException 403: If client doesn't belong to user
    """
    client = db.query(Client).filter(Client.id == client_id).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    # Check ownership
    if client.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this client"
        )

    # Get statistics
    birth_data_count = db.query(BirthData).filter(BirthData.client_id == client_id).count()
    chart_count = db.query(Chart).filter(Chart.client_id == client_id).count()
    session_notes_count = db.query(SessionNote).filter(SessionNote.client_id == client_id).count()

    # Create response with stats
    client_dict = {
        "id": client.id,
        "user_id": client.user_id,
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update client information

    Updates a client's information.

    Args:
        client_id: Client ID
        client_update: Client update data
        db: Database session
        current_user: Current authenticated user

    Returns:
        Updated client

    Raises:
        HTTPException 404: If client not found
        HTTPException 403: If client doesn't belong to user
    """
    client = db.query(Client).filter(Client.id == client_id).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    # Check ownership
    if client.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this client"
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete client

    Permanently deletes a client and all associated data (birth data, charts, notes).

    Args:
        client_id: Client ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        Success message

    Raises:
        HTTPException 404: If client not found
        HTTPException 403: If client doesn't belong to user
    """
    client = db.query(Client).filter(Client.id == client_id).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    # Check ownership
    if client.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this client"
        )

    db.delete(client)
    db.commit()

    return {
        "message": "Client deleted successfully",
        "detail": "Client and all associated data have been permanently removed"
    }
