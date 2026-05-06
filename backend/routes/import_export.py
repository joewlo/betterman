from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from models import ImportCurlRequest, ImportPostmanRequest
from services.curl_parser import parse_curl, export_curl
from services.postman_importer import parse_postman

router = APIRouter(prefix="/api", tags=["import-export"])


@router.post("/import/curl")
async def import_curl(req: ImportCurlRequest, db=Depends(get_db)):
    try:
        parsed = parse_curl(req.curl_command)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse curl: {str(e)}")

    if not parsed.get("url"):
        raise HTTPException(status_code=400, detail="No URL found in curl command")

    if req.collection_id:
        # Save directly to a collection
        cursor = await db.execute(
            """INSERT INTO requests
            (collection_id, name, method, url, headers, query_params, body, body_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                req.collection_id, parsed["name"], parsed["method"], parsed["url"],
                parsed["headers"], parsed["query_params"], parsed["body"], parsed["body_type"],
            ),
        )
        await db.commit()
        cursor = await db.execute("SELECT * FROM requests WHERE id=?", (cursor.lastrowid,))
        return {
            "saved": True,
            "request": dict(await cursor.fetchone()),
            "parsed": parsed,
        }

    return {"saved": False, "parsed": parsed}


@router.post("/import/postman")
async def import_postman(req: ImportPostmanRequest, db=Depends(get_db)):
    try:
        parsed = parse_postman(req.payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse Postman collection: {str(e)}")

    # 1. Create environments first
    env_id = None
    if parsed["environments"]:
        env = parsed["environments"][0]
        cursor = await db.execute(
            "INSERT INTO environments (name, variables) VALUES (?, ?)",
            (env["name"], env["variables"]),
        )
        await db.commit()
        env_id = cursor.lastrowid

    # 2. Create collection
    target_col_id = req.collection_id
    if not target_col_id:
        col = parsed["collection"]
        cursor = await db.execute(
            "INSERT INTO collections (name, description, environment_id) VALUES (?, ?, ?)",
            (col["name"], col.get("description", ""), env_id),
        )
        await db.commit()
        target_col_id = cursor.lastrowid

    # 3. Create requests
    created = []
    for r in parsed["requests"]:
        cursor = await db.execute(
            """INSERT INTO requests
            (collection_id, name, method, url, headers, query_params, body, body_type, auth)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                target_col_id, r["name"], r["method"], r["url"],
                r["headers"], r["query_params"], r["body"], r["body_type"], r["auth"],
            ),
        )
        cursor = await db.execute("SELECT * FROM requests WHERE id=?", (cursor.lastrowid,))
        created.append(dict(await cursor.fetchone()))

    await db.commit()
    return {
        "collection_id": target_col_id,
        "environment_id": env_id,
        "requests_created": len(created),
        "requests": created,
    }


@router.get("/export/curl/{req_id}")
async def export_request_curl(req_id: int, db=Depends(get_db)):
    cursor = await db.execute("SELECT * FROM requests WHERE id=?", (req_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")

    request_data = dict(row)
    curl_command = export_curl(request_data)
    return {"curl": curl_command}
