from app.core.config.settings import settings

print(settings.database_url)

from sqlalchemy import text
from app.infrastructure.database.session import engine

with engine.connect() as conn:
    result = conn.execute(text("SELECT version();"))
    print(result.scalar())