-- CreateTable
CREATE TABLE `STORY_COMENTARIO` (
    `id_comentario` CHAR(36) NOT NULL,
    `id_story` CHAR(36) NOT NULL,
    `id_usuario` CHAR(36) NOT NULL,
    `comentario` VARCHAR(500) NOT NULL,
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `STORY_COMENTARIO_id_story_data_criacao_idx`(`id_story`, `data_criacao`),
    PRIMARY KEY (`id_comentario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `STORY_COMENTARIO` ADD CONSTRAINT `STORY_COMENTARIO_id_story_fkey` FOREIGN KEY (`id_story`) REFERENCES `STORY`(`id_story`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `STORY_COMENTARIO` ADD CONSTRAINT `STORY_COMENTARIO_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;
