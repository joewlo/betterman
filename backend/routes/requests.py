from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from models import RequestCreate, RequestUpdate

router = APIRouter(prefix="/api/requests", tags=["requests"])


@router.get("/")
async def list_requests(collection_id: int = None, db=Depends(get_db)):
    if collection_id:
        rows = await db.execute_fetchall(
            "SELECT * FROM requests WHERE collection_id=? ORDER BY sort_order ASC, name ASC",
            (collection_id,),
        )
    else:
        rows = await db.execute_fetchall(
            "SELECT * FROM requests ORDER BY sort_order ASC, name ASC"
        )
    return [dict(row) for row in rows]


@router.get("/{req_id}")
async def get_request(req_id: int, db=Depends(get_db)):
    cursor = await db.execute("SELECT * FROM requests WHERE id=?", (req_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")
    return dict(row)


@router.post("/")
async def create_request(req: RequestCreate, db=Depends(get_db)):
    cursor = await db.execute(
        """INSERT INTO requests
        (collection_id, name, method, url, headers, query_params, body,
         body_type, auth, pre_request_script, post_response_script, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            req.collection_id, req.name, req.method, req.url, req.headers,
            req.query_params, req.body, req.body_type, req.auth,
            req.pre_request_script, req.post_response_script, req.sort_order,
        ),
    )
    await db.commit()
    cursor = await db.execute("SELECT * FROM requests WHERE id=?", (cursor.lastrowid,))
    return dict(await cursor.fetchone())


@router.put("/{req_id}")
async def update_request(req_id: int, req: RequestUpdate, db=Depends(get_db)):
    updates = {}
    field_map = {
        "name": req.name, "method": req.method, "url": req.url,
        "headers": req.headers, "query_params": req.query_params,
        "body": req.body, "body_type": req.body_type, "auth": req.auth,
        "pre_request_script": req.pre_request_script,
        "post_response_script": req.post_response_script,
        "sort_order": req.sort_order,
    }
    for k, v in field_map.items():
        if v is not None:
            updates[k] = v

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = "datetime('now')"
    set_clause = ", ".join(f"{k}=?" for k in updates.keys())
    values = list(updates.values()) + [req_id]
    await db.execute(f"UPDATE requests SET {set_clause} WHERE id=?", values)
    await db.commit()
    cursor = await db.execute("SELECT * FROM requests WHERE id=?", (req_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")
    return dict(row)


@router.delete("/{req_id}")
async def delete_request(req_id: int, db=Depends(get_db)):
    cursor = await db.execute("DELETE FROM requests WHERE id=?", (req_id,))
    await db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"ok": True}
