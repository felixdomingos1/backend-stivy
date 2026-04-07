-- AlterTable
ALTER TABLE `USUARIO` ADD COLUMN `reset_password_attempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `reset_password_code` VARCHAR(10) NULL,
    ADD COLUMN `reset_password_expira` DATETIME(3) NULL;
