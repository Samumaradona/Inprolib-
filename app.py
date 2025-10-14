from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify, send_from_directory, make_response
import psycopg
from psycopg.rows import dict_row
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

load_dotenv()

app = Flask(__name__, static_folder='static', template_folder='templates')
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

# Controle de acesso por perfil
def _normalize_role(tipo: str) -> str:
    if not tipo:
        return ''
    tipo = str(tipo).strip()
    mapping = {
        'Administrador': 'Administrador',
        'Funcionário': 'Administrador',
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

            if user:
                cur2 = conn.cursor()
                cur2.execute(
                    "UPDATE usuario SET nome = %s, cpf = %s, senha = %s, tipo = %s WHERE id_usuario = %s",
                    (nome, cpf, senha_hash, 'Funcionário', user['id_usuario'])
                )
                conn.commit()
                cur2.close()
                status = 'updated'
            else:
                cur2 = conn.cursor()
                cur2.execute(
                    "INSERT INTO usuario (nome, email, cpf, senha, tipo, curso_usuario) VALUES (%s, %s, %s, %s, %s, %s)",
                    (nome, email, cpf, senha_hash, 'Funcionário', None)
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
        senha = (request.form.get('senha') or '').strip()
        if not email or not senha:
            flash('Informe e-mail e senha.', 'error')
            return redirect(url_for('login'))

        conn = get_db_connection()
        if not conn:
            flash('Falha ao conectar ao banco.', 'error')
            return redirect(url_for('login'))
        try:
            cur = conn.cursor(row_factory=dict_row)
            cur.execute("SELECT id_usuario, nome, email, senha, tipo, foto_perfil FROM usuario WHERE email = %s", (email,))
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
            # Autentica
            session['user_id'] = user['id_usuario']
            session['user_name'] = user['nome']
            session['user_tipo'] = user['tipo']
            session['role'] = _normalize_role(user['tipo'])
            # Normaliza caminho da foto (se existente) para uso via static
            foto = user.get('foto_perfil')
            def _norm_photo_path(fp: str) -> str:
                if not fp:
                    return ''
                # substitui barras invertidas por barras
                fp = str(fp).replace('\\', '/').strip()
                # tenta localizar subcaminho sob 'static/'
                idx = fp.lower().find('static/')
                if idx != -1:
                    rel = fp[idx+len('static/'):]  # conteúdo após 'static/'
                    return rel
                # se já for relativo (uploads/..), mantem
                if fp.startswith('uploads/'):
                    return fp
                return ''
            session['user_photo'] = _norm_photo_path(foto)
            audit_log('login_ok', {'email': email})
            return redirect(url_for('home'))
        except Exception as e:
            try:
                conn.close()
            except Exception:
                pass
            flash(f'Erro no login: {e}', 'error')
            audit_log('login_error', {'error': str(e)})
            return redirect(url_for('login'))

    return render_template('login.html')

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
        tipo_form = (request.form.get('tipo_usuario') or '').strip()
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
                # Determinar tipo do usuário no banco
                tipo_db = 'Aluno'
                if tipo_form.lower() == 'docente':
                    tipo_db = 'Professor'
                # Inserir novo usuário
                senha_hash = generate_password_hash(senha)
                cur.execute(
                    "INSERT INTO usuario (nome, email, cpf, senha, tipo, curso_usuario) VALUES (%s, %s, %s, %s, %s, %s)",
                    (nome, email, cpf, senha_hash, tipo_db, curso)
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
    return render_template('publicacao.html', cursos=cursos, tipos=tipos, publicacoes=publicacoes, captcha_question=captcha_question)

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
@roles_required(['Administrador'])
def relatorio():
    return render_template('relatorio.html')

# Rota para a página de suporte
@app.route('/suporte')
@login_required
@roles_required(['Administrador','Docente','Aluno'])
def suporte():
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
            app.run(debug=True)
    else:
        app.run(debug=True)