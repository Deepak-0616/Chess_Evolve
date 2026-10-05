import os

base_path = "c:/Users/deepa/Desktop/Deepak/github/Chess_Evolve/ml-service/app/models/current_self"

files = [
    "__init__.py",
    "model.py",
    "config.py",
    "dataset.py",
    "loss.py",
    "trainer.py",
    "evaluator.py",
    "inference.py",
    "metrics.py",
    "checkpoint.py",
    "registry.py"
]

os.makedirs(base_path, exist_ok=True)

for f in files:
    path = os.path.join(base_path, f)
    if not os.path.exists(path):
        with open(path, "w") as file:
            file.write(f"# {f}\n")

print("Model scaffolding complete.")
