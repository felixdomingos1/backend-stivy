-- As tabelas do chat foram criadas com `db push` e nunca tiveram migração.
-- IF NOT EXISTS: em bases que já as têm, esta migração não faz nada.

-- CreateTable
CREATE TABLE IF NOT EXISTS `CONVERSA` (
    `id_conversa` CHAR(36) NOT NULL,
    `tipo` ENUM('direct', 'grupo') NOT NULL DEFAULT 'direct',
    `titulo` VARCHAR(100) NULL,
    `criada_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizada_em` DATETIME(3) NOT NULL,

    INDEX `CONVERSA_atualizada_em_idx`(`atualizada_em`),
    PRIMARY KEY (`id_conversa`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `CONVERSA_PARTICIPANTE` (
    `id_participante` CHAR(36) NOT NULL,
    `id_conversa` CHAR(36) NOT NULL,
    `id_usuario` CHAR(36) NOT NULL,
    `ultima_leitura` DATETIME(3) NULL,
    `joined_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CONVERSA_PARTICIPANTE_id_usuario_idx`(`id_usuario`),
    UNIQUE INDEX `CONVERSA_PARTICIPANTE_id_conversa_id_usuario_key`(`id_conversa`, `id_usuario`),
    PRIMARY KEY (`id_participante`),
    CONSTRAINT `CONVERSA_PARTICIPANTE_id_conversa_fkey` FOREIGN KEY (`id_conversa`) REFERENCES `CONVERSA`(`id_conversa`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `CONVERSA_PARTICIPANTE_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `MENSAGEM` (
    `id_mensagem` CHAR(36) NOT NULL,
    `id_conversa` CHAR(36) NOT NULL,
    `id_remetente` CHAR(36) NOT NULL,
    `conteudo` TEXT NOT NULL,
    `tipo` VARCHAR(20) NOT NULL DEFAULT 'texto',
    `lida` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `MENSAGEM_id_conversa_created_at_idx`(`id_conversa`, `created_at`),
    INDEX `MENSAGEM_id_remetente_idx`(`id_remetente`),
    PRIMARY KEY (`id_mensagem`),
    CONSTRAINT `MENSAGEM_id_conversa_fkey` FOREIGN KEY (`id_conversa`) REFERENCES `CONVERSA`(`id_conversa`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `MENSAGEM_id_remetente_fkey` FOREIGN KEY (`id_remetente`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
