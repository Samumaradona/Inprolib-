from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify, send_from_directory, make_response
import psycopg
from psycopg.rows import dict_row
import os
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash
from datetime import datetime
import secrets
import re
from functools import wraps
import time
import random
import io
import sys

load_dotenv()

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = os.getenv('SECRET_KEY', 'inprolib_secret_key_2024')
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload

# Configuração do banco de dados PostgreSQL (via variáveis de ambiente)
DB_CONFIG = {
    'dbname': os.getenv('DB_NAME', 'inprolib_schema'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres'),
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432')
}

# Garantir que a pasta de uploads exista
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs'), exist_ok=True)

# Rate limiting simples em memória: chave por IP+rota
RATE_LIMIT = {}

def check_rate_limit(key: str, limit: int = 20, window: int = 60) -> bool:
    now = time.time()
    bucket = RATE_LIMIT.get(key, {'count': 0, 'reset': now + window})
    if now > bucket['reset']:
        bucket = {'count': 0, 'reset': now + window}
    bucket['count'] += 1
    RATE_LIMIT[key] = bucket
    return bucket['count'] <= limit

def audit_log(event: str, details: dict):
    try:
        log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs', 'audit.log')
        with open(log_path, 'a', encoding='utf-8') as f:
            ts = datetime.now().isoformat()
            user = session.get('user_id')
            ip = request.remote_addr
            f.write(f"{ts}\t{ip}\tuser={user}\t{event}\t{details}\n")
    except Exception:
        pass

def validar_cpf(cpf: str) -> bool:
    if not cpf:
        return False
    cpf = re.sub(r'[^0-9]', '', cpf)
    if len(cpf) != 11:
        return False
    if cpf == cpf[0] * 11:
        return False
    # primeiro dígito verificador
    soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
    resto = 11 - (soma % 11)
    d1 = 0 if resto >= 10 else resto
    # segundo dígito verificador
    soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
    resto = 11 - (soma % 11)
    d2 = 0 if resto >= 10 else resto
    return cpf[-2:] == f"{d1}{d2}"

# Rotas para servir assets conforme os caminhos usados nos HTML (sem alterar HTML/CSS)
@app.route('/<asset_name>.css')
def serve_css(asset_name):
    resp = make_response(send_from_directory(os.path.join(app.static_folder, 'css'), f'{asset_name}.css'))
    resp.headers['Cache-Control'] = 'public, max-age=86400'
    return resp

@app.route('/<script_name>.js')
def serve_js(script_name):
    resp = make_response(send_from_directory(os.path.join(app.static_folder, 'javascript'), f'{script_name}.js'))
    resp.headers['Cache-Control'] = 'public, max-age=86400'
    return resp

@app.route('/img/<path:filename>')
def serve_img(filename):
    resp = make_response(send_from_directory(os.path.join(app.static_folder, 'img'), filename))
    resp.headers['Cache-Control'] = 'public, max-age=604800'
    return resp

# Função para conectar ao banco de dados
def get_db_connection():
    try:
        conn = psycopg.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"Erro ao conectar ao banco de dados: {e}")
        return None

# Decorator para verificar se o usuário está logado
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Por favor, faça login para acessar esta página', 'error')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Rota principal -> redireciona para Home
@app.route('/')
def index():
    return redirect(url_for('home'))

# Rota para a página inicial após login
@app.route('/home')
def home():
    conn = get_db_connection()
    publicacoes = []
    
    if conn:
        try:
            cur = conn.cursor(row_factory=dict_row)
            # Buscar as últimas publicações
            cur.execute("""
                SELECT p.*, u.nome as autor_nome, c.nome_curso 
                FROM publicacao p
                JOIN usuario u ON p.id_autor = u.id_usuario
                JOIN curso c ON p.id_curso = c.id_curso
                WHERE p.status = 'Publicado'
                ORDER BY p.data_publicacao DESC
                LIMIT 10
            """)
            publicacoes = cur.fetchall()
            cur.close()
            conn.close()
        except Exception as e:
            flash(f'Erro ao buscar publicações: {e}', 'error')
    
    return render_template('home.html', publicacoes=publicacoes)

# Rota para a página de cadastro de alunos
@app.route('/cadastro_alunos', methods=['GET', 'POST'])
def cadastro_alunos():
    # Em ambientes sem autenticação, não restringir acesso
    if request.method == 'POST' and request.form:
        # Rate limit por IP+rota
        key = f"{request.remote_addr}:cadastro_alunos"
        if not check_rate_limit(key, limit=20, window=60):
            flash('Muitas tentativas. Tente novamente em instantes.', 'error')
            audit_log('rate_limit', {'route': 'cadastro_alunos'})
            return redirect(url_for('cadastro_alunos'))
        nome = (request.form.get('nome') or request.form.get('nome_user') or '').strip()
        email = (request.form.get('email') or request.form.get('email_user') or '').strip()
        cpf = (request.form.get('cpf') or request.form.get('cpf_user') or '').strip()
        senha = (request.form.get('senha') or '').strip()
        confirmar_senha = (request.form.get('confirmar_senha') or '').strip()
        curso = request.form.get('curso')
        captcha = (request.form.get('captcha') or '').strip()

        # Validações básicas
        if not nome or not email or not cpf or not senha:
            flash('Por favor, preencha todos os campos obrigatórios.', 'error')
            return redirect(url_for('cadastro_alunos'))
        if senha != confirmar_senha:
            flash('As senhas não coincidem.', 'error')
            return redirect(url_for('cadastro_alunos'))
        if '@' not in email or '.' not in email:
            flash('E-mail inválido.', 'error')
            return redirect(url_for('cadastro_alunos'))
        if not validar_cpf(cpf):
            flash('CPF inválido.', 'error')
            return redirect(url_for('cadastro_alunos'))
        # Captcha simples
        if str(session.get('captcha_answer')) != captcha:
            flash('Captcha incorreto.', 'error')
            return redirect(url_for('cadastro_alunos'))

        conn = get_db_connection()
        if conn:
            try:
                cur = conn.cursor()
                # Verificar se o email já existe
                cur.execute("SELECT 1 FROM usuario WHERE email = %s", (email,))
                if cur.fetchone():
                    flash('Email já cadastrado', 'error')
                    cur.close()
                    conn.close()
                    audit_log('cadastro_aluno_fail', {'motivo': 'email_duplicado', 'email': email})
                    return redirect(url_for('cadastro_alunos'))
                # Inserir novo aluno
                senha_hash = generate_password_hash(senha)
                cur.execute(
                    "INSERT INTO usuario (nome, email, cpf, senha, tipo, curso_usuario) VALUES (%s, %s, %s, %s, %s, %s)",
                    (nome, email, cpf, senha_hash, 'Aluno', curso)
                )
                conn.commit()
                flash('Aluno cadastrado com sucesso!', 'success')
                cur.close()
                conn.close()
                audit_log('cadastro_aluno_ok', {'email': email})
            except Exception as e:
                flash(f'Erro ao cadastrar aluno: {e}', 'error')
                try:
                    conn.close()
                except Exception:
                    pass
                audit_log('cadastro_aluno_error', {'error': str(e)})
            return redirect(url_for('cadastro_alunos'))
    
    # Buscar cursos para o formulário e alunos para listagem
    cursos = []
    conn = get_db_connection()
    if conn:
        try:
            cur = conn.cursor(row_factory=dict_row)
            cur.execute("SELECT * FROM curso ORDER BY nome_curso")
            cursos = cur.fetchall()
            cur.close()
            conn.close()
        except Exception as e:
            flash(f'Erro ao buscar cursos: {e}', 'error')
    # Captcha pergunta
    a, b = random.randint(1, 9), random.randint(1, 9)
    session['captcha_answer'] = str(a + b)
    captcha_question = f"Quanto é {a} + {b}?"
    return render_template('cadastro_alunos.html', cursos=cursos, captcha_question=captcha_question)

# Rota para a página de cadastro de cursos
@app.route('/cadastro_curso', methods=['GET', 'POST'])
def cadastro_curso():
    if request.method == 'POST' and request.form:
        # Rate limit
        key = f"{request.remote_addr}:cadastro_curso"
        if not check_rate_limit(key, limit=20, window=60):
            flash('Muitas tentativas. Tente novamente em instantes.', 'error')
            audit_log('rate_limit', {'route': 'cadastro_curso'})
            return redirect(url_for('cadastro_curso'))
        nome_curso = request.form.get('nome_curso') or request.form.get('nome')
        descricao = request.form.get('descricao')
        codigo = request.form.get('codigo')
        autorizacao = request.form.get('autorizacao') or request.form.get('portaria')
        coordenador_id = request.form.get('coordenador')
        if coordenador_id == '':
            coordenador_id = None
        
        conn = get_db_connection()
        if conn:
            try:
                cur = conn.cursor()
                if nome_curso:
                    # Inserir novo curso
                    cur.execute(
                        "INSERT INTO curso (nome_curso, descricao_curso, codigo_curso, autorizacao, id_coordenador) VALUES (%s, %s, %s, %s, %s)",
                        (nome_curso, descricao, codigo, autorizacao, coordenador_id)
                    )
                    conn.commit()
                    flash('Curso cadastrado com sucesso!', 'success')
                    cur.close()
                    conn.close()
                    audit_log('cadastro_curso_ok', {'nome_curso': nome_curso})
                    return redirect(url_for('cadastro_curso'))
                else:
                    flash('Informe ao menos o nome do curso.', 'error')
                    cur.close()
                    conn.close()
                    audit_log('cadastro_curso_fail', {'motivo': 'nome_vazio'})
            except Exception as e:
                flash(f'Erro ao cadastrar curso: {e}', 'error')
                audit_log('cadastro_curso_error', {'error': str(e)})
    
    # Buscar professores para o formulário
    professores = []
    cursos = []
    conn = get_db_connection()
    if conn:
        try:
            cur = conn.cursor(row_factory=dict_row)
            cur.execute("SELECT * FROM usuario WHERE tipo = 'Professor' ORDER BY nome")
            professores = cur.fetchall()
            # Buscar cursos já cadastrados
            cur.execute("""
                SELECT c.id_curso, c.nome_curso, c.codigo_curso, c.autorizacao, u.nome as coordenador
                FROM curso c
                LEFT JOIN usuario u ON c.id_coordenador = u.id_usuario
                ORDER BY c.id_curso DESC
            """)
            cursos = cur.fetchall()
            cur.close()
            conn.close()
        except Exception as e:
            flash(f'Erro ao buscar professores: {e}', 'error')
    
    return render_template('cadastro_curso.html', professores=professores, cursos=cursos)

# Rota para a página de publicação
@app.route('/publicacao', methods=['GET', 'POST'])
def publicacao():
    if request.method == 'POST':
        # Rate limit
        key = f"{request.remote_addr}:publicacao"
        if not check_rate_limit(key, limit=15, window=60):
            flash('Muitas tentativas. Tente novamente em instantes.', 'error')
            audit_log('rate_limit', {'route': 'publicacao'})
            return redirect(url_for('publicacao'))
        titulo = (request.form.get('titulo') or request.form.get('titulo_conteudo') or '').strip()
        tipo = (request.form.get('tipo') or request.form.get('tipo_publicacao') or '').strip()
        curso_id = request.form.get('curso')  # pode ser None se não houver campo
        captcha = (request.form.get('captcha') or '').strip()
        arquivo = request.files.get('conteudo')
        # Captcha
        if str(session.get('captcha_answer')) != captcha:
            flash('Captcha incorreto.', 'error')
            return redirect(url_for('publicacao'))
        if not titulo:
            flash('Informe o título da publicação.', 'error')
            return redirect(url_for('publicacao'))
        if not tipo:
            flash('Informe o tipo da publicação.', 'error')
            return redirect(url_for('publicacao'))
        if not (arquivo and arquivo.filename):
            flash('Anexe o arquivo de conteúdo para publicar.', 'error')
            return redirect(url_for('publicacao'))
        # Validação de tipos de arquivo
        ALLOW_EXT = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.png', '.jpg', '.jpeg', '.webp'}
        ext = os.path.splitext(arquivo.filename)[1].lower()
        if ext not in ALLOW_EXT:
            flash('Tipo de arquivo não permitido.', 'error')
            return redirect(url_for('publicacao'))

        # Gerar nome seguro para o arquivo
        filename = secure_filename(arquivo.filename)
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        novo_filename = f"{timestamp}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], novo_filename)
        
        # Salvar o arquivo
        arquivo.save(filepath)
        
        conn = get_db_connection()
        if conn:
            try:
                cur = conn.cursor()
                # Inserir nova publicação (id_autor e id_curso podem ser None)
                cur.execute(
                    """INSERT INTO publicacao 
                       (titulo, data_publicacao, id_autor, id_curso, tipo, status, arquivo, nome_arquivo, assuntos_relacionados, data_autoria) 
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (titulo, datetime.now(), session.get('user_id'), curso_id, tipo or '', 'Publicado', 
                     filepath, novo_filename, None, None)
                )
                conn.commit()
                flash('Publicação realizada com sucesso!', 'success')
                cur.close()
                conn.close()
                audit_log('publicacao_ok', {'titulo': titulo, 'arquivo': novo_filename})
            except Exception as e:
                flash(f'Erro ao publicar: {e}', 'error')
                try:
                    conn.close()
                except Exception:
                    pass
                audit_log('publicacao_error', {'error': str(e)})
        return redirect(url_for('publicacao'))
    
    # Buscar cursos e tipos de publicação para o formulário e listar últimas publicações
    cursos = []
    tipos = []
    publicacoes = []
    conn = get_db_connection()
    if conn:
        try:
            cur = conn.cursor(row_factory=dict_row)
            cur.execute("SELECT * FROM curso ORDER BY nome_curso")
            cursos = cur.fetchall()
            
            cur.execute("SELECT * FROM tipos_de_publicacao ORDER BY nome_tipo")
            tipos = cur.fetchall()

            cur.execute("""
                SELECT p.id_publicacao, p.titulo, p.tipo, c.nome_curso AS curso
                FROM publicacao p
                LEFT JOIN curso c ON c.id_curso = p.id_curso
                ORDER BY p.id_publicacao DESC
                LIMIT 20
            """)
            publicacoes = cur.fetchall()
            
            cur.close()
            conn.close()
        except Exception as e:
            # Não exibir erros na tela durante o carregamento inicial (GET)
            # Registrar em log para diagnóstico sem interromper a experiência do usuário
            try:
                audit_log('vinculacao_fetch_error', {'error': str(e)})
            except Exception:
                pass
    # Captcha pergunta
    a, b = random.randint(1, 9), random.randint(1, 9)
    session['captcha_answer'] = str(a + b)
    captcha_question = f"Quanto é {a} + {b}?"
    return render_template('publicacao.html', cursos=cursos, tipos=tipos, publicacoes=publicacoes, captcha_question=captcha_question)

# Rota para a página de avaliação
@app.route('/avaliacao')
def avaliacao():
    publicacoes = []
    conn = get_db_connection()
    if conn:
        try:
            cur = conn.cursor(row_factory=dict_row)
            # Buscar publicações para avaliação
            cur.execute("""
                SELECT p.*, u.nome as autor_nome, c.nome_curso 
                FROM publicacao p
                JOIN usuario u ON p.id_autor = u.id_usuario
                JOIN curso c ON p.id_curso = c.id_curso
                ORDER BY p.data_publicacao DESC
            """)
            publicacoes = cur.fetchall()
            cur.close()
            conn.close()
        except Exception as e:
            flash(f'Erro ao buscar publicações: {e}', 'error')
    
    return render_template('avaliacao.html', publicacoes=publicacoes)

# Rota para a página de vinculação de curso
@app.route('/vinculacao_curso', methods=['GET', 'POST'])
def vinculacao_curso():
    if request.method == 'POST':
        key = f"{request.remote_addr}:vinculacao_curso"
        if not check_rate_limit(key, limit=30, window=60):
            flash('Muitas tentativas. Tente novamente em instantes.', 'error')
            audit_log('rate_limit', {'route': 'vinculacao_curso'})
            return redirect(url_for('vinculacao_curso'))
        usuario_id = request.form.get('usuario')
        curso_id = request.form.get('curso')

        if not usuario_id or not curso_id:
            flash('Selecione curso e usuário para vincular.', 'error')
            return redirect(url_for('vinculacao_curso'))

        conn = get_db_connection()
        if conn:
            try:
                cur = conn.cursor()
                # Verificar se já existe vinculação
                cur.execute("SELECT 1 FROM usuario_curso WHERE id_usuario = %s AND id_curso = %s", 
                           (usuario_id, curso_id))
                if cur.fetchone():
                    flash('Usuário já vinculado a este curso', 'error')
                else:
                    # Inserir vinculação
                    cur.execute(
                        "INSERT INTO usuario_curso (id_usuario, id_curso) VALUES (%s, %s)",
                        (usuario_id, curso_id)
                    )
                    conn.commit()
                    flash('Vinculação realizada com sucesso!', 'success')
                    audit_log('vinculacao_ok', {'usuario_id': usuario_id, 'curso_id': curso_id})
                cur.close()
                conn.close()
            except Exception as e:
                flash(f'Erro ao vincular: {e}', 'error')
                audit_log('vinculacao_error', {'error': str(e)})
        return redirect(url_for('vinculacao_curso'))
    
    # Buscar usuários e cursos para o formulário e listar vinculações
    usuarios = []
    cursos = []
    vinculos = []
    conn = get_db_connection()
    if conn:
        try:
            cur = conn.cursor(row_factory=dict_row)
            cur.execute("SELECT * FROM usuario ORDER BY nome")
            usuarios = cur.fetchall()
            
            cur.execute("SELECT * FROM curso ORDER BY nome_curso")
            cursos = cur.fetchall()

            cur.execute("""
                SELECT uc.id, u.nome AS usuario, c.nome_curso AS curso
                FROM usuario_curso uc
                JOIN usuario u ON u.id_usuario = uc.id_usuario
                JOIN curso c ON c.id_curso = uc.id_curso
                ORDER BY uc.id DESC
                LIMIT 50
            """)
            vinculos = cur.fetchall()
            
            cur.close()
            conn.close()
        except Exception as e:
            flash(f'Erro ao buscar dados: {e}', 'error')
    
    return render_template('vinculacao_curso.html', usuarios=usuarios, cursos=cursos, vinculos=vinculos)

# Rota para a página de relatório
@app.route('/relatorio')
def relatorio():
    return render_template('relatorio.html')

# Rota para a página de suporte
@app.route('/suporte')
def suporte():
    return render_template('suporte.html')

# Rota para a página de configuração
@app.route('/configuracao')
def configuracao():
    return render_template('configuracao.html')

# Rota para logout
@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# API para buscar publicações
@app.route('/api/publicacoes', methods=['GET'])
def api_publicacoes():
    query = request.args.get('q', '')
    filtros = request.args.getlist('filtro')
    
    if not filtros:
        filtros = ['autor', 'assunto', 'curso', 'titulo']
    
    conn = get_db_connection()
    resultados = []
    
    if conn:
        try:
            cur = conn.cursor(row_factory=dict_row)
            
            # Construir a consulta SQL com base nos filtros
            sql_parts = []
            params = []
            
            if 'autor' in filtros:
                sql_parts.append("u.nome ILIKE %s")
                params.append(f'%{query}%')
            
            if 'assunto' in filtros:
                sql_parts.append("p.assuntos_relacionados ILIKE %s")
                params.append(f'%{query}%')
            
            if 'curso' in filtros:
                sql_parts.append("c.nome_curso ILIKE %s")
                params.append(f'%{query}%')
            
            if 'titulo' in filtros:
                sql_parts.append("p.titulo ILIKE %s")
                params.append(f'%{query}%')
            
            where_clause = " OR ".join(sql_parts)
            
            # Executar a consulta
            cur.execute(f"""
                SELECT p.*, u.nome as autor_nome, c.nome_curso 
                FROM publicacao p
                JOIN usuario u ON p.id_autor = u.id_usuario
                JOIN curso c ON p.id_curso = c.id_curso
                WHERE p.status = 'Publicado' AND ({where_clause})
                ORDER BY p.data_publicacao DESC
            """, params)
            
            resultados = cur.fetchall()
            
            # Converter para formato JSON
            resultados_json = []
            for r in resultados:
                resultados_json.append({
                    'id': r['id_publicacao'],
                    'titulo': r['titulo'],
                    'autor': r['autor_nome'],
                    'curso': r['nome_curso'],
                    'data': r['data_publicacao'].strftime('%d/%m/%Y'),
                    'tipo': r['tipo'],
                    'assuntos': r['assuntos_relacionados']
                })
            
            cur.close()
            conn.close()
            return jsonify(resultados_json)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    return jsonify([])

def run_validacao():
    # Rotina de validação: cria curso, publica arquivo com CAPTCHA e vincula usuário a curso.
    with app.test_client() as client:
        # 1) Criar curso
        resp1 = client.post('/cadastro_curso', data={
            'nome_curso': 'Curso Validação',
            'descricao': 'Curso de Teste',
            'codigo': 'VAL123',
            'autorizacao': '1234',
            'coordenador': ''
        }, follow_redirects=True)
        print('cadastro_curso status:', resp1.status_code)

        # Obter id do curso recém-criado (ou último com mesmo código)
        curso_id = None
        conn = get_db_connection()
        if conn:
            try:
                cur = conn.cursor()
                cur.execute("""
                    SELECT id_curso FROM curso
                    WHERE codigo_curso = %s
                    ORDER BY id_curso DESC
                    LIMIT 1
                """, ('VAL123',))
                row = cur.fetchone()
                if row:
                    curso_id = str(row[0])
                cur.close()
                conn.close()
            except Exception as e:
                try:
                    conn.close()
                except Exception:
                    pass
                print('Erro ao obter curso_id:', e)

        # 2) Publicação com CAPTCHA e upload
        _ = client.get('/publicacao')
        with client.session_transaction() as sess:
            captcha_answer = sess.get('captcha_answer')
        data = {
            'titulo_conteudo': 'Teste Publicacao',
            'tipo_publicacao': 'TCC',
            'curso': curso_id or '',
            'captcha': captcha_answer or ''
        }
        file_tuple = (io.BytesIO(b'Arquivo de teste da publicacao'), 'test_upload.txt')
        resp2 = client.post(
            '/publicacao',
            data={**data, 'conteudo': file_tuple},
            content_type='multipart/form-data',
            follow_redirects=True
        )
        print('publicacao status:', resp2.status_code)

        # 3) Vincular usuário a curso (pega primeiro usuário existente)
        usuario_id = None
        conn2 = get_db_connection()
        if conn2:
            try:
                cur2 = conn2.cursor()
                cur2.execute("SELECT id_usuario FROM usuario ORDER BY id_usuario LIMIT 1")
                row2 = cur2.fetchone()
                if row2:
                    usuario_id = str(row2[0])
                cur2.close()
                conn2.close()
            except Exception as e:
                try:
                    conn2.close()
                except Exception:
                    pass
                print('Erro ao obter usuario_id:', e)

        if usuario_id and curso_id:
            resp3 = client.post('/vinculacao_curso', data={'usuario': usuario_id, 'curso': curso_id}, follow_redirects=True)
            print('vinculacao_curso status:', resp3.status_code)
        else:
            print('vinculacao_curso pulada: usuario_id ou curso_id ausente')


def run_migracao_hash():
    # Migra senhas em texto puro para hash seguro (pbkdf2:sha256)
    conn = get_db_connection()
    if not conn:
        print('Falha ao conectar ao banco para migração de hash.')
        return
    atualizados = 0
    try:
        cur = conn.cursor()
        cur.execute("SELECT id_usuario, senha FROM usuario")
        rows = cur.fetchall()
        for uid, senha in rows:
            s = str(senha or '')
            # Se já parece hash conhecido, pula
            if s.startswith('pbkdf2:') or s.startswith('$argon2'):
                continue
            novo = generate_password_hash(s)
            cur.execute("UPDATE usuario SET senha = %s WHERE id_usuario = %s", (novo, uid))
            atualizados += 1
        conn.commit()
        cur.close()
        conn.close()
        print(f'Migração concluída. Senhas atualizadas: {atualizados}.')
    except Exception as e:
        try:
            conn.close()
        except Exception:
            pass
        print('Erro na migração de hash:', e)


if __name__ == '__main__':
    # Executa a validação quando chamado com --validate; migração com --hash-migrate; caso contrário, sobe o servidor.
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if arg in ('--validate', 'validate'):
            run_validacao()
        elif arg in ('--hash-migrate', 'hash-migrate'):
            run_migracao_hash()
        else:
            app.run(debug=True)
    else:
        app.run(debug=True)