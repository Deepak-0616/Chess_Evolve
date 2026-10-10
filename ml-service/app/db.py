import os
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.pool import QueuePool
from dotenv import load_dotenv

# Try finding .env relative to ml-service root or backend
load_dotenv(os.path.join(os.path.dirname(__file__), "../../backend/.env"))
load_dotenv()

# Get DB URL from env
db_url = os.environ.get("DIRECT_DATABASE_URL", os.environ.get("DATABASE_URL"))
if not db_url:
    raise ValueError("Database URL not found in environment variables.")

# Parse URL with SQLAlchemy make_url to safely sanitize Prisma-specific query params
parsed_url = make_url(db_url)
query_params = dict(parsed_url.query)

# Strip parameters that Prisma uses but psycopg2/libpq rejects as DSN options
schema = query_params.pop("schema", None)
query_params.pop("pgbouncer", None)
query_params.pop("connection_limit", None)

connect_args = {}
# If schema was provided, safely set search_path via PostgreSQL connection options
if schema:
    connect_args["options"] = f"-c search_path={schema}"

# Force postgresql+psycopg2 driver if using postgresql dialect
drivername = parsed_url.drivername
if drivername == "postgresql" or drivername.startswith("postgres"):
    drivername = "postgresql+psycopg2"

sanitized_url = parsed_url.set(drivername=drivername, query=query_params)

# Configure connection pooling limits safely for Supabase connection limits
pool_size = int(os.environ.get("ML_DB_POOL_SIZE", "5"))
max_overflow = int(os.environ.get("ML_DB_MAX_OVERFLOW", "2"))
pool_timeout = int(os.environ.get("ML_DB_POOL_TIMEOUT", "30"))
pool_recycle = int(os.environ.get("ML_DB_POOL_RECYCLE", "1800"))

# Create a single global engine with QueuePool and pool_pre_ping
engine = create_engine(
    sanitized_url,
    connect_args=connect_args,
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
