from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.users.models import User


def get_by_id(db: Session, user_id: UUID) -> User | None:
    return db.scalar(
        select(User).where(User.id == user_id)
    )


def get_by_email(db: Session, email: str) -> User | None:
    return db.scalar(
        select(User).where(User.email == email)
    )


def create(
    db: Session,
    email: str,
    password_hash: str,
) -> User:
    user = User(
        email=email,
        password_hash=password_hash,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user