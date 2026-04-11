import mysql.connector
from mysql.connector import pooling
from typing import Any, Optional
from contextlib import contextmanager

DB_CONFIG = {
    "host": "76.13.21.186",
    "user": "root",
    "password": "apotek123",
    "database": "game_store_db",
    "port": 3306,
    "ssl_disabled": True,
    "autocommit": True,
    "connection_timeout": 10
}

_connection_pool = None

def get_connection_pool():
    global _connection_pool
    if _connection_pool is None:
        _connection_pool = pooling.MySQLConnectionPool(
            pool_name="mypool",
            pool_size=5,
            **DB_CONFIG
        )
    return _connection_pool

def get_connection():
    return get_connection_pool().get_connection()

@contextmanager
def get_db_cursor(dictionary=True):
    conn = get_connection()
    cursor = conn.cursor(dictionary=dictionary)
    try:
        yield cursor, conn
    finally:
        cursor.close()
        conn.close()

def fetch_all(query: str, params: tuple = None) -> list[dict]:
    with get_db_cursor() as (cursor, conn):
        cursor.execute(query, params or ())
        return cursor.fetchall()

def fetch_one(query: str, params: tuple = None) -> Optional[dict]:
    with get_db_cursor() as (cursor, conn):
        cursor.execute(query, params or ())
        return cursor.fetchone()

def execute(query: str, params: tuple = None) -> int:
    with get_db_cursor() as (cursor, conn):
        cursor.execute(query, params or ())
        conn.commit()
        return cursor.lastrowid

def execute_many(query: str, params_list: list[tuple]) -> int:
    with get_db_cursor() as (cursor, conn):
        cursor.executemany(query, params_list)
        conn.commit()
        return cursor.rowcount

@contextmanager
def transaction():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        yield cursor, conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()
