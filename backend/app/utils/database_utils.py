"""
Database utility functions
Helper functions for common database operations
"""
from typing import Optional, Type, TypeVar, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.base import Base

# Generic type for models
ModelType = TypeVar("ModelType", bound=Base)


def create_record(db: Session, model: Type[ModelType], **kwargs) -> Optional[ModelType]:
    """
    Create a new record in the database

    Args:
        db: Database session
        model: SQLAlchemy model class
        **kwargs: Field values for the record

    Returns:
        Created record or None if failed
    """
    try:
        record = model(**kwargs)
        db.add(record)
        db.commit()
        db.refresh(record)
        return record
    except IntegrityError as e:
        db.rollback()
        print(f"Error creating record: {e}")
        return None


def get_record_by_id(
    db: Session,
    model: Type[ModelType],
    record_id: str
) -> Optional[ModelType]:
    """
    Get a record by ID

    Args:
        db: Database session
        model: SQLAlchemy model class
        record_id: Record UUID

    Returns:
        Record or None if not found
    """
    return db.query(model).filter(model.id == record_id).first()


def update_record(
    db: Session,
    record: ModelType,
    **kwargs
) -> Optional[ModelType]:
    """
    Update a record

    Args:
        db: Database session
        record: Record to update
        **kwargs: Fields to update

    Returns:
        Updated record or None if failed
    """
    try:
        for key, value in kwargs.items():
            setattr(record, key, value)
        db.commit()
        db.refresh(record)
        return record
    except IntegrityError as e:
        db.rollback()
        print(f"Error updating record: {e}")
        return None


def delete_record(db: Session, record: ModelType) -> bool:
    """
    Delete a record

    Args:
        db: Database session
        record: Record to delete

    Returns:
        True if successful, False otherwise
    """
    try:
        db.delete(record)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"Error deleting record: {e}")
        return False


def get_all_records(
    db: Session,
    model: Type[ModelType],
    skip: int = 0,
    limit: int = 100
) -> List[ModelType]:
    """
    Get all records with pagination

    Args:
        db: Database session
        model: SQLAlchemy model class
        skip: Number of records to skip
        limit: Maximum number of records to return

    Returns:
        List of records
    """
    return db.query(model).offset(skip).limit(limit).all()


def count_records(db: Session, model: Type[ModelType]) -> int:
    """
    Count total records

    Args:
        db: Database session
        model: SQLAlchemy model class

    Returns:
        Total count of records
    """
    return db.query(model).count()


def record_exists(db: Session, model: Type[ModelType], **kwargs) -> bool:
    """
    Check if a record exists with given criteria

    Args:
        db: Database session
        model: SQLAlchemy model class
        **kwargs: Filter criteria

    Returns:
        True if exists, False otherwise
    """
    query = db.query(model)
    for key, value in kwargs.items():
        query = query.filter(getattr(model, key) == value)
    return query.first() is not None
