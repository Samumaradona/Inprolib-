import os
from dotenv import load_dotenv
import psycopg

def main():
    load_dotenv()
    dbname = os.getenv('DB_NAME', 'inprolib')
    host = os.getenv('DB_HOST', 'localhost')
    port = int(os.getenv('DB_PORT', '5432'))
    user = os.getenv('DB_USER', 'postgres')
    password = os.getenv('DB_PASSWORD', 'postgres')
    print(f"[DB] Creating database if missing: {dbname} @ {host}:{port} as {user}")
    try:
        admin = psycopg.connect(dbname='postgres', host=host, port=port, user=user, password=password, connect_timeout=5)
        admin.autocommit = True
        with admin.cursor() as cur:
            cur.execute('SELECT 1 FROM pg_database WHERE datname=%s', (dbname,))
            exists = cur.fetchone()
            if exists:
                print('[DB] Database already exists')
            else:
                cur.execute(f'CREATE DATABASE "{dbname}"')
                print('[DB] Database created successfully')
        admin.close()
    except Exception as e:
        print(f"[DB] Failed to create database: {e}")

if __name__ == '__main__':
    main()