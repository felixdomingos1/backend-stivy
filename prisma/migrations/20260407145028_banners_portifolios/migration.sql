-- AlterTable
ALTER TABLE `EVENTO` ADD COLUMN `banner_public_id` VARCHAR(255) NULL,
    ADD COLUMN `banner_url` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `FAZEDOR` ADD COLUMN `capa_public_id` VARCHAR(255) NULL,
    ADD COLUMN `capa_url` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `USUARIO` ADD COLUMN `anner_url` VARCHAR(255) NULL,
    ADD COLUMN `banner_public_id` VARCHAR(255) NULL;

-- CreateTable
CREATE TABLE `PORTFOLIO` (
    `id_portfolio` CHAR(36) NOT NULL,
    `id_fazedor` CHAR(36) NOT NULL,
    `titulo` VARCHAR(100) NULL,
    `descricao` TEXT NULL,
    `imagem_url` VARCHAR(255) NOT NULL,
    `imagem_public_id` VARCHAR(255) NOT NULL,
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id_portfolio`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SERVICO_IMAGEM` (
    `id_servico_imagem` CHAR(36) NOT NULL,
    `id_servico` CHAR(36) NOT NULL,
    `imagem_url` VARCHAR(255) NOT NULL,
    `imagem_public_id` VARCHAR(255) NOT NULL,
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `is_principal` BOOLEAN NOT NULL DEFAULT false,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id_servico_imagem`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EVENTO_IMAGEM` (
    `id_evento_imagem` CHAR(36) NOT NULL,
    `id_evento` CHAR(36) NOT NULL,
    `imagem_url` VARCHAR(255) NOT NULL,
    `imagem_public_id` VARCHAR(255) NOT NULL,
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `legenda` VARCHAR(255) NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id_evento_imagem`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `STORY` (
    `id_story` CHAR(36) NOT NULL,
    `id_usuario` CHAR(36) NOT NULL,
    `midia_url` VARCHAR(255) NOT NULL,
    `midia_public_id` VARCHAR(255) NOT NULL,
    `tipo` ENUM('imagem', 'video') NOT NULL DEFAULT 'imagem',
    `duracao` INTEGER NOT NULL DEFAULT 5,
    `texto` VARCHAR(255) NULL,
    `cor_fundo` VARCHAR(7) NULL,
    `expira_em` DATETIME(3) NOT NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `STORY_expira_em_idx`(`expira_em`),
    PRIMARY KEY (`id_story`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `STORY_VISUALIZACAO` (
    `id_visualizacao` CHAR(36) NOT NULL,
    `id_story` CHAR(36) NOT NULL,
    `id_usuario` CHAR(36) NOT NULL,
    `data_visualizacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `STORY_VISUALIZACAO_id_story_id_usuario_key`(`id_story`, `id_usuario`),
    PRIMARY KEY (`id_visualizacao`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `STORY_CURTIDA` (
    `id_curtida` CHAR(36) NOT NULL,
    `id_story` CHAR(36) NOT NULL,
    `id_usuario` CHAR(36) NOT NULL,
    `data_curtida` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `STORY_CURTIDA_id_story_id_usuario_key`(`id_story`, `id_usuario`),
    PRIMARY KEY (`id_curtida`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PORTFOLIO` ADD CONSTRAINT `PORTFOLIO_id_fazedor_fkey` FOREIGN KEY (`id_fazedor`) REFERENCES `FAZEDOR`(`id_fazedor`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SERVICO_IMAGEM` ADD CONSTRAINT `SERVICO_IMAGEM_id_servico_fkey` FOREIGN KEY (`id_servico`) REFERENCES `SERVICO`(`id_servico`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EVENTO_IMAGEM` ADD CONSTRAINT `EVENTO_IMAGEM_id_evento_fkey` FOREIGN KEY (`id_evento`) REFERENCES `EVENTO`(`id_evento`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `STORY` ADD CONSTRAINT `STORY_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `STORY_VISUALIZACAO` ADD CONSTRAINT `STORY_VISUALIZACAO_id_story_fkey` FOREIGN KEY (`id_story`) REFERENCES `STORY`(`id_story`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `STORY_VISUALIZACAO` ADD CONSTRAINT `STORY_VISUALIZACAO_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `STORY_CURTIDA` ADD CONSTRAINT `STORY_CURTIDA_id_story_fkey` FOREIGN KEY (`id_story`) REFERENCES `STORY`(`id_story`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `STORY_CURTIDA` ADD CONSTRAINT `STORY_CURTIDA_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;
