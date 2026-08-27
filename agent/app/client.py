import httpx

from app.config import API_URL


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