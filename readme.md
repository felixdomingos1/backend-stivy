# STIVY - Plataforma de Gestão de Processos da Moda em Luanda

## Sobre o Projeto

STIVY é uma aplicação mobile desenvolvida para facilitar a gestão e divulgação de processos da moda em Luanda, Angola. A plataforma conecta profissionais da moda (agências, modelos, estilistas, maquiadores, fotógrafos) com apreciadores e contratantes, centralizando informações sobre serviços, eventos e oportunidades no setor da moda angolana.

### Problema Solucionado

- Falta de informação centralizada sobre profissionais da moda em Luanda
- Dificuldade na divulgação de eventos e serviços
- Processos manuais e descentralizados para casting e contratação
- Ausência de plataforma nacional dedicada ao setor da moda

### Público-Alvo

- **Fazedores de Moda**: Agências, modelos, estilistas, maquiadores, fotógrafos
- **Apreciadores**: Pessoas interessadas em contratar serviços ou participar de eventos

## Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **TypeScript** - Tipagem estática
- **Express** - Framework web
- **Prisma** - ORM para banco de dados
- **MySQL** - Banco de dados relacional
- **Redis** - Cache e rate limiting
- **JWT** - Autenticação

### Ferramentas de Desenvolvimento
- **ts-node-dev** - Desenvolvimento com hot reload
- **tsx** - Execução de TypeScript

## Requisitos do Sistema

- Node.js 18 ou superior
- MySQL 8.0 ou superior
- Redis 7.0 ou superior
- Yarn ou NPM

## Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/stivy-backend.git
cd stivy-backend
```

### 2. Instale as dependências

```bash
yarn install
# ou
npm install
```

### 3. Configure o banco de dados MySQL

```bash
# Iniciar MySQL
sudo systemctl start mysql

# Acessar MySQL
sudo mysql -u root -p

# Criar banco de dados
CREATE DATABASE stivy_fashion;
CREATE DATABASE stivy_fashion_test;
EXIT;
```

### 4. Configure o Redis

```bash
# Iniciar Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verificar status
sudo systemctl status redis-server
redis-cli ping
```

### 5. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Servidor
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="mysql://root:SUA_SENHA@localhost:3306/stivy_fashion"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=stivy_secret_key_change_in_production
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3001

# Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

### 6. Execute as migrações do Prisma

```bash
# Gerar cliente Prisma
yarn prisma:generate

# Executar migrações
yarn prisma:migrate

# Popular banco com dados iniciais (opcional)
yarn prisma:seed
```

### 7. Inicie o servidor

```bash
# Desenvolvimento
yarn dev

# Produção
yarn build
yarn start
```

## Estrutura do Projeto

```
stivy-backend/
├── prisma/
│   ├── schema.prisma      # Modelos do banco de dados
│   └── seed.ts            # Dados iniciais
├── src/
│   ├── config/            # Configurações
│   │   ├── database.ts    # Conexão MySQL
│   │   └── redis.ts       # Conexão Redis
│   ├── controllers/       # Controladores
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── fashion.controller.ts
│   │   ├── event.controller.ts
│   │   ├── request.controller.ts
│   │   └── notification.controller.ts
│   ├── middleware/        # Middlewares
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── rateLimit.middleware.ts
│   ├── routes/            # Rotas
│   │   └── index.ts
│   ├── types/             # Tipos TypeScript
│   │   └── index.ts
│   ├── utils/             # Utilitários
│   │   ├── logger.ts
│   │   ├── jwt.ts
│   │   └── bcrypt.ts
│   └── server.ts          # Ponto de entrada
├── uploads/               # Arquivos enviados
├── .env                   # Variáveis de ambiente
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints

### Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/registrar` | Registrar novo usuário |
| POST | `/api/auth/login` | Fazer login |
| GET | `/api/auth/me` | Dados do usuário logado |
| POST | `/api/auth/recuperar-senha` | Solicitar recuperação de senha |
| POST | `/api/auth/redefinir-senha` | Redefinir senha |

### Usuários

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/users/perfil` | Visualizar perfil |
| PUT | `/api/users/perfil` | Atualizar perfil |
| PUT | `/api/users/foto-perfil` | Atualizar foto de perfil |
| GET | `/api/users/favoritos` | Listar favoritos |
| POST | `/api/users/favoritos/:id` | Adicionar favorito |
| DELETE | `/api/users/favoritos/:id` | Remover favorito |

### Moda (Serviços, Modelos, Fazedores)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/fashion/servicos` | Listar serviços |
| GET | `/api/fashion/servicos/:id` | Buscar serviço |
| POST | `/api/fashion/servicos` | Criar serviço |
| PUT | `/api/fashion/servicos/:id` | Atualizar serviço |
| DELETE | `/api/fashion/servicos/:id` | Remover serviço |
| GET | `/api/fashion/modelos` | Listar modelos |
| GET | `/api/fashion/modelos/:id` | Buscar modelo |
| POST | `/api/fashion/modelos` | Cadastrar modelo |
| PUT | `/api/fashion/modelos/:id` | Atualizar modelo |
| DELETE | `/api/fashion/modelos/:id` | Remover modelo |
| GET | `/api/fashion/fazedores` | Listar profissionais |
| GET | `/api/fashion/fazedores/:id` | Buscar profissional |
| POST | `/api/fashion/avaliacoes/:id` | Avaliar profissional |

### Eventos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/events` | Listar eventos |
| GET | `/api/events/proximos` | Listar eventos próximos |
| GET | `/api/events/:id` | Buscar evento |
| POST | `/api/events` | Criar evento |
| PUT | `/api/events/:id` | Atualizar evento |
| DELETE | `/api/events/:id` | Cancelar evento |
| POST | `/api/events/:id/participar` | Participar do evento |
| DELETE | `/api/events/:id/participar` | Cancelar participação |

### Requisições

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/requests` | Minhas requisições |
| GET | `/api/requests/recebidas` | Requisições recebidas |
| POST | `/api/requests/servico/:id` | Requisitar serviço |
| POST | `/api/requests/modelo/:id` | Requisitar modelo |
| PUT | `/api/requests/:id/aceitar` | Aceitar requisição |
| PUT | `/api/requests/:id/recusar` | Recusar requisição |
| PUT | `/api/requests/:id/cancelar` | Cancelar requisição |

### Notificações

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/notifications` | Listar notificações |
| PUT | `/api/notifications/:id/lida` | Marcar como lida |
| DELETE | `/api/notifications/:id` | Remover notificação |

## Exemplos de Requisições

### Registrar usuário (apreciador)

```bash
curl -X POST http://localhost:3000/api/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Silva",
    "email": "joao@email.com",
    "senha": "123456",
    "telefone": "923456789",
    "tipo": "apreciador"
  }'
```

### Registrar usuário (fazedor)

```bash
curl -X POST http://localhost:3000/api/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Maria Santos",
    "email": "maria@email.com",
    "senha": "123456",
    "telefone": "923456788",
    "tipo": "fazedor",
    "tipo_fazedor": "estilista"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@email.com",
    "senha": "123456"
  }'
```

### Listar serviços (com filtros)

```bash
curl "http://localhost:3000/api/fashion/servicos?categoria=fotografia&page=1&limit=10"
```

### Criar serviço (requer autenticação)

```bash
curl -X POST http://localhost:3000/api/fashion/servicos \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Sessão de Fotos",
    "descricao": "Sessão de fotos profissionais para portfólio",
    "categoria": "fotografia",
    "valor": 50000,
    "tempo_estimado": "2 horas"
  }'
```

### Listar eventos próximos

```bash
curl "http://localhost:3000/api/events/proximos?tipo=desfile"
```

## Comandos Úteis

### Desenvolvimento

```bash
# Iniciar em modo desenvolvimento
yarn dev

# Build do projeto
yarn build

# Iniciar em produção
yarn start

# Limpar build
yarn clean
```

### Banco de Dados (Prisma)

```bash
# Gerar cliente Prisma
yarn prisma:generate

# Executar migrações
yarn prisma:migrate

# Abrir Prisma Studio (UI do banco)
yarn prisma:studio

# Popular banco com dados iniciais
yarn prisma:seed

# Resetar banco de dados
yarn db:reset
```

### Redis

```bash
# Verificar status do Redis
sudo systemctl status redis-server

# Reiniciar Redis
sudo systemctl restart redis-server

# Ver logs do Redis
sudo tail -f /var/log/redis/redis-server.log

# Conectar ao Redis CLI
redis-cli

# Comandos úteis no Redis CLI
> PING                 # Deve retornar PONG
> KEYS *               # Listar todas as chaves
> FLUSHALL             # Limpar tudo (cuidado!)
> INFO stats           # Ver estatísticas
```

## Monitoramento e Status

### Health Check

```bash
curl http://localhost:3000/health
```

Resposta esperada:
```json
{
  "status": "OK",
  "timestamp": "2026-04-03T17:00:00.000Z",
  "uptime": 120.5,
  "environment": "development",
  "redis": "connected"
}
```

### Status do Redis

```bash
curl http://localhost:3000/redis-status
```

Resposta esperada:
```json
{
  "connected": true,
  "ready": true,
  "ping": "OK",
  "config": {
    "host": "localhost",
    "port": 6379
  },
  "timestamp": "2026-04-03T17:00:00.000Z"
}
```

## Solução de Problemas

### Erro de conexão com MySQL

```bash
# Verificar se MySQL está rodando
sudo systemctl status mysql

# Reiniciar MySQL
sudo systemctl restart mysql

# Verificar credenciais no .env
cat .env | grep DATABASE_URL
```

### Erro de conexão com Redis

```bash
# Verificar se Redis está rodando
sudo systemctl status redis-server

# Reiniciar Redis
sudo systemctl restart redis-server

# Testar conexão
redis-cli ping
```

### Erro de porta em uso

```bash
# Verificar o que está usando a porta 3000
sudo lsof -i :3000

# Matar processo
kill -9 PID_DO_PROCESSO

# Ou mudar porta no .env
PORT=3001
```

### Erro de compilação TypeScript

```bash
# Limpar build anterior
yarn clean

# Reinstalar dependências
rm -rf node_modules
yarn install

# Recompilar
yarn build
```

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `PORT` | Porta do servidor | 3000 |
| `NODE_ENV` | Ambiente (development/production) | development |
| `DATABASE_URL` | URL de conexão MySQL | - |
| `REDIS_HOST` | Host do Redis | localhost |
| `REDIS_PORT` | Porta do Redis | 6379 |
| `JWT_SECRET` | Chave secreta JWT | - |
| `JWT_EXPIRES_IN` | Expiração do token | 7d |
| `CORS_ORIGIN` | Origem permitida CORS | * |
| `MAX_FILE_SIZE` | Tamanho máximo de upload | 5242880 |

## Estrutura do Banco de Dados

### Principais Tabelas

- `USUARIO` - Usuários do sistema
- `FAZEDOR` - Profissionais da moda
- `AGENCIA` - Agências de modelos
- `MODELO` - Modelos agenciados
- `SERVICO` - Serviços oferecidos
- `EVENTO` - Eventos de moda
- `REQUISICAO` - Solicitações de serviço
- `NOTIFICACAO` - Notificações dos usuários
- `AVALIACAO` - Avaliações de profissionais

## Rate Limiting

A API implementa rate limiting para prevenir abusos:

| Tipo | Limite | Janela |
|------|--------|--------|
| Geral | 200 requisições | 1 minuto |
| Autenticação | 5 tentativas | 5 minutos |
| Buscas | 30 requisições | 1 minuto |
| Strict (operações sensíveis) | 10 requisições | 1 minuto |

## Segurança

- Senhas hash com bcrypt
- Autenticação JWT
- Rate limiting por IP e usuário
- Headers de segurança com Helmet
- CORS configurável
- Validação de dados com express-validator

## Licença

Este projeto é de uso acadêmico e está sob a licença MIT.

## Contato

**Autora:** Stélvia Rossana da Silva Firmino
**Curso:** Engenharia Informática
**Instituição:** Instituto Superior Politécnico de Tecnologias e Ciências (ISPTEC)
**Ano:** 2022
**Orientador:** Prof. Metódio Armando

---

## Agradecimentos

- Instituto Superior Politécnico de Tecnologias e Ciências (ISPTEC)
- Agência Hadja Models
- Agência Tussole Models
- Todos os profissionais da moda que contribuíram com suas experiências
