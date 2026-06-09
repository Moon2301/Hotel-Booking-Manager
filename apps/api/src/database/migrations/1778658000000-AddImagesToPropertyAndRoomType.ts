import { MigrationInterface, QueryRunner } from "typeorm";

export class AddImagesToPropertyAndRoomType1778658000000 implements MigrationInterface {
    name = 'AddImagesToPropertyAndRoomType1778658000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "properties" ADD "description" text`);
        await queryRunner.query(`ALTER TABLE "properties" ADD "images" jsonb DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "room_types" ADD "images" jsonb DEFAULT '[]'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "room_types" DROP COLUMN "images"`);
        await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN "images"`);
        await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN "description"`);
    }
}
