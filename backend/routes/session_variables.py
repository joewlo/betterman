from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from models import SessionVariableCreate

router = APIRouter(prefix="/api/session-variables", tags=["session-variables"])


@router.get("/")
async def list_session_vars(db=Depends(get_db)):
    rows = await db.execute_fetchall("SELECT * FROM session_variables ORDER BY key")
    return [dict(row) for row in rows]


@router.post("/")
async def set_session_var(var: SessionVariableCreate, db=Depends(get_db)):
    await db.execute(
        "INSERT OR REPLACE INTO session_variables (key, value, scope) VALUES (?, ?, ?)",
        (var.key, var.value, var.scope),
    )
    await db.commit()
    cursor = await db.execute(
        "SELECT * FROM session_variables WHERE key=?", (var.key,)
    )
    return dict(await cursor.fetchone())


@router.delete("/")
async def clear_session_vars(db=Depends(get_db)):
    await db.execute("DELETE FROM session_variables WHERE scope='session'")
    await db.commit()
    return {"ok": True}


@router.delete("/{key}")
async def delete_session_var(key: str, db=Depends(get_db)):
    await db.execute("DELETE FROM session_variables WHERE key=?", (key,))
    await db.commit()
    return {"ok": True}
