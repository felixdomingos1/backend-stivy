-- Tabelas/índices que existiam no schema (via db push) mas nunca tiveram migração.
-- CreateTable
CREATE TABLE `REFRESH_TOKEN` (
    `id` CHAR(36) NOT NULL,
    `id_usuario` CHAR(36) NOT NULL,
    `token` VARCHAR(500) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revoked` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `REFRESH_TOKEN_token_key`(`token`),
    INDEX `REFRESH_TOKEN_id_usuario_idx`(`id_usuario`),
    INDEX `REFRESH_TOKEN_token_idx`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SEGUIDOR` (
    `id_seguidor` CHAR(36) NOT NULL,
    `id_seguidor_usuario` CHAR(36) NOT NULL,
    `id_seguido` CHAR(36) NOT NULL,
    `data_inicio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SEGUIDOR_id_seguido_idx`(`id_seguido`),
    INDEX `SEGUIDOR_id_seguidor_usuario_idx`(`id_seguidor_usuario`),
    UNIQUE INDEX `SEGUIDOR_id_seguidor_usuario_id_seguido_key`(`id_seguidor_usuario`, `id_seguido`),
    PRIMARY KEY (`id_seguidor`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DEVICE_TOKEN` (
    `id` CHAR(36) NOT NULL,
    `id_usuario` CHAR(36) NOT NULL,
    `token` VARCHAR(500) NOT NULL,
    `plataforma` VARCHAR(20) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    INDEX `DEVICE_TOKEN_id_usuario_idx`(`id_usuario`),
    UNIQUE INDEX `DEVICE_TOKEN_id_usuario_token_key`(`id_usuario`, `token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `EVENTO_data_inicio_idx` ON `EVENTO`(`data_inicio`);

-- CreateIndex
CREATE INDEX `EVENTO_tipo_evento_idx` ON `EVENTO`(`tipo_evento`);

-- CreateIndex
CREATE INDEX `EVENTO_status_idx` ON `EVENTO`(`status`);

-- CreateIndex
CREATE INDEX `FAZEDOR_tipo_fazedor_idx` ON `FAZEDOR`(`tipo_fazedor`);

-- CreateIndex
CREATE INDEX `FAZEDOR_status_aprovacao_idx` ON `FAZEDOR`(`status_aprovacao`);

-- CreateIndex
CREATE INDEX `FAZEDOR_avaliacao_media_idx` ON `FAZEDOR`(`avaliacao_media`);

-- CreateIndex
CREATE INDEX `NOTIFICACAO_id_usuario_lida_idx` ON `NOTIFICACAO`(`id_usuario`, `lida`);

-- CreateIndex
CREATE INDEX `NOTIFICACAO_data_envio_idx` ON `NOTIFICACAO`(`data_envio`);

-- CreateIndex
CREATE INDEX `PORTFOLIO_id_fazedor_ordem_idx` ON `PORTFOLIO`(`id_fazedor`, `ordem`);

-- CreateIndex
CREATE INDEX `REQUISICAO_status_idx` ON `REQUISICAO`(`status`);

-- CreateIndex
CREATE INDEX `SERVICO_categoria_idx` ON `SERVICO`(`categoria`);

-- CreateIndex
CREATE INDEX `SERVICO_status_idx` ON `SERVICO`(`status`);

-- CreateIndex
CREATE INDEX `SERVICO_data_criacao_idx` ON `SERVICO`(`data_criacao`);

-- CreateIndex
CREATE INDEX `USUARIO_email_idx` ON `USUARIO`(`email`);

-- CreateIndex
CREATE INDEX `USUARIO_tipo_idx` ON `USUARIO`(`tipo`);

-- AddForeignKey
ALTER TABLE `REFRESH_TOKEN` ADD CONSTRAINT `REFRESH_TOKEN_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SEGUIDOR` ADD CONSTRAINT `SEGUIDOR_id_seguidor_usuario_fkey` FOREIGN KEY (`id_seguidor_usuario`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SEGUIDOR` ADD CONSTRAINT `SEGUIDOR_id_seguido_fkey` FOREIGN KEY (`id_seguido`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DEVICE_TOKEN` ADD CONSTRAINT `DEVICE_TOKEN_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `EVENTO` RENAME INDEX `EVENTO_id_organizador_fkey` TO `EVENTO_id_organizador_idx`;

-- RenameIndex
ALTER TABLE `REQUISICAO` RENAME INDEX `REQUISICAO_id_solicitante_fkey` TO `REQUISICAO_id_solicitante_idx`;

-- RenameIndex
ALTER TABLE `SERVICO` RENAME INDEX `SERVICO_id_fazedor_fkey` TO `SERVICO_id_fazedor_idx`;

