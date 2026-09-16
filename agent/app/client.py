import httpx

from app.config import API_URL
import mimetypes
import os


async def pair_device(
    pairing_code: str,
    hostname: str,
    os_name: str,
    agent_version: str,
) -> dict:
    url = f"{API_URL}/api/v1/devices/pair"

    payload = {
        "pairing_code": pairing_code,
        "hostname": hostname,
        "os": os_name,
        "agent_version": agent_version,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            url,
            json=payload,
        )

        response.raise_for_status()

        return response.json()


async def send_heartbeat(
    device_id: str,
    device_token: str,
    payload: dict,
) -> dict:
    url = (
        f"{API_URL}/api/v1/devices/"
        f"{device_id}/heartbeat"
    )

    headers = {
        "Authorization": f"Bearer {device_token}",
    }

    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.post(
            url,
            json=payload,
            headers=headers,
        )

        response.raise_for_status()

        return response.json()


async def send_storage(
    device_id: str,
    device_token: str,
    storage: list,
) -> dict:
    url = f"{API_URL}/api/v1/devices/{device_id}/storage"

    headers = {
        "Authorization": f"Bearer {device_token}"
    }

    payload = {
        "storage": storage
    }

    async with httpx.AsyncClient(
        timeout=10.0
    ) as client:
        response = await client.post(
            url,
            json=payload,
            headers=headers,
        )

        response.raise_for_status()

        return response.json()

async def send_photos(
    device_id: str,
    device_token: str,
    photos: list,
) -> dict:
    url = f"{API_URL}/api/v1/devices/{device_id}/photos"

    headers = {
        "Authorization": f"Bearer {device_token}"
    }

    payload = {
        "photos": photos
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            url,
            json=payload,
            headers=headers,
        )

        response.raise_for_status()

        return response.json()


async def upload_photo(
    device_id,
    device_token,
    file_path,
):
    url = (
        f"{API_URL}/api/v1/devices/"
        f"{device_id}/photos/upload"
    )

    headers = {
        "Authorization": f"Bearer {device_token}"
    }

    mime_type, _ = mimetypes.guess_type(file_path)

    if mime_type is None:
        mime_type = "application/octet-stream"

    async with httpx.AsyncClient(
        timeout=120.0
    ) as client:

        with open(file_path, "rb") as photo_file:
            files = {
                "file": (
                    os.path.basename(file_path),
                    photo_file,
                    mime_type,
                )
            }

            data = {
                "file_path": file_path
            }

            response = await client.post(
                url,
                headers=headers,
                data=data,
                files=files,
            )

            response.raise_for_status()

            return response.json()