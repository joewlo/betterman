import shlex
import re
import json


def parse_curl(curl_command):
    if curl_command.startswith("curl "):
        curl_command = curl_command[5:]

    try:
        parts = shlex.split(curl_command)
    except ValueError:
        # fallback: try manual parsing
        parts = _manual_split(curl_command)

    method = "GET"
    url = ""
    headers = []
    body = ""
    body_type = "none"
    query_params = []

    i = 0
    while i < len(parts):
        part = parts[i]

        if part in ("-X", "--request") and i + 1 < len(parts):
            method = parts[i + 1].upper()
            i += 2
            continue

        if part in ("-H", "--header") and i + 1 < len(parts):
            header_str = parts[i + 1]
            if ":" in header_str:
                key, value = header_str.split(":", 1)
                headers.append({"key": key.strip(), "value": value.strip()})
            i += 2
            continue

        if part in ("-d", "--data", "--data-raw", "--data-binary") and i + 1 < len(parts):
            body = parts[i + 1]
            if method == "GET":
                method = "POST"
            i += 2
            continue

        if part == "--data-urlencode" and i + 1 < len(parts):
            kv = parts[i + 1]
            if "=" in kv:
                key, value = kv.split("=", 1)
                body += f"&{key}={value}"
            if method == "GET":
                method = "POST"
            i += 2
            continue

        if part in ("--compressed", "-k", "--insecure", "-L", "--location"):
            i += 1
            continue

        # URL - last positional argument or starts with http
        if part.startswith("http://") or part.startswith("https://"):
            url = part
            i += 1
            continue

        if not part.startswith("-"):
            # probably the URL
            url = part
        i += 1

    # Parse query params from URL
    if "?" in url:
        base_url, qs = url.split("?", 1)
        url = base_url
        for pair in qs.split("&"):
            if "=" in pair:
                k, v = pair.split("=", 1)
                query_params.append({"key": k, "value": v})

    # Detect body_type
    if body:
        body_stripped = body.strip()
        if body_type == "none":
            content_type = ""
            for h in headers:
                if h["key"].lower() == "content-type":
                    content_type = h["value"].lower()
                    break
            if "json" in content_type or (body_stripped.startswith("{") and body_stripped.endswith("}")):
                body_type = "json"
            elif "xml" in content_type or (body_stripped.startswith("<") and body_stripped.endswith(">")):
                body_type = "xml"
            elif "x-www-form-urlencoded" in content_type:
                body_type = "x-www-form-urlencoded"
            elif "form-data" in content_type or "multipart" in content_type:
                body_type = "form-data"
            else:
                body_type = "raw"

    name = _infer_name(url, method)

    return {
        "name": name,
        "method": method,
        "url": url,
        "headers": json.dumps(headers),
        "query_params": json.dumps(query_params),
        "body": body,
        "body_type": body_type,
    }


def _infer_name(url, method):
    if not url:
        return f"{method} Request"
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        path = parsed.path.strip("/")
        if path:
            parts = path.split("/")
            # use last meaningful part
            for part in reversed(parts):
                if part and not part.isdigit() and not re.match(r"^[a-f0-9-]{20,}$", part):
                    return f"{method} {part.replace('-', ' ').replace('_', ' ').title()}"
            return f"{method} {parts[-1]}" if parts[-1] else f"{method} {parsed.netloc}"
        return f"{method} {parsed.netloc}"
    except Exception:
        return f"{method} Request"


def _manual_split(cmd):
    """Fallback parser when shlex fails (e.g., unclosed quotes in data)."""
    pattern = re.compile(
        r"""'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\S+""",
    )
    return [m.group(0) for m in pattern.finditer(cmd)]


def export_curl(request_data):
    parts = ["curl"]

    if request_data.get("method", "GET") != "GET":
        parts.extend(["-X", request_data["method"]])

    headers = json.loads(request_data.get("headers", "[]"))
    for h in headers:
        if h.get("key") and h.get("value"):
            parts.extend(["-H", f"{h['key']}: {h['value']}"])

    if request_data.get("body") and request_data.get("body_type") != "none":
        parts.extend(["-d", request_data["body"]])

    url = request_data.get("url", "")
    query_params = json.loads(request_data.get("query_params", "[]"))
    if query_params:
        from urllib.parse import urlencode
        qs = urlencode(
            {p["key"]: p["value"] for p in query_params if p.get("key")}
        )
        separator = "&" if "?" in url else "?"
        url = f"{url}{separator}{qs}"

    parts.append(f"'{url}'")
    return " ".join(parts)
