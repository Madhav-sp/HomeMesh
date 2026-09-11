import mimetypes
import os
from datetime import datetime


PHOTO_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".webp",
    ".tiff",
    ".heic",
}


EXCLUDED_DIRECTORIES = {
    "node_modules",
    ".git",
    ".venv",
    "venv",
    "__pycache__",
    "dist",
    "build",
}


def scan_photos(
    directories=None,
    max_photos=1000,
):
    if directories is None:
        directories = [
            os.path.expanduser("~/Pictures"),
            os.path.expanduser("~/Downloads"),
        ]

    photos = []

    for directory in directories:
        if not os.path.exists(directory):
            continue

        for root, dirs, files in os.walk(directory):

            # Skip unnecessary / huge directories
            dirs[:] = [
                directory_name
                for directory_name in dirs
                if directory_name not in EXCLUDED_DIRECTORIES
            ]

            for file_name in files:
                if len(photos) >= max_photos:
                    return photos

                extension = os.path.splitext(file_name)[1].lower()

                if extension not in PHOTO_EXTENSIONS:
                    continue

                file_path = os.path.join(
                    root,
                    file_name,
                )

                try:
                    stat = os.stat(file_path)

                    mime_type, _ = mimetypes.guess_type(
                        file_path
                    )

                    photos.append(
                        {
                            "file_name": file_name,
                            "file_path": file_path,
                            "file_size": stat.st_size,
                            "mime_type": mime_type,
                            "modified_at": datetime.fromtimestamp(
                                stat.st_mtime
                            ).isoformat(),
                        }
                    )

                except (
                    PermissionError,
                    FileNotFoundError,
                    OSError,
                ):
                    continue

    return photos