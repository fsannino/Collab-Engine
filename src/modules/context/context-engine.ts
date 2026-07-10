import type { ProjectType } from '@prisma/client';

/**
 * Context Engine — configura comportamento automático baseado no tipo de projeto.
 *
 * Cada ProjectType tem um preset de:
 * - Módulos habilitados (M1-M16)
 * - Dimensões de impacto mais relevantes
 * - Score de complexidade base
 * - Templates de risco pré-carregados
 * - Fases sugeridas do change management
 */

export interface ProjectContextConfig {
  label: string;
  description: string;
  /** Módulos do IPCO habilitados por padrão */
  enabledModules: string[];
  /** Dimensões de impacto prioritárias (ordenadas) */
  priorityDimensions: string[];
  /** Score base de complexidade (1-10) */
  baseComplexity: number;
  /** Riscos pré-carregados para o tipo de projeto */
  defaultRisks: Array<{ description: string; impact: number; probability: number }>;
  /** Fases sugeridas de change management */
  suggestedPhases: string[];
  /** Templates de comunicação sugeridos */
  communicationFocus: string[];
}

export const PROJECT_CONTEXT_CONFIGS: Record<ProjectType, ProjectContextConfig> = {
  ERP_IMPLEMENTATION: {
    label: 'Implantação ERP',
    description: 'Projetos SAP, Oracle, TOTVS e similares',
    enabledModules: ['M2', 'M3', 'M5', 'M7', 'M8', 'M9', 'M11'],
    priorityDimensions: ['PROCESS', 'TECHNOLOGY', 'PEOPLE', 'STRUCTURE'],
    baseComplexity: 8,
    defaultRisks: [
      { description: 'Resistência dos key users às mudanças de processo', impact: 4, probability: 4 },
      { description: 'Gaps de treinamento em funcionalidades críticas', impact: 5, probability: 3 },
      { description: 'Sobrecarga operacional durante cutover', impact: 4, probability: 3 },
      { description: 'Perda de produtividade no período de estabilização', impact: 3, probability: 4 },
    ],
    suggestedPhases: ['Diagnóstico', 'Preparação', 'Capacitação', 'Go-Live', 'Estabilização', 'Sustentação'],
    communicationFocus: ['Sponsors', 'Key Users', 'Gestores de área', 'Usuários finais'],
  },

  DIGITAL_TRANSFORMATION: {
    label: 'Transformação Digital',
    description: 'Automação, IA, digitalização de processos',
    enabledModules: ['M2', 'M3', 'M5', 'M7', 'M9', 'M11'],
    priorityDimensions: ['TECHNOLOGY', 'PEOPLE', 'CULTURE', 'PROCESS'],
    baseComplexity: 7,
    defaultRisks: [
      { description: 'Resistência cultural à adoção de novas tecnologias', impact: 4, probability: 4 },
      { description: 'Gaps de competência digital nas equipes', impact: 4, probability: 3 },
      { description: 'Expectativas desalinhadas entre áreas', impact: 3, probability: 3 },
    ],
    suggestedPhases: ['Discovery', 'Piloto', 'Rollout', 'Escala', 'Otimização'],
    communicationFocus: ['C-Level', 'Digital Champions', 'Equipes operacionais'],
  },

  MERGER_ACQUISITION: {
    label: 'Fusão & Aquisição',
    description: 'M&A, integração de empresas',
    enabledModules: ['M2', 'M3', 'M5', 'M7', 'M8', 'M9', 'M11', 'M12'],
    priorityDimensions: ['CULTURE', 'STRUCTURE', 'PEOPLE', 'POLICY'],
    baseComplexity: 9,
    defaultRisks: [
      { description: 'Choque cultural entre organizações', impact: 5, probability: 4 },
      { description: 'Perda de talentos-chave durante integração', impact: 5, probability: 3 },
      { description: 'Duplicidade de processos e sistemas', impact: 4, probability: 4 },
      { description: 'Incerteza e ansiedade nas equipes', impact: 4, probability: 5 },
    ],
    suggestedPhases: ['Due Diligence Cultural', 'Day 1 Planning', 'Integração Inicial', 'Harmonização', 'Nova Cultura'],
    communicationFocus: ['Liderança de ambas organizações', 'Gestores', 'Todos os colaboradores'],
  },

  INFRASTRUCTURE: {
    label: 'Infraestrutura',
    description: 'Mudanças físicas, relocação, cloud migration',
    enabledModules: ['M2', 'M3', 'M5', 'M11'],
    priorityDimensions: ['TECHNOLOGY', 'STRUCTURE', 'PROCESS'],
    baseComplexity: 5,
    defaultRisks: [
      { description: 'Interrupção de serviços durante migração', impact: 5, probability: 3 },
      { description: 'Treinamento insuficiente nas novas ferramentas', impact: 3, probability: 3 },
    ],
    suggestedPhases: ['Assessment', 'Planejamento', 'Migração', 'Validação', 'Operação'],
    communicationFocus: ['TI', 'Gestores de área', 'Usuários impactados'],
  },

  INNOVATION: {
    label: 'Inovação',
    description: 'Novos produtos, modelos de negócio, metodologias',
    enabledModules: ['M2', 'M3', 'M7', 'M11'],
    priorityDimensions: ['CULTURE', 'PEOPLE', 'METRICS'],
    baseComplexity: 6,
    defaultRisks: [
      { description: 'Resistência a experimentação e risco', impact: 3, probability: 4 },
      { description: 'Falta de patrocínio executivo sustentado', impact: 4, probability: 3 },
    ],
    suggestedPhases: ['Ideação', 'Validação', 'MVP', 'Escala', 'Aprendizado'],
    communicationFocus: ['Sponsors', 'Early adopters', 'Times de produto'],
  },

  SOCIAL_IMPACT: {
    label: 'Impacto Social',
    description: 'ESG, sustentabilidade, diversidade',
    enabledModules: ['M2', 'M3', 'M5', 'M7', 'M11'],
    priorityDimensions: ['CULTURE', 'POLICY', 'PEOPLE', 'METRICS'],
    baseComplexity: 6,
    defaultRisks: [
      { description: 'Percepção de ação apenas cosmética (greenwashing)', impact: 4, probability: 3 },
      { description: 'Desalinhamento entre discurso e prática', impact: 4, probability: 3 },
    ],
    suggestedPhases: ['Diagnóstico', 'Política', 'Implementação', 'Mensuração', 'Comunicação'],
    communicationFocus: ['C-Level', 'RH', 'Comunicação Interna', 'Stakeholders externos'],
  },

  LEAN_SIX_SIGMA: {
    label: 'Lean / Six Sigma',
    description: 'Melhoria contínua, eficiência operacional',
    enabledModules: ['M2', 'M3', 'M5', 'M11'],
    priorityDimensions: ['PROCESS', 'METRICS', 'PEOPLE'],
    baseComplexity: 5,
    defaultRisks: [
      { description: 'Retorno aos velhos hábitos após projeto', impact: 4, probability: 4 },
      { description: 'Falta de engajamento da liderança intermediária', impact: 3, probability: 3 },
    ],
    suggestedPhases: ['Define', 'Measure', 'Analyze', 'Improve', 'Control'],
    communicationFocus: ['Green/Black Belts', 'Donos de processo', 'Operadores'],
  },

  CULTURAL_TRANSFORMATION: {
    label: 'Transformação Cultural',
    description: 'Mudança de mindset, valores, comportamentos',
    enabledModules: ['M2', 'M3', 'M5', 'M7', 'M8', 'M9', 'M11', 'M12'],
    priorityDimensions: ['CULTURE', 'PEOPLE', 'STRUCTURE', 'POLICY'],
    baseComplexity: 9,
    defaultRisks: [
      { description: 'Liderança não modela os novos comportamentos', impact: 5, probability: 4 },
      { description: 'Mudança percebida como imposição top-down', impact: 4, probability: 3 },
      { description: 'Tempo insuficiente para mudança comportamental real', impact: 4, probability: 4 },
    ],
    suggestedPhases: ['Diagnóstico OCAI', 'Visão Compartilhada', 'Experimentação', 'Reforço', 'Sustentação'],
    communicationFocus: ['C-Level', 'Liderança', 'Change Champions', 'Todos os níveis'],
  },
};

/**
 * Retorna a configuração de contexto para um tipo de projeto.
 */
export function getContextConfig(projectType: ProjectType): ProjectContextConfig {
  return PROJECT_CONTEXT_CONFIGS[projectType];
}

/**
 * Retorna se um módulo está habilitado para o tipo de projeto.
 */
export function isModuleEnabled(projectType: ProjectType, moduleCode: string): boolean {
  return PROJECT_CONTEXT_CONFIGS[projectType].enabledModules.includes(moduleCode);
}
