import type { ImpactDimension } from '@prisma/client';

export type CatalogEntry = {
  title: string;
  durationH: number;
};

export const TRAINING_CATALOG: Record<ImpactDimension, CatalogEntry[]> = {
  PROCESS: [
    { title: 'Mapeamento e Redesenho de Processos', durationH: 8 },
    { title: 'Gestão da Mudança em Processos', durationH: 4 },
  ],
  PEOPLE: [
    { title: 'Gestão de Mudança Organizacional', durationH: 16 },
    { title: 'Comunicação em Tempos de Mudança', durationH: 8 },
  ],
  TECHNOLOGY: [
    { title: 'Treinamento Funcional no Sistema', durationH: 16 },
    { title: 'Suporte Técnico — FAQ do Sistema', durationH: 4 },
  ],
  STRUCTURE: [
    { title: 'Nova Estrutura Organizacional', durationH: 4 },
    { title: 'Papéis, Responsabilidades e Autoridades', durationH: 4 },
  ],
  CULTURE: [
    { title: 'Cultura e Valores da Organização', durationH: 8 },
    { title: 'Liderança na Mudança Cultural', durationH: 16 },
  ],
  POLICY: [
    { title: 'Novas Políticas e Procedimentos', durationH: 4 },
    { title: 'Compliance e Governança', durationH: 8 },
  ],
  METRICS: [
    { title: 'Novos Indicadores e KPIs', durationH: 4 },
    { title: 'Ferramentas de Acompanhamento e Reporting', durationH: 4 },
  ],
};
