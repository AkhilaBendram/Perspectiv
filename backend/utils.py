import os, logging
from typing import List

def get_logger(name: str) -> logging.Logger:
    level = os.getenv("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    )
    return logging.getLogger(name)

def get_env_list(key: str, default: str = "") -> List[str]:
    val = os.getenv(key, default)
    return [x.strip() for x in val.split(",") if x.strip()]

def mb_limit_okay(size_bytes: int) -> bool:
    try:
        limit_mb = int(os.getenv("MAX_FILE_MB", "50"))
    except:
        limit_mb = 50
    return size_bytes <= limit_mb * 1024 * 1024
