-- DropForeignKey
ALTER TABLE `REQUISICAO` DROP FOREIGN KEY `REQUISICAO_id_modelo_fkey`;

-- DropForeignKey
ALTER TABLE `REQUISICAO` DROP FOREIGN KEY `REQUISICAO_id_servico_fkey`;

-- DropForeignKey
ALTER TABLE `SERVICO_COMENTARIO` DROP FOREIGN KEY `SERVICO_COMENTARIO_parent_id_fkey`;

-- AlterTable
ALTER TABLE `FAZEDOR` ADD COLUMN `cidade` VARCHAR(100) NULL,
    ADD COLUMN `email_publico` VARCHAR(100) NULL,
    ADD COLUMN `latitude` DECIMAL(10, 8) NULL,
    ADD COLUMN `longitude` DECIMAL(11, 8) NULL,
    ADD COLUMN `provincia` VARCHAR(100) NULL,
    ADD COLUMN `telefone_publico` VARCHAR(20) NULL,
    ADD COLUMN `whatsapp` VARCHAR(20) NULL;

-- AlterTable
ALTER TABLE `MENSAGEM` ADD COLUMN `midia_url` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `NOTIFICACAO` MODIFY `tipo` ENUM('requisicao', 'evento', 'sistema', 'mensagem', 'avaliacao', 'seguidor', 'comentario', 'reacao') NOT NULL;

-- AlterTable
ALTER TABLE `REQUISICAO` MODIFY `id_servico` CHAR(36) NULL,
    MODIFY `id_modelo` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `FAZEDOR_latitude_longitude_idx` ON `FAZEDOR`(`latitude`, `longitude`);

-- AddForeignKey
ALTER TABLE `REQUISICAO` ADD CONSTRAINT `REQUISICAO_id_servico_fkey` FOREIGN KEY (`id_servico`) REFERENCES `SERVICO`(`id_servico`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `REQUISICAO` ADD CONSTRAINT `REQUISICAO_id_modelo_fkey` FOREIGN KEY (`id_modelo`) REFERENCES `MODELO`(`id_modelo`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SERVICO_COMENTARIO` ADD CONSTRAINT `SERVICO_COMENTARIO_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `SERVICO_COMENTARIO`(`id_comentario`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- RenameIndex
ALTER TABLE `MODELO_PORTFOLIO` RENAME INDEX `MODELO_PORTFOLIO_id_modelo_fkey` TO `MODELO_PORTFOLIO_id_modelo_idx`;

-- RenameIndex
ALTER TABLE `REQUISICAO` RENAME INDEX `REQUISICAO_id_modelo_fkey` TO `REQUISICAO_id_modelo_idx`;

-- RenameIndex
ALTER TABLE `REQUISICAO` RENAME INDEX `REQUISICAO_id_servico_fkey` TO `REQUISICAO_id_servico_idx`;

-- RenameIndex
ALTER TABLE `STORY` RENAME INDEX `STORY_id_usuario_fkey` TO `STORY_id_usuario_idx`;

