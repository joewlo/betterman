from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from models import CollectionCreate, CollectionUpdate

router = APIRouter(prefix="/api/collections", tags=["collections"])


@router.get("/")
async def list_collections(db=Depends(get_db)):
    rows = await db.execute_fetchall(
        "SELECT * FROM collections ORDER BY sort_order ASC, name ASC"
    )
    return [dict(row) for row in rows]


@router.get("/{col_id}")
async def get_collection(col_id: int, db=Depends(get_db)):
    cursor = await db.execute("SELECT * FROM collections WHERE id=?", (col_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Collection not found")
    return dict(row)


@router.post("/")
async def create_collection(col: CollectionCreate, db=Depends(get_db)):
    cursor = await db.execute(
        "INSERT INTO collections (name, description, environment_id, sort_order) VALUES (?, ?, ?, ?)",
        (col.name, col.description, col.environment_id, col.sort_order),
    )
    await db.commit()
    cursor = await db.execute("SELECT * FROM collections WHERE id=?", (cursor.lastrowid,))
    return dict(await cursor.fetchone())


@router.put("/{col_id}")
async def update_collection(col_id: int, col: CollectionUpdate, db=Depends(get_db)):
    updates = {}
    if col.name is not None:
        updates["name"] = col.name
    if col.description is not None:
        updates["description"] = col.description
    if col.environment_id is not None:
        updates["environment_id"] = col.environment_id
    if col.sort_order is not None:
        updates["sort_order"] = col.sort_order

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = "datetime('now')"
    set_clause = ", ".join(f"{k}=?" for k in updates.keys())
    values = list(updates.values()) + [col_id]
    await db.execute(f"UPDATE collections SET {set_clause} WHERE id=?", values)
    await db.commit()
    cursor = await db.execute("SELECT * FROM collections WHERE id=?", (col_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Collection not found")
    return dict(row)


@router.delete("/{col_id}")
async def delete_collection(col_id: int, db=Depends(get_db)):
    cursor = await db.execute("DELETE FROM collections WHERE id=?", (col_id,))
    await db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Collection not found")
    return {"ok": True}
