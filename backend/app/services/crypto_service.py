import base64
import logging

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings

logger = logging.getLogger(__name__)


class CryptoService:
    def __init__(self):
        self._fernet: Fernet | None = None
        key = settings.secrets_encryption_key
        if key:
            try:
                key_bytes = key.encode("utf-8") if isinstance(key, str) else key
                if len(key_bytes) == 44:
                    key_bytes = base64.urlsafe_b64decode(key_bytes)
                self._fernet = Fernet(base64.urlsafe_b64encode(key_bytes) if len(key_bytes) == 32 else key_bytes)
            except Exception:
                try:
                    self._fernet = Fernet(key if isinstance(key, bytes) else key.encode("utf-8"))
                except Exception:
                    logger.warning("Invalid secrets_encryption_key — encryption disabled")
                    self._fernet = None

    def is_configured(self) -> bool:
        return self._fernet is not None

    def encrypt(self, plaintext: str) -> str:
        if not self._fernet:
            return plaintext
        return self._fernet.encrypt(plaintext.encode("utf-8")).decode("utf-8")

    def decrypt(self, ciphertext: str) -> str | None:
        if not self._fernet:
            return ciphertext
        try:
            return self._fernet.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
        except (InvalidToken, Exception):
            logger.warning("Failed to decrypt value — returning None")
            return None


_crypto_service = CryptoService()


def encrypt_secret(plaintext: str) -> str:
    return _crypto_service.encrypt(plaintext)


def decrypt_secret(ciphertext: str) -> str | None:
    return _crypto_service.decrypt(ciphertext)
