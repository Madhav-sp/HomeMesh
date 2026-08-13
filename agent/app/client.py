import httpx

from app.config import API_URL, DEVICE_ID, DEVICE_TOKEN


async def send_heartbeat(payload: dict) -> dict:
    url = f"{API_URL}/api/v1/devices/{DEVICE_ID}/heartbeat"

    headers = {
        "Authorization": f"Bearer {DEVICE_TOKEN}",
    }

    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.post(
            url,
            json=payload,
            headers=headers,
        )

        response.raise_for_status()

        return response.json()