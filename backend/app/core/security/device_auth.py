import hashlib

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.infrastructure.database.dependencies import get_db
from app.modules.devices import repository
from app.modules.devices.models import Device


security = HTTPBearer()


def get_current_device(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> Device:

    token = credentials.credentials

    token_hash = hashlib.sha256(
        token.encode()
    ).hexdigest()

    device = repository.get_by_token_hash(
        db,
        token_hash,
    )

    if device is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid device token.",
        )

    return device