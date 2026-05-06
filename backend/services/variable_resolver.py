import json
import re
from database import get_db


async def gather_variables(environment_id=None, collection_id=None):
    scope_map = {}

    async for db in get_db():
        rows = await db.execute_fetchall(
            "SELECT key, value, scope FROM session_variables"
        )
        for row in rows:
            scope_map.setdefault("session", {})[row["key"]] = row["value"]

        if environment_id:
            cursor = await db.execute(
                "SELECT variables FROM environments WHERE id=?", (environment_id,)
            )
            row = await cursor.fetchone()
            if row:
                env_vars = json.loads(row["variables"])
                scope_map.setdefault("environment", {}).update(env_vars)

        if collection_id:
            cursor = await db.execute(
                "SELECT environment_id FROM collections WHERE id=?", (collection_id,)
            )
            row = await cursor.fetchone()
            if row and row["environment_id"]:
                cursor2 = await db.execute(
                    "SELECT variables FROM environments WHERE id=?",
                    (row["environment_id"],),
                )
                env_row = await cursor2.fetchone()
                if env_row:
                    env_vars = json.loads(env_row["variables"])
                    scope_map.setdefault("collection", {}).update(env_vars)

        cursor = await db.execute(
            "SELECT variables FROM environments WHERE is_global=1 LIMIT 1"
        )
        row = await cursor.fetchone()
        if row:
            global_vars = json.loads(row["variables"])
            scope_map.setdefault("global", {}).update(global_vars)

    return scope_map


def resolve(text, scope_map, max_depth=5):
    if not text or "{{" not in text:
        return text

    for _ in range(max_depth):
        original = text

        def replacer(match):
            var_name = match.group(1).strip()
            for scope in ["session", "environment", "collection", "global"]:
                if scope in scope_map and var_name in scope_map[scope]:
                    val = scope_map[scope][var_name]
                    return str(val) if val is not None else match.group(0)
            return match.group(0)

        text = re.sub(r"\{\{(.+?)\}\}", replacer, text)
        if text == original:
            break
    return text


def resolve_headers_and_params(headers_json, query_params_json, scope_map):
    headers = json.loads(headers_json) if isinstance(headers_json, str) else headers_json
    query_params = json.loads(query_params_json) if isinstance(query_params_json, str) else query_params_json

    resolved_headers = {}
    for h in headers:
        key = resolve(h.get("key", ""), scope_map)
        value = resolve(h.get("value", ""), scope_map)
        resolved_headers[key] = value

    resolved_params = {}
    for p in query_params:
        key = resolve(p.get("key", ""), scope_map)
        value = resolve(p.get("value", ""), scope_map)
        resolved_params[key] = value

    return resolved_headers, resolved_params
