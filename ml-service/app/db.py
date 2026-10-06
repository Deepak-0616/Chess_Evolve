import os
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool
from dotenv import load_dotenv

# Try finding .env relative to ml-service root or backend
load_dotenv(os.path.join(os.path.dirname(__file__), "../../backend/.env"))
load_dotenv()

# Get DB URL from env
db_url = os.environ.get("DIRECT_DATABASE_URL", os.environ.get("DATABASE_URL"))
if not db_url:
    raise ValueError("Database URL not found in environment variables.")

if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

# Configure connection pooling limits safely for Supabase connection limits
pool_size = int(os.environ.get("ML_DB_POOL_SIZE", "5"))
max_overflow = int(os.environ.get("ML_DB_MAX_OVERFLOW", "2"))
pool_timeout = int(os.environ.get("ML_DB_POOL_TIMEOUT", "30"))
pool_recycle = int(os.environ.get("ML_DB_POOL_RECYCLE", "1800"))

# Create a single global engine with QueuePool and pool_pre_ping
engine = create_engine(
    db_url,
    poolclass=QueuePool,
    pool_size=pool_size,
    max_overflow=max_overflow,
    pool_timeout=pool_timeout,
    pool_recycle=pool_recycle,
    pool_pre_ping=True
)

def get_engine():
    return engine

def dispose_engine():
    """Explicitly closes all connections in the pool on shutdown or before heavy training."""
    if engine:
        engine.dispose()
