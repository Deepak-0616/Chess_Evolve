import os

base_path = "c:/Users/deepa/Desktop/Deepak/github/Chess_Evolve/ml-service/app/datasets"

files = [
    "__init__.py",
    "current_self_builder.py",
    "peak_self_builder.py",
    "target_generation.py",
    "split.py",
    "normalization.py",
    "validation.py",
    "statistics.py",
    "schemas.py",
    "artifacts.py",
    "dataset_pipeline.py"
]

os.makedirs(base_path, exist_ok=True)

for f in files:
    path = os.path.join(base_path, f)
    if not os.path.exists(path):
        with open(path, "w") as file:
            file.write("# " + f + "\n")

print("Datasets scaffolding complete.")
