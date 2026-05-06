import json
from typing import List, Dict, Any


def parse_postman(payload: Any) -> Dict[str, List[Dict]]:
    """Parse Postman Collection v2.1 format."""
    if isinstance(payload, str):
        payload = json.loads(payload)

    info = payload.get("info", {})
    collection_name = info.get("name", "Imported Collection")
    collection_desc = info.get("description", "")
    if isinstance(collection_desc, dict):
        collection_desc = collection_desc.get("content", "")

    result = {
        "collection": {
            "name": collection_name,
            "description": str(collection_desc)[:1000],
        },
        "requests": [],
        "environments": [],
    }

    # Parse variables
    variables = payload.get("variable", [])
    if variables:
        env_vars = {}
        for var in variables:
            env_vars[var.get("key", "")] = var.get("value", "")
        result["environments"].append({
            "name": f"{collection_name} Environment",
            "variables": json.dumps(env_vars),
        })

    items = payload.get("item", [])
    _parse_items(items, result["requests"])

    return result


def _parse_items(items, results, folder_name=None):
    for item in items:
        if "item" in item:
            # It's a folder
            fname = item.get("name", "Folder")
            _parse_items(item["item"], results, fname)
            continue

        request = item.get("request", {})
        name = item.get("name", "Request")

        method = request.get("method", "GET")
        url_obj = request.get("url", {})

        url = ""
        query_params = []
        if isinstance(url_obj, dict):
            raw = url_obj.get("raw", "")
            # Postman raw URL usually includes query string
            if raw and "?" in raw:
                base, qs = raw.split("?", 1)
                url = base
                for pair in qs.split("&"):
                    if "=" in pair:
                        k, v = pair.split("=", 1)
                        query_params.append({"key": k, "value": v})
            else:
                url = raw

            # Also check the structured query params
            if not query_params:
                for q in url_obj.get("query", []):
                    query_params.append({
                        "key": q.get("key", ""),
                        "value": q.get("value", ""),
                    })
        elif isinstance(url_obj, str):
            url = url_obj

        headers = []
        for h in request.get("header", []):
            headers.append({
                "key": h.get("key", ""),
                "value": h.get("value", ""),
            })

        body = ""
        body_type = "none"
        body_obj = request.get("body", {})
        if body_obj:
            mode = body_obj.get("mode", "none")
            if mode == "raw":
                body = body_obj.get("raw", "")
                # Detect content type
                content_type = ""
                for h in headers:
                    if h["key"].lower() == "content-type":
                        content_type = h["value"].lower()
                        break
                if "json" in content_type:
                    body_type = "json"
                elif "xml" in content_type:
                    body_type = "xml"
                else:
                    body_type = "raw"
            elif mode == "urlencoded":
                body_type = "x-www-form-urlencoded"
                form_pairs = []
                for f in body_obj.get("urlencoded", []):
                    form_pairs.append(f"{f.get('key','')}={f.get('value','')}")
                body = "&".join(form_pairs)
            elif mode == "formdata":
                body_type = "form-data"
            elif mode == "graphql":
                body_type = "graphql"
                body = body_obj.get("graphql", {}).get("query", "")
            else:
                body_type = mode

        auth_json = '{"type":"none"}'
        auth_obj = request.get("auth", {})
        if auth_obj:
            auth_type = auth_obj.get("type", "none")
            if auth_type == "bearer":
                token = ""
                for a in auth_obj.get("bearer", []):
                    if a.get("key") == "token":
                        token = a.get("value", "")
                        break
                auth_json = json.dumps({"type": "bearer", "token": token})
            elif auth_type == "basic":
                username = ""
                password = ""
                for a in auth_obj.get("basic", []):
                    if a.get("key") == "username":
                        username = a.get("value", "")
                    if a.get("key") == "password":
                        password = a.get("value", "")
                auth_json = json.dumps({"type": "basic", "username": username, "password": password})
            elif auth_type == "apikey":
                key = ""
                value = ""
                placement = "header"
                for a in auth_obj.get("apikey", []):
                    if a.get("key") == "key":
                        key = a.get("value", "")
                    if a.get("key") == "value":
                        value = a.get("value", "")
                    if a.get("key") == "in":
                        placement = a.get("value", "header")
                auth_json = json.dumps({"type": "api_key", "key": key, "value": value, "placement": placement})

        if folder_name:
            name = f"[{folder_name}] {name}"

        results.append({
            "name": name[:200],
            "method": method,
            "url": url,
            "headers": json.dumps(headers),
            "query_params": json.dumps(query_params),
            "body": body,
            "body_type": body_type,
            "auth": auth_json,
        })
