import json
from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from models import EnvironmentCreate, EnvironmentUpdate, Environment

router = APIRouter(prefix="/api/environments", tags=["environments"])


@router.get("/")
async def list_environments(db=Depends(get_db)):
    rows = await db.execute_fetchall(
        "SELECT * FROM environments ORDER BY is_global DESC, name ASC"
    )
    return [dict(row) for row in rows]


@router.get("/{env_id}")
async def get_environment(env_id: int, db=Depends(get_db)):
    cursor = await db.execute("SELECT * FROM environments WHERE id=?", (env_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Environment not found")
    return dict(row)


@router.post("/")
async def create_environment(env: EnvironmentCreate, db=Depends(get_db)):
    cursor = await db.execute(
        "INSERT INTO environments (name, variables, is_global) VALUES (?, ?, ?)",
        (env.name, env.variables, env.is_global),
    )
    await db.commit()
    cursor = await db.execute("SELECT * FROM environments WHERE id=?", (cursor.lastrowid,))
    return dict(await cursor.fetchone())


@router.put("/{env_id}")
async def update_environment(env_id: int, env: EnvironmentUpdate, db=Depends(get_db)):
    updates = {}
    if env.name is not None:
        updates["name"] = env.name
    if env.variables is not None:
        updates["variables"] = env.variables
    if env.is_global is not None:
        updates["is_global"] = env.is_global

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = "datetime('now')"
    set_clause = ", ".join(f"{k}=?" for k in updates.keys())
    values = list(updates.values()) + [env_id]
    await db.execute(
        f"UPDATE environments SET {set_clause} WHERE id=?",
        values,
    )
    await db.commit()
    cursor = await db.execute("SELECT * FROM environments WHERE id=?", (env_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Environment not found")
    return dict(row)


@router.delete("/{env_id}")
async def delete_environment(env_id: int, db=Depends(get_db)):
    cursor = await db.execute("DELETE FROM environments WHERE id=?", (env_id,))
    await db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Environment not found")
    return {"ok": True}
