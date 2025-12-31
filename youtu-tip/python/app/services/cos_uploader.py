# File: python/app/services/cos_uploader.py
# Project: Tip Desktop Assistant
# Description: Thin Tencent COS uploader wrapper plus factory built from environment configuration.

# Copyright (C) 2025 Tencent. All rights reserved.
# License: Licensed under the License Terms of Youtu-Tip (see license at repository root).
# Warranty: Provided on an "AS IS" basis, without warranties or conditions of any kind.
# Modifications must retain this notice.

from __future__ import annotations

from pathlib import Path
from typing import Optional

import structlog
from qcloud_cos import CosConfig, CosS3Client
from qcloud_cos.cos_exception import CosClientError, CosServiceError

from ..core import config

logger = structlog.get_logger(__name__)


class CosUploader:
    def __init__(self, secret_id: str, secret_key: str, bucket: str, region: str, scheme: str = 'https') -> None:
        self._bucket = bucket
        self._region = region
        cfg = CosConfig(
            Region=region,
            SecretId=secret_id,
            SecretKey=secret_key,
            Scheme=scheme,
        )
        self._client = CosS3Client(cfg)

    def upload_file(self, local_path: Path, key: str) -> str:
        try:
            logger.info('cos.upload.begin', key=key, size=local_path.stat().st_size)
            self._client.upload_file(
                Bucket=self._bucket,
                Key=key,
                LocalFilePath=str(local_path),
            )
            url = f'https://{self._bucket}.cos.{self._region}.myqcloud.com/{key}'
            logger.info('cos.upload.success', key=key, url=url)
            return url
        except (CosClientError, CosServiceError) as exc:
            logger.error('cos.upload.failed', key=key, error=str(exc))
            raise


def build_cos_uploader_from_env() -> Optional[CosUploader]:
    if config.COS_UPLOAD_DISABLED:
        logger.info('cos.upload.disabled')
        return None
    if not config.COS_SECRET_ID or not config.COS_SECRET_KEY:
        logger.warning('cos.credentials_missing', hint='set COS_SECRET_ID and COS_SECRET_KEY to enable upload')
        return None
    try:
        return CosUploader(
            secret_id=config.COS_SECRET_ID,
            secret_key=config.COS_SECRET_KEY,
            bucket=config.COS_BUCKET,
            region=config.COS_REGION,
            scheme=config.COS_SCHEME,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error('cos.uploader_init_failed', error=str(exc))
        return None
