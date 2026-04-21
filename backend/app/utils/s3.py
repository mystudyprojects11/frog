import uuid

import boto3
from botocore.client import Config

from app.core.config import settings

_client = None


def get_s3_client():
    global _client
    if _client is None:
        _client = boto3.client(
            "s3",
            endpoint_url=f"http://{settings.MINIO_ENDPOINT}",
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
            config=Config(signature_version="s3v4"),
            region_name="us-east-1",
        )
    return _client


def ensure_bucket() -> None:
    client = get_s3_client()
    existing = [b["Name"] for b in client.list_buckets().get("Buckets", [])]
    if settings.MINIO_BUCKET not in existing:
        client.create_bucket(Bucket=settings.MINIO_BUCKET)
        client.put_bucket_policy(
            Bucket=settings.MINIO_BUCKET,
            Policy=f"""{{
                "Version": "2012-10-17",
                "Statement": [{{
                    "Effect": "Allow",
                    "Principal": {{"AWS": ["*"]}},
                    "Action": ["s3:GetObject"],
                    "Resource": ["arn:aws:s3:::{settings.MINIO_BUCKET}/*"]
                }}]
            }}""",
        )


def upload_file(file_bytes: bytes, content_type: str, folder: str = "listings") -> str:
    key = f"{folder}/{uuid.uuid4()}"
    get_s3_client().put_object(
        Bucket=settings.MINIO_BUCKET,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )
    return key


def delete_file(key: str) -> None:
    get_s3_client().delete_object(Bucket=settings.MINIO_BUCKET, Key=key)


def public_url(key: str) -> str:
    return f"{settings.MINIO_PUBLIC_URL}/{settings.MINIO_BUCKET}/{key}"


def key_from_url(url: str) -> str | None:
    prefix = f"{settings.MINIO_PUBLIC_URL}/{settings.MINIO_BUCKET}/"
    return url[len(prefix):] if url.startswith(prefix) else None
