import os
import sys
import argparse
import json
from typing import Dict, Any, List, Tuple

try:
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


def conn_from_url_or_env(url: str | None, fallback_env_key: str, schema: str) -> psycopg.Connection:
    if not url:
        url = os.getenv(fallback_env_key)
    if not url:
        # Monta a URL a partir de variáveis DB_* se existir
        host = os.getenv("DB_HOST", "localhost")
        port = int(os.getenv("DB_PORT", "5432"))
        user = os.getenv("DB_USER", "postgres")
        password = os.getenv("DB_PASSWORD", "")
        name = os.getenv("DB_NAME", "postgres")
        conn = psycopg.connect(host=host, port=port, user=user, password=password, dbname=name, connect_timeout=10)
    else:
        conn = psycopg.connect(url, connect_timeout=10)
    with conn.cursor() as cur:
        try:
            cur.execute(f'SET search_path TO "{schema}", public')
        except Exception:
            pass
    return conn


def get_table_columns(conn: psycopg.Connection, schema: str, table: str) -> List[Tuple[str, str]]:
    sql = """
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema=%s AND table_name=%s
        ORDER BY ordinal_position
    """
    cur = conn.cursor()
    cur.execute(sql, (schema, table))
    out = [(r[0], r[1]) for r in cur.fetchall() or []]
    cur.close()
    return out


def get_publicacao_stats(conn: psycopg.Connection) -> Dict[str, Any]:
    cur = conn.cursor(row_factory=dict_row)
    cur.execute("SELECT COUNT(*) AS total FROM publicacao")
    total = (cur.fetchone() or {}).get("total", 0)
    cur.execute("SELECT COUNT(*) AS sem_nome FROM publicacao WHERE nome_arquivo IS NULL OR nome_arquivo='' ")
    sem_nome = (cur.fetchone() or {}).get("sem_nome", 0)
    cur.execute("SELECT COUNT(*) AS com_nome FROM publicacao WHERE nome_arquivo IS NOT NULL AND nome_arquivo<>'' ")
    com_nome = (cur.fetchone() or {}).get("com_nome", 0)
    # Amostras recentes
    cur.execute("""
        SELECT id_publicacao, titulo, nome_arquivo, status
        FROM publicacao
        ORDER BY id_publicacao DESC
        LIMIT 10
    """)
    amostra = cur.fetchall() or []
    cur.close()
    return {
        "total": total,
        "sem_nome_arquivo": sem_nome,
        "com_nome_arquivo": com_nome,
        "amostra": amostra,
    }


def main():
    parser = argparse.ArgumentParser(description="Comparar discrepâncias entre dois bancos (local vs online)")
    parser.add_argument("--db1", help="URL do banco 1 (ex: local). Se omitido, usa DATABASE_URL.", default=None)
    parser.add_argument("--db2", help="URL do banco 2 (ex: online). Se omitido, usa DATABASE_URL_2.", default=None)
    parser.add_argument("--schema", help="Schema (default: public)", default=os.getenv("DB_SCHEMA", "public"))
    args = parser.parse_args()

    schema = (args.schema or "public").strip() or "public"
    conn1 = conn_from_url_or_env(args.db1, "DATABASE_URL", schema)
    conn2 = conn_from_url_or_env(args.db2, "DATABASE_URL_2", schema)

    # Estrutura de tabelas críticas
    tables = ["usuario", "curso", "publicacao", "avaliacao", "tipos_de_publicacao"]
    estrutura1 = {t: get_table_columns(conn1, schema, t) for t in tables}
    estrutura2 = {t: get_table_columns(conn2, schema, t) for t in tables}

    # Estatísticas de publicacao
    pub1 = get_publicacao_stats(conn1)
    pub2 = get_publicacao_stats(conn2)

    # Comparação simples
    diff: Dict[str, Any] = {"schema": schema, "tabelas": {}}
    for t in tables:
        cols1 = estrutura1.get(t, [])
        cols2 = estrutura2.get(t, [])
        set1 = set(cols1)
        set2 = set(cols2)
        missing_in_2 = sorted(list(set1 - set2))
        missing_in_1 = sorted(list(set2 - set1))
        diff["tabelas"][t] = {
            "db1_cols": cols1,
            "db2_cols": cols2,
            "faltando_em_db2": missing_in_2,
            "faltando_em_db1": missing_in_1,
        }

    out = {
        "db1": {
            "schema": schema,
            "publicacao": pub1,
        },
        "db2": {
            "schema": schema,
            "publicacao": pub2,
        },
        "diferencas_estrutura": diff,
    }

    print(json.dumps(out, ensure_ascii=False, indent=2))

    conn1.close(); conn2.close()


if __name__ == "__main__":
    main()