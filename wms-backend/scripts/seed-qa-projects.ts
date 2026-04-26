/**
 * Seed QA Projects — Gate 5 test fixture for feature/master-plan-project-lookup
 *
 * Creates 10 projects across 3 sites (SITE-VCQ7 / SITE-TDC / SITE-SGA) with
 * diverse status/budget values to cover QA_TEST_MATRIX §1.2 scenarios:
 *   - Basic LOV search (TC-A)
 *   - Vietnamese unaccent search (TC-B)
 *   - Status filter toggle (TC-C)
 *   - Cross-org display (TC-D)
 *   - Edit mode hydration (TC-E)
 *   - Budget warning flow (TC-F)
 *   - Accessibility (TC-G)
 *   - Error handling + validation (TC-H)
 *
 * Usage:
 *   cd wms-backend
 *   npx ts-node -r tsconfig-paths/register scripts/seed-qa-projects.ts
 *
 * Idempotent: re-running skips projects whose project_code already exists.
 *
 * Prereqs:
 *   - Database running + schema migrated
 *   - Seed sites SITE-VCQ7 / SITE-TDC / SITE-SGA must exist
 *     (run `npm run start:dev` once to trigger SeedService if not)
 *
 * Note: bootstrapping AppModule via createApplicationContext triggers
 * OnApplicationBootstrap hooks (SeedService, WorkflowSeedService). This is
 * intentional — ensures orgs + privileges exist before we seed projects.
 *
 * Author: Tech Advisor (Gate 5 QA support)
 * Date: 2026-04-24
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { AppModule } from '../src/app.module';
import { Project } from '../src/projects/entities/project.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import {
  ProjectStage,
  ProjectStatus,
  ProjectType,
} from '../src/projects/enums/project.enum';

// ─────────────────────────────────────────────────────────────────────────
// QA project fixtures — keyed to QA_TEST_MATRIX.md §1.2
// ─────────────────────────────────────────────────────────────────────────

type SiteCode = 'SITE-VCQ7' | 'SITE-TDC' | 'SITE-SGA';

interface QAProjectSpec {
  project_code: string;
  project_name: string;
  description: string;
  site_code: SiteCode;
  stage: ProjectStage;
  status: ProjectStatus;
  budget: number;
  contract_value: number;
  /** Test cases this project supports (human-readable tag). */
  tc_refs: string;
}

const QA_PROJECTS: readonly QAProjectSpec[] = [
  {
    project_code: 'TOW-VCQ7-001',
    project_name: 'Tháp nước VCQ7',
    description: 'QA seed — primary active VCQ7 project; used for base LOV + edit hydration + a11y',
    site_code: 'SITE-VCQ7',
    stage: ProjectStage.CONSTRUCTION,
    status: ProjectStatus.ACTIVE,
    budget: 2_000_000_000,
    contract_value: 10_000_000_000, // Headroom 8B — MP budget > 8B triggers warning
    tc_refs: 'TC-A, TC-D, TC-E, TC-G',
  },
  {
    project_code: 'TOW-VCQ7-002',
    project_name: 'Tháp nước mở rộng VCQ7',
    description: 'QA seed — WON_BID status (pre-construction), VCQ7 site',
    site_code: 'SITE-VCQ7',
    stage: ProjectStage.PERMITTING,
    status: ProjectStatus.WON_BID,
    budget: 0,
    contract_value: 5_000_000_000,
    tc_refs: 'TC-A, TC-C',
  },
  {
    project_code: 'WH-TDC-001',
    project_name: 'Nhà kho Tân Đô Cảng',
    description: 'QA seed — cross-org visibility primary case (User-B VIEW_ALL_PROJECTS)',
    site_code: 'SITE-TDC',
    stage: ProjectStage.CONSTRUCTION,
    status: ProjectStatus.ACTIVE,
    budget: 1_500_000_000,
    contract_value: 7_000_000_000,
    tc_refs: 'TC-A, TC-B, TC-D',
  },
  {
    project_code: 'WH-TDC-002',
    project_name: 'Nhà kho phụ',
    description: 'QA seed — ON_HOLD status for active-filter testing',
    site_code: 'SITE-TDC',
    stage: ProjectStage.PLANNING,
    status: ProjectStatus.ON_HOLD,
    budget: 500_000_000,
    contract_value: 3_000_000_000,
    tc_refs: 'TC-C',
  },
  {
    project_code: 'PUMP-SGA-001',
    project_name: 'Trạm bơm Sài Gòn A',
    description: 'QA seed — SETTLING status cross-org (SGA site)',
    site_code: 'SITE-SGA',
    stage: ProjectStage.MANAGEMENT,
    status: ProjectStatus.SETTLING,
    budget: 4_500_000_000,
    contract_value: 5_000_000_000,
    tc_refs: 'TC-A, TC-D',
  },
  {
    project_code: 'PUMP-SGA-002',
    project_name: 'Trạm bơm cũ',
    description: 'QA seed — SETTLED (finalized/closed equivalent) for include-inactive toggle',
    site_code: 'SITE-SGA',
    stage: ProjectStage.MANAGEMENT,
    status: ProjectStatus.SETTLED,
    budget: 1_200_000_000,
    contract_value: 1_200_000_000,
    tc_refs: 'TC-C (inactive toggle)',
  },
  {
    project_code: 'DAI-HOC-001',
    project_name: 'Công trình Đại Học Quốc Gia',
    description: 'QA seed — Vietnamese accent test (search "dai hoc"/"truong"/"đại học")',
    site_code: 'SITE-VCQ7',
    stage: ProjectStage.CONSTRUCTION,
    status: ProjectStatus.ACTIVE,
    budget: 3_000_000_000,
    contract_value: 8_000_000_000,
    tc_refs: 'TC-B (unaccent)',
  },
  {
    project_code: 'EDGE-001',
    project_name:
      'Dự án có tên rất dài vượt 50 ký tự để test truncation trong picker dropdown cell',
    description: 'QA seed — edge case long name (>50 chars) for UI truncation test',
    site_code: 'SITE-TDC',
    stage: ProjectStage.CONSTRUCTION,
    status: ProjectStatus.ACTIVE,
    budget: 1_000_000_000,
    contract_value: 2_000_000_000,
    tc_refs: 'TC-A (truncation edge)',
  },
  {
    project_code: 'CXL-TEST-01',
    project_name: 'Công trình xây lắp',
    description: 'QA seed — CANCELED status (inactive toggle test)',
    site_code: 'SITE-SGA',
    stage: ProjectStage.PLANNING,
    status: ProjectStatus.CANCELED,
    budget: 0,
    contract_value: 0,
    tc_refs: 'TC-C (inactive toggle)',
  },
  {
    project_code: 'SPEC-UNI-001',
    project_name: 'Ký tự đặc biệt @ # $ & unicode 中文 日本語',
    description:
      'QA seed — special char + unicode in name for validation/rendering test; code stays clean',
    site_code: 'SITE-VCQ7',
    stage: ProjectStage.PLANNING,
    status: ProjectStatus.ACTIVE,
    budget: 500_000_000,
    contract_value: 2_500_000_000,
    tc_refs: 'TC-H (validation)',
  },
];

const REQUIRED_SITES: readonly SiteCode[] = [
  'SITE-VCQ7',
  'SITE-TDC',
  'SITE-SGA',
];

// ─────────────────────────────────────────────────────────────────────────
// Bootstrap + run
// ─────────────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  const logger = new Logger('SeedQAProjects');
  logger.log('🌱 Starting QA project seed…');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const projectRepo = app.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
    const orgRepo = app.get<Repository<Organization>>(
      getRepositoryToken(Organization),
    );

    // 1. Resolve site orgs by code
    const sites = await orgRepo.find({
      where: REQUIRED_SITES.map((code) => ({ organization_code: code })),
    });
    const siteMap = new Map<string, Organization>(
      sites.map((s) => [s.organization_code, s]),
    );

    const missing = REQUIRED_SITES.filter((code) => !siteMap.has(code));
    if (missing.length > 0) {
      logger.error(
        `❌ Missing required sites: ${missing.join(', ')}. ` +
          'Run `npm run start:dev` once to trigger SeedService, then retry.',
      );
      await app.close();
      process.exit(1);
    }

    logger.log(`✅ Resolved ${sites.length}/${REQUIRED_SITES.length} sites.`);

    // 2. Seed projects (idempotent by project_code)
    let created = 0;
    let skipped = 0;

    for (const spec of QA_PROJECTS) {
      const existing = await projectRepo.findOne({
        where: { project_code: spec.project_code },
      });
      if (existing) {
        logger.log(
          `  ⏭  SKIP  ${spec.project_code.padEnd(16)} — already exists (id=${existing.id})`,
        );
        skipped++;
        continue;
      }

      const org = siteMap.get(spec.site_code)!;
      const project = projectRepo.create({
        project_code: spec.project_code,
        project_name: spec.project_name,
        description: spec.description,
        organization_id: org.id,
        project_type: ProjectType.CONSTRUCTION,
        stage: spec.stage,
        status: spec.status,
        budget: spec.budget,
        contract_value: spec.contract_value,
      });
      await projectRepo.save(project);
      logger.log(
        `  ✅ CREATE ${spec.project_code.padEnd(16)} — ${spec.status.padEnd(10)} @ ${spec.site_code} (${spec.tc_refs})`,
      );
      created++;
    }

    // 3. Summary
    logger.log('');
    logger.log('═══════════════════════════════════════════════════');
    logger.log('  QA Project Seed — Summary');
    logger.log('═══════════════════════════════════════════════════');
    logger.log(`  Total spec:        ${QA_PROJECTS.length}`);
    logger.log(`  Created:           ${created}`);
    logger.log(`  Skipped (exists):  ${skipped}`);
    logger.log('═══════════════════════════════════════════════════');

    // 4. Hint for QA
    if (created > 0) {
      logger.log('');
      logger.log('👉 Next: run QA_TEST_MATRIX.md against these fixtures.');
      logger.log('   Open http://localhost:5173 (FE dev) after `npm run dev`.');
    }
  } catch (err) {
    logger.error('❌ Seed failed:', err instanceof Error ? err.stack : err);
    await app.close();
    process.exit(1);
  }

  await app.close();
  process.exit(0);
}

bootstrap();
