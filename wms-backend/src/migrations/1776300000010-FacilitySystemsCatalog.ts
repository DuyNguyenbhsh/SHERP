import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Master Plan SUPPLEMENT (2026-04-20): template thực tế xlsx/pdf
 * - Thêm 2 bảng master-data taxonomy: facility_systems, facility_equipment_items (SA §15.1.1-2)
 * - Thêm enum task_executor_party (SA §15.1.4, BR-MP-08)
 * - Seed 11 system + 40 equipment item khởi điểm (BA §10.6)
 */
export class FacilitySystemsCatalog1776300000010 implements MigrationInterface {
  name = 'FacilitySystemsCatalog1776300000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Enum task_executor_party ──────────────────────────
    await queryRunner.query(`
      CREATE TYPE "task_executor_party" AS ENUM (
        'INTERNAL','OWNER','TENANT','CONTRACTOR','MIXED'
      );
    `);

    // ── facility_systems (cấp 1) ──────────────────────────
    await queryRunner.query(`
      CREATE TABLE "facility_systems" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code" varchar(32) NOT NULL UNIQUE,
        "name_vi" varchar(200) NOT NULL,
        "name_en" varchar(200),
        "sort_order" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_FS_ACTIVE" ON "facility_systems" ("is_active","sort_order");
    `);

    // ── facility_equipment_items (cấp 2) ──────────────────
    await queryRunner.query(`
      CREATE TABLE "facility_equipment_items" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "system_id" uuid NOT NULL REFERENCES "facility_systems"("id") ON DELETE RESTRICT,
        "code" varchar(32) UNIQUE,
        "name_vi" varchar(200) NOT NULL,
        "name_en" varchar(200),
        "sort_order" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_FEI_SYSTEM" ON "facility_equipment_items" ("system_id","sort_order");
    `);

    // ── Seed 11 system ────────────────────────────────────
    const systems: Array<[string, string, string, number]> = [
      ['FS_FIRE', 'Hệ thống PCCC & Báo cháy', 'Fire Protection & Alarm', 10],
      ['FS_WATER', 'Hệ thống cấp thoát nước', 'Water Supply & Drainage', 20],
      ['FS_LIGHTNING', 'Chống sét', 'Lightning Protection', 30],
      ['FS_ELECTRICAL', 'Hệ thống điện', 'Electrical System', 40],
      ['FS_GENERATOR', 'Máy phát điện', 'Diesel Generator', 50],
      [
        'FS_LIGHTING',
        'Chiếu sáng & đèn khẩn cấp',
        'Lighting & Emergency Light',
        60,
      ],
      [
        'FS_HVAC',
        'Hệ thống thông gió & hút khói',
        'Ventilation & Smoke Extraction',
        70,
      ],
      ['FS_DOCK', 'Cửa cuốn & Dock leveler', 'Roll-up Door & Dock Leveler', 80],
      [
        'FS_CCTV',
        'Camera quan sát & Âm thanh (PA)',
        'CCTV & Public Address',
        90,
      ],
      [
        'FS_STRUCTURE',
        'Kết cấu & Cơ sở hạ tầng',
        'Structure & Infrastructure',
        100,
      ],
      [
        'FS_ENV',
        'Môi trường & Quản lý năng lượng',
        'Environment & Energy Management',
        110,
      ],
    ];
    for (const [code, vi, en, sort] of systems) {
      await queryRunner.query(
        `INSERT INTO "facility_systems" ("code","name_vi","name_en","sort_order")
         VALUES ($1,$2,$3,$4);`,
        [code, vi, en, sort],
      );
    }

    // ── Seed 40 equipment item ────────────────────────────
    // Thao tác: lookup system_id theo code → insert
    const items: Array<[string, string, string, string, number]> = [
      // FS_FIRE
      [
        'FS_FIRE',
        'FEI_FIRE_PUMP',
        'Trạm bơm chữa cháy',
        'Fire Pump Station',
        10,
      ],
      [
        'FS_FIRE',
        'FEI_FIRE_HYDRANT',
        'Họng cứu hỏa & cuộn vòi',
        'Hydrant & Hose Reel',
        20,
      ],
      ['FS_FIRE', 'FEI_FIRE_EXT', 'Bình chữa cháy', 'Fire Extinguisher', 30],
      [
        'FS_FIRE',
        'FEI_FIRE_ALARM',
        'Tủ báo cháy trung tâm',
        'Fire Alarm Panel',
        40,
      ],
      [
        'FS_FIRE',
        'FEI_FIRE_SPRINKLER',
        'Hệ thống Sprinkler',
        'Sprinkler System',
        50,
      ],
      // FS_WATER
      [
        'FS_WATER',
        'FEI_WATER_PUMP',
        'Bơm cấp nước sinh hoạt',
        'Domestic Water Pump',
        10,
      ],
      [
        'FS_WATER',
        'FEI_WATER_TANK',
        'Bể nước & đài nước',
        'Water Tank & Tower',
        20,
      ],
      [
        'FS_WATER',
        'FEI_WATER_WWT',
        'Hệ thống xử lý nước thải',
        'Wastewater Treatment',
        30,
      ],
      [
        'FS_WATER',
        'FEI_WATER_DRAIN',
        'Hố ga & cống thoát',
        'Manhole & Drainage',
        40,
      ],
      // FS_LIGHTNING
      ['FS_LIGHTNING', 'FEI_LIGHT_ROD', 'Cột thu lôi', 'Lightning Rod', 10],
      [
        'FS_LIGHTNING',
        'FEI_LIGHT_GROUND',
        'Hệ thống tiếp địa',
        'Grounding System',
        20,
      ],
      // FS_ELECTRICAL
      [
        'FS_ELECTRICAL',
        'FEI_ELEC_MSB',
        'Tủ điện tổng MSB',
        'Main Switchboard (MSB)',
        10,
      ],
      [
        'FS_ELECTRICAL',
        'FEI_ELEC_DSB',
        'Tủ điện phân phối DSB',
        'Distribution Switchboard',
        20,
      ],
      ['FS_ELECTRICAL', 'FEI_ELEC_TRAFO', 'Máy biến áp', 'Transformer', 30],
      ['FS_ELECTRICAL', 'FEI_ELEC_UPS', 'UPS & Bộ lưu điện', 'UPS', 40],
      [
        'FS_ELECTRICAL',
        'FEI_ELEC_CABLE',
        'Cáp điện & thang máng',
        'Cable & Tray',
        50,
      ],
      // FS_GENERATOR
      [
        'FS_GENERATOR',
        'FEI_GEN_DIESEL',
        'Máy phát điện dầu',
        'Diesel Generator Set',
        10,
      ],
      [
        'FS_GENERATOR',
        'FEI_GEN_ATS',
        'Tủ chuyển nguồn ATS',
        'Automatic Transfer Switch',
        20,
      ],
      [
        'FS_GENERATOR',
        'FEI_GEN_FUELTANK',
        'Bồn dầu & hệ nhiên liệu',
        'Fuel Tank & Pipeline',
        30,
      ],
      // FS_LIGHTING
      [
        'FS_LIGHTING',
        'FEI_LIGHT_NORMAL',
        'Đèn chiếu sáng thông thường',
        'Normal Lighting',
        10,
      ],
      [
        'FS_LIGHTING',
        'FEI_LIGHT_EMER',
        'Đèn khẩn cấp & Exit sign',
        'Emergency & Exit Light',
        20,
      ],
      // FS_HVAC
      ['FS_HVAC', 'FEI_HVAC_FAN', 'Quạt thông gió', 'Ventilation Fan', 10],
      [
        'FS_HVAC',
        'FEI_HVAC_SMOKE',
        'Quạt hút khói',
        'Smoke Extraction Fan',
        20,
      ],
      [
        'FS_HVAC',
        'FEI_HVAC_AHU',
        'AHU & Máy lạnh trung tâm',
        'AHU / Central AC',
        30,
      ],
      ['FS_HVAC', 'FEI_HVAC_SPLIT', 'Điều hòa cục bộ', 'Split AC Unit', 40],
      // FS_DOCK
      [
        'FS_DOCK',
        'FEI_DOCK_ROLLUP',
        'Cửa cuốn nhanh',
        'High-speed Roll-up Door',
        10,
      ],
      [
        'FS_DOCK',
        'FEI_DOCK_LEVELER',
        'Dock leveler thủy lực',
        'Hydraulic Dock Leveler',
        20,
      ],
      [
        'FS_DOCK',
        'FEI_DOCK_SEAL',
        'Dock seal & shelter',
        'Dock Seal & Shelter',
        30,
      ],
      // FS_CCTV
      ['FS_CCTV', 'FEI_CCTV_CAMERA', 'Camera IP', 'IP Camera', 10],
      ['FS_CCTV', 'FEI_CCTV_NVR', 'Đầu ghi NVR', 'Network Video Recorder', 20],
      [
        'FS_CCTV',
        'FEI_CCTV_PA',
        'Âm thanh PA & Paging',
        'Public Address System',
        30,
      ],
      // FS_STRUCTURE
      [
        'FS_STRUCTURE',
        'FEI_STRUCT_ROOF',
        'Mái tôn & máng xối',
        'Roof & Gutter',
        10,
      ],
      [
        'FS_STRUCTURE',
        'FEI_STRUCT_FLOOR',
        'Nền sàn & vạch kẻ',
        'Floor & Line Marking',
        20,
      ],
      [
        'FS_STRUCTURE',
        'FEI_STRUCT_WALL',
        'Tường bao & hàng rào',
        'Wall & Fence',
        30,
      ],
      [
        'FS_STRUCTURE',
        'FEI_STRUCT_ROAD',
        'Đường nội khu & vạch xe',
        'Internal Road & Marking',
        40,
      ],
      [
        'FS_STRUCTURE',
        'FEI_STRUCT_LAND',
        'Cảnh quan & cây xanh',
        'Landscape & Greenery',
        50,
      ],
      // FS_ENV
      [
        'FS_ENV',
        'FEI_ENV_WASTE',
        'Thu gom chất thải nguy hại',
        'Hazardous Waste Collection',
        10,
      ],
      ['FS_ENV', 'FEI_ENV_ELEC_METER', 'Công tơ điện', 'Electric Meter', 20],
      ['FS_ENV', 'FEI_ENV_WATER_METER', 'Đồng hồ nước', 'Water Meter', 30],
      [
        'FS_ENV',
        'FEI_ENV_AIR',
        'Quan trắc không khí',
        'Air Quality Monitoring',
        40,
      ],
    ];
    for (const [sysCode, itemCode, vi, en, sort] of items) {
      await queryRunner.query(
        `INSERT INTO "facility_equipment_items" ("system_id","code","name_vi","name_en","sort_order")
         VALUES ((SELECT id FROM "facility_systems" WHERE code = $1), $2, $3, $4, $5);`,
        [sysCode, itemCode, vi, en, sort],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "facility_equipment_items";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "facility_systems";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "task_executor_party";`);
  }
}
