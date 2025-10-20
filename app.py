from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify, send_from_directory, make_response, send_file
import psycopg
from psycopg.rows import dict_row
from psycopg.errors import InvalidCatalogName
import os
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import secrets
import re
from functools import wraps
import time
import random
import io
import sys
import smtplib
from email.message import EmailMessage
import mimetypes

load_dotenv()

app = Flask(__name__, static_folder='static', template_folder='templates')
# Tipos MIME explícitos para Office (garantem Content-Type correto em assets estáticos)
mimetypes.add_type('application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx')
mimetypes.add_type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx')
mimetypes.add_type('application/vnd.ms-excel', '.xls')
app.secret_key = os.getenv('SECRET_KEY', 'inprolib_secret_key_2024')
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload
ADMIN_SETUP_TOKEN = os.getenv('ADMIN_SETUP_TOKEN', 'setup_admin_2024')
ADMIN_TEMP_PASSWORD = os.getenv('ADMIN_TEMP_PASSWORD', 'Adm@2025!')
# Expiração do token de recuperação em segundos (padrão: 8 segundos)
RESET_TOKEN_EXP_SECONDS = int(os.getenv('RESET_TOKEN_EXP_SECONDS', '8'))

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

def send_reset_email(to_email: str, reset_url: str) -> bool:
    host = os.getenv('SMTP_HOST')
    port = int(os.getenv('SMTP_PORT', '587'))
    user = os.getenv('SMTP_USER')
    password = os.getenv('SMTP_PASSWORD')
    sender = os.getenv('SMTP_FROM', user or '')
    use_ssl = os.getenv('SMTP_USE_SSL', '0').lower() in {'1','true','yes'}

    if not host or not user or not password or not sender:
        print('[SMTP] Configuração incompleta. Não foi possível enviar e-mail.')
        print('[SMTP] Link de redefinição:', reset_url)
        return False

    try:
        msg = EmailMessage()
        msg['Subject'] = 'INPROLIB - Redefinição de senha'
        msg['From'] = sender
        msg['To'] = to_email
        msg.set_content(
            (
                'Olá,\n\nVocê solicitou a redefinição de senha no INPROLIB.\n'
                f'Acesse o link abaixo para criar uma nova senha (expira em {RESET_TOKEN_EXP_SECONDS} segundos):\n\n{reset_url}\n\n'
                'Se você não solicitou, ignore este e-mail.'
            )
        )

        if use_ssl:
            with smtplib.SMTP_SSL(host, port) as smtp:
                smtp.login(user, password)
                smtp.send_message(msg)
        else:
            with smtplib.SMTP(host, port) as smtp:
                smtp.ehlo()
                smtp.starttls()
                smtp.ehlo()
                smtp.login(user, password)
                smtp.send_message(msg)
        return True
    except Exception as e:
        print('[SMTP] Erro ao enviar e-mail:', e)
        print('[SMTP] Link de redefinição:', reset_url)
        return False


def send_support_email(body_text: str, attachment: tuple | None = None, reply_to: str | None = None, subject: str = 'INPROLIB - Suporte') -> bool:
    """
    Envia um e-mail de suporte.
    - body_text: texto principal da mensagem
    - attachment: tuple opcional (filename, data_bytes, mimetype)
    - reply_to: e-mail do usuário para facilitar resposta
    """
    host = os.getenv('SMTP_HOST')
    port = int(os.getenv('SMTP_PORT', '587'))
    user = os.getenv('SMTP_USER')
    password = os.getenv('SMTP_PASSWORD')
    sender = os.getenv('SMTP_FROM', user or '')
    use_ssl = os.getenv('SMTP_USE_SSL', '0').lower() in {'1','true','yes'}
    to_email = os.getenv('SUPPORT_EMAIL', 'suporteinprolib@gmail.com')

    if not host or not user or not password or not sender:
        print('[SMTP] Configuração incompleta. Não foi possível enviar e-mail de suporte.')
        return False

    try:
        msg = EmailMessage()
        msg['Subject'] = subject
        msg['From'] = sender
        msg['To'] = to_email
        if reply_to:
            msg['Reply-To'] = reply_to
        msg.set_content(body_text)

        if attachment:
            filename, data_bytes, mimetype = attachment
            try:
                maintype, subtype = (mimetype or 'application/octet-stream').split('/', 1)
            except Exception:
                maintype, subtype = 'application', 'octet-stream'
            msg.add_attachment(data_bytes, maintype=maintype, subtype=subtype, filename=filename)

        if use_ssl:
            with smtplib.SMTP_SSL(host, port) as smtp:
                smtp.login(user, password)
                smtp.send_message(msg)
        else:
            with smtplib.SMTP(host, port) as smtp:
                smtp.ehlo()
                smtp.starttls()
                smtp.ehlo()
                smtp.login(user, password)
                smtp.send_message(msg)
        return True
    except Exception as e:
        print('[SMTP] Erro ao enviar e-mail de suporte:', e)
        return False

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
    # Evita cache agressivo durante desenvolvimento, garantindo atualização imediata do menu
    resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    resp.headers['Pragma'] = 'no-cache'
    resp.headers['Expires'] = '0'
    return resp

@app.route('/<script_name>.js')
def serve_js(script_name):
    resp = make_response(send_from_directory(os.path.join(app.static_folder, 'javascript'), f'{script_name}.js'))
    # Evita cache agressivo durante desenvolvimento, garantindo atualização imediata do JS
    resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    resp.headers['Pragma'] = 'no-cache'
    resp.headers['Expires'] = '0'
    return resp

@app.route('/img/<path:filename>')
def serve_img(filename):
    resp = make_response(send_from_directory(os.path.join(app.static_folder, 'img'), filename))
    resp.headers['Cache-Control'] = 'public, max-age=604800'
    return resp

# Função para conectar ao banco de dados
# Usa psycopg (v3) e cria o banco automaticamente se ele não existir
SCHEMA_READY = False

def get_db_connection():
    global SCHEMA_READY
    try:
        db_url = os.getenv('DATABASE_URL')
        if db_url:
            # Corrige prefixo antigo
            if db_url.startswith("postgres://"):
                db_url = db_url.replace("postgres://", "postgresql://", 1)
            conn = psycopg.connect(db_url)
            return conn

        # Monta a conexão via dict (DB_CONFIG)
        cfg = {k: (str(v).strip() if isinstance(v, str) else v) for k, v in DB_CONFIG.items()}
        try:
            conn = psycopg.connect(**cfg)
            return conn
        except InvalidCatalogName:
            # Banco não existe: conecta no 'postgres' e cria
            admin_cfg = {**cfg, 'dbname': 'postgres'}
            admin = psycopg.connect(**admin_cfg)
            admin.autocommit = True
            with admin.cursor() as cur:
                cur.execute("SELECT 1 FROM pg_database WHERE datname=%s", (cfg['dbname'],))
                if not cur.fetchone():
                    cur.execute(f'CREATE DATABASE "{cfg["dbname"]}"')
            admin.close()
            # Conecta ao banco recém-criado
            conn = psycopg.connect(**cfg)
            return conn
    except Exception as e:
        print(f"Erro ao conectar ao banco de dados: {e}")
        return None

# Helper para garantir coluna 'ativo' em curso
def ensure_curso_ativo_column():
    conn = get_db_connection()
    if not conn:
        return
    try:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM information_schema.columns WHERE table_name='curso' AND column_name='ativo'")
        if not cur.fetchone():
            cur.execute("ALTER TABLE curso ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT TRUE")
            conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        try:
            conn.close()
        except Exception:
            pass
        print(f"Falha ao garantir coluna curso.ativo: {e}")

# Helper para garantir coluna 'ativo' em usuario
def ensure_usuario_ativo_column():
    conn = get_db_connection()
    if not conn:
        return
    try:
        cur = conn.cursor()
        cur.execute("SELECT current_schema()")
        schema = (cur.fetchone() or ['public'])[0] or 'public'
        cur.execute("SELECT 1 FROM information_schema.columns WHERE table_schema=%s AND table_name='usuario' AND column_name='ativo'", (schema,))
        if not cur.fetchone():
            cur.execute(f'ALTER TABLE "{schema}".usuario ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT TRUE')
            conn.commit()
        cur.close(); conn.close()
    except Exception as e:
        try:
            conn.close()
        except Exception:
            pass
        print(f"Falha ao garantir coluna usuario.ativo: {e}")

# Helper para garantir colunas de endereço em usuario (cep, logradouro, complemento, bairro, cidade, estado)
def ensure_usuario_endereco_columns():
    conn = get_db_connection()
    if not conn:
        return
    try:
        cur = conn.cursor()
        cur.execute("SELECT current_schema()")
        schema = (cur.fetchone() or ['public'])[0] or 'public'
        cols = [
            ('cep', 'VARCHAR(9)'),
            ('logradouro', 'VARCHAR(255)'),
            ('complemento', 'VARCHAR(255)'),
            ('bairro', 'VARCHAR(255)'),
            ('cidade', 'VARCHAR(255)'),
            ('estado', 'VARCHAR(2)')
        ]
        for col, coldef in cols:
            cur.execute("SELECT 1 FROM information_schema.columns WHERE table_schema=%s AND table_name='usuario' AND column_name=%s", (schema, col))
            if not cur.fetchone():
                cur.execute(f'ALTER TABLE "{schema}".usuario ADD COLUMN {col} {coldef}')
                conn.commit()
        cur.close(); conn.close()
    except Exception as e:
        try:
            conn.close()
        except Exception:
            pass
        print(f"Falha ao garantir colunas de endereço em usuario: {e}")

# Inicialização do schema na primeira requisição
SCHEMA_INIT_DONE = False
@app.before_request
def init_schema_once():
    global SCHEMA_INIT_DONE
    if SCHEMA_INIT_DONE:
        return
    try:
        ensure_usuario_ativo_column()
        ensure_usuario_endereco_columns()
        SCHEMA_INIT_DONE = True
        print("Schema inicial garantido: usuario.ativo e colunas de endereço.")
    except Exception as e:
        print(f"Falha ao garantir schema inicial: {e}")

# Decorator para verificar se o usuário está logado
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Por favor, faça login para acessar esta página', 'error')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Controle de acesso por perfil
def _normalize_role(tipo: str) -> str:
    if not tipo:
        return ''
    tipo = str(tipo).strip()
    mapping = {
        'Administrador': 'Administrador',
        'Funcionário': 'Administrador',
        'Funcionario': 'Administrador',
        'Professor': 'Docente',
        'Docente': 'Docente',
        'Aluno': 'Aluno'
    }
    return mapping.get(tipo, tipo)

def roles_required(allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            role = _normalize_role(session.get('role') or session.get('user_tipo'))
            if not role:
                flash('Por favor, faça login para acessar esta página', 'error')
                return redirect(url_for('login'))
            if role not in allowed_roles:
                # Silenciosamente redireciona para Home sem exibir mensagem
                return redirect(url_for('home'))
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Rota principal -> redireciona para Home
@app.route('/')
def index():
    return redirect(url_for('login'))

# Rota segura para cadastrar/atualizar usuário administrador
@app.route('/setup_admin', methods=['GET'])
def setup_admin():
    try:
        token = (request.args.get('token') or '').strip()
        if token != ADMIN_SETUP_TOKEN:
            return make_response(jsonify({'error': 'Unauthorized'}), 403)

        # Dados padrão do admin (podem ser sobrepostos via querystring)
        nome = (request.args.get('nome') or 'Samuel Edgar').strip()
        email = (request.args.get('email') or 'samuel.edgar@gmail.com').strip()
        cpf = (request.args.get('cpf') or '000.000.000-00').strip()
        # Permitir sobrepor a senha via querystring ("senha" ou "password"); fallback para ADMIN_TEMP_PASSWORD
        senha_param = (request.args.get('senha') or request.args.get('password') or '').strip()
        temp_password = senha_param if senha_param else ADMIN_TEMP_PASSWORD
        senha_hash = generate_password_hash(temp_password)

        conn = get_db_connection()
        if not conn:
            return make_response(jsonify({'error': 'Falha ao conectar ao banco.'}), 500)
        try:
            cur = conn.cursor(row_factory=dict_row)
            cur.execute("SELECT id_usuario, tipo FROM usuario WHERE email = %s", (email,))
            user = cur.fetchone()

            # Detectar o label válido para 'Funcionário' no enum (com ou sem acento)
            cur_labels = conn.cursor()
            cur_labels.execute("""
                SELECT e.enumlabel
                FROM pg_enum e
                WHERE e.enumtypid = (
                  SELECT a.atttypid
                  FROM pg_attribute a
                  JOIN pg_class c ON a.attrelid = c.oid
                  WHERE c.relname = 'usuario' AND a.attname = 'tipo'
                  LIMIT 1
                )
            """)
            rows = cur_labels.fetchall() or []
            labels = set()
            for r in rows:
                try:
                    labels.add(r[0])
                except Exception:
                    try:
                        labels.add(r.get('enumlabel'))
                    except Exception:
                        pass
            cur_labels.close()
            tipo_admin_label = 'Funcionário' if 'Funcionário' in labels else ('Funcionario' if 'Funcionario' in labels else None)
            if not tipo_admin_label:
                audit_log('setup_admin_error', {'error': 'Enum tipo_usuario sem Funcionário/Funcionario', 'labels': sorted(list(labels))})
                cur.close(); conn.close()
                return make_response(jsonify({'error': f"Enum tipo_usuario não possui 'Funcionário' ou 'Funcionario'. Labels: {sorted(list(labels))}"}), 500)

            if user:
                cur2 = conn.cursor()
                cur2.execute(
                    "UPDATE usuario SET nome = %s, cpf = %s, senha = %s, tipo = %s WHERE id_usuario = %s",
                    (nome, cpf, senha_hash, tipo_admin_label, user['id_usuario'])
                )
                conn.commit()
                cur2.close()
                status = 'updated'
            else:
                cur2 = conn.cursor()
                cur2.execute(
                    "INSERT INTO usuario (nome, email, cpf, senha, tipo, curso_usuario) VALUES (%s, %s, %s, %s, %s, %s)",
                    (nome, email, cpf, senha_hash, tipo_admin_label, None)
                )
                conn.commit()
                cur2.close()
                status = 'created'

            cur.close()
            conn.close()
            audit_log('setup_admin_ok', {'email': email, 'status': status})
            return jsonify({'ok': True, 'status': status, 'email': email, 'temp_password': temp_password})
        except Exception as e:
            try:
                conn.close()
            except Exception:
                pass
            audit_log('setup_admin_error', {'error': str(e)})
            return make_response(jsonify({'error': str(e)}), 500)
    except Exception as e:
        audit_log('setup_admin_error_outer', {'error': str(e)})
        return make_response(jsonify({'error': str(e)}), 500)

# Rota para a página inicial após login
@app.route('/home')
@login_required
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

# (Removida) Rota de cadastro de login

# Tela de Login
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        key = f"{request.remote_addr}:login"
        if not check_rate_limit(key, limit=30, window=60):
            flash('Muitas tentativas. Tente novamente em instantes.', 'error')
            audit_log('rate_limit', {'route': 'login'})
            return redirect(url_for('login'))

        email = (request.form.get('email') or '').strip()
        cpf = (request.form.get('cpf') or '').strip()
        senha = (request.form.get('senha') or '').strip()

        if not senha or (not email and not cpf):
            flash('Informe seu CPF (ou e-mail) e a senha.', 'error')
            return redirect(url_for('login'))

        if cpf and not validar_cpf(cpf):
            flash('CPF inválido.', 'error')
            return redirect(url_for('login'))

        conn = get_db_connection()
        if not conn:
            flash('Falha ao conectar ao banco.', 'error')
            return redirect(url_for('login'))
        try:
            cur = conn.cursor(row_factory=dict_row)
            if email:
                cur.execute("SELECT id_usuario, nome, email, senha, tipo, foto_perfil FROM usuario WHERE email = %s", (email,))
            else:
                cpf_digits = re.sub(r'[^0-9]', '', cpf)
                cur.execute("SELECT id_usuario, nome, email, senha, tipo, foto_perfil FROM usuario WHERE regexp_replace(cpf, '[^0-9]', '', 'g') = %s", (cpf_digits,))
            user = cur.fetchone()
            cur.close()
            conn.close()
            if not user:
                flash('Usuário não encontrado.', 'error')
                return redirect(url_for('login'))
            senha_hash = user['senha'] if isinstance(user['senha'], str) else (user['senha'].decode() if user['senha'] else '')
            if not senha_hash or not check_password_hash(senha_hash, senha):
                flash('Senha incorreta.', 'error')
                return redirect(url_for('login'))
            session['user_id'] = user['id_usuario']
            session['user_name'] = user['nome']
            session['user_tipo'] = user['tipo']
            session['role'] = _normalize_role(user['tipo'])
            foto = user.get('foto_perfil')
            def _norm_photo_path(fp: str) -> str:
                if not fp:
                    return ''
                fp = str(fp).replace('\\', '/').strip()
                idx = fp.lower().find('static/')
                if idx != -1:
                    rel = fp[idx+len('static/'):]
                    return rel
                if fp.startswith('uploads/'):
                    return fp
                return ''
            session['user_photo'] = _norm_photo_path(foto)
            audit_log('login_ok', {'email': email or '', 'cpf': cpf or ''})
            return redirect(url_for('home'))
        except Exception as e:
            try:
                conn.close()
            except Exception:
                pass
            flash(f'Erro no login: {e}', 'error')
            audit_log('login_error', {'error': str(e)})
            return redirect(url_for('login'))

    # GET — gerar captcha para o formulário de cadastro no modal
    a, b = random.randint(1, 9), random.randint(1, 9)
    session['captcha_answer'] = str(a + b)
    captcha_question = f"Quanto é {a} + {b}?"
    return render_template('login.html', captcha_question=captcha_question)

# Upload de avatar do usuário logado
@app.route('/upload_avatar', methods=['POST'])
@login_required
def upload_avatar():
    file = request.files.get('avatar')
    if not file or not file.filename:
        return jsonify({'ok': False, 'error': 'Nenhum arquivo selecionado'}), 400

    # valida extensão
    filename = secure_filename(file.filename)
    name, ext = os.path.splitext(filename)
    ext = ext.lower()
    allowed = {'.png', '.jpg', '.jpeg', '.webp', '.gif'}
    if ext not in allowed:
        return jsonify({'ok': False, 'error': 'Formato não suportado'}), 400

    # diretório de avatares
    avatars_dir = os.path.join(app.config['UPLOAD_FOLDER'], 'avatars')
    os.makedirs(avatars_dir, exist_ok=True)

    # nome do arquivo por usuário
    uid = session.get('user_id')
    ts = int(time.time())
    out_name = f"avatar_{uid}_{ts}{ext}"
    out_path = os.path.join(avatars_dir, out_name)
    try:
        file.save(out_path)
    except Exception as e:
        return jsonify({'ok': False, 'error': f'Falha ao salvar: {e}'}), 500

    # caminho relativo para servir via static
    rel_path = f"uploads/avatars/{out_name}"

    # Atualiza no banco
    conn = get_db_connection()
    if not conn:
        return jsonify({'ok': False, 'error': 'Falha de conexão com o banco'}), 500
    try:
        cur = conn.cursor()
        cur.execute("UPDATE usuario SET foto_perfil = %s WHERE id_usuario = %s", (rel_path, uid))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        try:
            conn.close()
        except Exception:
            pass
        return jsonify({'ok': False, 'error': f'Falha ao atualizar perfil: {e}'}), 500

    # Atualiza sessão
    session['user_photo'] = rel_path

    # URL acessível
    photo_url = url_for('static', filename=rel_path)
    return jsonify({'ok': True, 'photo_url': photo_url})

# Esqueci a senha: solicitar token
@app.route('/esqueci_senha', methods=['GET', 'POST'])
def esqueci_senha():
    if request.method == 'POST':
        email = (request.form.get('email') or '').strip()
        if not email:
            flash('Informe seu e-mail.', 'error')
            return redirect(url_for('esqueci_senha'))

        conn = get_db_connection()
        if not conn:
            flash('Falha ao conectar ao banco.', 'error')
            return redirect(url_for('esqueci_senha'))
        try:
            cur = conn.cursor()
            # Verifica se usuário existe
            cur.execute("SELECT 1 FROM usuario WHERE email = %s", (email,))
            if not cur.fetchone():
                flash('E-mail não cadastrado.', 'error')
                cur.close()
                conn.close()
                return redirect(url_for('esqueci_senha'))
            # Expira tokens anteriores
            cur.execute("UPDATE esqueci_senha SET status = 'Expirado' WHERE email = %s AND status = 'Ativo'", (email,))
            # Gera novo token
            token = secrets.token_urlsafe(32)
            cur.execute(
                "INSERT INTO esqueci_senha (email, token, data_solicitacao, status) VALUES (%s, %s, %s, %s)",
                (email, token, datetime.utcnow(), 'Ativo')
            )
            conn.commit()
            cur.close()
            conn.close()
            reset_url = url_for('resetar_senha', token=token, email=email, _external=True)
            if send_reset_email(email, reset_url):
                flash('Solicitação registrada. Verifique seu e-mail para criar uma nova senha.', 'success')
            else:
                # Não exibir o link na interface; manter registro em log via send_reset_email
                flash('Solicitação registrada. Verifique seu e-mail para criar uma nova senha.', 'success')
            audit_log('forgot_ok', {'email': email})
            return redirect(url_for('esqueci_senha'))
        except Exception as e:
            try:
                conn.close()
            except Exception:
                pass
            flash(f'Erro ao gerar token: {e}', 'error')
            audit_log('forgot_error', {'error': str(e)})
            return redirect(url_for('esqueci_senha'))

    return render_template('esqueci_senha.html')

# Resetar senha via token
@app.route('/resetar_senha', methods=['GET', 'POST'])
def resetar_senha():
    token = request.args.get('token') or request.form.get('token')
    email = request.args.get('email') or request.form.get('email')
    if request.method == 'POST':
        nova = (request.form.get('nova_senha') or '').strip()
        confirmar = (request.form.get('confirmar_senha') or '').strip()
        if not nova or not confirmar or nova != confirmar:
            flash('As senhas devem coincidir e não podem ser vazias.', 'error')
            return redirect(url_for('resetar_senha', token=token, email=email))
        conn = get_db_connection()
        if not conn:
            flash('Falha ao conectar ao banco.', 'error')
            return redirect(url_for('resetar_senha', token=token, email=email))
        try:
            cur = conn.cursor(row_factory=dict_row)
            cur.execute("SELECT * FROM esqueci_senha WHERE email = %s AND token = %s AND status = 'Ativo'", (email, token))
            req = cur.fetchone()
            if not req:
                flash('Token inválido ou expirado.', 'error')
                cur.close()
                conn.close()
                return redirect(url_for('esqueci_senha'))
            # Validade configurável (padrão: 8 segundos)
            requested_at = req['data_solicitacao']
            if isinstance(requested_at, datetime):
                age_seconds = (datetime.utcnow() - requested_at).total_seconds()
                if age_seconds > RESET_TOKEN_EXP_SECONDS:
                    # expira
                    cur2 = conn.cursor()
                    cur2.execute("UPDATE esqueci_senha SET status = 'Expirado' WHERE id_solicitacao = %s", (req['id_solicitacao'],))
                    conn.commit()
                    cur2.close()
                    cur.close()
                    conn.close()
                    flash('Token expirado. Solicite um novo.', 'error')
                    return redirect(url_for('esqueci_senha'))
            # Atualiza senha do usuário
            nova_hash = generate_password_hash(nova)
            cur2 = conn.cursor()
            cur2.execute("UPDATE usuario SET senha = %s WHERE email = %s", (nova_hash, email))
            # Expira e remove o token imediatamente após redefinir a senha
            cur2.execute("UPDATE esqueci_senha SET status = 'Expirado' WHERE id_solicitacao = %s", (req['id_solicitacao'],))
            cur2.execute("DELETE FROM esqueci_senha WHERE id_solicitacao = %s", (req['id_solicitacao'],))
            conn.commit()
            cur2.close()
            cur.close()
            conn.close()
            flash('Senha redefinida com sucesso. Faça login.', 'success')
            audit_log('reset_ok', {'email': email})
            return redirect(url_for('login'))
        except Exception as e:
            try:
                conn.close()
            except Exception:
                pass
            flash(f'Erro ao redefinir senha: {e}', 'error')
            audit_log('reset_error', {'error': str(e)})
            return redirect(url_for('esqueci_senha'))

    # GET
    if not token or not email:
        flash('Token ou e-mail ausente.', 'error')
        return redirect(url_for('esqueci_senha'))
    return render_template('resetar_senha.html', token=token, email=email)

# Rota para a página de cadastro de alunos
@app.route('/cadastro_alunos', methods=['GET', 'POST'])
def cadastro_alunos():
    # Em ambientes sem autenticação, não restringir acesso
    if request.method == 'POST' and request.form:
        action = (request.form.get('action') or request.form.get('acao') or '').strip().lower()
        if action == 'toggle':
            key = f"{request.remote_addr}:cadastro_alunos_toggle"
            if not check_rate_limit(key, limit=20, window=60):
                flash('Muitas tentativas. Tente novamente em instantes.', 'error')
                audit_log('rate_limit', {'route': 'cadastro_alunos_toggle'})
                return redirect(url_for('cadastro_alunos'))
            ensure_usuario_ativo_column()
            id_usuario = request.form.get('id_usuario')
            if not id_usuario:
                flash('Usuário inválido para alternar status.', 'error')
                return redirect(url_for('cadastro_alunos'))
            conn = get_db_connection()
            if conn:
                try:
                    cur = conn.cursor()
                    cur.execute("SELECT ativo FROM usuario WHERE id_usuario = %s", (id_usuario,))
                    row = cur.fetchone()
                    current_active = True
                    if row is not None:
                        val = row[0] if isinstance(row, tuple) else row
                        current_active = bool(val) if val is not None else True
                    new_active = not current_active
                    cur.execute("UPDATE usuario SET ativo = %s WHERE id_usuario = %s", (new_active, id_usuario))
                    conn.commit()
                    flash('Usuário reativado com sucesso!' if new_active else 'Usuário inativado com sucesso!', 'success')
                    audit_log('usuario_toggle', {'id_usuario': id_usuario, 'ativo': new_active})
                    cur.close(); conn.close()
                    return redirect(url_for('cadastro_alunos'))
                except Exception as e:
                    try:
                        conn.close()
                    except Exception:
                        pass
                    flash(f'Erro ao alternar status: {e}', 'error')
                    audit_log('cadastro_aluno_toggle_error', {'error': str(e)})
                    return redirect(url_for('cadastro_alunos'))
        # Rate limit por IP+rota
        key = f"{request.remote_addr}:cadastro_alunos"
        if not check_rate_limit(key, limit=20, window=60):
            flash('Muitas tentativas. Tente novamente em instantes.', 'error')
            audit_log('rate_limit', {'route': 'cadastro_alunos'})
            return redirect(url_for('cadastro_alunos'))

        action = (request.form.get('action') or request.form.get('acao') or '').strip().lower()
        if action == 'update':
            key_upd = f"{request.remote_addr}:cadastro_alunos_update"
            if not check_rate_limit(key_upd, limit=20, window=60):
                flash('Muitas tentativas. Tente novamente em instantes.', 'error')
                audit_log('rate_limit', {'route': 'cadastro_alunos_update'})
                return redirect(url_for('cadastro_alunos'))
            id_usuario = request.form.get('id_usuario')
            nome = (request.form.get('nome') or request.form.get('nome_user') or '').strip()
            email = (request.form.get('email') or request.form.get('email_user') or '').strip()
            cpf = (request.form.get('cpf') or request.form.get('cpf_user') or '').strip()
            tipo_form = (request.form.get('tipo_usuario') or '').strip()
            # Endereço (opcionais)
            cep = (request.form.get('cep') or request.form.get('cep_user') or '').strip()
            logradouro = (request.form.get('logradouro') or '').strip()
            complemento = (request.form.get('complemento') or '').strip()
            bairro = (request.form.get('bairro') or '').strip()
            cidade = (request.form.get('cidade') or '').strip()
            estado = (request.form.get('estado') or '').strip()
            if not id_usuario:
                flash('Usuário inválido para edição.', 'error')
                return redirect(url_for('cadastro_alunos'))
            if not nome or not email or not cpf:
                flash('Por favor, preencha nome, e-mail e CPF.', 'error')
                return redirect(url_for('cadastro_alunos'))
            if '@' not in email or '.' not in email:
                flash('E-mail inválido.', 'error')
                return redirect(url_for('cadastro_alunos'))
            if not validar_cpf(cpf):
                flash('CPF inválido.', 'error')
                return redirect(url_for('cadastro_alunos'))
            ensure_usuario_endereco_columns()
            conn = get_db_connection()
            if conn:
                try:
                    cur = conn.cursor()
                    # Verificar e-mail duplicado em outro usuário
                    cur.execute("SELECT 1 FROM usuario WHERE email = %s AND id_usuario <> %s", (email, id_usuario))
                    if cur.fetchone():
                        flash('E-mail já utilizado por outro usuário.', 'error')
                        cur.close(); conn.close()
                        return redirect(url_for('cadastro_alunos'))
                    tipo_db = 'Aluno'
                    if (tipo_form or '').lower() == 'docente':
                        tipo_db = 'Professor'
                    cur.execute(
                        "UPDATE usuario SET nome = %s, email = %s, cpf = %s, tipo = %s, cep = %s, logradouro = %s, complemento = %s, bairro = %s, cidade = %s, estado = %s WHERE id_usuario = %s",
                        (nome, email, cpf, tipo_db, cep or None, logradouro or None, complemento or None, bairro or None, cidade or None, estado or None, id_usuario)
                    )
                    conn.commit()
                    cur.close(); conn.close()
                    flash('Usuário atualizado com sucesso!', 'success')
                    audit_log('cadastro_aluno_update_ok', {'id_usuario': id_usuario})
                    return redirect(url_for('cadastro_alunos'))
                except Exception as e:
                    try: conn.close()
                    except Exception: pass
                    flash(f'Erro ao atualizar: {e}', 'error')
                    audit_log('cadastro_aluno_update_error', {'error': str(e)})
                    return redirect(url_for('cadastro_alunos'))

        # Fluxo de criação (padrão)
        nome = (request.form.get('nome') or request.form.get('nome_user') or '').strip()
        email = (request.form.get('email') or request.form.get('email_user') or '').strip()
        cpf = (request.form.get('cpf') or request.form.get('cpf_user') or '').strip()
        senha = (request.form.get('senha') or '').strip()
        confirmar_senha = (request.form.get('confirmar_senha') or '').strip()
        curso = request.form.get('curso')
        tipo_form = (request.form.get('tipo_usuario') or '').strip()
        captcha = (request.form.get('captcha') or '').strip()
        # Endereço (opcionais)
        cep = (request.form.get('cep') or request.form.get('cep_user') or '').strip()
        logradouro = (request.form.get('logradouro') or '').strip()
        complemento = (request.form.get('complemento') or '').strip()
        bairro = (request.form.get('bairro') or '').strip()
        cidade = (request.form.get('cidade') or '').strip()
        estado = (request.form.get('estado') or '').strip()

        # Validações básicas (criação)
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

        ensure_usuario_endereco_columns()
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
                # Determinar tipo do usuário no banco
                tipo_db = 'Aluno'
                if tipo_form.lower() == 'docente':
                    tipo_db = 'Professor'
                # Inserir novo usuário
                senha_hash = generate_password_hash(senha)
                cur.execute(
                    "INSERT INTO usuario (nome, email, cpf, senha, tipo, curso_usuario, cep, logradouro, complemento, bairro, cidade, estado) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                    (nome, email, cpf, senha_hash, tipo_db, curso, cep or None, logradouro or None, complemento or None, bairro or None, cidade or None, estado or None)
                )
                conn.commit()
                flash('Usuário cadastrado com sucesso!', 'success')
                cur.close()
                conn.close()
                audit_log('cadastro_aluno_ok', {'email': email})
                # Após cadastro bem-sucedido, redireciona para a Home
                return redirect(url_for('home'))
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
    usuarios = []
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

    # Buscar usuários para listagem
    ensure_usuario_ativo_column()
    conn2 = get_db_connection()
    if conn2:
        try:
            cur2 = conn2.cursor(row_factory=dict_row)
            cur2.execute("""
                SELECT id_usuario, nome, email, cpf, tipo, curso_usuario, foto_perfil,
                       COALESCE(ativo, TRUE) AS ativo
                FROM usuario
                ORDER BY id_usuario DESC
            """)
            usuarios = cur2.fetchall()
            cur2.close(); conn2.close()
        except Exception as e:
            try:
                conn2.close()
            except Exception:
                pass
            flash(f'Erro ao buscar usuários: {e}', 'error')

    # Captcha pergunta
    a, b = random.randint(1, 9), random.randint(1, 9)
    session['captcha_answer'] = str(a + b)
    captcha_question = f"Quanto é {a} + {b}?"
    return render_template('cadastro_alunos.html', cursos=cursos, usuarios=usuarios, captcha_question=captcha_question)

# Rota para a página de cadastro de cursos
@app.route('/cadastro_curso', methods=['GET', 'POST'])
@login_required
@roles_required(['Administrador'])
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
        action = (request.form.get('action') or request.form.get('acao') or '').strip().lower()
        coordenador_id = request.form.get('coordenador')
        if coordenador_id == '':
            coordenador_id = None
        
        conn = get_db_connection()
        if conn:
            try:
                cur = conn.cursor()
                if action == 'toggle':
                    ensure_curso_ativo_column()
                    id_curso = request.form.get('id_curso')
                    if not id_curso:
                        flash('Curso inválido para alternar status.', 'error')
                        cur.close(); conn.close()
                        return redirect(url_for('cadastro_curso'))
                    # Obtém estado atual
                    conn2 = get_db_connection()
                    row = None
                    if conn2:
                        try:
                            cur2 = conn2.cursor()
                            cur2.execute("SELECT ativo FROM curso WHERE id_curso = %s", (id_curso,))
                            row = cur2.fetchone()
                            cur2.close(); conn2.close()
                        except Exception:
                            try:
                                conn2.close()
                            except Exception:
                                pass
                            row = None
                    current_active = True
                    if row is not None:
                        val = row[0] if isinstance(row, tuple) else row
                        current_active = bool(val) if val is not None else True
                    new_active = not current_active
                    cur.execute("UPDATE curso SET ativo = %s WHERE id_curso = %s", (new_active, id_curso))
                    conn.commit()
                    flash('Curso reativado com sucesso!' if new_active else 'Curso inativado com sucesso!', 'success')
                    audit_log('curso_toggle', {'id_curso': id_curso, 'ativo': new_active})
                    cur.close(); conn.close()
                    return redirect(url_for('cadastro_curso'))
                elif action == 'update':
                    id_curso = request.form.get('id_curso')
                    if not id_curso or not nome_curso:
                        flash('Informe nome e selecione o curso para editar.', 'error')
                        cur.close(); conn.close()
                        audit_log('cadastro_curso_fail', {'motivo': 'update_campos_invalidos'})
                        return redirect(url_for('cadastro_curso'))
                    cur.execute(
                        "UPDATE curso SET nome_curso = %s, descricao_curso = %s, codigo_curso = %s, autorizacao = %s, id_coordenador = %s WHERE id_curso = %s",
                        (nome_curso, descricao, codigo, autorizacao, coordenador_id, id_curso)
                    )
                    conn.commit()
                    flash('Curso atualizado com sucesso!', 'success')
                    cur.close(); conn.close()
                    audit_log('cadastro_curso_update', {'id_curso': id_curso, 'nome_curso': nome_curso})
                    return redirect(url_for('cadastro_curso'))
                else:
                    # Inserir novo curso
                    if nome_curso:
                        cur.execute(
                            "INSERT INTO curso (nome_curso, descricao_curso, codigo_curso, autorizacao, id_coordenador) VALUES (%s, %s, %s, %s, %s)",
                            (nome_curso, descricao, codigo, autorizacao, coordenador_id)
                        )
                        conn.commit()
                        flash('Curso cadastrado com sucesso!', 'success')
                        cur.close(); conn.close()
                        audit_log('cadastro_curso_ok', {'nome_curso': nome_curso})
                        return redirect(url_for('cadastro_curso'))
                    else:
                        flash('Informe ao menos o nome do curso.', 'error')
                        cur.close(); conn.close()
                        audit_log('cadastro_curso_fail', {'motivo': 'nome_vazio'})
            except Exception as e:
                flash(f'Erro ao processar curso: {e}', 'error')
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
            ensure_curso_ativo_column()
            cur.execute(
                """
                SELECT c.id_curso, c.nome_curso, c.codigo_curso, c.autorizacao, c.ativo, c.id_coordenador, u.nome as coordenador
                FROM curso c
                LEFT JOIN usuario u ON c.id_coordenador = u.id_usuario
                ORDER BY c.id_curso DESC
                """
            )
            cursos = cur.fetchall()
            cur.close()
            conn.close()
        except Exception as e:
            flash(f'Erro ao buscar professores: {e}', 'error')
    return render_template('cadastro_curso.html', professores=professores, cursos=cursos)

# Rota para a página de publicação
@app.route('/publicacao', methods=['GET', 'POST'])
@login_required
@roles_required(['Administrador','Docente','Aluno'])
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
    professores = []
    publicacoes = []
    conn = get_db_connection()
    if conn:
        try:
            cur = conn.cursor(row_factory=dict_row)
            cur.execute("SELECT * FROM curso ORDER BY nome_curso")
            cursos = cur.fetchall()
            
            # Padroniza tipo 'Artigo Científico'
            try:
                cur_ins = conn.cursor()
                # garante 'Artigo Científico'
                cur_ins.execute("INSERT INTO tipos_de_publicacao (nome_tipo) SELECT %s WHERE NOT EXISTS (SELECT 1 FROM tipos_de_publicacao WHERE nome_tipo = %s)", ('Artigo Científico','Artigo Científico'))
                # atualiza publicações antigas
                cur_ins.execute("UPDATE publicacao SET tipo = %s WHERE tipo = %s", ('Artigo Científico','Artigo'))
                # remove 'Artigo' da lista se já existir 'Artigo Científico'
                cur_ins.execute("DELETE FROM tipos_de_publicacao WHERE nome_tipo = %s AND EXISTS (SELECT 1 FROM tipos_de_publicacao WHERE nome_tipo = %s)", ('Artigo','Artigo Científico'))
                conn.commit()
                cur_ins.close()
            except Exception:
                pass

            cur.execute("SELECT * FROM tipos_de_publicacao ORDER BY nome_tipo")
            tipos = cur.fetchall()

            cur.execute("SELECT id_usuario, nome FROM usuario WHERE tipo = 'Professor' ORDER BY nome")
            professores = cur.fetchall()

            cur.execute("""
                SELECT 
                  p.id_publicacao, 
                  p.titulo, 
                  p.tipo, 
                  c.nome_curso AS curso,
                  p.nome_arquivo,
                  p.data_publicacao
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
    return render_template('publicacao.html', cursos=cursos, tipos=tipos, professores=professores, publicacoes=publicacoes, captcha_question=captcha_question)

# Rota de download da publicação com nome do arquivo igual ao título
@app.route('/download_publicacao/<int:id_publicacao>')
@login_required
@roles_required(['Administrador','Docente','Aluno'])
def download_publicacao(id_publicacao):
    conn = get_db_connection()
    if not conn:
        flash('Falha ao obter conexão para download.', 'error')
        return redirect(url_for('publicacao'))
    try:
        cur = conn.cursor(row_factory=dict_row)
        cur.execute("""
            SELECT nome_arquivo, titulo
            FROM publicacao
            WHERE id_publicacao = %s
            LIMIT 1
        """, (id_publicacao,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row or not row.get('nome_arquivo'):
            flash('Publicação não encontrada ou sem arquivo.', 'error')
            return redirect(url_for('publicacao'))
        stored_name = row['nome_arquivo']
        titulo = (row['titulo'] or 'publicacao').strip()
        upload_dir = app.config['UPLOAD_FOLDER']
        # Verifica se o arquivo existe fisicamente
        full_path = os.path.join(upload_dir, stored_name)
        if not os.path.exists(full_path):
            flash('Arquivo não encontrado no servidor.', 'error')
            return redirect(url_for('publicacao'))
        # Preserva a extensão original para evitar problemas ao abrir o arquivo
        ext = os.path.splitext(stored_name)[1]
        safe_title = secure_filename(titulo) or 'publicacao'
        download_name = f"{safe_title}{ext}"
        resp = send_from_directory(upload_dir, stored_name, as_attachment=True, download_name=download_name)
        # Define explicitamente Content-Length para permitir barra de progresso no front
        try:
            size_bytes = os.path.getsize(full_path)
            resp.headers['Content-Length'] = size_bytes
        except Exception:
            size_bytes = None
            pass
        try:
            ctype = mimetypes.guess_type(full_path)[0] or 'application/octet-stream'
        except Exception:
            ctype = 'application/octet-stream'
        # Auditoria de download: quem (via sessão), quando (timestamp no audit_log) e qual arquivo
        audit_log('download_publicacao', {
            'id_publicacao': id_publicacao,
            'arquivo': stored_name,
            'nome_download': download_name,
            'size_bytes': size_bytes,
            'content_type': ctype
        })
        return resp
    except Exception as e:
        try:
            conn.close()
        except Exception:
            pass
        flash(f'Erro ao preparar download: {e}', 'error')
        try:
            audit_log('download_publicacao_error', {
                'id_publicacao': id_publicacao,
                'error': str(e)
            })
        except Exception:
            pass
        return redirect(url_for('publicacao'))

# Rota de pré-visualização de publicação para formatos Office
@app.route('/preview_publicacao/<int:id_publicacao>')
@login_required
@roles_required(['Administrador','Docente','Aluno'])
def preview_publicacao(id_publicacao):
    from html import escape
    try:
        conn = get_db_connection()
        cur = conn.cursor(row_factory=dict_row)
        cur.execute("""
            SELECT titulo, nome_arquivo
            FROM publicacao
            WHERE id_publicacao = %s
            LIMIT 1
        """, (id_publicacao,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row or not row.get('nome_arquivo'):
            return make_response('<div style="padding:12px;color:#dc2626;">Publicação não encontrada ou sem arquivo.</div>', 404)
        titulo = (row.get('titulo') or '').strip()
        stored_name = row['nome_arquivo']
        upload_dir = app.config['UPLOAD_FOLDER']
        full_path = os.path.join(upload_dir, stored_name)
        if not os.path.exists(full_path):
            return make_response('<div style="padding:12px;color:#dc2626;">Arquivo não encontrado no servidor.</div>', 404)
        ext = os.path.splitext(stored_name)[1].lower()

        html_content = ''
        if ext == '.docx':
            try:
                from docx import Document
                doc = Document(full_path)
                parts = []
                parts.append('<div style="font-family: ui-sans-serif, system-ui; color:#1f2937;">')
                parts.append(f'<h3 style="margin:0 0 8px 0; font-weight:600;">{escape(titulo)}</h3>')
                count = 0
                for p in doc.paragraphs:
                    text = p.text.strip()
                    if text:
                        parts.append(f'<p style="margin:6px 0;">{escape(text)}</p>')
                        count += 1
                        if count >= 120:
                            parts.append('<p style="color:#6b7280;">Pré-visualização truncada…</p>')
                            break
                parts.append('</div>')
                html_content = ''.join(parts)
            except Exception as e:
                html_content = f'<div style="padding:12px;color:#dc2626;">Falha ao gerar pré-visualização DOCX: {escape(str(e))}</div>'

        elif ext in ('.xlsx',):
            try:
                import openpyxl
                wb = openpyxl.load_workbook(full_path, read_only=True, data_only=True)
                ws = wb.active
                parts = []
                parts.append('<div style="font-family: ui-sans-serif, system-ui; color:#1f2937;">')
                parts.append(f'<h3 style="margin:0 0 8px 0; font-weight:600;">{escape(titulo)}</h3>')
                parts.append('<div style="overflow:auto; border:1px solid #e5e7eb; border-radius:6px;">')
                parts.append('<table style="border-collapse:collapse; width:100%;">')
                max_rows = 50
                max_cols = 20
                for row_cells in ws.iter_rows(min_row=1, max_row=max_rows, min_col=1, max_col=max_cols):
                    parts.append('<tr>')
                    for cell in row_cells:
                        val = cell.value
                        txt = '' if val is None else escape(str(val))
                        parts.append(f'<td style="border:1px solid #e5e7eb; padding:6px; font-size:14px;">{txt}</td>')
                    parts.append('</tr>')
                parts.append('</table></div></div>')
                html_content = ''.join(parts)
            except Exception as e:
                html_content = f'<div style="padding:12px;color:#dc2626;">Falha ao gerar pré-visualização XLSX: {escape(str(e))}</div>'

        elif ext in ('.xls',):
            try:
                import xlrd
                book = xlrd.open_workbook(full_path)
                sheet = book.sheet_by_index(0)
                parts = []
                parts.append('<div style="font-family: ui-sans-serif, system-ui; color:#1f2937;">')
                parts.append(f'<h3 style="margin:0 0 8px 0; font-weight:600;">{escape(titulo)}</h3>')
                parts.append('<div style="overflow:auto; border:1px solid #e5e7eb; border-radius:6px;">')
                parts.append('<table style="border-collapse:collapse; width:100%;">')
                max_rows = min(50, sheet.nrows)
                max_cols = min(20, sheet.ncols)
                for r in range(max_rows):
                    parts.append('<tr>')
                    for c in range(max_cols):
                        val = sheet.cell_value(r, c)
                        txt = '' if val is None else escape(str(val))
                        parts.append(f'<td style="border:1px solid #e5e7eb; padding:6px; font-size:14px;">{txt}</td>')
                    parts.append('</tr>')
                parts.append('</table></div></div>')
                html_content = ''.join(parts)
            except Exception as e:
                html_content = f'<div style="padding:12px;color:#dc2626;">Falha ao gerar pré-visualização XLS: {escape(str(e))}</div>'
        else:
            return make_response('<div style="padding:12px;color:#6b7280;">Pré-visualização não suportada por esta rota.</div>', 400)

        resp = make_response(html_content)
        resp.headers['Content-Type'] = 'text/html; charset=utf-8'
        resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return resp
    except Exception as e:
        from html import escape as esc
        return make_response(f'<div style="padding:12px;color:#dc2626;">Erro ao gerar pré-visualização: {esc(str(e))}</div>', 500)

# Utilitários para conversão automática para PDF

def ensure_previews_dir() -> str:
    d = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'previews')
    os.makedirs(d, exist_ok=True)
    return d


def try_libreoffice_convert(input_path: str, outdir: str):
    """Tenta converter via LibreOffice (soffice). Retorna (ok, caminho_pdf)."""
    try:
        import shutil, subprocess
        soffice = shutil.which('soffice')
        if not soffice:
            return (False, None)
        res = subprocess.run(
            [soffice, '--headless', '--convert-to', 'pdf', '--outdir', outdir, input_path],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60
        )
        if res.returncode == 0:
            base = os.path.splitext(os.path.basename(input_path))[0]
            pdf_path = os.path.join(outdir, base + '.pdf')
            if os.path.exists(pdf_path):
                return (True, pdf_path)
        return (False, None)
    except Exception:
        return (False, None)


def docx_to_pdf_reportlab(input_path: str, out_pdf_path: str):
    """Fallback simples DOCX→PDF usando ReportLab (texto plano)."""
    from docx import Document
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.pagesizes import A4
    styles = getSampleStyleSheet()
    story = []
    doc = Document(input_path)
    for p in doc.paragraphs:
        text = (p.text or '').strip()
        if text:
            story.append(Paragraph(text, styles['Normal']))
            story.append(Spacer(1, 6))
    SimpleDocTemplate(out_pdf_path, pagesize=A4).build(story)


def excel_to_pdf_reportlab(input_path: str, out_pdf_path: str):
    """Fallback simples Excel→PDF mostrando até 50 linhas e 20 colunas."""
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet
    data = []
    styles = getSampleStyleSheet()
    ext = os.path.splitext(input_path)[1].lower()
    if ext == '.xlsx':
        import openpyxl
        wb = openpyxl.load_workbook(input_path, read_only=True, data_only=True)
        ws = wb.active
        max_rows = 50
        max_cols = 20
        for r in ws.iter_rows(min_row=1, max_row=max_rows, min_col=1, max_col=max_cols):
            row = []
            for c in r:
                val = c.value
                row.append('' if val is None else str(val))
            data.append(row)
    else:
        import xlrd
        book = xlrd.open_workbook(input_path)
        sheet = book.sheet_by_index(0)
        max_rows = min(50, sheet.nrows)
        max_cols = min(20, sheet.ncols)
        for rr in range(max_rows):
            row = []
            for cc in range(max_cols):
                val = sheet.cell_value(rr, cc)
                row.append('' if val is None else str(val))
            data.append(row)
    doc = SimpleDocTemplate(out_pdf_path, pagesize=A4)
    story = []
    if data:
        t = Table(data, repeatRows=1)
        t.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.25, colors.lightgrey),
            ('BACKGROUND', (0,0), (-1,0), colors.whitesmoke),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ROWHEIGHT', (0,0), (-1,-1), 16),
        ]))
        story.append(Paragraph('Pré-visualização de planilha (máx. 50 linhas, 20 colunas)', styles['Italic']))
        story.append(Spacer(1, 8))
        story.append(t)
    else:
        story.append(Paragraph('Sem dados para exibir.', styles['Normal']))
    doc.build(story)


# Rota de pré-visualização com PDF automático
@app.route('/preview_pdf_publicacao/<int:id_publicacao>')
@login_required
@roles_required(['Administrador','Docente','Aluno'])
def preview_pdf_publicacao(id_publicacao):
    try:
        conn = get_db_connection()
        cur = conn.cursor(row_factory=dict_row)
        cur.execute("""
            SELECT titulo, nome_arquivo
            FROM publicacao
            WHERE id_publicacao = %s
            LIMIT 1
        """, (id_publicacao,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row or not row.get('nome_arquivo'):
            return make_response('<div style="padding:12px;color:#dc2626;">Publicação não encontrada ou sem arquivo.</div>', 404)
        stored_name = row['nome_arquivo']
        upload_dir = app.config['UPLOAD_FOLDER']
        full_path = os.path.join(upload_dir, stored_name)
        if not os.path.exists(full_path):
            return make_response('<div style="padding:12px;color:#dc2626;">Arquivo não encontrado no servidor.</div>', 404)
        ext = os.path.splitext(stored_name)[1].lower()
        if ext not in ('.doc', '.docx', '.xls', '.xlsx'):
            return make_response('<div style="padding:12px;color:#6b7280;">Formato não suportado para conversão automática.</div>', 400)

        preview_dir = ensure_previews_dir()
        preview_name = f'preview_pub_{id_publicacao}.pdf'
        preview_path = os.path.join(preview_dir, preview_name)

        # Cache simples: usa preview se for mais novo que a fonte
        try:
            if os.path.exists(preview_path):
                src_m = os.path.getmtime(full_path)
                dst_m = os.path.getmtime(preview_path)
                if dst_m >= src_m:
                    return send_from_directory(preview_dir, preview_name, mimetype='application/pdf', as_attachment=False)
        except Exception:
            pass

        # Tenta LibreOffice
        ok, lo_pdf = try_libreoffice_convert(full_path, preview_dir)
        if ok and lo_pdf and os.path.exists(lo_pdf):
            try:
                import shutil
                shutil.copyfile(lo_pdf, preview_path)
            except Exception:
                preview_path = lo_pdf
            return send_from_directory(os.path.dirname(preview_path), os.path.basename(preview_path), mimetype='application/pdf', as_attachment=False)

        # Fallbacks
        try:
            if ext in ('.docx',):
                docx_to_pdf_reportlab(full_path, preview_path)
            elif ext in ('.xlsx', '.xls'):
                excel_to_pdf_reportlab(full_path, preview_path)
            else:
                return make_response('<div style="padding:12px;color:#6b7280;">Converter este formato requer LibreOffice no servidor.</div>', 400)
            return send_from_directory(preview_dir, preview_name, mimetype='application/pdf', as_attachment=False)
        except Exception as e:
            from html import escape as esc
            return make_response(f'<div style="padding:12px;color:#dc2626;">Falha ao gerar PDF: {esc(str(e))}</div>', 500)
    except Exception as e:
        from html import escape as esc
        return make_response(f'<div style="padding:12px;color:#dc2626;">Erro ao preparar pré-visualização: {esc(str(e))}</div>', 500)

# Rota para a página de avaliação
@app.route('/avaliacao')
@login_required
@roles_required(['Administrador','Docente'])
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
@login_required
@roles_required(['Administrador','Docente'])
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
@login_required
@roles_required(['Administrador','Docente','Aluno'])
def relatorio():
    autores = []
    cursos = []
    tipos = []
    conn = get_db_connection()
    if conn:
        try:
            cur = conn.cursor(row_factory=dict_row)
            # Autores: todos os professores cadastrados
            cur.execute("SELECT id_usuario, nome FROM usuario WHERE tipo = 'Professor' ORDER BY nome")
            autores = cur.fetchall()
            # Cursos: todos os cursos
            cur.execute("SELECT id_curso, nome_curso FROM curso ORDER BY nome_curso")
            cursos = cur.fetchall()
            # Padroniza tipo 'Artigo Científico'
            try:
                cur_ins = conn.cursor()
                # garante 'Artigo Científico'
                cur_ins.execute("INSERT INTO tipos_de_publicacao (nome_tipo) SELECT %s WHERE NOT EXISTS (SELECT 1 FROM tipos_de_publicacao WHERE nome_tipo = %s)", ('Artigo Científico','Artigo Científico'))
                # atualiza publicações antigas
                cur_ins.execute("UPDATE publicacao SET tipo = %s WHERE tipo = %s", ('Artigo Científico','Artigo'))
                # remove 'Artigo' da lista se já existir 'Artigo Científico'
                cur_ins.execute("DELETE FROM tipos_de_publicacao WHERE nome_tipo = %s AND EXISTS (SELECT 1 FROM tipos_de_publicacao WHERE nome_tipo = %s)", ('Artigo','Artigo Científico'))
                conn.commit()
                cur_ins.close()
            except Exception:
                pass
            # Tipos de publicação aceitos
            cur.execute("SELECT nome_tipo FROM tipos_de_publicacao ORDER BY nome_tipo")
            tipos = cur.fetchall()
            cur.close()
            conn.close()
        except Exception as e:
            try:
                conn.close()
            except Exception:
                pass
            flash(f'Erro ao carregar filtros de relatório: {e}', 'error')
    return render_template('relatorio.html', autores=autores, cursos=cursos, tipos=tipos)

# Exportação de Relatório em Excel
@app.route('/relatorio/exportar', methods=['GET'])
@login_required
@roles_required(['Administrador','Docente','Aluno'])
def exportar_relatorio():
    # Coleta de filtros
    autor = (request.args.get('autor') or '').strip()
    orientador = (request.args.get('orientador') or '').strip()
    curso = (request.args.get('curso') or '').strip()
    tipo = (request.args.get('tipo') or '').strip()
    data_inicial = (request.args.get('data_inicial') or '').strip()
    data_final = (request.args.get('data_final') or '').strip()

    # Construção dinâmica do WHERE
    where = ["1=1"]
    params = []

    if autor:
        where.append("u.nome ILIKE %s")
        params.append(f"%{autor}%")
    if orientador:
        where.append("p.id_autor = %s")
        params.append(orientador)
    if curso:
        where.append("p.id_curso = %s")
        params.append(curso)
    if tipo:
        where.append("p.tipo = %s")
        params.append(tipo)
    # Datas (YYYY-MM-DD)
    try:
        if data_inicial:
            from datetime import datetime
            di = datetime.strptime(data_inicial, '%Y-%m-%d').date()
            where.append("p.data_publicacao >= %s")
            params.append(di)
        if data_final:
            from datetime import datetime
            df = datetime.strptime(data_final, '%Y-%m-%d').date()
            where.append("p.data_publicacao <= %s")
            params.append(df)
    except Exception:
        pass

    sql = f"""
        SELECT 
          p.id_publicacao,
          p.titulo,
          p.tipo,
          p.data_publicacao,
          p.status,
          COALESCE(u.nome, '') AS autor,
          COALESCE(c.nome_curso, '') AS curso,
          COALESCE(p.assuntos_relacionados, '') AS assuntos
        FROM publicacao p
        JOIN usuario u ON u.id_usuario = p.id_autor
        LEFT JOIN curso c ON c.id_curso = p.id_curso
        WHERE {' AND '.join(where)}
        ORDER BY p.data_publicacao DESC, p.id_publicacao DESC
    """

    try:
        conn = get_db_connection()
        if not conn:
            flash('Falha ao conectar para exportação.', 'error')
            return redirect(url_for('relatorio'))
        cur = conn.cursor(row_factory=dict_row)
        cur.execute(sql, params)
        rows = cur.fetchall() or []
        cur.close(); conn.close()

        # Limite de taxa simples por usuário (10/min)
        key = f"relatorio_export::{session.get('user_id') or 'anon'}"
        if not check_rate_limit(key, limit=10, window=60):
            return make_response('Muitas exportações. Tente novamente em instantes.', 429)

        # Colunas configuráveis
        import re, io
        fmt = (request.args.get('format') or 'xlsx').lower()
        cols_param = (request.args.get('cols') or '').strip()
        valid_cols = ['id_publicacao','titulo','tipo','autor','curso','data_publicacao','status','assuntos']
        col_map = {
            'id_publicacao':'ID',
            'titulo':'Título',
            'tipo':'Tipo',
            'autor':'Autor',
            'curso':'Curso',
            'data_publicacao':'Data Publicação',
            'status':'Status',
            'assuntos':'Assuntos'
        }
        selected_cols = [c for c in re.split(r'[\s,;]+', cols_param) if c in valid_cols]
        if not selected_cols:
            selected_cols = valid_cols[:]

        from datetime import datetime as _dt
        fname_base = f"relatorio_inprolib_{_dt.now().strftime('%Y%m%d_%H%M%S')}"

        def val_for(col_key, r):
            v = r.get(col_key)
            if col_key == 'data_publicacao' and v:
                try:
                    # psycopg returns date/datetime; for CSV/PDF use YYYY-MM-DD
                    return v.strftime('%Y-%m-%d')
                except Exception:
                    return str(v)
            return v if (v is not None) else ''

        if fmt == 'csv':
            import csv
            headers = [col_map[c] for c in selected_cols]
            text_buf = io.StringIO()
            writer = csv.writer(text_buf, delimiter=';', quotechar='"', quoting=csv.QUOTE_MINIMAL)
            writer.writerow(headers)
            for r in rows:
                writer.writerow([val_for(c, r) for c in selected_cols])
            csv_bytes = text_buf.getvalue().encode('utf-8-sig')  # BOM para Excel abrir corretamente
            buf = io.BytesIO(csv_bytes)
            buf.seek(0)
            resp = send_file(
                buf,
                as_attachment=True,
                download_name=f"{fname_base}.csv",
                mimetype='text/csv',
                max_age=0
            )
        elif fmt == 'pdf':
            try:
                from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
                from reportlab.lib.pagesizes import landscape, A4
                from reportlab.lib import colors
                from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
                headers = [col_map[c] for c in selected_cols]
                buf = io.BytesIO()
                doc = SimpleDocTemplate(buf, pagesize=landscape(A4), rightMargin=24, leftMargin=24, topMargin=24, bottomMargin=24)
                styles = getSampleStyleSheet()
                title_style = ParagraphStyle('ReportTitle', parent=styles['Title'], fontSize=16, textColor=colors.HexColor('#1F4E79'), alignment=1, spaceAfter=12)
                title = Paragraph('Relatório de publicações', title_style)
                # Monta story com logo (se disponível)
                story = []
                try:
                    logo_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'img', 'logo.png')
                    if os.path.exists(logo_path):
                        img = RLImage(logo_path, width=46, height=46)
                        story.extend([img, Spacer(1, 6)])
                except Exception:
                    pass
                story.extend([title, Spacer(1, 10)])
                data = [headers]
                for r in rows:
                    data.append([val_for(c, r) for c in selected_cols])
                table = Table(data, repeatRows=1)
                table.setStyle(TableStyle([
                    ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#f0f0f0')),
                    ('TEXTCOLOR',(0,0),(-1,0),colors.black),
                    ('GRID',(0,0),(-1,-1),0.25,colors.HexColor('#cccccc')),
                    ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
                    ('FONTSIZE',(0,0),(-1,-1),9),
                    ('ALIGN',(0,0),(-1,-1),'LEFT'),
                    ('VALIGN',(0,0),(-1,-1),'MIDDLE')
                ]))
                doc.build(story + [table])
                buf.seek(0)
                resp = send_file(
                    buf,
                    as_attachment=True,
                    download_name=f"{fname_base}.pdf",
                    mimetype='application/pdf',
                    max_age=0
                )
            except Exception as _e:
                # Fallback simples para CSV se PDF falhar
                import csv
                headers = [col_map[c] for c in selected_cols]
                text_buf = io.StringIO()
                writer = csv.writer(text_buf, delimiter=';', quotechar='"', quoting=csv.QUOTE_MINIMAL)
                writer.writerow(headers)
                for r in rows:
                    writer.writerow([val_for(c, r) for c in selected_cols])
                csv_bytes = text_buf.getvalue().encode('utf-8-sig')
                buf = io.BytesIO(csv_bytes)
                buf.seek(0)
                resp = send_file(
                    buf,
                    as_attachment=True,
                    download_name=f"{fname_base}.csv",
                    mimetype='text/csv',
                    max_age=0
                )
        else:
            # Excel sem a coluna ID e com formatação moderna
            from openpyxl import Workbook
            from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
            from openpyxl.utils import get_column_letter
            from openpyxl.drawing.image import Image as XLImage
            wb = Workbook()
            ws = wb.active
            ws.title = 'Relatório'
            excel_cols = [c for c in selected_cols if c != 'id_publicacao']
            if not excel_cols:
                excel_cols = [c for c in valid_cols if c != 'id_publicacao']
            excel_headers = [col_map[c] for c in excel_cols]
            # Título e logo do relatório
            title_text = 'Relatório de publicações'
            logo_added = False
            try:
                logo_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'img', 'logo.png')
                if os.path.exists(logo_path):
                    xlimg = XLImage(logo_path)
                    xlimg.width = 36
                    xlimg.height = 36
                    ws.add_image(xlimg, 'A1')
                    logo_added = True
            except Exception:
                pass
            # Posiciona o título: em B1 se houver logo; caso contrário, em A1
            title_col_start = 2 if logo_added else 1
            title_cell = ws.cell(row=1, column=title_col_start)
            title_cell.value = title_text
            ws.merge_cells(start_row=1, start_column=title_col_start, end_row=1, end_column=len(excel_headers))
            title_cell.font = Font(size=16, bold=True, color='1F4E79')
            title_cell.alignment = Alignment(horizontal='center', vertical='center')
            ws.row_dimensions[1].height = 30
            hdr_row = 2
            # Cabeçalhos
            ws.append(excel_headers)
            for r in rows:
                row_vals = []
                for c in excel_cols:
                    v = r.get(c)
                    if c == 'data_publicacao' and v:
                        row_vals.append(v)  # manter como date/datetime para formatar
                    else:
                        row_vals.append(v if (v is not None) else '')
                ws.append(row_vals)
            # Estilo moderno
            thin = Side(style='thin', color='D0D7DE')
            hdr_fill = PatternFill('solid', fgColor='F1F5F9')
            for col_idx in range(1, len(excel_headers)+1):
                cell = ws.cell(row=hdr_row, column=col_idx)
                cell.font = Font(bold=True)
                cell.fill = hdr_fill
                cell.alignment = Alignment(vertical='center')
                cell.border = Border(top=thin, left=thin, right=thin, bottom=thin)
            # Zebrado
            for i in range(0, len(rows)):
                if i % 2 == 0:
                    row_num = i + hdr_row + 1
                    for col_idx in range(1, len(excel_headers)+1):
                        ws.cell(row=row_num, column=col_idx).fill = PatternFill('solid', fgColor='F9FAFB')
            # Wrap em Título/Assuntos
            wrap_cols = []
            for idx, key in enumerate(excel_cols, start=1):
                if key in {'titulo','assuntos'}:
                    wrap_cols.append(idx)
            for row_num in range(hdr_row+1, ws.max_row+1):
                for idx in wrap_cols:
                    ws.cell(row=row_num, column=idx).alignment = Alignment(wrap_text=True, vertical='top')
            # Larguras de coluna
            width_map = {
                'titulo': 50,
                'tipo': 18,
                'autor': 24,
                'curso': 24,
                'data_publicacao': 14,
                'status': 16,
                'assuntos': 36
            }
            for idx, key in enumerate(excel_cols, start=1):
                ws.column_dimensions[get_column_letter(idx)].width = width_map.get(key, 22)
            # Congelar cabeçalho e filtro
            ws.freeze_panes = f'A{hdr_row+1}'
            ws.auto_filter.ref = f"A{hdr_row}:{get_column_letter(len(excel_headers))}{hdr_row}"
            # Formato de data
            if 'data_publicacao' in excel_cols:
                d_idx = excel_cols.index('data_publicacao') + 1
                for row_num in range(hdr_row+1, ws.max_row+1):
                    ws.cell(row=row_num, column=d_idx).number_format = 'YYYY-MM-DD'
            buf = io.BytesIO()
            wb.save(buf)
            buf.seek(0)
            resp = send_file(
                buf,
                as_attachment=True,
                download_name=f"{fname_base}.xlsx",
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                max_age=0
            )

        # Define Content-Length explícito para permitir barra de progresso no frontend
        try:
            resp.headers['Content-Length'] = buf.getbuffer().nbytes
        except Exception:
            pass
        resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        resp.headers['Pragma'] = 'no-cache'
        resp.headers['Expires'] = '0'
        # Auditoria leve
        try:
            audit_log('relatorio_export', {
                'format': fmt,
                'cols': selected_cols,
                'rows': len(rows),
                'filters': {
                    'autor': autor,
                    'orientador': orientador,
                    'curso': curso,
                    'tipo': tipo,
                    'data_inicial': data_inicial,
                    'data_final': data_final
                }
            })
        except Exception:
            pass
        return resp
    except Exception as e:
        flash(f'Erro ao gerar Excel: {e}', 'error')
        try:
            conn.close()
        except Exception:
            pass
        return redirect(url_for('relatorio'))

# Visualização de Relatório (JSON)
@app.route('/relatorio/preview', methods=['GET'])
@login_required
@roles_required(['Administrador','Docente','Aluno'])
def preview_relatorio():
    autor = (request.args.get('autor') or '').strip()
    orientador = (request.args.get('orientador') or '').strip()
    curso = (request.args.get('curso') or '').strip()
    tipo = (request.args.get('tipo') or '').strip()
    data_inicial = (request.args.get('data_inicial') or '').strip()
    data_final = (request.args.get('data_final') or '').strip()

    where = ["1=1"]
    params = []
    if autor:
        where.append("u.nome ILIKE %s")
        params.append(f"%{autor}%")
    if orientador:
        where.append("p.id_autor = %s")
        params.append(orientador)
    if curso:
        where.append("p.id_curso = %s")
        params.append(curso)
    if tipo:
        where.append("p.tipo = %s")
        params.append(tipo)
    try:
        if data_inicial:
            from datetime import datetime
            di = datetime.strptime(data_inicial, '%Y-%m-%d').date()
            where.append("p.data_publicacao >= %s")
            params.append(di)
        if data_final:
            from datetime import datetime
            df = datetime.strptime(data_final, '%Y-%m-%d').date()
            where.append("p.data_publicacao <= %s")
            params.append(df)
    except Exception:
        pass

    where_clause = " AND ".join(where)
    sql = f"""
        SELECT 
          p.id_publicacao, p.titulo, p.tipo, p.status, p.assuntos_relacionados as assuntos,
          u.nome as autor, c.nome_curso as curso, p.data_publicacao
        FROM publicacao p
        LEFT JOIN usuario u ON u.id_usuario = p.id_autor
        LEFT JOIN curso c ON c.id_curso = p.id_curso
        WHERE {where_clause}
        ORDER BY p.id_publicacao DESC
    """

    try:
        conn = get_db_connection()
        if not conn:
            return make_response(jsonify({'error': 'Falha ao conectar ao banco.'}), 500)
        cur = conn.cursor(row_factory=dict_row)
        cur.execute(sql, params)
        rows = cur.fetchall() or []
        cur.close(); conn.close()
        # Normaliza datas para string
        out = []
        for r in rows:
            out.append({
                'id_publicacao': r.get('id_publicacao'),
                'titulo': r.get('titulo'),
                'tipo': r.get('tipo'),
                'autor': r.get('autor'),
                'curso': r.get('curso'),
                'data_publicacao': r.get('data_publicacao').strftime('%Y-%m-%d') if r.get('data_publicacao') else '',
                'status': r.get('status'),
                'assuntos': r.get('assuntos')
            })
        return jsonify({'rows': out})
    except Exception as e:
        return make_response(jsonify({'error': str(e)}), 500)

# Rota para a página de suporte
@app.route('/suporte', methods=['GET','POST'])
@login_required
@roles_required(['Administrador','Docente','Aluno'])
def suporte():
    if request.method == 'POST':
        key = f"{request.remote_addr}:suporte"
        if not check_rate_limit(key, limit=10, window=60):
            flash('Muitas tentativas. Tente novamente em instantes.', 'error')
            audit_log('rate_limit', {'route': 'suporte'})
            return redirect(url_for('suporte'))
        mensagem = (request.form.get('mensagem') or '').strip()
        arquivo = request.files.get('imagem')
        attach_tuple = None
        try:
            if arquivo and arquivo.filename:
                filename = secure_filename(arquivo.filename)
                data_bytes = arquivo.read()
                mimetype = arquivo.mimetype or (mimetypes.guess_type(filename)[0] or 'application/octet-stream')
                attach_tuple = (filename, data_bytes, mimetype)
        except Exception:
            attach_tuple = None
        user_name = (session.get('user_name') or '').strip()
        user_id = session.get('user_id')
        role = (session.get('role') or session.get('user_tipo') or '').strip()
        body_text = (
            'Novo contato de suporte no INPROLIB:\n\n'
            f'Usuário: {user_name or "Desconhecido"}\n'
            f'Perfil: {role or "-"}\n'
        )
        ok = send_support_email(body_text, attach_tuple, None)
        if ok:
            flash('Mensagem de suporte enviada com sucesso!', 'success')
            audit_log('suporte_email_ok', {'user_id': user_id})
        else:
            flash('Falha ao enviar o e-mail de suporte.', 'error')
            audit_log('suporte_email_error', {'user_id': user_id})
        return redirect(url_for('suporte'))
    return render_template('suporte.html')

# Rota para a página de configuração
@app.route('/configuracao')
@login_required
@roles_required(['Administrador'])
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


def run_seed_admins():
    # Cria/atualiza administradores padrão informados pelo usuário
    admins = [
        {
            'nome': 'Larissa Alinny',
            'email': 'aalinny9@gmail.com',
            'cpf': '000.000.000-00',
            'senha': 'LA123@47'
        },
        {
            'nome': 'Arthur Madeira',
            'email': 'Arthurmad456@gmail.com',
            'cpf': '000.000.000-00',
            'senha': 'AM123@47'
        },
        {
            'nome': 'João Vitor Ferreira',
            'email': 'vitorjoao123z@gmail.com',
            'cpf': '000.000.000-00',
            'senha': 'JV123@47'
        },
        {
            'nome': 'Victor Hugo Freitas',
            'email': 'victorhugofreitas123@gmail.com',
            'cpf': '000.000.000-00',
            'senha': 'VH123@47'
        },
        {
            'nome': 'Renata Fagundes',
            'email': 'renata.facinpro@gmail.com',
            'cpf': '000.000.000-00',
            'senha': 'RF123@47'
        },
        {
            'nome': 'Livio Lucas',
            'email': 'liviool123@gmail.com',
            'cpf': '000.000.000-00',
            'senha': 'Fac@1470'
        },
    ]

    conn = get_db_connection()
    if not conn:
        print('Falha ao conectar ao banco para seed de administradores.')
        return
    try:
        for admin in admins:
            cur = conn.cursor(row_factory=dict_row)
            print(f"Verificando usuário: {admin['email']}")
            cur.execute("SELECT id_usuario, tipo FROM usuario WHERE email = %s", (admin['email'],))
            user = cur.fetchone()
            senha_hash = generate_password_hash(admin['senha'])
            if user:
                cur2 = conn.cursor()
                cur2.execute(
                    "UPDATE usuario SET nome = %s, cpf = %s, senha = %s, tipo = %s WHERE id_usuario = %s",
                    (admin['nome'], admin['cpf'], senha_hash, 'Funcionário', user['id_usuario'])
                )
                conn.commit()
                cur2.close()
                audit_log('seed_admin_updated', {'email': admin['email']})
                print(f"Admin atualizado: {admin['nome']} <{admin['email']}>")
            else:
                cur2 = conn.cursor()
                cur2.execute(
                    "INSERT INTO usuario (nome, email, cpf, senha, tipo, curso_usuario) VALUES (%s, %s, %s, %s, %s, %s)",
                    (admin['nome'], admin['email'], admin['cpf'], senha_hash, 'Funcionário', None)
                )
                conn.commit()
                cur2.close()
                audit_log('seed_admin_created', {'email': admin['email']})
                print(f"Admin criado: {admin['nome']} <{admin['email']}>")
            cur.close()
        conn.close()
        print('Seed de administradores concluído.')
    except Exception as e:
        try:
            conn.close()
        except Exception:
            pass
        print('Erro ao executar seed de administradores:', e)


if __name__ == '__main__':
    # Executa a validação quando chamado com --validate; migração com --hash-migrate; caso contrário, sobe o servidor.
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if arg in ('--validate', 'validate'):
            run_validacao()
        elif arg in ('--hash-migrate', 'hash-migrate'):
            run_migracao_hash()
        elif arg in ('--seed-admins', 'seed-admins'):
            run_seed_admins()
        else:
            app.run(host='0.0.0.0', port=int(os.getenv('PORT', '5000')), debug=True)
    else:
        app.run(debug=True)