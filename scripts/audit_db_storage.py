import os
import sys
import json
from typing import Dict, Any, List

try:
    # Prefer local .env if available
    from dotenv import load_dotenv, find_dotenv  # type: ignore
    _dotenv = find_dotenv(usecwd=True)
    if _dotenv:
        load_dotenv(_dotenv)
except Exception:
    pass

try:
    import psycopg  # type: ignore
    from psycopg.rows import dict_row  # type: ignore
except Exception as e:
    print("Erro: psycopg não está disponível. Instale as dependências (requirements.txt).", file=sys.stderr)
    raise


def _get_db_conn():
    """Abre conexão com PostgreSQL usando env vars (DATABASE_URL tem precedência).
    Seta search_path para DB_SCHEMA e public.
    """
    db_url = os.getenv("DATABASE_URL")
    db_schema = (os.getenv("DB_SCHEMA", "public") or "public").strip()
    if db_url:
        conn = psycopg.connect(db_url, connect_timeout=10)
    else:
        host = os.getenv("DB_HOST", "localhost")
        port = int(os.getenv("DB_PORT", "5432"))
        user = os.getenv("DB_USER", "postgres")
        password = os.getenv("DB_PASSWORD", "")
        name = os.getenv("DB_NAME", "postgres")
        conn = psycopg.connect(host=host, port=port, user=user, password=password, dbname=name, connect_timeout=10)
    with conn.cursor() as cur:
        try:
            cur.execute(f'SET search_path TO "{db_schema}", public')
        except Exception:
            # Continua mesmo se o schema não existir
            pass
    return conn


def audit_publicacao_and_uploads(limit: int = 0) -> Dict[str, Any]:
    """Audita integridade entre registros de publicacao e arquivos em static/uploads.

    Retorna um dicionário com contagens e amostras de problemas.
    """
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    uploads_dir = os.path.join(base_dir, "static", "uploads")
    previews_dir = os.path.join(base_dir, "static", "previews")

    # Garante que os diretórios existam (apenas local)
    os.makedirs(uploads_dir, exist_ok=True)
    os.makedirs(previews_dir, exist_ok=True)

    conn = _get_db_conn()
    cur = conn.cursor(row_factory=dict_row)
    sql = "SELECT id_publicacao, titulo, nome_arquivo, status FROM publicacao ORDER BY id_publicacao DESC"
    if limit and limit > 0:
        sql += " LIMIT %s"
        cur.execute(sql, (limit,))
    else:
        cur.execute(sql)
    rows: List[Dict[str, Any]] = cur.fetchall() or []
    cur.close(); conn.close()

    total = len(rows)
    without_name = []
    with_name_missing_file = []
    with_name_file_ok = 0

    for r in rows:
        stored = (r.get("nome_arquivo") or "").strip()
        if not stored:
            without_name.append({"id": r.get("id_publicacao"), "titulo": r.get("titulo"), "status": r.get("status")})
            continue
        full = os.path.join(uploads_dir, stored)
        if not os.path.exists(full):
            with_name_missing_file.append({"id": r.get("id_publicacao"), "titulo": r.get("titulo"), "nome_arquivo": stored, "status": r.get("status")})
        else:
            with_name_file_ok += 1

    uploads_count = 0
    try:
        uploads_count = len([f for f in os.listdir(uploads_dir) if os.path.isfile(os.path.join(uploads_dir, f))])
    except Exception:
        pass

    result = {
        "uploads_dir": uploads_dir,
        "previews_dir": previews_dir,
        "uploads_count": uploads_count,
        "total_publicacoes": total,
        "sem_nome_arquivo": len(without_name),
        "com_nome_e_arquivo_ok": with_name_file_ok,
        "com_nome_mas_arquivo_faltando": len(with_name_missing_file),
        "amostra_sem_nome": without_name[:20],
        "amostra_arquivo_faltando": with_name_missing_file[:20],
    }
    return result


def main():
    limit = 0
    if len(sys.argv) >= 2:
        try:
            limit = int(sys.argv[1])
        except Exception:
            pass
    report = audit_publicacao_and_uploads(limit=limit)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()