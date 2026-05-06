import aiosqlite
import os
from pathlib import Path

DB_PATH = Path(__file__).parent / "betterman.db"


async def get_db():
    db = await aiosqlite.connect(str(DB_PATH))
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    yield db
    await db.close()


async def init_db():
    db = await aiosqlite.connect(str(DB_PATH))
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")

    await db.executescript("""
        CREATE TABLE IF NOT EXISTS environments (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            variables   TEXT DEFAULT '{}',
            is_global   INTEGER DEFAULT 0,
            created_at  TEXT DEFAULT (datetime('now')),
            updated_at  TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS collections (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            name            TEXT NOT NULL,
            description     TEXT DEFAULT '',
            environment_id  INTEGER REFERENCES environments(id) ON DELETE SET NULL,
            sort_order      INTEGER DEFAULT 0,
            created_at      TEXT DEFAULT (datetime('now')),
            updated_at      TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS requests (
            id                    INTEGER PRIMARY KEY AUTOINCREMENT,
            collection_id         INTEGER REFERENCES collections(id) ON DELETE CASCADE,
            name                  TEXT NOT NULL,
            method                TEXT DEFAULT 'GET',
            url                   TEXT DEFAULT '',
            headers               TEXT DEFAULT '[]',
            query_params          TEXT DEFAULT '[]',
            body                  TEXT DEFAULT '',
            body_type             TEXT DEFAULT 'none',
            auth                  TEXT DEFAULT '{"type":"none"}',
            pre_request_script    TEXT DEFAULT '',
            post_response_script  TEXT DEFAULT '',
            sort_order            INTEGER DEFAULT 0,
            created_at            TEXT DEFAULT (datetime('now')),
            updated_at            TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS session_variables (
            id    INTEGER PRIMARY KEY AUTOINCREMENT,
            key   TEXT NOT NULL UNIQUE,
            value TEXT,
            scope TEXT DEFAULT 'session'
        );

        CREATE INDEX IF NOT EXISTS idx_requests_collection ON requests(collection_id);
        CREATE INDEX IF NOT EXISTS idx_collections_env ON collections(environment_id);
    """)

    await db.commit()
    await db.close()
