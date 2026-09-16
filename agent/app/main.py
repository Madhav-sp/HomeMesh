import asyncio
import os

from app.config import DEVICE_ID, DEVICE_TOKEN
from app.heartbeat import heartbeat_loop
from app.pairing import pair_new_device
from app.photo_scanner import scan_photos
from app.client import send_photos, upload_photo


PHOTO_SYNC_INTERVAL = 300  # 5 minutes


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
                # First sync photo metadata
                response = await send_photos(
                    device_id=device_id,
                    device_token=device_token,
                    photos=photos,
                )

                print(
                    f"Photos synced: "
                    f"{response['photos']}"
                )

                # Backend tells us which photos
                # still need their actual image bytes
                photos_to_upload = response.get(
                    "photos_to_upload",
                    []
                )

                print(
                    f"Photos needing upload: "
                    f"{len(photos_to_upload)}"
                )

                # Upload only photos that are missing
                # from backend storage
                for photo in photos_to_upload:
                    try:
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


async def main():
    device_id = DEVICE_ID
    device_token = DEVICE_TOKEN

    # First time: pair the device
    if not device_id or not device_token:
        print("Device is not paired.")

        device_id, device_token = await pair_new_device()

    # Run heartbeat and photo sync together
    await asyncio.gather(
        heartbeat_loop(
            device_id=device_id,
            device_token=device_token,
        ),
        photo_sync_loop(
            device_id=device_id,
            device_token=device_token,
        ),
    )


if __name__ == "__main__":
    asyncio.run(main())