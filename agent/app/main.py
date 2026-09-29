from __future__ import annotations
import asyncio
import os

from app.config import DEVICE_ID, DEVICE_TOKEN
from app.heartbeat import heartbeat_loop
from app.pairing import pair_new_device
from app.photo_scanner import scan_photos

from app.client import (
    send_photos,
    upload_photo,
    get_pending_transfers,
    download_transfer,
    complete_transfer,
    get_pending_compute_jobs,
    claim_compute_job,
    complete_compute_job,
)


# =========================================================
# SETTINGS
# =========================================================

PHOTO_SYNC_INTERVAL = 10       # Scan photos every 10 seconds
TRANSFER_SYNC_INTERVAL = 5     # Check transfers every 5 seconds


# =========================================================
# PHOTO SYNC
# DEVICE → HOMeMESH BACKEND
# =========================================================

async def photo_sync_loop(
    device_id: str,
    device_token: str,
):
    print("Photo sync started")

    while True:
        try:
            print("\nScanning for photos...")

            photos = scan_photos(
                max_photos=1000,
            )

            print(
                f"Photos found: {len(photos)}"
            )

            if photos:

                # -------------------------------------------------
                # Sync photo metadata
                # -------------------------------------------------

                response = await send_photos(
                    device_id=device_id,
                    device_token=device_token,
                    photos=photos,
                )

                print(
                    f"Photos synced: "
                    f"{response['photos']}"
                )

                # -------------------------------------------------
                # Get photos that still need actual upload
                # -------------------------------------------------

                photos_to_upload = response.get(
                    "photos_to_upload",
                    []
                )

                print(
                    f"Photos needing upload: "
                    f"{len(photos_to_upload)}"
                )

                # -------------------------------------------------
                # Upload missing photos
                # -------------------------------------------------

                for photo in photos_to_upload:
                    try:

                        # -------------------------------------------------
                        # Transferred files are already stored on this
                        # device by the HomeMesh transfer system.
                        #
                        # Do NOT upload them back to the backend.
                        # -------------------------------------------------

                        if photo.get("is_transferred"):
                            print(
                                f"Skipping re-upload for transferred file: "
                                f"{photo.get('file_name')}"
                            )
                            continue

                        file_path = photo["file_path"]

                        if not os.path.isfile(file_path):
                            print(
                                f"Photo missing: "
                                f"{file_path}"
                            )
                            continue

                        print(
                            f"Uploading: "
                            f"{os.path.basename(file_path)}"
                        )

                        upload_response = await upload_photo(
                            device_id=device_id,
                            device_token=device_token,
                            file_path=file_path,
                        )

                        print(
                            f"Uploaded: "
                            f"{upload_response['file_name']}"
                        )

                    except Exception as exc:
                        print(
                            f"Photo upload failed: "
                            f"{exc}"
                        )

            else:
                print("No photos found.")

        except Exception as exc:
            print(
                f"Photo sync failed: "
                f"{exc}"
            )

        await asyncio.sleep(
            PHOTO_SYNC_INTERVAL
        )


# =========================================================
# TRANSFER SYNC
# HOMeMESH BACKEND → DEVICE
# =========================================================

async def transfer_sync_loop(
    device_id: str,
    device_token: str,
):
    print("Transfer sync started")

    # ---------------------------------------------------------
    # Local directory where transferred files are stored
    # ---------------------------------------------------------

    storage_directory = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            "..",
            "storage",
            "transfers",
        )
    )

    os.makedirs(
        storage_directory,
        exist_ok=True,
    )

    print(
        f"Transfer storage: "
        f"{storage_directory}"
    )

    # ---------------------------------------------------------
    # Continuously check for new transfers
    # ---------------------------------------------------------

    while True:
        try:

            transfers = await get_pending_transfers(
                device_id=device_id,
                device_token=device_token,
            )

            if transfers:
                print(
                    f"\nTransfers waiting: "
                    f"{len(transfers)}"
                )

            # -----------------------------------------------------
            # Process each transfer
            # -----------------------------------------------------

            for transfer in transfers:

                transfer_id = str(
                    transfer["id"]
                )

                file_name = transfer["file_name"]

                # -------------------------------------------------
                # Prevent path traversal
                # -------------------------------------------------

                safe_file_name = os.path.basename(
                    file_name
                )

                destination = os.path.join(
                    storage_directory,
                    transfer_id + "_" + safe_file_name,
                )

                try:

                    print(
                        f"Downloading: "
                        f"{safe_file_name}"
                    )

                    # ---------------------------------------------
                    # Download from HomeMesh backend
                    # ---------------------------------------------

                    result = await download_transfer(
                        device_id=device_id,
                        device_token=device_token,
                        transfer_id=transfer_id,
                        destination=destination,
                    )

                    print(
                        f"Saved: "
                        f"{result['destination']}"
                    )

                    print(
                        f"Size: "
                        f"{result['size']} bytes"
                    )

                    # ---------------------------------------------
                    # Tell backend transfer completed
                    # ---------------------------------------------

                    complete_response = (
                        await complete_transfer(
                            device_id=device_id,
                            device_token=device_token,
                            transfer_id=transfer_id,
                        )
                    )

                    print(
                        f"Transfer completed: "
                        f"{safe_file_name}"
                    )

                    print(
                        f"Backend status: "
                        f"{complete_response['status']}"
                    )

                except Exception as exc:

                    print(
                        f"Transfer failed "
                        f"for {safe_file_name}: "
                        f"{exc}"
                    )

        except Exception as exc:

            print(
                f"Transfer sync failed: "
                f"{exc}"
            )

        await asyncio.sleep(
            TRANSFER_SYNC_INTERVAL
        )


# =========================================================
# COMPUTE SYNC
# HOMeMESH BACKEND → DEVICE COMPUTE WORKER
# =========================================================

COMPUTE_SYNC_INTERVAL = 5  # Check compute jobs every 5 seconds


def execute_compute_job(job_type: str, payload_raw: str | None) -> tuple[str, dict | str, str | None]:
    import json
    import time
    import hashlib
    import platform
    import psutil

    payload = {}
    if payload_raw:
        try:
            payload = json.loads(payload_raw) if isinstance(payload_raw, str) else payload_raw
        except Exception:
            payload = {"raw": payload_raw}

    try:
        if job_type == "ping":
            return "completed", {"pong": True, "timestamp": time.time()}, None

        elif job_type == "system_info":
            info = {
                "platform": platform.platform(),
                "python_version": platform.python_version(),
                "cpu_count_logical": psutil.cpu_count(logical=True),
                "cpu_count_physical": psutil.cpu_count(logical=False),
                "memory_total_gb": round(psutil.virtual_memory().total / (1024**3), 2),
                "memory_available_gb": round(psutil.virtual_memory().available / (1024**3), 2),
            }
            return "completed", info, None

        elif job_type == "prime_count":
            n = int(payload.get("n", 100000))
            start_time = time.time()

            # Simple sieve of Eratosthenes
            if n < 2:
                count = 0
            else:
                sieve = [True] * (n + 1)
                sieve[0] = sieve[1] = False
                for p in range(2, int(n**0.5) + 1):
                    if sieve[p]:
                        for i in range(p * p, n + 1, p):
                            sieve[i] = False
                count = sum(sieve)

            elapsed_ms = round((time.time() - start_time) * 1000, 2)
            return "completed", {"n": n, "prime_count": count, "elapsed_ms": elapsed_ms}, None

        elif job_type == "hash_calc":
            text = str(payload.get("text", "HomeMesh Distributed Compute"))
            algo = str(payload.get("algo", "sha256")).lower()

            if algo == "md5":
                hashed = hashlib.md5(text.encode("utf-8")).hexdigest()
            elif algo == "sha512":
                hashed = hashlib.sha512(text.encode("utf-8")).hexdigest()
            else:
                hashed = hashlib.sha256(text.encode("utf-8")).hexdigest()

            return "completed", {"algo": algo, "input": text, "hash": hashed}, None

        else:
            # Generic echo task
            return "completed", {"job_type": job_type, "input": payload, "status": "processed"}, None

    except Exception as exc:
        return "failed", None, str(exc)


async def compute_worker_loop(
    device_id: str,
    device_token: str,
):
    print("Compute worker loop started")

    while True:
        try:
            jobs = await get_pending_compute_jobs(
                device_id=device_id,
                device_token=device_token,
            )

            for job in jobs:
                job_id = str(job["id"])
                job_type = job["job_type"]
                payload_raw = job.get("payload")

                print(f"\nProcessing compute job {job_id} (type: {job_type})...")

                try:
                    await claim_compute_job(
                        device_id=device_id,
                        device_token=device_token,
                        job_id=job_id,
                    )

                    status, result, error_msg = execute_compute_job(job_type, payload_raw)

                    await complete_compute_job(
                        device_id=device_id,
                        device_token=device_token,
                        job_id=job_id,
                        status=status,
                        result=result,
                        error_message=error_msg,
                    )

                    print(f"Compute job {job_id} finished with status '{status}'")

                except Exception as exc:
                    print(f"Error executing compute job {job_id}: {exc}")

        except Exception as exc:
            print(f"Compute worker loop error: {exc}")

        await asyncio.sleep(COMPUTE_SYNC_INTERVAL)


# =========================================================
# MAIN
# =========================================================

async def main():

    device_id = DEVICE_ID
    device_token = DEVICE_TOKEN

    # ---------------------------------------------------------
    # First time: pair the device
    # ---------------------------------------------------------

    if not device_id or not device_token:

        print("Device is not paired.")

        device_id, device_token = (
            await pair_new_device()
        )

    print(
        f"Device ID: {device_id}"
    )

    print("Starting HomeMesh agent...")

    # ---------------------------------------------------------
    # Run all background tasks together
    # ---------------------------------------------------------

    await asyncio.gather(

        # Device heartbeat
        heartbeat_loop(
            device_id=device_id,
            device_token=device_token,
        ),

        # Device → backend photo synchronization
        photo_sync_loop(
            device_id=device_id,
            device_token=device_token,
        ),

        # Backend → device transfer synchronization
        transfer_sync_loop(
            device_id=device_id,
            device_token=device_token,
        ),

        # Distributed compute worker
        compute_worker_loop(
            device_id=device_id,
            device_token=device_token,
        ),
    )


# =========================================================
# ENTRY POINT
# =========================================================

if __name__ == "__main__":
    asyncio.run(main())