import re

from sqlalchemy import Column, func


def search_condition(
    columns: list[Column],
    search: str,
    case_sensitive: bool = False,
    whole_word: bool = False,
):
    if whole_word:
        escaped = re.escape(search)
        pattern = rf'\b{escaped}\b'
        if not case_sensitive:
            pattern = f'(?i){pattern}'
        conditions = [func.regexp(pattern, col) for col in columns]
        return conditions[0] if len(conditions) == 1 else conditions[0] | conditions[1]

    if case_sensitive:
        like_fn = Column.like
    else:
        like_fn = Column.ilike

    conditions = [like_fn(col, f'%{search}%') for col in columns]
    return conditions[0] if len(conditions) == 1 else conditions[0] | conditions[1]
