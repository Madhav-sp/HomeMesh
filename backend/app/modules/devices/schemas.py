from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DeviceRegister(BaseModel):
    name: str
    hostname: str
    os: str
    agent_version: str


class DeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    hostname: str
    os: str
    agent_version: str
    status: str
    last_seen: datetime | None
    created_at: datetime
    updated_at: datetime