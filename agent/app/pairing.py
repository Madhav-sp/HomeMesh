import os
import platform

from app.client import pair_device


AGENT_VERSION = "1.0.0"


async def pair_new_device():
    pairing_code = input(
        "Enter HomeMesh pairing code: "
    ).strip()

    response = await pair_device(
        pairing_code=pairing_code,
        hostname=platform.node(),
        os_name=platform.platform(),
        agent_version=AGENT_VERSION,
    )

    device_id = response["device_id"]
    device_token = response["device_token"]

    # Save credentials to .env
    with open(".env", "a", encoding="utf-8") as file:
        file.write(
            f"\nHOMEMESH_DEVICE_ID={device_id}\n"
        )
        file.write(
            f"HOMEMESH_DEVICE_TOKEN={device_token}\n"
        )

    print("\nDevice paired successfully!")
    print(f"Device ID: {device_id}")

    return device_id, device_token