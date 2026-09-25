"""
storage_mock.py - Lightweight in-memory S3/MinIO mock for Milestone 3 testing.
Ensures tests run 100% offline, deterministic, and free of external network dependencies.
"""
from typing import Dict, Optional, Any
import io


class StorageError(Exception):
    """Raised when simulating a storage failure."""
    pass


class FakeStorageService:
    """
    In-memory simulation of MinIO / S3 object storage.
    Supports upload, download, existence checks, versioned paths, and simulated failure modes.
    """
    def __init__(self):
        # Structure: bucket_name -> {object_key: {"data": bytes, "content_type": str, "size": int}}
        self._buckets: Dict[str, Dict[str, Dict[str, Any]]] = {
            "swipex-resumes": {}
        }
        self.should_fail: bool = False

    def create_bucket(self, bucket_name: str) -> None:
        if bucket_name not in self._buckets:
            self._buckets[bucket_name] = {}

    def upload_file(
        self,
        bucket: str,
        file_key: str,
        data: bytes,
        content_type: str = "application/pdf"
    ) -> Dict[str, Any]:
        """Uploads a file to the in-memory bucket."""
        if self.should_fail:
            raise StorageError("Simulated storage backend failure (MinIO offline)")

        if bucket not in self._buckets:
            self.create_bucket(bucket)

        self._buckets[bucket][file_key] = {
            "data": data,
            "content_type": content_type,
            "size": len(data)
        }
        return {
            "bucket": bucket,
            "key": file_key,
            "size": len(data),
            "content_type": content_type,
            "etag": f"fake-etag-{hash(data)}"
        }

    def get_file(self, bucket: str, file_key: str) -> bytes:
        """Retrieves raw bytes for an object key."""
        if self.should_fail:
            raise StorageError("Simulated storage backend failure")

        bucket_data = self._buckets.get(bucket)
        if not bucket_data or file_key not in bucket_data:
            raise KeyError(f"Object {file_key} not found in bucket {bucket}")

        return bucket_data[file_key]["data"]

    def has_object(self, bucket: str, file_key: str) -> bool:
        """Checks if an object exists in storage."""
        return bucket in self._buckets and file_key in self._buckets[bucket]

    def delete_file(self, bucket: str, file_key: str) -> bool:
        """Deletes an object."""
        if self.has_object(bucket, file_key):
            del self._buckets[bucket][file_key]
            return True
        return False

    def clear(self) -> None:
        """Resets all stored data."""
        self._buckets = {"swipex-resumes": {}}
        self.should_fail = False
