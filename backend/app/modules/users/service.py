from sqlalchemy.orm import Session

from app.core.security.passwords import hash_password, verify_password
from app.modules.users import repository
from app.modules.users.models import User


class UserAlreadyExistsError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


def create_user(
    db: Session,
    email: str,
    password: str,
) -> User:
    existing_user = repository.get_by_email(db, email)

    if existing_user is not None:
        raise UserAlreadyExistsError(
            "A user with this email already exists."
        )

    return repository.create(
        db=db,
        email=email,
        password_hash=hash_password(password),
    )


def authenticate_user(
    db: Session,
    email: str,
    password: str,
) -> User:
    user = repository.get_by_email(db, email)

    if user is None:
        raise InvalidCredentialsError("Invalid credentials.")

    if not verify_password(password, user.password_hash):
        raise InvalidCredentialsError("Invalid credentials.")

    if not user.is_active:
        raise InvalidCredentialsError("User account is inactive.")

    return user