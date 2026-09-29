import json
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security.dependencies import get_current_user
from app.core.security.device_auth import get_current_device
from app.infrastructure.database.dependencies import get_db
from app.modules.devices import repository
from app.modules.devices.compute_model import ComputeJob
from app.modules.devices.models import Device
from app.modules.users.models import User

router = APIRouter(
    prefix="/api/v1/compute",
    tags=["Compute"],
)


class CreateComputeJobRequest(BaseModel):
    target_device_id: UUID
    job_type: str
    payload: dict | str | None = None


class CompleteComputeJobRequest(BaseModel):
    status: str
    result: dict | str | None = None
    error_message: str | None = None


# =========================================================
# CREATE COMPUTE JOB (USER)
# =========================================================

@router.post("/jobs")
def create_compute_job(
    data: CreateComputeJobRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    device = repository.get_by_id(db=db, device_id=data.target_device_id)
    if device is None or device.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target device not found.",
        )

    if device.status != "online":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Target device is not online.",
        )

    payload_str = (
        json.dumps(data.payload)
        if isinstance(data.payload, dict)
        else data.payload
    )

    job = ComputeJob(
        owner_id=current_user.id,
        target_device_id=data.target_device_id,
        job_type=data.job_type,
        payload=payload_str,
        status="pending",
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    return {
        "id": job.id,
        "target_device_id": job.target_device_id,
        "target_device_name": device.name,
        "job_type": job.job_type,
        "payload": job.payload,
        "status": job.status,
        "created_at": job.created_at,
    }


# =========================================================
# LIST COMPUTE JOBS (USER)
# =========================================================

@router.get("/jobs")
def list_compute_jobs(
    device_id: UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        select(ComputeJob, Device)
        .join(Device, ComputeJob.target_device_id == Device.id)
        .where(ComputeJob.owner_id == current_user.id)
    )

    if device_id:
        query = query.where(ComputeJob.target_device_id == device_id)

    query = query.order_by(ComputeJob.created_at.desc())
    results = db.execute(query).tuples().all()

    return [
        {
            "id": job.id,
            "target_device_id": device.id,
            "target_device_name": device.name,
            "job_type": job.job_type,
            "payload": job.payload,
            "status": job.status,
            "result": job.result,
            "error_message": job.error_message,
            "created_at": job.created_at,
            "started_at": job.started_at,
            "completed_at": job.completed_at,
        }
        for job, device in results
    ]


# =========================================================
# GET PENDING JOBS (AGENT)
# =========================================================

@router.get("/jobs/pending")
def get_pending_jobs(
    current_device: Device = Depends(get_current_device),
    db: Session = Depends(get_db),
):
    jobs = list(
        db.scalars(
            select(ComputeJob)
            .where(
                ComputeJob.target_device_id == current_device.id,
                ComputeJob.status == "pending",
            )
            .order_by(ComputeJob.created_at.asc())
        )
    )

    return [
        {
            "id": job.id,
            "job_type": job.job_type,
            "payload": job.payload,
            "created_at": job.created_at,
        }
        for job in jobs
    ]


# =========================================================
# CLAIM JOB (AGENT)
# =========================================================

@router.post("/jobs/{job_id}/claim")
def claim_job(
    job_id: UUID,
    current_device: Device = Depends(get_current_device),
    db: Session = Depends(get_db),
):
    job = db.scalar(
        select(ComputeJob).where(ComputeJob.id == job_id)
    )

    if job is None or job.target_device_id != current_device.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compute job not found.",
        )

    job.status = "running"
    job.started_at = datetime.now(timezone.utc)
    db.commit()

    return {"id": job.id, "status": job.status}


# =========================================================
# COMPLETE JOB (AGENT)
# =========================================================

@router.post("/jobs/{job_id}/complete")
def complete_job(
    job_id: UUID,
    data: CompleteComputeJobRequest,
    current_device: Device = Depends(get_current_device),
    db: Session = Depends(get_db),
):
    job = db.scalar(
        select(ComputeJob).where(ComputeJob.id == job_id)
    )

    if job is None or job.target_device_id != current_device.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compute job not found.",
        )

    job.status = data.status
    result_str = (
        json.dumps(data.result)
        if isinstance(data.result, dict)
        else data.result
    )
    job.result = result_str
    job.error_message = data.error_message
    job.completed_at = datetime.now(timezone.utc)

    db.commit()

    return {"id": job.id, "status": job.status}
