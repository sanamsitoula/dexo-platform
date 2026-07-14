import type { AiAgentDefinition } from '@dexo/ai-platform';

export const websiteAgents: AiAgentDefinition[] = [
  {
    key: 'website.content-writer',
    name: 'Website Content Writer',
    description: 'Drafts section copy for the Website/Menu/Page Builder — no database access, output is a draft the tenant reviews before saving.',
    moduleKeys: [], // pure text generation, no tools — never touches tenant data directly
    systemPromptKey: 'website.content_writer_system',
  },
];
