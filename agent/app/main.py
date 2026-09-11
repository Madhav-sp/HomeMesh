import asyncio

from app.config import DEVICE_ID, DEVICE_TOKEN
from app.heartbeat import heartbeat_loop
from app.pairing import pair_new_device
from app.photo_scanner import scan_photos
from app.client import send_photos


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
                response = await send_photos(
                    device_id=device_id,
                    device_token=device_token,
                    photos=photos,
                )

                print(
                    f"Photos synced: "
                    f"{response['photos']}"
                )
            else:
                print("No photos found.")

        except Exception as exc:
            print(
                f"Photo sync failed: {exc}"
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