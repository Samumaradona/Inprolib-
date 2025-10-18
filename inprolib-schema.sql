--
-- PostgreSQL database dump
--

\restrict P6AJUW4FJ9dUDewzDiEtBZt8cBgknKX5NJ6CxQIWTTEKL0PNwd7qRtKMwHJfEQB

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

-- Started on 2025-10-18 15:57:06

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 866 (class 1247 OID 25674)
-- Name: status_esqueci_senha; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.status_esqueci_senha AS ENUM (
    'Ativo',
    'Expirado'
);


ALTER TYPE public.status_esqueci_senha OWNER TO postgres;

--
-- TOC entry 869 (class 1247 OID 25680)
-- Name: status_publicacao; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.status_publicacao AS ENUM (
    'Publicado',
    'Desativado'
);


ALTER TYPE public.status_publicacao OWNER TO postgres;

--
-- TOC entry 872 (class 1247 OID 25686)
-- Name: tipo_relatorio; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tipo_relatorio AS ENUM (
    'Por Curso',
    'Por Data',
    'Por Pessoa'
);


ALTER TYPE public.tipo_relatorio OWNER TO postgres;

--
-- TOC entry 875 (class 1247 OID 25694)
-- Name: tipo_usuario; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tipo_usuario AS ENUM (
    'Funcionário',
    'Professor',
    'Coordenador',
    'Secretaria',
    'Bibliotecaria',
    'Aluno'
);


ALTER TYPE public.tipo_usuario OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 220 (class 1259 OID 25720)
-- Name: audit_login; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_login (
    id_audit integer NOT NULL,
    nome_usuario character varying(255) DEFAULT NULL::character varying,
    imagem_usuario character varying(255) DEFAULT NULL::character varying,
    ultimo_login timestamp without time zone
);


ALTER TABLE public.audit_login OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 25719)
-- Name: audit_login_id_audit_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_login_id_audit_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_login_id_audit_seq OWNER TO postgres;

--
-- TOC entry 4929 (class 0 OID 0)
-- Dependencies: 219
-- Name: audit_login_id_audit_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_login_id_audit_seq OWNED BY public.audit_login.id_audit;


--
-- TOC entry 222 (class 1259 OID 25731)
-- Name: curso; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.curso (
    id_curso integer NOT NULL,
    nome_curso character varying(255) NOT NULL,
    id_coordenador integer,
    descricao_curso character varying(50) DEFAULT NULL::character varying,
    codigo_curso character varying(50) DEFAULT NULL::character varying,
    autorizacao character varying(255) DEFAULT NULL::character varying,
    ativo boolean DEFAULT true NOT NULL
);


ALTER TABLE public.curso OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 25730)
-- Name: curso_id_curso_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.curso_id_curso_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.curso_id_curso_seq OWNER TO postgres;

--
-- TOC entry 4930 (class 0 OID 0)
-- Dependencies: 221
-- Name: curso_id_curso_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.curso_id_curso_seq OWNED BY public.curso.id_curso;


--
-- TOC entry 224 (class 1259 OID 25748)
-- Name: esqueci_senha; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.esqueci_senha (
    id_solicitacao integer NOT NULL,
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    data_solicitacao timestamp without time zone NOT NULL,
    status public.status_esqueci_senha NOT NULL
);


ALTER TABLE public.esqueci_senha OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 25747)
-- Name: esqueci_senha_id_solicitacao_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.esqueci_senha_id_solicitacao_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.esqueci_senha_id_solicitacao_seq OWNER TO postgres;

--
-- TOC entry 4931 (class 0 OID 0)
-- Dependencies: 223
-- Name: esqueci_senha_id_solicitacao_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.esqueci_senha_id_solicitacao_seq OWNED BY public.esqueci_senha.id_solicitacao;


--
-- TOC entry 226 (class 1259 OID 25757)
-- Name: funcao; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.funcao (
    id_funcao integer NOT NULL,
    descricao character varying(255) NOT NULL
);


ALTER TABLE public.funcao OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 25756)
-- Name: funcao_id_funcao_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.funcao_id_funcao_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.funcao_id_funcao_seq OWNER TO postgres;

--
-- TOC entry 4932 (class 0 OID 0)
-- Dependencies: 225
-- Name: funcao_id_funcao_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.funcao_id_funcao_seq OWNED BY public.funcao.id_funcao;


--
-- TOC entry 228 (class 1259 OID 25764)
-- Name: logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.logs (
    id_log integer NOT NULL,
    id_usuario integer,
    atividade character varying(255) NOT NULL,
    data_hora timestamp without time zone NOT NULL
);


ALTER TABLE public.logs OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 25763)
-- Name: logs_id_log_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.logs_id_log_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.logs_id_log_seq OWNER TO postgres;

--
-- TOC entry 4933 (class 0 OID 0)
-- Dependencies: 227
-- Name: logs_id_log_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.logs_id_log_seq OWNED BY public.logs.id_log;


--
-- TOC entry 230 (class 1259 OID 25776)
-- Name: publicacao; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.publicacao (
    id_publicacao integer NOT NULL,
    titulo character varying(255) NOT NULL,
    data_publicacao timestamp without time zone NOT NULL,
    id_autor integer,
    id_curso integer,
    tipo character varying(255) DEFAULT ''::character varying NOT NULL,
    status public.status_publicacao NOT NULL,
    arquivo character varying(255) DEFAULT NULL::character varying,
    nome_arquivo character varying(255) DEFAULT NULL::character varying,
    assuntos_relacionados character varying(255) DEFAULT NULL::character varying,
    data_autoria date
);


ALTER TABLE public.publicacao OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 25775)
-- Name: publicacao_id_publicacao_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.publicacao_id_publicacao_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.publicacao_id_publicacao_seq OWNER TO postgres;

--
-- TOC entry 4934 (class 0 OID 0)
-- Dependencies: 229
-- Name: publicacao_id_publicacao_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.publicacao_id_publicacao_seq OWNED BY public.publicacao.id_publicacao;


--
-- TOC entry 232 (class 1259 OID 25799)
-- Name: relatorio; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.relatorio (
    id_relatorio integer NOT NULL,
    tipo public.tipo_relatorio NOT NULL,
    data_geracao date NOT NULL
);


ALTER TABLE public.relatorio OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 25798)
-- Name: relatorio_id_relatorio_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.relatorio_id_relatorio_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.relatorio_id_relatorio_seq OWNER TO postgres;

--
-- TOC entry 4935 (class 0 OID 0)
-- Dependencies: 231
-- Name: relatorio_id_relatorio_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.relatorio_id_relatorio_seq OWNED BY public.relatorio.id_relatorio;


--
-- TOC entry 234 (class 1259 OID 25806)
-- Name: tipos_de_publicacao; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tipos_de_publicacao (
    id integer NOT NULL,
    nome_tipo character varying(255) NOT NULL
);


ALTER TABLE public.tipos_de_publicacao OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 25805)
-- Name: tipos_de_publicacao_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tipos_de_publicacao_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tipos_de_publicacao_id_seq OWNER TO postgres;

--
-- TOC entry 4936 (class 0 OID 0)
-- Dependencies: 233
-- Name: tipos_de_publicacao_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tipos_de_publicacao_id_seq OWNED BY public.tipos_de_publicacao.id;


--
-- TOC entry 218 (class 1259 OID 25708)
-- Name: usuario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario (
    id_usuario integer NOT NULL,
    nome character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    cpf character varying(255) NOT NULL,
    senha character varying(255) NOT NULL,
    tipo public.tipo_usuario NOT NULL,
    foto_perfil character varying(255) DEFAULT NULL::character varying,
    curso_usuario character varying(255) DEFAULT NULL::character varying,
    "tokenRecuperarSenha" character varying(50) DEFAULT NULL::character varying,
    ativo boolean DEFAULT true NOT NULL,
    cep character varying(9),
    logradouro character varying(255),
    complemento character varying(255),
    bairro character varying(255),
    cidade character varying(255),
    estado character varying(2)
);


ALTER TABLE public.usuario OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 25813)
-- Name: usuario_curso; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario_curso (
    id integer NOT NULL,
    id_usuario integer NOT NULL,
    id_curso integer NOT NULL
);


ALTER TABLE public.usuario_curso OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 25812)
-- Name: usuario_curso_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuario_curso_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuario_curso_id_seq OWNER TO postgres;

--
-- TOC entry 4937 (class 0 OID 0)
-- Dependencies: 235
-- Name: usuario_curso_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuario_curso_id_seq OWNED BY public.usuario_curso.id;


--
-- TOC entry 237 (class 1259 OID 25831)
-- Name: usuario_funcao; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario_funcao (
    id_usuario integer NOT NULL,
    id_funcao integer NOT NULL
);


ALTER TABLE public.usuario_funcao OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 25707)
-- Name: usuario_id_usuario_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuario_id_usuario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuario_id_usuario_seq OWNER TO postgres;

--
-- TOC entry 4938 (class 0 OID 0)
-- Dependencies: 217
-- Name: usuario_id_usuario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuario_id_usuario_seq OWNED BY public.usuario.id_usuario;


--
-- TOC entry 4707 (class 2604 OID 25723)
-- Name: audit_login id_audit; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_login ALTER COLUMN id_audit SET DEFAULT nextval('public.audit_login_id_audit_seq'::regclass);


--
-- TOC entry 4710 (class 2604 OID 25734)
-- Name: curso id_curso; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.curso ALTER COLUMN id_curso SET DEFAULT nextval('public.curso_id_curso_seq'::regclass);


--
-- TOC entry 4715 (class 2604 OID 25751)
-- Name: esqueci_senha id_solicitacao; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.esqueci_senha ALTER COLUMN id_solicitacao SET DEFAULT nextval('public.esqueci_senha_id_solicitacao_seq'::regclass);


--
-- TOC entry 4716 (class 2604 OID 25760)
-- Name: funcao id_funcao; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.funcao ALTER COLUMN id_funcao SET DEFAULT nextval('public.funcao_id_funcao_seq'::regclass);


--
-- TOC entry 4717 (class 2604 OID 25767)
-- Name: logs id_log; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logs ALTER COLUMN id_log SET DEFAULT nextval('public.logs_id_log_seq'::regclass);


--
-- TOC entry 4718 (class 2604 OID 25779)
-- Name: publicacao id_publicacao; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publicacao ALTER COLUMN id_publicacao SET DEFAULT nextval('public.publicacao_id_publicacao_seq'::regclass);


--
-- TOC entry 4723 (class 2604 OID 25802)
-- Name: relatorio id_relatorio; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.relatorio ALTER COLUMN id_relatorio SET DEFAULT nextval('public.relatorio_id_relatorio_seq'::regclass);


--
-- TOC entry 4724 (class 2604 OID 25809)
-- Name: tipos_de_publicacao id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tipos_de_publicacao ALTER COLUMN id SET DEFAULT nextval('public.tipos_de_publicacao_id_seq'::regclass);


--
-- TOC entry 4702 (class 2604 OID 25711)
-- Name: usuario id_usuario; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario ALTER COLUMN id_usuario SET DEFAULT nextval('public.usuario_id_usuario_seq'::regclass);


--
-- TOC entry 4725 (class 2604 OID 25816)
-- Name: usuario_curso id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_curso ALTER COLUMN id SET DEFAULT nextval('public.usuario_curso_id_seq'::regclass);


--
-- TOC entry 4906 (class 0 OID 25720)
-- Dependencies: 220
-- Data for Name: audit_login; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (2, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-04 16:33:18');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (3, 'Leonardo Santos Henrique Melo', 'C:\\Users\\livio\\Documents\\GitHub\\INPROLIB\\fotoperfil\\Screenshot_1.png', '2024-12-04 16:34:26');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (4, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-04 21:46:28');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (5, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-04 22:12:47');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (6, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-04 22:19:17');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (7, 'teste', '..\\static\\img\\pentagono.png', '2024-12-04 22:23:02');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (8, 'teste', '..\\static\\img\\pentagono.png', '2024-12-04 22:23:33');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (9, 'teste', '..\\static\\img\\pentagono.png', '2024-12-04 22:26:53');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (10, 'TCHÊRERE', '..\\static\\img\\tcherere.png', '2024-12-04 22:35:09');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (11, 'TCHÊRERE', '..\\static\\img\\tcherere.png', '2024-12-04 22:35:39');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (12, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-04 22:35:48');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (13, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-04 22:38:56');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (14, 'TCHÊRERE', '..\\static\\img\\tcherere.png', '2024-12-04 22:39:04');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (15, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-04 22:42:02');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (16, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-04 22:46:08');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (17, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-04 22:53:08');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (18, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-10 15:49:46');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (19, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-10 15:50:15');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (20, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-16 16:22:09');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (21, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-16 16:22:26');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (22, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-16 23:42:56');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (23, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-17 00:32:10');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (24, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-17 00:32:27');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (25, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-17 00:34:37');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (26, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-17 00:37:01');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (27, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-17 00:54:12');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (28, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-17 00:56:11');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (29, 'Gustavo Henrique Suriane', '..\\static\\img\\wppLIVIO.jpg', '2024-12-17 01:00:01');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (30, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-17 01:07:53');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (31, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-17 16:01:50');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (32, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-17 16:18:14');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (33, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-17 16:51:00');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (34, 'Lucas Rodrigues Vargas', '..\\static\\img\\wppLIVIO.jpg', '2024-12-17 16:52:09');
INSERT INTO public.audit_login (id_audit, nome_usuario, imagem_usuario, ultimo_login) VALUES (35, 'Lívio Lucas', '..\\static\\img\\fotoLivio.png', '2024-12-17 17:08:35');


--
-- TOC entry 4908 (class 0 OID 25731)
-- Dependencies: 222
-- Data for Name: curso; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.curso (id_curso, nome_curso, id_coordenador, descricao_curso, codigo_curso, autorizacao, ativo) VALUES (4, 'Psicologia', NULL, 'Curso de Bacharelado em Psicologia', 'PSI2024/2', 'teste do livio', true);
INSERT INTO public.curso (id_curso, nome_curso, id_coordenador, descricao_curso, codigo_curso, autorizacao, ativo) VALUES (5, 'Administração', 13, 'Curso de Administração', 'ADM 2024.2', 'teste do livio', true);
INSERT INTO public.curso (id_curso, nome_curso, id_coordenador, descricao_curso, codigo_curso, autorizacao, ativo) VALUES (6, 'Enfermagem', 15, 'Curso de Enfermagem 2024.2', 'ENF 2024.2', 'TESTE TCHERERE', true);
INSERT INTO public.curso (id_curso, nome_curso, id_coordenador, descricao_curso, codigo_curso, autorizacao, ativo) VALUES (7, 'teste', 13, 'teste', 'teste', 'TESTE TCHERERE', true);
INSERT INTO public.curso (id_curso, nome_curso, id_coordenador, descricao_curso, codigo_curso, autorizacao, ativo) VALUES (8, 'Curso de Acupuntura', 13, 'Pós Graduação em Acupuntura', 'ACUP2024.2', '1095', true);
INSERT INTO public.curso (id_curso, nome_curso, id_coordenador, descricao_curso, codigo_curso, autorizacao, ativo) VALUES (10, 'Curso Validação', NULL, 'Curso de Teste', 'VAL123', '1234', true);
INSERT INTO public.curso (id_curso, nome_curso, id_coordenador, descricao_curso, codigo_curso, autorizacao, ativo) VALUES (11, 'Cartografia', 15, 'Piriguete', '1470', 'CD7878', true);
INSERT INTO public.curso (id_curso, nome_curso, id_coordenador, descricao_curso, codigo_curso, autorizacao, ativo) VALUES (9, 'Curso de Logística', NULL, 'Graduação em Logistica', 'LOG.2024-2', '6474/24', true);
INSERT INTO public.curso (id_curso, nome_curso, id_coordenador, descricao_curso, codigo_curso, autorizacao, ativo) VALUES (19, 'Medicina', 15, 'Pediatra', '1470', '2525', true);
INSERT INTO public.curso (id_curso, nome_curso, id_coordenador, descricao_curso, codigo_curso, autorizacao, ativo) VALUES (12, 'Curso UI Teste 153', 13, '', 'UITEST-245', '12345', false);


--
-- TOC entry 4910 (class 0 OID 25748)
-- Dependencies: 224
-- Data for Name: esqueci_senha; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.esqueci_senha (id_solicitacao, email, token, data_solicitacao, status) VALUES (1, 'samuel.edgar@gmail.com', 'J3UAJpdBLJuVuN5oYPdavRPGjQAprDk--N4ovP2KfPI', '2025-10-13 18:15:29.455253', 'Expirado');
INSERT INTO public.esqueci_senha (id_solicitacao, email, token, data_solicitacao, status) VALUES (2, 'samuel.edgar@gmail.com', 'ePrZxA6Rw-Ena32J64oNo7QCZvf19P5YPViPDe8ltTg', '2025-10-13 18:20:43.948801', 'Expirado');
INSERT INTO public.esqueci_senha (id_solicitacao, email, token, data_solicitacao, status) VALUES (3, 'samuel.edgar@gmail.com', 'gT6NdQVBDM3ViRIo3oj7AptGvD9tv2FavJ6PHVGZTtM', '2025-10-13 18:30:36.953678', 'Expirado');
INSERT INTO public.esqueci_senha (id_solicitacao, email, token, data_solicitacao, status) VALUES (4, 'samuel.edgar@gmail.com', 'B_Wu-V6B7_Oq4cKCTedefFZy4u-iZdziLAyGvoHMNY4', '2025-10-13 18:48:04.841832', 'Expirado');
INSERT INTO public.esqueci_senha (id_solicitacao, email, token, data_solicitacao, status) VALUES (5, 'samuel.edgar@gmail.com', '_KoaUDkFnqo8up0iyNz5c-hmV86qiLHUv9ZktU6osLg', '2025-10-13 18:56:24.047805', 'Expirado');
INSERT INTO public.esqueci_senha (id_solicitacao, email, token, data_solicitacao, status) VALUES (7, 'liviool123@gmail.com', 'zxO8R_89nMn-KKiVE-NEnUy8fHQcTg0uLgvVQeKPU4I', '2025-10-15 01:13:04.510163', 'Expirado');
INSERT INTO public.esqueci_senha (id_solicitacao, email, token, data_solicitacao, status) VALUES (8, 'liviool123@gmail.com', 'kNszurPW377fZVGG9NkZ40yJZhVBMB64dyLJ7AMZYkA', '2025-10-16 22:22:08.755742', 'Ativo');


--
-- TOC entry 4912 (class 0 OID 25757)
-- Dependencies: 226
-- Data for Name: funcao; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 4914 (class 0 OID 25764)
-- Dependencies: 228
-- Data for Name: logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 4916 (class 0 OID 25776)
-- Dependencies: 230
-- Data for Name: publicacao; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.publicacao (id_publicacao, titulo, data_publicacao, id_autor, id_curso, tipo, status, arquivo, nome_arquivo, assuntos_relacionados, data_autoria) VALUES (14, '1732719355852.pdf', '2024-11-27 17:28:36', 15, 5, 'Tese', 'Publicado', 'C:\\Users\\livio\\Documents\\GitHub\\INPROLIB\\arquivos\\upload\\1732719355852.pdf', 'Testando commit', 'teste', '2024-11-12');
INSERT INTO public.publicacao (id_publicacao, titulo, data_publicacao, id_autor, id_curso, tipo, status, arquivo, nome_arquivo, assuntos_relacionados, data_autoria) VALUES (16, '24100757.58_-_José_Guilherme_Paciléo_Zanardo_-_17122024112354208.pdf', '2024-12-17 16:54:00', 17, 9, 'Monografia', 'Publicado', 'C:\\Users\\livio\\Documents\\GitHub\\INPROLIB\\arquivos\\upload\\24100757.58_-_José_Guilherme_Paciléo_Zanardo_-_17122024112354208.pdf', 'Cargas Orgânicas ', 'Logistica', '2024-12-17');


--
-- TOC entry 4918 (class 0 OID 25799)
-- Dependencies: 232
-- Data for Name: relatorio; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 4920 (class 0 OID 25806)
-- Dependencies: 234
-- Data for Name: tipos_de_publicacao; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.tipos_de_publicacao (id, nome_tipo) VALUES (1, 'TCC');
INSERT INTO public.tipos_de_publicacao (id, nome_tipo) VALUES (2, 'Dissertação');
INSERT INTO public.tipos_de_publicacao (id, nome_tipo) VALUES (3, 'Monografia');
INSERT INTO public.tipos_de_publicacao (id, nome_tipo) VALUES (4, 'Tese');


--
-- TOC entry 4904 (class 0 OID 25708)
-- Dependencies: 218
-- Data for Name: usuario; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.usuario (id_usuario, nome, email, cpf, senha, tipo, foto_perfil, curso_usuario, "tokenRecuperarSenha", ativo, cep, logradouro, complemento, bairro, cidade, estado) VALUES (13, 'Leonardo Santos Henrique Melo', 'leoshmello@gmail.com', '810.301.940-25', '794613', 'Professor', 'C:\\Users\\livio\\Documents\\GitHub\\INPROLIB\\fotoperfil\\Screenshot_1.png', 'Psicologia', NULL, true, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.usuario (id_usuario, nome, email, cpf, senha, tipo, foto_perfil, curso_usuario, "tokenRecuperarSenha", ativo, cep, logradouro, complemento, bairro, cidade, estado) VALUES (14, 'teste', 'teste@gmail.com', '686.013.600-68', '123', 'Aluno', '..\\static\\img\\pentagono.png', 'Administração', NULL, true, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.usuario (id_usuario, nome, email, cpf, senha, tipo, foto_perfil, curso_usuario, "tokenRecuperarSenha", ativo, cep, logradouro, complemento, bairro, cidade, estado) VALUES (15, 'TCHÊRERE', 'gustavoteste@gmail.com', '113.233.720-83', '123123', 'Professor', '..\\static\\img\\tcherere.png', 'Administração', NULL, true, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.usuario (id_usuario, nome, email, cpf, senha, tipo, foto_perfil, curso_usuario, "tokenRecuperarSenha", ativo, cep, logradouro, complemento, bairro, cidade, estado) VALUES (16, 'Gustavo Henrique Suriane', 'gusSuriane@gmail.com', '984.864.811-21', '159159', 'Funcionário', '..\\static\\img\\wppLIVIO.jpg', NULL, NULL, true, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.usuario (id_usuario, nome, email, cpf, senha, tipo, foto_perfil, curso_usuario, "tokenRecuperarSenha", ativo, cep, logradouro, complemento, bairro, cidade, estado) VALUES (17, 'Lucas Rodrigues Vargas', 'Lucas@gmail.com', '662.181.111-23', '321321', 'Aluno', '..\\static\\img\\wppLIVIO.jpg', 'Curso de Logística', NULL, true, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.usuario (id_usuario, nome, email, cpf, senha, tipo, foto_perfil, curso_usuario, "tokenRecuperarSenha", ativo, cep, logradouro, complemento, bairro, cidade, estado) VALUES (18, 'Usuário com hash', 'test1e@gmail.com', '965.046.870-64', '$argon2id$v=19$m=65536,t=3,p=4$QjhuF8a2OY7jAG0g59RV/A$FAgUmlCmFUsTUJGLER9lV52Yd9hh+dm5m790tIEn/TQ', 'Funcionário', NULL, NULL, NULL, true, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.usuario (id_usuario, nome, email, cpf, senha, tipo, foto_perfil, curso_usuario, "tokenRecuperarSenha", ativo, cep, logradouro, complemento, bairro, cidade, estado) VALUES (20, 'Yanick Prohaska', 'yan@gmai.com', '322.108.930-97', 'pbkdf2:sha256:600000$npOoS1Po894TVfir$b761f490a6493c9e4a1288eda9c2fac8d57bacde113ec0d32015a4b4cab2d984', 'Aluno', NULL, NULL, NULL, true, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.usuario (id_usuario, nome, email, cpf, senha, tipo, foto_perfil, curso_usuario, "tokenRecuperarSenha", ativo, cep, logradouro, complemento, bairro, cidade, estado) VALUES (31, 'Victor Hugo Freitas', 'victorhugofreitas123@gmail.com', '000.000.000-00', 'pbkdf2:sha256:600000$Rk4r5lks8BRuDZxr$9d2a6263a9c28a7186e498c761bf0ba7ce82dbb9d3c91d1cc3634255364bc99e', 'Funcionário', NULL, NULL, NULL, true, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.usuario (id_usuario, nome, email, cpf, senha, tipo, foto_perfil, curso_usuario, "tokenRecuperarSenha", ativo, cep, logradouro, complemento, bairro, cidade, estado) VALUES (32, 'Renata Fagundes', 'renata.facinpro@gmail.com', '000.000.000-00', 'pbkdf2:sha256:600000$9KTynvZ0mPmjsPJp$8273c37774f79fb4e46b2c12560de0a889ae5b0e01c439b238b77b59f1d432cd', 'Funcionário', NULL, NULL, NULL, true, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.usuario (id_usuario, nome, email, cpf, senha, tipo, foto_perfil, curso_usuario, "tokenRecuperarSenha", ativo, cep, logradouro, complemento, bairro, cidade, estado) VALUES (39, 'Livio Lucas', 'liviool123@gmail.com', '821.537.670-32', 'pbkdf2:sha256:600000$iQmaOA6xQh1ztJMj$cb2e3f57b0c0fa35e081f0c952dad7a65bc28947cf230ef901885dc333430842', 'Funcionário', NULL, NULL, NULL, true, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.usuario (id_usuario, nome, email, cpf, senha, tipo, foto_perfil, curso_usuario, "tokenRecuperarSenha", ativo, cep, logradouro, complemento, bairro, cidade, estado) VALUES (27, 'Jaum Belarmino', 'jb@gmail.com', '030.466.670-00', 'pbkdf2:sha256:600000$SoPVXu61HN16L4Pa$fd43bef9759328d807b883478fc07f307710fc760903689425b9e0da9e536b94', 'Aluno', NULL, NULL, NULL, true, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.usuario (id_usuario, nome, email, cpf, senha, tipo, foto_perfil, curso_usuario, "tokenRecuperarSenha", ativo, cep, logradouro, complemento, bairro, cidade, estado) VALUES (35, 'Yuri Prohasck', 'yp@gmail.com', '805.630.530-03', 'pbkdf2:sha256:600000$TnC4KGGJ0gUpSoKB$1cf3643f1f0ad64617d9e04802c9da06e221f1c07d48ac1c6a64926c6dd7a682', 'Professor', NULL, NULL, NULL, true, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.usuario (id_usuario, nome, email, cpf, senha, tipo, foto_perfil, curso_usuario, "tokenRecuperarSenha", ativo, cep, logradouro, complemento, bairro, cidade, estado) VALUES (40, 'Samuel Edgar', 'samuel.edgar@gmail.com', '529.982.247-25', 'pbkdf2:sha256:600000$Ef2PfLwn91ShMluT$e5b71c912e94281809b8d08c432b3bcda6f9b7f5c0ee069038b5a1bec7cd1e6b', 'Funcionário', NULL, NULL, NULL, true, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.usuario (id_usuario, nome, email, cpf, senha, tipo, foto_perfil, curso_usuario, "tokenRecuperarSenha", ativo, cep, logradouro, complemento, bairro, cidade, estado) VALUES (28, 'Larissa Alinny', 'aalinny9@gmail.com', '000.000.000-00', 'pbkdf2:sha256:600000$NbqgpRmw8lPrkRss$73593319a0b6d9fb6f78898570f960ed32ddf7e86138ac4b2b865482828868ae', 'Funcionário', NULL, NULL, NULL, true, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.usuario (id_usuario, nome, email, cpf, senha, tipo, foto_perfil, curso_usuario, "tokenRecuperarSenha", ativo, cep, logradouro, complemento, bairro, cidade, estado) VALUES (29, 'Arthur Madeira', 'Arthurmad456@gmail.com', '000.000.000-00', 'pbkdf2:sha256:600000$VwmNloew4WkOLPR4$ec17060a68c4d65b0dcc3aed31883d291f60a6e315e59253fc7803d4241b80de', 'Funcionário', NULL, NULL, NULL, true, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.usuario (id_usuario, nome, email, cpf, senha, tipo, foto_perfil, curso_usuario, "tokenRecuperarSenha", ativo, cep, logradouro, complemento, bairro, cidade, estado) VALUES (30, 'João Vitor Ferreira', 'vitorjoao123z@gmail.com', '000.000.000-00', 'pbkdf2:sha256:600000$GoieOjfI7wok8kMU$85e7ad43e4bfc168e625baf64cf6a5920351234ac9f59829ff56962d13de2be4', 'Funcionário', NULL, NULL, NULL, true, NULL, NULL, NULL, NULL, NULL, NULL);


--
-- TOC entry 4922 (class 0 OID 25813)
-- Dependencies: 236
-- Data for Name: usuario_curso; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 4923 (class 0 OID 25831)
-- Dependencies: 237
-- Data for Name: usuario_funcao; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 4939 (class 0 OID 0)
-- Dependencies: 219
-- Name: audit_login_id_audit_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_login_id_audit_seq', 35, true);


--
-- TOC entry 4940 (class 0 OID 0)
-- Dependencies: 221
-- Name: curso_id_curso_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.curso_id_curso_seq', 19, true);


--
-- TOC entry 4941 (class 0 OID 0)
-- Dependencies: 223
-- Name: esqueci_senha_id_solicitacao_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.esqueci_senha_id_solicitacao_seq', 8, true);


--
-- TOC entry 4942 (class 0 OID 0)
-- Dependencies: 225
-- Name: funcao_id_funcao_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.funcao_id_funcao_seq', 1, false);


--
-- TOC entry 4943 (class 0 OID 0)
-- Dependencies: 227
-- Name: logs_id_log_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.logs_id_log_seq', 1, false);


--
-- TOC entry 4944 (class 0 OID 0)
-- Dependencies: 229
-- Name: publicacao_id_publicacao_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.publicacao_id_publicacao_seq', 16, true);


--
-- TOC entry 4945 (class 0 OID 0)
-- Dependencies: 231
-- Name: relatorio_id_relatorio_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.relatorio_id_relatorio_seq', 1, false);


--
-- TOC entry 4946 (class 0 OID 0)
-- Dependencies: 233
-- Name: tipos_de_publicacao_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tipos_de_publicacao_id_seq', 4, true);


--
-- TOC entry 4947 (class 0 OID 0)
-- Dependencies: 235
-- Name: usuario_curso_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuario_curso_id_seq', 1, true);


--
-- TOC entry 4948 (class 0 OID 0)
-- Dependencies: 217
-- Name: usuario_id_usuario_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuario_id_usuario_seq', 40, true);


--
-- TOC entry 4729 (class 2606 OID 25729)
-- Name: audit_login audit_login_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_login
    ADD CONSTRAINT audit_login_pkey PRIMARY KEY (id_audit);


--
-- TOC entry 4731 (class 2606 OID 25741)
-- Name: curso curso_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.curso
    ADD CONSTRAINT curso_pkey PRIMARY KEY (id_curso);


--
-- TOC entry 4733 (class 2606 OID 25755)
-- Name: esqueci_senha esqueci_senha_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.esqueci_senha
    ADD CONSTRAINT esqueci_senha_pkey PRIMARY KEY (id_solicitacao);


--
-- TOC entry 4735 (class 2606 OID 25762)
-- Name: funcao funcao_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.funcao
    ADD CONSTRAINT funcao_pkey PRIMARY KEY (id_funcao);


--
-- TOC entry 4737 (class 2606 OID 25769)
-- Name: logs logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_pkey PRIMARY KEY (id_log);


--
-- TOC entry 4739 (class 2606 OID 25787)
-- Name: publicacao publicacao_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publicacao
    ADD CONSTRAINT publicacao_pkey PRIMARY KEY (id_publicacao);


--
-- TOC entry 4741 (class 2606 OID 25804)
-- Name: relatorio relatorio_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.relatorio
    ADD CONSTRAINT relatorio_pkey PRIMARY KEY (id_relatorio);


--
-- TOC entry 4743 (class 2606 OID 25811)
-- Name: tipos_de_publicacao tipos_de_publicacao_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tipos_de_publicacao
    ADD CONSTRAINT tipos_de_publicacao_pkey PRIMARY KEY (id);


--
-- TOC entry 4745 (class 2606 OID 25818)
-- Name: usuario_curso usuario_curso_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_curso
    ADD CONSTRAINT usuario_curso_pkey PRIMARY KEY (id);


--
-- TOC entry 4747 (class 2606 OID 25820)
-- Name: usuario_curso usuario_curso_unique_pair; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_curso
    ADD CONSTRAINT usuario_curso_unique_pair UNIQUE (id_usuario, id_curso);


--
-- TOC entry 4749 (class 2606 OID 25835)
-- Name: usuario_funcao usuario_funcao_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_funcao
    ADD CONSTRAINT usuario_funcao_pkey PRIMARY KEY (id_usuario, id_funcao);


--
-- TOC entry 4727 (class 2606 OID 25718)
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id_usuario);


--
-- TOC entry 4750 (class 2606 OID 25742)
-- Name: curso curso_id_coordenador_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.curso
    ADD CONSTRAINT curso_id_coordenador_fkey FOREIGN KEY (id_coordenador) REFERENCES public.usuario(id_usuario) ON DELETE SET NULL;


--
-- TOC entry 4751 (class 2606 OID 25770)
-- Name: logs logs_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON DELETE CASCADE;


--
-- TOC entry 4752 (class 2606 OID 25788)
-- Name: publicacao publicacao_id_autor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publicacao
    ADD CONSTRAINT publicacao_id_autor_fkey FOREIGN KEY (id_autor) REFERENCES public.usuario(id_usuario) ON DELETE CASCADE;


--
-- TOC entry 4753 (class 2606 OID 25793)
-- Name: publicacao publicacao_id_curso_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publicacao
    ADD CONSTRAINT publicacao_id_curso_fkey FOREIGN KEY (id_curso) REFERENCES public.curso(id_curso) ON DELETE CASCADE;


--
-- TOC entry 4754 (class 2606 OID 25826)
-- Name: usuario_curso usuario_curso_id_curso_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_curso
    ADD CONSTRAINT usuario_curso_id_curso_fkey FOREIGN KEY (id_curso) REFERENCES public.curso(id_curso) ON DELETE CASCADE;


--
-- TOC entry 4755 (class 2606 OID 25821)
-- Name: usuario_curso usuario_curso_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_curso
    ADD CONSTRAINT usuario_curso_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON DELETE CASCADE;


--
-- TOC entry 4756 (class 2606 OID 25841)
-- Name: usuario_funcao usuario_funcao_id_funcao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_funcao
    ADD CONSTRAINT usuario_funcao_id_funcao_fkey FOREIGN KEY (id_funcao) REFERENCES public.funcao(id_funcao) ON DELETE CASCADE;


--
-- TOC entry 4757 (class 2606 OID 25836)
-- Name: usuario_funcao usuario_funcao_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_funcao
    ADD CONSTRAINT usuario_funcao_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON DELETE CASCADE;


-- Completed on 2025-10-18 15:57:06

--
-- PostgreSQL database dump complete
--

\unrestrict P6AJUW4FJ9dUDewzDiEtBZt8cBgknKX5NJ6CxQIWTTEKL0PNwd7qRtKMwHJfEQB

