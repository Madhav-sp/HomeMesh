from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security.jwt import create_access_token
from app.infrastructure.database.dependencies import get_db
from app.modules.users.schemas import (
    LoginRequest,
    TokenResponse,
    UserCreate,
    UserResponse,
)
from app.modules.users.service import (
    InvalidCredentialsError,
    UserAlreadyExistsError,
    authenticate_user,
    create_user,
)
from app.core.security.dependencies import get_current_user
from app.modules.users.models import User

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Authentication"],
)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    data: UserCreate,
    db: Session = Depends(get_db),
):
    try:
        return create_user(
            db=db,
            email=data.email,
            password=data.password,
        )
    except UserAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    try:
        user = authenticate_user(
            db=db,
            email=data.email,
            password=data.password,
        )
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    return TokenResponse(
        access_token=create_access_token(user.id),
    )

@router.get(
    "/me",
    response_model=UserResponse,
)
def get_me(
    current_user: User = Depends(get_current_user),
):
    return current_user