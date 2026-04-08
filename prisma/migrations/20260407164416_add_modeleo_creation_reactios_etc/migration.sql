-- AlterTable
ALTER TABLE `MODELO` ADD COLUMN `foto_public_id` VARCHAR(255) NULL,
    ADD COLUMN `habilidades` TEXT NULL,
    ADD COLUMN `idade` INTEGER NULL,
    ADD COLUMN `nacionalidade` VARCHAR(50) NULL,
    ADD COLUMN `redes_sociais` JSON NULL;

-- CreateTable
CREATE TABLE `SERVICO_COMENTARIO` (
    `id_comentario` CHAR(36) NOT NULL,
    `id_servico` CHAR(36) NOT NULL,
    `id_usuario` CHAR(36) NOT NULL,
    `comentario` TEXT NOT NULL,
    `parent_id` CHAR(36) NULL,
    `curtidas` INTEGER NOT NULL DEFAULT 0,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_edicao` DATETIME(3) NULL,
    `editado` BOOLEAN NOT NULL DEFAULT false,

    INDEX `SERVICO_COMENTARIO_id_servico_idx`(`id_servico`),
    INDEX `SERVICO_COMENTARIO_data_criacao_idx`(`data_criacao`),
    PRIMARY KEY (`id_comentario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SERVICO_COMENTARIO_REACAO` (
    `id_reacao` CHAR(36) NOT NULL,
    `id_comentario` CHAR(36) NOT NULL,
    `id_usuario` CHAR(36) NOT NULL,
    `tipo` ENUM('like', 'love', 'wow', 'sad', 'angry') NOT NULL,
    `data_reacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SERVICO_COMENTARIO_REACAO_id_comentario_id_usuario_key`(`id_comentario`, `id_usuario`),
    PRIMARY KEY (`id_reacao`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SERVICO_REACAO` (
    `id_reacao` CHAR(36) NOT NULL,
    `id_servico` CHAR(36) NOT NULL,
    `id_usuario` CHAR(36) NOT NULL,
    `tipo` ENUM('like', 'love', 'wow', 'sad', 'angry') NOT NULL,
    `data_reacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SERVICO_REACAO_id_servico_id_usuario_key`(`id_servico`, `id_usuario`),
    PRIMARY KEY (`id_reacao`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SERVICO_COMPARTILHAMENTO` (
    `id_compartilhamento` CHAR(36) NOT NULL,
    `id_servico` CHAR(36) NOT NULL,
    `id_usuario` CHAR(36) NOT NULL,
    `plataforma` VARCHAR(50) NULL,
    `link_compartilhado` VARCHAR(500) NULL,
    `data_compartilhamento` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SERVICO_COMPARTILHAMENTO_id_servico_idx`(`id_servico`),
    PRIMARY KEY (`id_compartilhamento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MODELO_PORTFOLIO` (
    `id_modelo_portfolio` CHAR(36) NOT NULL,
    `id_modelo` CHAR(36) NOT NULL,
    `titulo` VARCHAR(100) NULL,
    `descricao` TEXT NULL,
    `imagem_url` VARCHAR(255) NOT NULL,
    `imagem_public_id` VARCHAR(255) NOT NULL,
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `categoria` VARCHAR(50) NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id_modelo_portfolio`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SERVICO_COMENTARIO` ADD CONSTRAINT `SERVICO_COMENTARIO_id_servico_fkey` FOREIGN KEY (`id_servico`) REFERENCES `SERVICO`(`id_servico`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SERVICO_COMENTARIO` ADD CONSTRAINT `SERVICO_COMENTARIO_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SERVICO_COMENTARIO` ADD CONSTRAINT `SERVICO_COMENTARIO_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `SERVICO_COMENTARIO`(`id_comentario`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SERVICO_COMENTARIO_REACAO` ADD CONSTRAINT `SERVICO_COMENTARIO_REACAO_id_comentario_fkey` FOREIGN KEY (`id_comentario`) REFERENCES `SERVICO_COMENTARIO`(`id_comentario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SERVICO_COMENTARIO_REACAO` ADD CONSTRAINT `SERVICO_COMENTARIO_REACAO_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SERVICO_REACAO` ADD CONSTRAINT `SERVICO_REACAO_id_servico_fkey` FOREIGN KEY (`id_servico`) REFERENCES `SERVICO`(`id_servico`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SERVICO_REACAO` ADD CONSTRAINT `SERVICO_REACAO_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SERVICO_COMPARTILHAMENTO` ADD CONSTRAINT `SERVICO_COMPARTILHAMENTO_id_servico_fkey` FOREIGN KEY (`id_servico`) REFERENCES `SERVICO`(`id_servico`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SERVICO_COMPARTILHAMENTO` ADD CONSTRAINT `SERVICO_COMPARTILHAMENTO_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MODELO_PORTFOLIO` ADD CONSTRAINT `MODELO_PORTFOLIO_id_modelo_fkey` FOREIGN KEY (`id_modelo`) REFERENCES `MODELO`(`id_modelo`) ON DELETE CASCADE ON UPDATE CASCADE;
