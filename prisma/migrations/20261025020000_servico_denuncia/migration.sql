-- CreateTable
CREATE TABLE `SERVICO_DENUNCIA` (
    `id_denuncia` CHAR(36) NOT NULL,
    `id_servico` CHAR(36) NOT NULL,
    `id_usuario` CHAR(36) NOT NULL,
    `motivo` ENUM('spam', 'improprio', 'falso', 'outro') NOT NULL,
    `descricao` VARCHAR(500) NULL,
    `status` ENUM('pendente', 'resolvida', 'rejeitada') NOT NULL DEFAULT 'pendente',
    `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_revisao` DATETIME(3) NULL,

    INDEX `SERVICO_DENUNCIA_status_idx`(`status`),
    UNIQUE INDEX `SERVICO_DENUNCIA_id_servico_id_usuario_key`(`id_servico`, `id_usuario`),
    PRIMARY KEY (`id_denuncia`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SERVICO_DENUNCIA` ADD CONSTRAINT `SERVICO_DENUNCIA_id_servico_fkey` FOREIGN KEY (`id_servico`) REFERENCES `SERVICO`(`id_servico`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SERVICO_DENUNCIA` ADD CONSTRAINT `SERVICO_DENUNCIA_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `USUARIO`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;
