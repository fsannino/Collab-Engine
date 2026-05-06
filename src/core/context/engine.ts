import type { ProjectType } from '@prisma/client';
import type { ImpactDimension } from '@prisma/client';

export type ContextConfig = {
  /** Impact dimensions surfaced first in the creation form. */
  defaultDimensions: ImpactDimension[];
  /** Whether ADKAR scoring is prominently shown for stakeholders. */
  requiresAdkar: boolean;
  /** Scoring approach: 'standard' (waterfall) vs 'agile' (iterative). */
  riskApproach: 'standard' | 'agile';
  /** Suggested stakeholder category labels shown in the import template. */
  stakeholderCategories: string[];
  /** Label used on executive dashboards and heatmap headers. */
  heatmapLabel: string;
};

const CONTEXT_MAP: Record<ProjectType, ContextConfig> = {
  ERP_IMPLEMENTATION: {
    defaultDimensions: ['PROCESS', 'PEOPLE', 'TECHNOLOGY'],
    requiresAdkar: true,
    riskApproach: 'standard',
    stakeholderCategories: ['Super Usuários', 'Champions', 'Equipe TI', 'Business Owners'],
    heatmapLabel: 'Mapa de Impacto — ERP',
  },
  DIGITAL_TRANSFORMATION: {
    defaultDimensions: ['TECHNOLOGY', 'PEOPLE', 'CULTURE'],
    requiresAdkar: true,
    riskApproach: 'agile',
    stakeholderCategories: ['Sponsors', 'Digital Champions', 'Usuários Finais'],
    heatmapLabel: 'Mapa de Impacto — Transformação Digital',
  },
  MERGER_ACQUISITION: {
    defaultDimensions: ['STRUCTURE', 'CULTURE', 'PEOPLE', 'POLICY'],
    requiresAdkar: true,
    riskApproach: 'standard',
    stakeholderCategories: ['Executivos', 'Líderes de Área', 'Colaboradores', 'Jurídico'],
    heatmapLabel: 'Mapa de Impacto — M&A',
  },
  INFRASTRUCTURE: {
    defaultDimensions: ['TECHNOLOGY', 'PROCESS'],
    requiresAdkar: false,
    riskApproach: 'standard',
    stakeholderCategories: ['Equipe TI', 'Usuários de Negócio', 'Fornecedores'],
    heatmapLabel: 'Mapa de Impacto — Infraestrutura',
  },
  INNOVATION: {
    defaultDimensions: ['CULTURE', 'PEOPLE', 'TECHNOLOGY'],
    requiresAdkar: false,
    riskApproach: 'agile',
    stakeholderCategories: ['Líderes de Inovação', 'Champions', 'Usuários Piloto'],
    heatmapLabel: 'Mapa de Impacto — Inovação',
  },
  SOCIAL_IMPACT: {
    defaultDimensions: ['PEOPLE', 'CULTURE', 'POLICY'],
    requiresAdkar: true,
    riskApproach: 'standard',
    stakeholderCategories: ['Beneficiários', 'Parceiros', 'Financiadores', 'Comunidade'],
    heatmapLabel: 'Mapa de Impacto — Impacto Social',
  },
  LEAN_SIX_SIGMA: {
    defaultDimensions: ['PROCESS', 'METRICS', 'PEOPLE'],
    requiresAdkar: false,
    riskApproach: 'standard',
    stakeholderCategories: ['Process Owners', 'Black Belts', 'Green Belts', 'Patrocinadores'],
    heatmapLabel: 'Mapa de Impacto — Lean/Six Sigma',
  },
  CULTURAL_TRANSFORMATION: {
    defaultDimensions: ['CULTURE', 'PEOPLE', 'STRUCTURE'],
    requiresAdkar: true,
    riskApproach: 'standard',
    stakeholderCategories: ['Líderes', 'Influenciadores', 'Resistentes', 'Champions'],
    heatmapLabel: 'Mapa de Impacto — Transformação Cultural',
  },
};

export function getProjectContext(projectType: ProjectType): ContextConfig {
  return CONTEXT_MAP[projectType];
}

/** Returns the defaultDimensions for use as form pre-selection. */
export function getDefaultDimensions(projectType: ProjectType): ImpactDimension[] {
  return CONTEXT_MAP[projectType].defaultDimensions;
}
