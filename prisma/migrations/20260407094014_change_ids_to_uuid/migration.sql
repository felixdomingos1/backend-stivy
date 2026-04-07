-- CreateTable
CREATE TABLE `USUARIO` (
    `id_usuario` CHAR(36) NOT NULL,
    `nome` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `senha_hash` VARCHAR(255) NOT NULL,
    `telefone` VARCHAR(20) NULL,
    `tipo` ENUM('fazedor', 'apreciador') NOT NULL,
    `foto_perfil` VARCHAR(255) NULL,
    `data_cadastro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('ativo', 'inativo', 'bloqueado') NOT NULL DEFAULT 'ativo',
    `ultimo_acesso` DATETIME(3) NULL,
    `reset_token` VARCHAR(255) NULL,
    `reset_token_expira` DATETIME(3) NULL,
    `email_verificado` BOOLEAN NOT NULL DEFAULT false,
    `email_verification_code` VARCHAR(10) NULL,
    `email_verification_expira` DATETIME(3) NULL,
    `verification_attempts` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `USUARIO_email_key`(`email`),
    PRIMARY KEY (`id_usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FAZEDOR` (
    `id_fazedor` CHAR(36) NOT NULL,
    `id_usuario` CHAR(36) NOT NULL,
    `tipo_fazedor` ENUM('agencia', 'estilista', 'maquiador', 'fotografo', 'modelo_freelancer') NOT NULL,
    `biografia` TEXT NULL,
    `endereco` VARCHAR(255) NULL,
    `website` VARCHAR(100) NULL,
    `instagram` VARCHAR(100) NULL,
    `facebook` VARCHAR(100) NULL,
    `status_aprovacao` ENUM('pendente', 'aprovado', 'rejeitado') NOT NULL DEFAULT 'pendente',
    `data_aprovacao` DATETIME(3) NULL,
    `avaliacao_media` DECIMAL(3, 2) NULL,
    `total_avaliacoes` INTEGER NULL DEFAULT 0,

    UNIQUE INDEX `FAZEDOR_id_usuario_key`(`id_usuario`),
    PRIMARY KEY (`id_fazedor`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AGENCIA` (
    `id_agencia` CHAR(36) NOT NULL,
    `id_fazedor` CHAR(36) NOT NULL,
    `nome_agencia` VARCHAR(100) NOT NULL,
    `logo_url` VARCHAR(255) NULL,
    `telefone_contato` VARCHAR(20) NULL,
    `email_contato` VARCHAR(100) NULL,
    `endereco` VARCHAR(255) NULL,
    `descricao` TEXT NULL,
    `data_fundacao` DATETIME(3) NULL,

    UNIQUE INDEX `AGENCIA_id_fazedor_key`(`id_fazedor`),
    PRIMARY KEY (`id_agencia`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MODELO` (
    `id_modelo` CHAR(36) NOT NULL,
    `id_agencia` CHAR(36) NOT NULL,
    `nome_completo` VARCHAR(100) NOT NULL,
    `nome_artistico` VARCHAR(100) NULL,
    `genero` ENUM('feminino', 'masculino', 'outro') NOT NULL DEFAULT 'feminino',
    `altura` DECIMAL(3, 2) NULL,
    `peso` DECIMAL(5, 2) NULL,
    `busto` INTEGER NULL,
    `cintura` INTEGER NULL,
    `quadril` INTEGER NULL,
    `sapato` INTEGER NULL,
    `roupa` INTEGER NULL,
    `cabelo` VARCHAR(50) NULL,
    `olhos` VARCHAR(50) NULL,
    `foto_url` VARCHAR(255) NULL,
    `book_url` VARCHAR(255) NULL,
    `status` ENUM('ativo', 'inativo', 'em_negociacao') NOT NULL DEFAULT 'ativo',
    `experiencia` TEXT NULL,
    `data_cadastro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id_modelo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MODELO_FREELANCER` (
    `id_modelo_freelancer` CHAR(36) NOT NULL,
    `id_fazedor` CHAR(36) NOT NULL,
    `nome_artistico` VARCHAR(100) NOT NULL,
    `altura` DECIMAL(3, 2) NULL,
    `busto` INTEGER NULL,
    `cintura` INTEGER NULL,
    `quadril` INTEGER NULL,
    `foto_url` VARCHAR(255) NULL,
    `portifolio_url` VARCHAR(255) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'disponivel',
    `cache_medio` DECIMAL(10, 2) NULL,

    UNIQUE INDEX `MODELO_FREELANCER_id_fazedor_key`(`id_fazedor`),
    PRIMARY KEY (`id_modelo_freelancer`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ESTILISTA` (
    `id_estilista` CHAR(36) NOT NULL,
    `id_fazedor` CHAR(36) NOT NULL,
    `nome_marca` VARCHAR(100) NULL,
    `especialidade` VARCHAR(100) NULL,
    `logo_url` VARCHAR(255) NULL,
    `portifolio_url` VARCHAR(255) NULL,
    `instagram` VARCHAR(100) NULL,

    UNIQUE INDEX `ESTILISTA_id_fazedor_key`(`id_fazedor`),
    PRIMARY KEY (`id_estilista`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MAQUIADOR` (
    `id_maquiador` CHAR(36) NOT NULL,
    `id_fazedor` CHAR(36) NOT NULL,
    `especialidade` VARCHAR(100) NULL,
    `portifolio_url` VARCHAR(255) NULL,
    `certificacoes` TEXT NULL,
    `marcas_preferidas` TEXT NULL,

    UNIQUE INDEX `MAQUIADOR_id_fazedor_key`(`id_fazedor`),
    PRIMARY KEY (`id_maquiador`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FOTOGRAFO` (
    `id_fotografo` CHAR(36) NOT NULL,
    `id_fazedor` CHAR(36) NOT NULL,
    `especialidade` VARCHAR(100) NULL,
    `camera_equipamento` VARCHAR(255) NULL,
    `portifolio_url` VARCHAR(255) NULL,
    `estilos` TEXT NULL,

    UNIQUE INDEX `FOTOGRAFO_id_fazedor_key`(`id_fazedor`),
    PRIMARY KEY (`id_fotografo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SERVICO` (
    `id_servico` CHAR(36) NOT NULL,
    `id_fazedor` CHAR(36) NOT NULL,
    `titulo` VARCHAR(100) NOT NULL,
    `descricao` TEXT NULL,
    `categoria` VARCHAR(50) NULL,
    `valor` DECIMAL(10, 2) NULL,
    `imagem_url` VARCHAR(255) NULL,
    `status` ENUM('ativo', 'inativo', 'pausado') NOT NULL DEFAULT 'ativo',
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tempo_estimado` VARCHAR(50) NULL,

    PRIMARY KEY (`id_servico`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EVENTO` (
    `id_evento` CHAR(36) NOT NULL,
    `id_organizador` CHAR(36) NOT NULL,
    `titulo` VARCHAR(150) NOT NULL,
    `descricao` TEXT NULL,
    `local` VARCHAR(255) NULL,
    `latitude` DECIMAL(10, 8) NULL,
    `longitude` DECIMAL(11, 8) NULL,
    `data_inicio` DATETIME(3) NOT NULL,
    `data_fim` DATETIME(3) NOT NULL,
    `tipo_evento` ENUM('desfile', 'workshop', 'casting', 'fashion_week', 'concurso', 'outro') NOT NULL,
    `imagem_url` VARCHAR(255) NULL,
    `status` ENUM('ativo', 'cancelado', 'concluido') NOT NULL DEFAULT 'ativo',
    `vagas_disponiveis` INTEGER NOT NULL DEFAULT 0,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `valor_ingresso` DECIMAL(10, 2) NULL DEFAULT 0,

    PRIMARY KEY (`id_evento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `REQUISICAO` (
    `id_requisicao` CHAR(36) NOT NULL,
    `id_solicitante` CHAR(36) NOT NULL,
    `id_servico` VARCHAR(191) NULL,
    `id_modelo` VARCHAR(191) NULL,
    `data_requisicao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('pendente', 'aceita', 'recusada', 'concluida', 'cancelada') NOT NULL DEFAULT 'pendente',
    `mensagem` TEXT NULL,
    `contato_retorno` VARCHAR(100) NULL,
    `data_resposta` DATETIME(3) NULL,
    `observacoes` TEXT NULL,

    PRIMARY KEY (`id_requisicao`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NOTIFICACAO` (
    `id_notificacao` CHAR(36) NOT NULL,
    `id_usuario` CHAR(36) NOT NULL,
    `titulo` VARCHAR(100) NOT NULL,
    `mensagem` TEXT NOT NULL,
    `tipo` ENUM('requisicao', 'evento', 'sistema', 'mensagem') NOT NULL,
    `lida` BOOLEAN NOT NULL DEFAULT false,
    `data_envio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `link` VARCHAR(255) NULL,

    PRIMARY KEY (`id_notificacao`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FAVORITO` (
    `id_favorito` CHAR(36) NOT NULL,
    `id_usuario` CHAR(36) NOT NULL,
    `id_fazedor` CHAR(36) NOT NULL,
    `data_adicao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `FAVORITO_id_usuario_id_fazedor_key`(`id_usuario`, `id_fazedor`),
    PRIMARY KEY (`id_favorito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AVALIACAO` (
    `id_avaliacao` CHAR(36) NOT NULL,
    `id_avaliador` CHAR(36) NOT NULL,
    `id_avaliado` CHAR(36) NOT NULL,
    `nota` INTEGER NOT NULL,
    `comentario` TEXT NULL,
    `data_avaliacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AVALIACAO_id_avaliador_id_avaliado_key`(`id_avaliador`, `id_avaliado`),
    PRIMARY KEY (`id_avaliacao`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EVENTO_PARTICIPANTE` (
    `id_evento_participante` CHAR(36) NOT NULL,
    `id_evento` CHAR(36) NOT NULL,
    `id_usuario` CHAR(36) NOT NULL,
    `papel` VARCHAR(191) NOT NULL DEFAULT 'participante',
    `data_confirmacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `presente` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `EVENTO_PARTICIPANTE_id_evento_id_usuario_key`(`id_evento`, `id_usuario`),
    PRIMARY KEY (`id_evento_participante`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FAZEDOR` ADD CONSTRAINT `FAZEDOR_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AGENCIA` ADD CONSTRAINT `AGENCIA_id_fazedor_fkey` FOREIGN KEY (`id_fazedor`) REFERENCES `FAZEDOR`(`id_fazedor`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MODELO` ADD CONSTRAINT `MODELO_id_agencia_fkey` FOREIGN KEY (`id_agencia`) REFERENCES `AGENCIA`(`id_agencia`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MODELO_FREELANCER` ADD CONSTRAINT `MODELO_FREELANCER_id_fazedor_fkey` FOREIGN KEY (`id_fazedor`) REFERENCES `FAZEDOR`(`id_fazedor`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ESTILISTA` ADD CONSTRAINT `ESTILISTA_id_fazedor_fkey` FOREIGN KEY (`id_fazedor`) REFERENCES `FAZEDOR`(`id_fazedor`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MAQUIADOR` ADD CONSTRAINT `MAQUIADOR_id_fazedor_fkey` FOREIGN KEY (`id_fazedor`) REFERENCES `FAZEDOR`(`id_fazedor`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FOTOGRAFO` ADD CONSTRAINT `FOTOGRAFO_id_fazedor_fkey` FOREIGN KEY (`id_fazedor`) REFERENCES `FAZEDOR`(`id_fazedor`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SERVICO` ADD CONSTRAINT `SERVICO_id_fazedor_fkey` FOREIGN KEY (`id_fazedor`) REFERENCES `FAZEDOR`(`id_fazedor`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EVENTO` ADD CONSTRAINT `EVENTO_id_organizador_fkey` FOREIGN KEY (`id_organizador`) REFERENCES `FAZEDOR`(`id_fazedor`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `REQUISICAO` ADD CONSTRAINT `REQUISICAO_id_solicitante_fkey` FOREIGN KEY (`id_solicitante`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `REQUISICAO` ADD CONSTRAINT `REQUISICAO_id_servico_fkey` FOREIGN KEY (`id_servico`) REFERENCES `SERVICO`(`id_servico`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `REQUISICAO` ADD CONSTRAINT `REQUISICAO_id_modelo_fkey` FOREIGN KEY (`id_modelo`) REFERENCES `MODELO`(`id_modelo`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NOTIFICACAO` ADD CONSTRAINT `NOTIFICACAO_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FAVORITO` ADD CONSTRAINT `FAVORITO_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FAVORITO` ADD CONSTRAINT `FAVORITO_id_fazedor_fkey` FOREIGN KEY (`id_fazedor`) REFERENCES `FAZEDOR`(`id_fazedor`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AVALIACAO` ADD CONSTRAINT `AVALIACAO_id_avaliador_fkey` FOREIGN KEY (`id_avaliador`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AVALIACAO` ADD CONSTRAINT `AVALIACAO_id_avaliado_fkey` FOREIGN KEY (`id_avaliado`) REFERENCES `FAZEDOR`(`id_fazedor`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EVENTO_PARTICIPANTE` ADD CONSTRAINT `EVENTO_PARTICIPANTE_id_evento_fkey` FOREIGN KEY (`id_evento`) REFERENCES `EVENTO`(`id_evento`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EVENTO_PARTICIPANTE` ADD CONSTRAINT `EVENTO_PARTICIPANTE_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;
