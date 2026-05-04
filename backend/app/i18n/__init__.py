import json
from pathlib import Path

_LOCALES_DIR = Path(__file__).parent / "locales"
_cache: dict[str, dict] = {}


def _load_locale(lang: str) -> dict:
    if lang in _cache:
        return _cache[lang]
    path = _LOCALES_DIR / f"{lang}.json"
    if not path.exists():
        if lang != "ru":
            return _load_locale("ru")
        return {}
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    _cache[lang] = data
    return data


def t(key: str, lang: str = "ru", **kwargs) -> str:
    locale = _load_locale(lang)
    val = locale.get(key, key)
    if kwargs:
        for k, v in kwargs.items():
            val = val.replace(f"{{{k}}}", str(v))
    return val
