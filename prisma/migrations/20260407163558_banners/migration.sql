/*
  Warnings:

  - You are about to drop the column `anner_url` on the `USUARIO` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `USUARIO` DROP COLUMN `anner_url`,
    ADD COLUMN `banner_url` VARCHAR(255) NULL;
