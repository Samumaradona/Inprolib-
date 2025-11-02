import os
from dotenv import load_dotenv
import psycopg

def run_sql_file(path: str):
    with open(path, 'r', encoding='utf-8') as f:
        sql = f.read()
    # Split on semicolons while keeping statements simple; psycopg can execute full script if autocommit and use execute on full text
    return sql

def main():
    load_dotenv()
    dbname = os.getenv('DB_NAME', 'inprolib')
    host = os.getenv('DB_HOST', 'localhost')
    port = int(os.getenv('DB_PORT', '5432'))
    user = os.getenv('DB_USER', 'postgres')
    password = os.getenv('DB_PASSWORD', 'postgres')
    schema = os.getenv('DB_SCHEMA', 'public') or 'public'
    sql_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'banco.sql')
    print(f"[DB] Applying {sql_path} to {dbname} @ {host}:{port}")
    try:
        conn = psycopg.connect(dbname=dbname, host=host, port=port, user=user, password=password, connect_timeout=5)
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute(f'SET search_path TO "{schema}", public')
            cur.execute(run_sql_file(sql_path))
        conn.close()
        print('[DB] SQL applied successfully')
    except Exception as e:
        print(f"[DB] Failed to apply SQL: {e}")

if __name__ == '__main__':
    main()