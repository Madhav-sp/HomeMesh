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
    )


# =========================================================
# ENTRY POINT
# =========================================================

if __name__ == "__main__":
    asyncio.run(main())