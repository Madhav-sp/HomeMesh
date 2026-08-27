from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------
# USER CREATES A PENDING DEVICE
# ---------------------------------------------------------

class DeviceCreate(BaseModel):
    name: str


# ---------------------------------------------------------
# AGENT INFORMATION
# ---------------------------------------------------------

class DeviceAgentInfo(BaseModel):
    hostname: str
    os: str
    agent_version: str


# ---------------------------------------------------------
# DEVICE RESPONSE
# ---------------------------------------------------------

class DeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    hostname: str | None
    os: str | None
    agent_version: str | None
    status: str
    last_seen: datetime | None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------
# PAIRING
# ---------------------------------------------------------

class PairDeviceRequest(BaseModel):
    pairing_code: str
    hostname: str
    os: str
    agent_version: str


class PairDeviceResponse(BaseModel):
    device_id: UUID
    device_token: str


class PairingCodeResponse(BaseModel):
    code: str
    expires_at: datetime


# ---------------------------------------------------------
# HEARTBEAT
# ---------------------------------------------------------

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


# ---------------------------------------------------------
# LATEST METRICS
# ---------------------------------------------------------

class LatestMetrics(BaseModel):
    cpu_percent: float | None = None
    memory_percent: float | None = None
    memory_used: int | None = None
    memory_total: int | None = None
    disk_percent: float | None = None
    disk_used: int | None = None
    disk_total: int | None = None
    created_at: datetime | None = None


# ---------------------------------------------------------
# DEVICE DETAILS
# ---------------------------------------------------------

class DeviceDetailResponse(BaseModel):
    id: UUID
    name: str
    hostname: str | None
    os: str | None
    agent_version: str | None
    status: str
    last_seen: datetime | None
    latest_metrics: LatestMetrics | None = None


# ---------------------------------------------------------
# DEVICE LIST
# ---------------------------------------------------------

class DeviceListResponse(BaseModel):
    id: UUID
    name: str
    hostname: str | None
    os: str | None
    agent_version: str | None
    status: str
    last_seen: datetime | None
    created_at: datetime
    updated_at: datetime
    latest_metrics: LatestMetrics | None = None