import pytest
from sqlalchemy import text
from app.db import get_engine

def test_sqlalchemy_connection_pool_safety():
    """
    Verifies that repeated queries properly release connections back to the QueuePool,
    maintaining checkedout count at 0 and preventing connection exhaustion.
    """
    engine = get_engine()
    initial_checkedout = engine.pool.checkedout()
    assert initial_checkedout == 0, f"Expected 0 initial checkedout connections, got {initial_checkedout}"

    # Perform 50 sequential queries simulating high request load
    for i in range(50):
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1 AS val")).fetchone()
            assert result[0] == 1
            # During checkout, checkedout is at least 1
            assert engine.pool.checkedout() >= 1

    # After exiting all context managers, all connections must be returned to the pool
    final_checkedout = engine.pool.checkedout()
    assert final_checkedout == 0, f"Connections leaked! {final_checkedout} connections remained checked out."

    # Pool size must remain bounded within configured limits
    pool_size = engine.pool.size()
    assert pool_size <= 7, f"Pool size exceeded expected max (5 + 2 = 7): {pool_size}"
