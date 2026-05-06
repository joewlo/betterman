import json
import time
import base64
from fastapi import APIRouter, Depends, HTTPException
import httpx
from database import get_db
from models import ExecuteRequest, ExecuteResponse, VariableResolveRequest
from services.variable_resolver import gather_variables, resolve, resolve_headers_and_params
from services.script_runner import run_script
from services.auth import process_auth, get_httpx_auth

router = APIRouter(prefix="/api", tags=["execute"])


@router.post("/execute")
async def execute_request(req: ExecuteRequest, db=Depends(get_db)):
    scope_map = await gather_variables(req.environment_id, req.collection_id)

    resolved_url = resolve(req.url, scope_map)
    resolved_body = resolve(req.body, scope_map)
    resolved_headers, resolved_query_params = resolve_headers_and_params(
        req.headers, req.query_params, scope_map
    )

    # Run pre-request script
    pre_context = {
        "request": {
            "url": resolved_url,
            "method": req.method,
            "headers": resolved_headers,
            "body": resolved_body,
            "env_vars": scope_map.get("environment", {}),
        },
    }
    pre_vars, pre_output = run_script(req.pre_request_script, pre_context, "pre")

    # Store pre-script extracted vars even on error (error is captured in pre_vars)
    for k, v in pre_vars.items():
        if k != "error":
            await db.execute(
                "INSERT OR REPLACE INTO session_variables (key, value, scope) VALUES (?, ?, 'session')",
                (k, str(v)),
            )

    # Refresh scope map after pre-script
    if pre_vars:
        scope_map = await gather_variables(req.environment_id, req.collection_id)
        resolved_url = resolve(req.url, scope_map)
        resolved_headers, resolved_query_params = resolve_headers_and_params(
            req.headers, req.query_params, scope_map
        )

    # Process auth
    resolved_headers = process_auth(req.auth, scope_map, resolved_headers)

    # Execute request
    httpx_auth = get_httpx_auth(req.auth, scope_map)
    start_time = time.monotonic()

    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        try:
            response = await client.request(
                method=req.method,
                url=resolved_url,
                headers=resolved_headers,
                params=resolved_query_params,
                content=resolved_body if resolved_body else None,
                auth=httpx_auth,
            )
        except httpx.ConnectError as e:
            raise HTTPException(status_code=502, detail=f"Connection failed: {str(e)}")
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Request timed out")

    elapsed_ms = (time.monotonic() - start_time) * 1000
    response_headers_str = json.dumps(dict(response.headers))

    content_type = response.headers.get("content-type", "")
    is_binary = _is_binary_content(content_type)

    try:
        if is_binary:
            response_body = base64.b64encode(response.content).decode("ascii")
        else:
            response_body = response.text
    except Exception:
        response_body = ""

    # Run post-response script
    post_context = {
        "request": {
            "url": resolved_url,
            "method": req.method,
            "headers": resolved_headers,
            "body": resolved_body,
            "env_vars": scope_map.get("environment", {}),
        },
        "response": {
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "body": response_body,
        },
    }
    post_vars, post_output = run_script(req.post_response_script, post_context, "post")

    # Store post-script extracted vars
    for k, v in post_vars.items():
        await db.execute(
            "INSERT OR REPLACE INTO session_variables (key, value, scope) VALUES (?, ?, 'session')",
            (k, str(v)),
        )
    await db.commit()

    script_output = None
    if pre_output and post_output:
        script_output = f"[pre-script]\n{pre_output}\n\n[post-script]\n{post_output}"
    elif pre_output:
        script_output = f"[pre-script]\n{pre_output}"
    elif post_output:
        script_output = f"[post-script]\n{post_output}"

    if "error" in post_vars:
        script_output = (script_output or "") + f"\n[post-script error] {post_vars['error']}"

    return ExecuteResponse(
        status_code=response.status_code,
        headers=response_headers_str,
        body=response_body,
        elapsed_ms=round(elapsed_ms, 1),
        content_type=content_type,
        content_length=len(response.content) if response.content else None,
        extracted_vars={**pre_vars, **post_vars},
        script_output=script_output,
        is_binary=is_binary,
    )


@router.post("/resolve-variables")
async def resolve_variables(req: VariableResolveRequest):
    scope_map = await gather_variables(req.environment_id, req.collection_id)
    resolved = resolve(req.text, scope_map)
    return {"original": req.text, "resolved": resolved}


BINARY_CONTENT_TYPES = {
    "image/", "audio/", "video/", "application/octet-stream",
    "application/zip", "application/gzip", "application/pdf",
    "application/vnd.ms-excel", "application/vnd.openxmlformats",
}

def _is_binary_content(content_type: str) -> bool:
    ct = content_type.lower()
    for prefix in BINARY_CONTENT_TYPES:
        if ct.startswith(prefix):
            return True
    return False


def _try_json(text):
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return None
