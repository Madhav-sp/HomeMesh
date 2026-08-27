import asyncio

from app.config import DEVICE_ID, DEVICE_TOKEN
from app.heartbeat import heartbeat_loop
from app.pairing import pair_new_device


async def main():
    device_id = DEVICE_ID
    device_token = DEVICE_TOKEN

    # First time: pair the device
    if not device_id or not device_token:
        print("Device is not paired.")

        device_id, device_token = await pair_new_device()

    # Start monitoring
    await heartbeat_loop(
        device_id=device_id,
        device_token=device_token,
    )


if __name__ == "__main__":
    asyncio.run(main())