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

class PairDeviceRequest(BaseModel):
    pairing_code: str

class PairDeviceResponse(BaseModel):
    device_id: UUID
    device_token: str

class PairingCodeResponse(BaseModel):
    code: str
    expires_at: datetime

class PairDeviceRequest(BaseModel):
    pairing_code: str


class PairDeviceResponse(BaseModel):
    device_id: UUID
    device_token: str

class HeartbeatRequest(BaseModel):
    cpu_percent: float | None = None
    memory_percent: float | None = None
    memory_used: int | None = None
    memory_total: int | None = None
    disk_percent: float | None = None
    disk_used: int | None = None
    disk_total: int | None = None

class HeartbeatResponse(BaseModel):
    status: str
    last_seen: datetime