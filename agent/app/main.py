import asyncio

from app.heartbeat import heartbeat_loop


async def main():
    await heartbeat_loop()


if __name__ == "__main__":
    asyncio.run(main())