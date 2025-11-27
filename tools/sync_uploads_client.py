#!/usr/bin/env python3
"""
Cliente de sincronização de uploads para INPROLIB.

Funciona assim:
1) Consulta no servidor a lista de arquivos de publicações ausentes.
2) Procura esses arquivos em uma pasta local (por padrão ./static/uploads).
3) Envia um pacote ZIP com os arquivos encontrados para o endpoint /sync_uploads.

Uso:
  python tools/sync_uploads_client.py --server http://localhost:5000 --token SEU_TOKEN \
      --src ./static/uploads --overwrite

Variáveis de ambiente (alternativas):
  SERVER_URL           URL base do servidor (ex.: http://localhost:5000)
  UPLOAD_SYNC_TOKEN    Token de sincronização (mesmo valor configurado no backend)

Requisitos:
  pip install requests
"""

import os
import io
import sys
import argparse
import zipfile
import requests


def build_zip_from_missing(src_dir: str, missing: list[dict]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        added = 0
        for item in missing:
            fname = (item.get('nome_arquivo') or '').strip()
            if not fname:
                continue
            local_path = os.path.join(src_dir, fname)
            if os.path.exists(local_path):
                zf.write(local_path, arcname=fname)
                added += 1
            else:
                print(f"[warn] Arquivo local não encontrado: {local_path}")
    buf.seek(0)
    if buf.tell() == 0:
        # Em alguns ambientes, tell retorna 0 mesmo com dados; força leitura para contagem
        pass
    return buf.getvalue()


def main():
    parser = argparse.ArgumentParser(description="Cliente de sincronização de uploads para INPROLIB")
    parser.add_argument('--server', default=os.getenv('SERVER_URL') or 'http://localhost:5000', help='URL base do servidor')
    parser.add_argument('--token', default=os.getenv('UPLOAD_SYNC_TOKEN') or '', help='Token de sincronização')
    parser.add_argument('--src', default='./static/uploads', help='Diretório local de uploads')
    parser.add_argument('--limit', type=int, default=500, help='Limite de itens faltantes a processar')
    parser.add_argument('--overwrite', action='store_true', help='Sobrescrever arquivos existentes no servidor')
    parser.add_argument('--dry-run', action='store_true', help='Apenas listar, não enviar')
    args = parser.parse_args()

    server = args.server.rstrip('/')
    token = args.token.strip()
    if not token:
        print('[error] Token não informado. Use --token ou defina UPLOAD_SYNC_TOKEN.')
        sys.exit(1)

    # 1) Listar faltantes
    url_list = f"{server}/sync_list_missing?limit={args.limit}"
    try:
        resp = requests.get(url_list, headers={'X-Upload-Sync-Token': token}, timeout=20)
    except Exception as e:
        print('[error] Falha ao consultar faltantes:', e)
        sys.exit(2)
    if resp.status_code != 200:
        print('[error] Resposta inesperada:', resp.status_code, resp.text)
        sys.exit(3)
    payload = resp.json()
    if not payload.get('ok'):
        print('[error] Servidor retornou erro:', payload)
        sys.exit(4)
    missing = payload.get('missing') or []
    print(f"[info] Faltantes reportados: {payload.get('count')} (processando no máximo {args.limit})")
    if not missing:
        print('[info] Nada para sincronizar. Saindo.')
        return

    if args.dry_run:
        for it in missing[:10]:
            print(f" - id={it.get('id_publicacao')} nome_arquivo={it.get('nome_arquivo')} titulo={it.get('titulo')}")
        print('[info] Dry-run concluído. Use sem --dry-run para enviar.')
        return

    # 2) Montar ZIP
    src_dir = os.path.abspath(args.src)
    zip_bytes = build_zip_from_missing(src_dir, missing)
    if not zip_bytes:
        print('[error] Nenhum arquivo local correspondente encontrado em', src_dir)
        sys.exit(5)

    # 3) Enviar para /sync_uploads
    url_upload = f"{server}/sync_uploads"
    files = {
        'zip': ('uploads_sync.zip', zip_bytes, 'application/zip')
    }
    data = {
        'overwrite': '1' if args.overwrite else '0'
    }
    try:
        resp2 = requests.post(url_upload, headers={'X-Upload-Sync-Token': token}, files=files, data=data, timeout=60)
    except Exception as e:
        print('[error] Falha ao enviar ZIP:', e)
        sys.exit(6)
    if resp2.status_code != 200:
        print('[error] Upload falhou:', resp2.status_code, resp2.text)
        sys.exit(7)
    result = resp2.json()
    if not result.get('ok'):
        print('[error] Erro no servidor:', result)
        sys.exit(8)
    print('[info] Upload concluído. Resultados:')
    for r in result.get('results') or []:
        status = 'written' if r.get('written') else ('skipped' if r.get('skipped') else 'unknown')
        print(f" - {r.get('filename')}: {status}")


if __name__ == '__main__':
    main()