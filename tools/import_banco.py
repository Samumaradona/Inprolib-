import argparse
import os
from pathlib import Path

import psycopg


def run_sql_file(conn: psycopg.Connection, sql_path: Path):
    sql_text = sql_path.read_text(encoding="utf-8")

    # Split on semicolons to execute statements one by one.
    # This keeps things simple for schema + inserts contained in banco.sql.
    # Skips empty segments and trims whitespace.
    statements = [s.strip() for s in sql_text.split(";")]

    executed = 0
    with conn.cursor() as cur:
        for stmt in statements:
            if not stmt:
                continue
            try:
                cur.execute(stmt)
                executed += 1
            except Exception as e:
                # Provide context and keep failing fast so user can fix the SQL if needed
                raise RuntimeError(f"Falha ao executar SQL:\n{stmt}\n\nErro: {e}")
    conn.commit()
    return executed


def main():
    parser = argparse.ArgumentParser(description="Importar banco.sql no Postgres usando psycopg.")
    parser.add_argument(
        "--url",
        dest="db_url",
        help="String de conexão Postgres (ex.: postgresql://usuario:senha@host:5432/nome_db). Se omitida, usa DATABASE_URL do ambiente.",
    )
    parser.add_argument(
        "--file",
        dest="sql_file",
        default=str(Path(__file__).resolve().parent.parent / "banco.sql"),
        help="Caminho para o arquivo SQL (padrão: banco.sql na raiz do projeto).",
    )
    args = parser.parse_args()

    db_url = args.db_url or os.getenv("DATABASE_URL")
    if not db_url:
        raise SystemExit(
            "Você precisa fornecer a URL do banco via --url ou definir a variável de ambiente DATABASE_URL."
        )

    sql_path = Path(args.sql_file)
    if not sql_path.exists():
        raise SystemExit(f"Arquivo SQL não encontrado: {sql_path}")

    print(f"Conectando ao banco: {db_url}")
    with psycopg.connect(db_url, autocommit=False) as conn:
        total = run_sql_file(conn, sql_path)
    print(f"Importação concluída. {total} instruções executadas com sucesso.")


if __name__ == "__main__":
    main()