--
-- PostgreSQL database dump
--

\restrict 0vxEQciVLUtiQhmoVMQhETxNVIYlvc0Ti001FeRXyptzJ000DJgtkm9adsAuzNI

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: avaliacoes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.avaliacoes (
    id_avaliacao integer NOT NULL,
    usuario_id integer NOT NULL,
    empresa_id integer NOT NULL,
    nota smallint NOT NULL,
    comentario text,
    criado_em timestamp without time zone DEFAULT now() NOT NULL,
    editado_em timestamp without time zone,
    CONSTRAINT avaliacoes_nota_check CHECK (((nota >= 1) AND (nota <= 5)))
);


ALTER TABLE public.avaliacoes OWNER TO postgres;

--
-- Name: avaliacoes_id_avaliacao_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.avaliacoes_id_avaliacao_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.avaliacoes_id_avaliacao_seq OWNER TO postgres;

--
-- Name: avaliacoes_id_avaliacao_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.avaliacoes_id_avaliacao_seq OWNED BY public.avaliacoes.id_avaliacao;


--
-- Name: categorias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categorias (
    id_categoria integer NOT NULL,
    nome character varying(50) NOT NULL,
    icone character varying(100)
);


ALTER TABLE public.categorias OWNER TO postgres;

--
-- Name: categorias_id_categoria_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categorias_id_categoria_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categorias_id_categoria_seq OWNER TO postgres;

--
-- Name: categorias_id_categoria_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categorias_id_categoria_seq OWNED BY public.categorias.id_categoria;


--
-- Name: codigos_verificacao; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.codigos_verificacao (
    id_codigo integer NOT NULL,
    empresa_id integer NOT NULL,
    codigo character varying(6) NOT NULL,
    metodo character varying(10) NOT NULL,
    expira_em timestamp without time zone NOT NULL,
    usado boolean DEFAULT false NOT NULL,
    criado_em timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT codigos_verificacao_metodo_check CHECK (((metodo)::text = ANY ((ARRAY['sms'::character varying, 'email'::character varying])::text[])))
);


ALTER TABLE public.codigos_verificacao OWNER TO postgres;

--
-- Name: codigos_verificacao_id_codigo_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.codigos_verificacao_id_codigo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.codigos_verificacao_id_codigo_seq OWNER TO postgres;

--
-- Name: codigos_verificacao_id_codigo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.codigos_verificacao_id_codigo_seq OWNED BY public.codigos_verificacao.id_codigo;


--
-- Name: codigos_verificacao_senha; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.codigos_verificacao_senha (
    id_codigo integer NOT NULL,
    usuario_id integer NOT NULL,
    codigo character varying(6) NOT NULL,
    expira_em timestamp without time zone NOT NULL,
    usado boolean DEFAULT false NOT NULL,
    criado_em timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.codigos_verificacao_senha OWNER TO postgres;

--
-- Name: codigos_verificacao_senha_id_codigo_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.codigos_verificacao_senha_id_codigo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.codigos_verificacao_senha_id_codigo_seq OWNER TO postgres;

--
-- Name: codigos_verificacao_senha_id_codigo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.codigos_verificacao_senha_id_codigo_seq OWNED BY public.codigos_verificacao_senha.id_codigo;


--
-- Name: empresa_categoria; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.empresa_categoria (
    id_empresa_categoria integer NOT NULL,
    empresa_id integer NOT NULL,
    categoria_id integer NOT NULL
);


ALTER TABLE public.empresa_categoria OWNER TO postgres;

--
-- Name: empresa_categoria_id_empresa_categoria_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.empresa_categoria_id_empresa_categoria_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.empresa_categoria_id_empresa_categoria_seq OWNER TO postgres;

--
-- Name: empresa_categoria_id_empresa_categoria_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.empresa_categoria_id_empresa_categoria_seq OWNED BY public.empresa_categoria.id_empresa_categoria;


--
-- Name: empresas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.empresas (
    id_empresa integer NOT NULL,
    id_usuario integer NOT NULL,
    nome_fantasia character varying(150) NOT NULL,
    telefone character varying(20),
    descricao text,
    planilha_url character varying(255),
    tipo character varying(20) DEFAULT 'comercio'::character varying NOT NULL,
    status_verificacao character varying(20) DEFAULT 'pendente'::character varying NOT NULL,
    total_avaliacoes integer DEFAULT 0 NOT NULL,
    nota_media numeric(3,2) DEFAULT 0 NOT NULL,
    data_cadastro timestamp without time zone DEFAULT now() NOT NULL,
    site character varying(255),
    google_maps_url character varying(500),
    status character varying(30) DEFAULT 'rascunho'::character varying NOT NULL,
    enviada_para_aprovacao_em timestamp without time zone,
    motivo_rejeicao text,
    metodo_verificacao character varying(10),
    verificado_em timestamp without time zone,
    CONSTRAINT empresas_metodo_verificacao_check CHECK (((metodo_verificacao IS NULL) OR ((metodo_verificacao)::text = ANY ((ARRAY['sms'::character varying, 'email'::character varying])::text[])))),
    CONSTRAINT empresas_status_check CHECK (((status)::text = ANY ((ARRAY['rascunho'::character varying, 'pendente_aprovacao'::character varying, 'aprovada'::character varying, 'rejeitada'::character varying])::text[]))),
    CONSTRAINT empresas_status_verificacao_check CHECK (((status_verificacao)::text = ANY ((ARRAY['pendente'::character varying, 'aprovado'::character varying, 'rejeitado'::character varying])::text[]))),
    CONSTRAINT empresas_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['comercio'::character varying, 'servico'::character varying, 'ambos'::character varying])::text[])))
);


ALTER TABLE public.empresas OWNER TO postgres;

--
-- Name: empresas_id_empresa_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.empresas_id_empresa_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.empresas_id_empresa_seq OWNER TO postgres;

--
-- Name: empresas_id_empresa_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.empresas_id_empresa_seq OWNED BY public.empresas.id_empresa;


--
-- Name: enderecos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.enderecos (
    id_endereco integer NOT NULL,
    empresa_id integer NOT NULL,
    endereco character varying(255) NOT NULL,
    bairro character varying(100) NOT NULL,
    latitude numeric(10,7) NOT NULL,
    longitude numeric(10,7) NOT NULL
);


ALTER TABLE public.enderecos OWNER TO postgres;

--
-- Name: enderecos_id_endereco_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.enderecos_id_endereco_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.enderecos_id_endereco_seq OWNER TO postgres;

--
-- Name: enderecos_id_endereco_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.enderecos_id_endereco_seq OWNED BY public.enderecos.id_endereco;


--
-- Name: fotos_empresa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fotos_empresa (
    id_foto integer NOT NULL,
    empresa_id integer NOT NULL,
    url character varying(500) NOT NULL,
    ordem smallint DEFAULT 0 NOT NULL,
    criado_em timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.fotos_empresa OWNER TO postgres;

--
-- Name: fotos_empresa_id_foto_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fotos_empresa_id_foto_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fotos_empresa_id_foto_seq OWNER TO postgres;

--
-- Name: fotos_empresa_id_foto_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fotos_empresa_id_foto_seq OWNED BY public.fotos_empresa.id_foto;


--
-- Name: historico; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.historico (
    id_historico integer NOT NULL,
    usuario_id integer NOT NULL,
    tipo_acao character varying(20) NOT NULL,
    item_id integer,
    criado_em timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT historico_tipo_acao_check CHECK (((tipo_acao)::text = ANY ((ARRAY['busca'::character varying, 'visualizacao'::character varying])::text[])))
);


ALTER TABLE public.historico OWNER TO postgres;

--
-- Name: historico_id_historico_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.historico_id_historico_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.historico_id_historico_seq OWNER TO postgres;

--
-- Name: historico_id_historico_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.historico_id_historico_seq OWNED BY public.historico.id_historico;


--
-- Name: horarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.horarios (
    id_horario integer NOT NULL,
    empresa_id integer NOT NULL,
    dia_semana smallint NOT NULL,
    abertura time without time zone,
    fechamento time without time zone,
    fechado boolean DEFAULT false NOT NULL,
    data_fim date,
    status character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    CONSTRAINT horarios_dia_semana_check CHECK (((dia_semana >= 0) AND (dia_semana <= 6))),
    CONSTRAINT horarios_status_check CHECK (((status)::text = ANY ((ARRAY['normal'::character varying, 'feriado'::character varying, 'fechado_temporario'::character varying])::text[])))
);


ALTER TABLE public.horarios OWNER TO postgres;

--
-- Name: horarios_id_horario_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.horarios_id_horario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.horarios_id_horario_seq OWNER TO postgres;

--
-- Name: horarios_id_horario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.horarios_id_horario_seq OWNED BY public.horarios.id_horario;


--
-- Name: listas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.listas (
    id_lista integer NOT NULL,
    usuario_id integer NOT NULL,
    nome character varying(100) NOT NULL,
    privacidade character varying(20) DEFAULT 'privada'::character varying NOT NULL,
    criado_em timestamp without time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT listas_privacidade_check CHECK (((privacidade)::text = ANY ((ARRAY['publica'::character varying, 'privada'::character varying])::text[])))
);


ALTER TABLE public.listas OWNER TO postgres;

--
-- Name: listas_id_lista_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.listas_id_lista_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.listas_id_lista_seq OWNER TO postgres;

--
-- Name: listas_id_lista_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.listas_id_lista_seq OWNED BY public.listas.id_lista;


--
-- Name: produtos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.produtos (
    id_produto integer NOT NULL,
    empresa_id integer NOT NULL,
    nome character varying(150) NOT NULL,
    descricao text,
    preco numeric(10,2) NOT NULL,
    disponivel boolean DEFAULT true NOT NULL,
    atualizado_em timestamp without time zone DEFAULT now() NOT NULL,
    tipo_item character varying(10) DEFAULT 'produto'::character varying NOT NULL,
    categoria_id integer,
    unidade_medida character varying(20) DEFAULT 'un'::character varying NOT NULL,
    CONSTRAINT produtos_tipo_item_check CHECK (((tipo_item)::text = ANY ((ARRAY['produto'::character varying, 'servico'::character varying])::text[])))
);


ALTER TABLE public.produtos OWNER TO postgres;

--
-- Name: produtos_id_produto_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.produtos_id_produto_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.produtos_id_produto_seq OWNER TO postgres;

--
-- Name: produtos_id_produto_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.produtos_id_produto_seq OWNED BY public.produtos.id_produto;


--
-- Name: promocoes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.promocoes (
    id_promocao integer NOT NULL,
    empresa_id integer NOT NULL,
    produto_id integer,
    tipo character varying(20) NOT NULL,
    titulo character varying(150) NOT NULL,
    descricao text,
    condicao character varying(255),
    desconto_percentual numeric(5,2),
    data_inicio timestamp without time zone NOT NULL,
    data_fim timestamp without time zone NOT NULL,
    status character varying(20) DEFAULT 'agendada'::character varying NOT NULL,
    CONSTRAINT promocoes_desconto_percentual_check CHECK (((desconto_percentual IS NULL) OR ((desconto_percentual > (0)::numeric) AND (desconto_percentual <= (100)::numeric)))),
    CONSTRAINT promocoes_status_check CHECK (((status)::text = ANY ((ARRAY['agendada'::character varying, 'ativa'::character varying, 'expirada'::character varying])::text[]))),
    CONSTRAINT promocoes_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['normal'::character varying, 'especial'::character varying, 'relampago'::character varying])::text[])))
);


ALTER TABLE public.promocoes OWNER TO postgres;

--
-- Name: promocoes_id_promocao_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.promocoes_id_promocao_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.promocoes_id_promocao_seq OWNER TO postgres;

--
-- Name: promocoes_id_promocao_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.promocoes_id_promocao_seq OWNED BY public.promocoes.id_promocao;


--
-- Name: salvos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salvos (
    id_salvo integer NOT NULL,
    lista_id integer NOT NULL,
    usuario_id integer NOT NULL,
    tipo_item character varying(20) NOT NULL,
    item_id integer NOT NULL,
    criado_em timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT salvos_tipo_item_check CHECK (((tipo_item)::text = ANY ((ARRAY['empresa'::character varying, 'produto'::character varying])::text[])))
);


ALTER TABLE public.salvos OWNER TO postgres;

--
-- Name: salvos_id_salvo_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.salvos_id_salvo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.salvos_id_salvo_seq OWNER TO postgres;

--
-- Name: salvos_id_salvo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.salvos_id_salvo_seq OWNED BY public.salvos.id_salvo;


--
-- Name: solicitacoes_empresa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.solicitacoes_empresa (
    id_solicitacao integer NOT NULL,
    empresa_id integer NOT NULL,
    id_usuario integer NOT NULL,
    tipo character varying(20) NOT NULL,
    motivo character varying(30),
    mensagem text,
    status character varying(20) DEFAULT 'pendente'::character varying NOT NULL,
    criado_em timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT solicitacoes_empresa_motivo_check CHECK (((motivo IS NULL) OR ((motivo)::text = ANY ((ARRAY['duplicada'::character varying, 'informacoes_incorretas'::character varying, 'nao_existe'::character varying, 'outro'::character varying])::text[])))),
    CONSTRAINT solicitacoes_empresa_status_check CHECK (((status)::text = ANY ((ARRAY['pendente'::character varying, 'aprovada'::character varying, 'rejeitada'::character varying])::text[]))),
    CONSTRAINT solicitacoes_empresa_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['reivindicacao'::character varying, 'denuncia'::character varying])::text[])))
);


ALTER TABLE public.solicitacoes_empresa OWNER TO postgres;

--
-- Name: solicitacoes_empresa_id_solicitacao_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.solicitacoes_empresa_id_solicitacao_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.solicitacoes_empresa_id_solicitacao_seq OWNER TO postgres;

--
-- Name: solicitacoes_empresa_id_solicitacao_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.solicitacoes_empresa_id_solicitacao_seq OWNED BY public.solicitacoes_empresa.id_solicitacao;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id_usuario integer NOT NULL,
    nome character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    senha_hash character varying(255) NOT NULL,
    tipo character varying(20) DEFAULT 'consumidor'::character varying NOT NULL,
    data_nascimento date,
    telefone character varying(20),
    conta_privada boolean DEFAULT false NOT NULL,
    notificacoes_ativas boolean DEFAULT true NOT NULL,
    foto_perfil_url character varying(255),
    biografia text,
    data_cadastro timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT usuarios_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['consumidor'::character varying, 'empresario'::character varying, 'admin'::character varying])::text[])))
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_usuario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_usuario_seq OWNER TO postgres;

--
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_usuario_seq OWNED BY public.usuarios.id_usuario;


--
-- Name: avaliacoes id_avaliacao; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avaliacoes ALTER COLUMN id_avaliacao SET DEFAULT nextval('public.avaliacoes_id_avaliacao_seq'::regclass);


--
-- Name: categorias id_categoria; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias ALTER COLUMN id_categoria SET DEFAULT nextval('public.categorias_id_categoria_seq'::regclass);


--
-- Name: codigos_verificacao id_codigo; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.codigos_verificacao ALTER COLUMN id_codigo SET DEFAULT nextval('public.codigos_verificacao_id_codigo_seq'::regclass);


--
-- Name: codigos_verificacao_senha id_codigo; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.codigos_verificacao_senha ALTER COLUMN id_codigo SET DEFAULT nextval('public.codigos_verificacao_senha_id_codigo_seq'::regclass);


--
-- Name: empresa_categoria id_empresa_categoria; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresa_categoria ALTER COLUMN id_empresa_categoria SET DEFAULT nextval('public.empresa_categoria_id_empresa_categoria_seq'::regclass);


--
-- Name: empresas id_empresa; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresas ALTER COLUMN id_empresa SET DEFAULT nextval('public.empresas_id_empresa_seq'::regclass);


--
-- Name: enderecos id_endereco; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enderecos ALTER COLUMN id_endereco SET DEFAULT nextval('public.enderecos_id_endereco_seq'::regclass);


--
-- Name: fotos_empresa id_foto; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fotos_empresa ALTER COLUMN id_foto SET DEFAULT nextval('public.fotos_empresa_id_foto_seq'::regclass);


--
-- Name: historico id_historico; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historico ALTER COLUMN id_historico SET DEFAULT nextval('public.historico_id_historico_seq'::regclass);


--
-- Name: horarios id_horario; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.horarios ALTER COLUMN id_horario SET DEFAULT nextval('public.horarios_id_horario_seq'::regclass);


--
-- Name: listas id_lista; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.listas ALTER COLUMN id_lista SET DEFAULT nextval('public.listas_id_lista_seq'::regclass);


--
-- Name: produtos id_produto; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produtos ALTER COLUMN id_produto SET DEFAULT nextval('public.produtos_id_produto_seq'::regclass);


--
-- Name: promocoes id_promocao; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promocoes ALTER COLUMN id_promocao SET DEFAULT nextval('public.promocoes_id_promocao_seq'::regclass);


--
-- Name: salvos id_salvo; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salvos ALTER COLUMN id_salvo SET DEFAULT nextval('public.salvos_id_salvo_seq'::regclass);


--
-- Name: solicitacoes_empresa id_solicitacao; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitacoes_empresa ALTER COLUMN id_solicitacao SET DEFAULT nextval('public.solicitacoes_empresa_id_solicitacao_seq'::regclass);


--
-- Name: usuarios id_usuario; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id_usuario SET DEFAULT nextval('public.usuarios_id_usuario_seq'::regclass);


--
-- Name: avaliacoes avaliacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avaliacoes
    ADD CONSTRAINT avaliacoes_pkey PRIMARY KEY (id_avaliacao);


--
-- Name: avaliacoes avaliacoes_usuario_id_empresa_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avaliacoes
    ADD CONSTRAINT avaliacoes_usuario_id_empresa_id_key UNIQUE (usuario_id, empresa_id);


--
-- Name: categorias categorias_nome_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_nome_key UNIQUE (nome);


--
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id_categoria);


--
-- Name: codigos_verificacao codigos_verificacao_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.codigos_verificacao
    ADD CONSTRAINT codigos_verificacao_pkey PRIMARY KEY (id_codigo);


--
-- Name: codigos_verificacao_senha codigos_verificacao_senha_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.codigos_verificacao_senha
    ADD CONSTRAINT codigos_verificacao_senha_pkey PRIMARY KEY (id_codigo);


--
-- Name: empresa_categoria empresa_categoria_empresa_id_categoria_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresa_categoria
    ADD CONSTRAINT empresa_categoria_empresa_id_categoria_id_key UNIQUE (empresa_id, categoria_id);


--
-- Name: empresa_categoria empresa_categoria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresa_categoria
    ADD CONSTRAINT empresa_categoria_pkey PRIMARY KEY (id_empresa_categoria);


--
-- Name: empresas empresas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id_empresa);


--
-- Name: enderecos enderecos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enderecos
    ADD CONSTRAINT enderecos_pkey PRIMARY KEY (id_endereco);


--
-- Name: fotos_empresa fotos_empresa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fotos_empresa
    ADD CONSTRAINT fotos_empresa_pkey PRIMARY KEY (id_foto);


--
-- Name: historico historico_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historico
    ADD CONSTRAINT historico_pkey PRIMARY KEY (id_historico);


--
-- Name: horarios horarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.horarios
    ADD CONSTRAINT horarios_pkey PRIMARY KEY (id_horario);


--
-- Name: listas listas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.listas
    ADD CONSTRAINT listas_pkey PRIMARY KEY (id_lista);


--
-- Name: produtos produtos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produtos
    ADD CONSTRAINT produtos_pkey PRIMARY KEY (id_produto);


--
-- Name: promocoes promocoes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promocoes
    ADD CONSTRAINT promocoes_pkey PRIMARY KEY (id_promocao);


--
-- Name: salvos salvos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salvos
    ADD CONSTRAINT salvos_pkey PRIMARY KEY (id_salvo);


--
-- Name: solicitacoes_empresa solicitacoes_empresa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitacoes_empresa
    ADD CONSTRAINT solicitacoes_empresa_pkey PRIMARY KEY (id_solicitacao);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario);


--
-- Name: avaliacoes avaliacoes_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avaliacoes
    ADD CONSTRAINT avaliacoes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id_empresa) ON DELETE CASCADE;


--
-- Name: avaliacoes avaliacoes_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avaliacoes
    ADD CONSTRAINT avaliacoes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;


--
-- Name: codigos_verificacao codigos_verificacao_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.codigos_verificacao
    ADD CONSTRAINT codigos_verificacao_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id_empresa) ON DELETE CASCADE;


--
-- Name: codigos_verificacao_senha codigos_verificacao_senha_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.codigos_verificacao_senha
    ADD CONSTRAINT codigos_verificacao_senha_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;


--
-- Name: empresa_categoria empresa_categoria_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresa_categoria
    ADD CONSTRAINT empresa_categoria_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id_categoria) ON DELETE CASCADE;


--
-- Name: empresa_categoria empresa_categoria_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresa_categoria
    ADD CONSTRAINT empresa_categoria_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id_empresa) ON DELETE CASCADE;


--
-- Name: empresas empresas_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;


--
-- Name: enderecos enderecos_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enderecos
    ADD CONSTRAINT enderecos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id_empresa) ON DELETE CASCADE;


--
-- Name: fotos_empresa fotos_empresa_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fotos_empresa
    ADD CONSTRAINT fotos_empresa_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id_empresa) ON DELETE CASCADE;


--
-- Name: historico historico_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historico
    ADD CONSTRAINT historico_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;


--
-- Name: horarios horarios_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.horarios
    ADD CONSTRAINT horarios_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id_empresa) ON DELETE CASCADE;


--
-- Name: listas listas_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.listas
    ADD CONSTRAINT listas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;


--
-- Name: produtos produtos_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produtos
    ADD CONSTRAINT produtos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id_categoria);


--
-- Name: produtos produtos_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produtos
    ADD CONSTRAINT produtos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id_empresa) ON DELETE CASCADE;


--
-- Name: promocoes promocoes_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promocoes
    ADD CONSTRAINT promocoes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id_empresa) ON DELETE CASCADE;


--
-- Name: promocoes promocoes_produto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promocoes
    ADD CONSTRAINT promocoes_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos(id_produto) ON DELETE CASCADE;


--
-- Name: salvos salvos_lista_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salvos
    ADD CONSTRAINT salvos_lista_id_fkey FOREIGN KEY (lista_id) REFERENCES public.listas(id_lista) ON DELETE CASCADE;


--
-- Name: salvos salvos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salvos
    ADD CONSTRAINT salvos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;


--
-- Name: solicitacoes_empresa solicitacoes_empresa_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitacoes_empresa
    ADD CONSTRAINT solicitacoes_empresa_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id_empresa) ON DELETE CASCADE;


--
-- Name: solicitacoes_empresa solicitacoes_empresa_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitacoes_empresa
    ADD CONSTRAINT solicitacoes_empresa_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 0vxEQciVLUtiQhmoVMQhETxNVIYlvc0Ti001FeRXyptzJ000DJgtkm9adsAuzNI


--
-- Foto do produto (M7)
--

ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS foto_url character varying(500);

--
-- Item repetido na mesma lista (M8)
--

ALTER TABLE ONLY public.salvos
    ADD CONSTRAINT salvos_lista_item_key UNIQUE (lista_id, tipo_item, item_id);

--
-- Histórico com o tipo do item e o termo buscado (M9)
--

ALTER TABLE public.historico
  ADD COLUMN tipo_item character varying(20),
  ADD COLUMN termo character varying(100),
  ADD CONSTRAINT historico_tipo_item_check CHECK (tipo_item IS NULL OR tipo_item IN ('empresa', 'produto', 'promocao')),
  ADD CONSTRAINT historico_conteudo_check CHECK (
    (tipo_acao = 'busca' AND termo IS NOT NULL) OR
    (tipo_acao = 'visualizacao' AND tipo_item IS NOT NULL AND item_id IS NOT NULL));
CREATE INDEX IF NOT EXISTS historico_usuario_data_idx ON public.historico (usuario_id, criado_em DESC);

--
-- Fotos das avaliações (M10)
--

CREATE TABLE IF NOT EXISTS public.fotos_avaliacao (
    id_foto serial PRIMARY KEY,
    avaliacao_id integer NOT NULL REFERENCES public.avaliacoes(id_avaliacao) ON DELETE CASCADE,
    url character varying(500) NOT NULL,
    ordem smallint DEFAULT 0 NOT NULL,
    criado_em timestamp without time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS fotos_avaliacao_avaliacao_idx ON public.fotos_avaliacao (avaliacao_id);

--
-- Denúncias de avaliações (M10)
--

CREATE TABLE IF NOT EXISTS public.denuncias_avaliacao (
    id_denuncia serial PRIMARY KEY,
    avaliacao_id integer NOT NULL REFERENCES public.avaliacoes(id_avaliacao) ON DELETE CASCADE,
    denunciante_id integer NOT NULL REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
    motivo character varying(20) NOT NULL CHECK (motivo IN ('ofensiva', 'falsa', 'spam', 'outro')),
    mensagem text,
    status character varying(20) DEFAULT 'pendente' NOT NULL CHECK (status IN ('pendente', 'recusada')),
    criado_em timestamp without time zone DEFAULT now() NOT NULL,
    UNIQUE (avaliacao_id, denunciante_id)
);

--
-- Ofertas também podem ser salvas
--

ALTER TABLE public.salvos DROP CONSTRAINT IF EXISTS salvos_tipo_item_check;
ALTER TABLE public.salvos
  ADD CONSTRAINT salvos_tipo_item_check CHECK (tipo_item IN ('empresa', 'produto', 'promocao'));

--
-- Tentativas de código de troca de senha
--

ALTER TABLE public.codigos_verificacao_senha ADD COLUMN IF NOT EXISTS tentativas smallint DEFAULT 0 NOT NULL;

--
-- Data da última troca de senha e logins válidos a partir de quando
--

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS senha_atualizada_em timestamp without time zone,
  ADD COLUMN IF NOT EXISTS sessoes_validas_desde timestamp without time zone;
