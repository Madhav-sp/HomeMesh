import uuid

from sqlalchemy import select

from app.infrastructure.database.session import SessionLocal
from app.modules.users.models import User
from app.modules.users import repository


def test_create_user_in_database():
    db = SessionLocal()

    email = f"test-{uuid.uuid4()}@example.com"

    try:
        user = repository.create(
            db=db,
            email=email,
            password_hash="fake_hash",
        )

        assert user.id is not None
        assert user.email == email
        assert user.password_hash == "fake_hash"
        assert user.is_active is True
        assert user.created_at is not None
        assert user.updated_at is not None

        stored_user = db.scalar(
            select(User).where(User.id == user.id)
        )

        assert stored_user is not None
        assert stored_user.email == email

    finally:
        db.delete(user)
        db.commit()
        db.close()


import pytest
from sqlalchemy.exc import IntegrityError


def test_duplicate_email_rejected_by_database():
    db = SessionLocal()

    email = f"duplicate-{uuid.uuid4()}@example.com"

    try:
        first_user = repository.create(
            db=db,
            email=email,
            password_hash="hash1",
        )

        with pytest.raises(IntegrityError):
            repository.create(
                db=db,
                email=email,
                password_hash="hash2",
            )

        db.rollback()

        db.delete(first_user)
        db.commit()

    finally:
        db.close()