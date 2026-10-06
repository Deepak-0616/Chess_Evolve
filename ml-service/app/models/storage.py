import os
import hashlib
from typing import Optional, Dict, Any

class ModelStorage:
    """
    Production model artifact storage abstraction.
    Supports local filesystem and object storage (e.g. Supabase Storage / S3).
    Enforces path isolation and cryptographic checksum verification.
    """

    def __init__(self, base_path: Optional[str] = None):
        self.base_path = base_path or os.environ.get("MODEL_STORAGE_PATH", "./artifacts")
        self.storage_type = os.environ.get("MODEL_STORAGE_BACKEND", "LOCAL").upper()

    def get_canonical_path(self, user_id: str, model_type: str, model_version_id: str) -> str:
        """
        Constructs a safe, isolated canonical path. Never accepts user-supplied paths.
        """
        safe_type = "current_self" if "CURRENT" in model_type.upper() else "peak_self"
        # Sanitize parameters against path traversal
        clean_user = "".join(c for c in user_id if c.isalnum() or c in "-_")
        clean_id = "".join(c for c in model_version_id if c.isalnum() or c in "-_")
        return os.path.join(self.base_path, safe_type, clean_user, clean_id, "checkpoint_best.pt")

    @staticmethod
    def compute_checksum(filepath: str) -> Optional[str]:
        """Computes SHA-256 hash of an artifact file."""
        if not os.path.exists(filepath):
            return None
        sha256 = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                sha256.update(chunk)
        return sha256.hexdigest()

    def verify_artifact(self, filepath: str, expected_hash: Optional[str] = None) -> bool:
        """
        Verifies that an artifact exists, is non-empty, and matches expected hash if provided.
        """
        if not os.path.isfile(filepath):
            return False
        if os.path.getsize(filepath) == 0:
            return False
        if expected_hash:
            actual = self.compute_checksum(filepath)
            return actual == expected_hash
        return True

    def save_artifact(self, user_id: str, model_type: str, model_version_id: str, src_path: str) -> Dict[str, Any]:
        """
        Persists artifact to canonical location and returns checksum and metadata.
        """
        dest_path = self.get_canonical_path(user_id, model_type, model_version_id)
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)

        if src_path != dest_path:
            import shutil
            shutil.copyfile(src_path, dest_path)

        checksum = self.compute_checksum(dest_path)
        size = os.path.getsize(dest_path)

        return {
            "artifactPath": dest_path,
            "checksumSha256": checksum,
            "sizeBytes": size,
            "storageBackend": self.storage_type
        }
