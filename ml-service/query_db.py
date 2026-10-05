from sqlalchemy import create_engine, text
import json

engine = create_engine("postgresql://postgres:postgres@localhost:5432/chess_evolve") # Wait, what is the DB URL?

# Let's read the .env file in backend to get the DATABASE_URL
with open("../backend/.env", "r") as f:
    lines = f.readlines()
    db_url = None
    for line in lines:
        if line.startswith("DATABASE_URL="):
            db_url = line.strip().split("=")[1].strip('"').strip("'")
            break

if db_url:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        res = conn.execute(text('SELECT * FROM "MLModelVersion"')).fetchall()
        models = [dict(zip(res[0]._mapping.keys(), r)) for r in res] if res else []
        print("MODELS:")
        print(models)
        
        res_ds = conn.execute(text('SELECT * FROM "MLDatasetRecord"')).fetchall()
        datasets = [dict(zip(res_ds[0]._mapping.keys(), r)) for r in res_ds] if res_ds else []
        print("DATASETS:")
        print(datasets)
else:
    print("No DATABASE_URL found.")
