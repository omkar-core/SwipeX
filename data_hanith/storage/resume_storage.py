"""
Resume File Storage Foundation for SwipeX Job & Data Intelligence Service.
Provides provider-independent local filesystem storage under:
  uploads/resumes/<user_id>/<resume_version_id>/<original_filename>

Supports file creation, retrieval, deletion, and volume persistence verification.
"""
import os
import shutil
from typing import Optional

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEFAULT_UPLOADS_DIR = os.getenv("RESUME_STORAGE_DIR", os.path.join(BASE_DIR, "uploads", "resumes"))


class ResumeStorage:
    def __init__(self, base_storage_dir: Optional[str] = None):
        self.base_dir = os.path.abspath(base_storage_dir or DEFAULT_UPLOADS_DIR)
        os.makedirs(self.base_dir, exist_ok=True)

    def save_resume_file(
        self,
        user_id: str,
        resume_version_id: str,
        file_name: str,
        content: bytes
    ) -> str:
        """
        Saves resume file binary content locally under:
        <base_dir>/<user_id>/<resume_version_id>/<file_name>

        Returns a provider-independent relative path string for database storage.
        """
        clean_user_id = str(user_id).strip()
        clean_version_id = str(resume_version_id).strip()
        clean_filename = os.path.basename(file_name.strip())

        target_dir = os.path.join(self.base_dir, clean_user_id, clean_version_id)
        os.makedirs(target_dir, exist_ok=True)

        full_path = os.path.join(target_dir, clean_filename)
        with open(full_path, "wb") as f:
            f.write(content)

        # Compute relative URI path for DB storage
        rel_path = os.path.relpath(full_path, self.base_dir).replace("\\", "/")
        return f"uploads/resumes/{rel_path}"

    def get_resume_file(self, file_path: str) -> bytes:
        """
        Reads and returns binary resume file content from path.
        Accepts relative DB file_path string or full path.
        """
        full_path = self.resolve_full_path(file_path)
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Resume file not found at: {full_path}")
        with open(full_path, "rb") as f:
            return f.read()

    def exists_resume_file(self, file_path: str) -> bool:
        """Checks whether a resume file exists on disk."""
        full_path = self.resolve_full_path(file_path)
        return os.path.exists(full_path) and os.path.isfile(full_path)

    def delete_resume_file(self, file_path: str) -> bool:
        """Deletes a resume file from disk."""
        full_path = self.resolve_full_path(file_path)
        if os.path.exists(full_path):
            os.remove(full_path)
            return True
        return False

    def resolve_full_path(self, file_path: str) -> str:
        """Resolves relative file_path URI to absolute filesystem path."""
        clean_path = file_path.strip().replace("\\", "/")
        if clean_path.startswith("uploads/resumes/"):
            clean_path = clean_path[len("uploads/resumes/"):].lstrip("/")
        
        # If absolute path already
        if os.path.isabs(clean_path):
            return clean_path

        return os.path.abspath(os.path.join(self.base_dir, clean_path))
