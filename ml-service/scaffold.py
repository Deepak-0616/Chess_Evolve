import os

base_path = "c:/Users/deepa/Desktop/Deepak/github/Chess_Evolve/ml-service/app"

directories = [
    "features",
    "datasets",
    "validation",
    "tests"
]

feature_files = [
    "__init__.py",
    "position_features.py",
    "material_features.py",
    "piece_features.py",
    "king_safety_features.py",
    "mobility_features.py",
    "pawn_structure_features.py",
    "tactical_features.py",
    "positional_features.py",
    "candidate_features.py",
    "engine_features.py",
    "game_phase_features.py",
    "opening_features.py",
    "player_features.py",
    "chess_dna_features.py",
    "historical_features.py",
    "time_features.py",
    "weakness_features.py",
    "feature_schema.py",
    "feature_pipeline.py",
    "feature_version.py"
]

dataset_files = [
    "__init__.py",
    "feature_dataset_builder.py"
]

validation_files = [
    "__init__.py",
    "feature_validator.py"
]

test_files = [
    "test_position_features.py",
    "test_candidate_features.py",
    "test_player_features.py",
    "test_feature_pipeline.py",
    "test_user_isolation.py"
]

for d in directories:
    os.makedirs(os.path.join(base_path, d), exist_ok=True)

for f in feature_files:
    path = os.path.join(base_path, "features", f)
    if not os.path.exists(path):
        with open(path, "w") as file:
            file.write("# " + f + "\n")

for f in dataset_files:
    path = os.path.join(base_path, "datasets", f)
    if not os.path.exists(path):
        with open(path, "w") as file:
            file.write("# " + f + "\n")

for f in validation_files:
    path = os.path.join(base_path, "validation", f)
    if not os.path.exists(path):
        with open(path, "w") as file:
            file.write("# " + f + "\n")

for f in test_files:
    path = os.path.join(base_path, "tests", f)
    if not os.path.exists(path):
        with open(path, "w") as file:
            file.write("# " + f + "\n")

print("Scaffolding complete.")
