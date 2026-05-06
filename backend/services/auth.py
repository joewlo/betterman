import json
import base64
from services.variable_resolver import resolve


def process_auth(auth_json, scope_map, existing_headers):
    if isinstance(auth_json, str):
        auth = json.loads(auth_json)
    else:
        auth = auth_json

    auth_type = auth.get("type", "none")
    if auth_type == "none":
        return existing_headers

    headers = dict(existing_headers)

    if auth_type == "bearer":
        token = auth.get("token", "")
        if token:
            token = resolve(token, scope_map)
            headers["Authorization"] = f"Bearer {token}"

    elif auth_type == "basic":
        username = resolve(auth.get("username", ""), scope_map)
        password = resolve(auth.get("password", ""), scope_map)
        if username or password:
            creds = base64.b64encode(f"{username}:{password}".encode()).decode()
            headers["Authorization"] = f"Basic {creds}"

    elif auth_type == "api_key":
        key = resolve(auth.get("key", ""), scope_map)
        value = resolve(auth.get("value", ""), scope_map)
        placement = auth.get("placement", "header")
        if placement == "header":
            headers[key] = value
        elif placement == "query":
            # returned separately - caller must handle
            pass

    elif auth_type == "oauth2":
        token = ""
        for scope in ["session", "environment", "collection", "global"]:
            if scope in scope_map and "oauth_token" in scope_map[scope]:
                token = scope_map[scope]["oauth_token"]
                break
        if token:
            headers["Authorization"] = f"Bearer {token}"

    elif auth_type == "digest":
        # Digest is handled by httpx automatically when auth is set
        pass

    return headers


def get_httpx_auth(auth_json, scope_map):
    if isinstance(auth_json, str):
        auth = json.loads(auth_json)
    else:
        auth = auth_json

    auth_type = auth.get("type", "none")

    if auth_type == "digest":
        import httpx
        username = resolve(auth.get("username", ""), scope_map)
        password = resolve(auth.get("password", ""), scope_map)
        return httpx.DigestAuth(username=username, password=password)

    return None
