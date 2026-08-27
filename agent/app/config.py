import os

from dotenv import load_dotenv

load_dotenv()


API_URL = os.getenv(
    "HOMEMESH_API_URL",
    "http://127.0.0.1:8000",
)

DEVICE_ID = os.getenv("HOMEMESH_DEVICE_ID")
DEVICE_TOKEN = os.getenv("HOMEMESH_DEVICE_TOKEN")

HEARTBEAT_INTERVAL = int(
    os.getenv("HOMEMESH_HEARTBEAT_INTERVAL", "10")
)