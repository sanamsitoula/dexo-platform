import { Injectable } from '@nestjs/common';
import type { AiPromptTemplate } from './types';

/**
 * Every module owns its own prompt templates instead of prompts being
 * hardcoded inside a runtime/agent implementation. `{{var}}` placeholders
 * are filled from AiContext plus whatever extra vars the caller passes.
 */
@Injectable()
export class PromptRegistry {
  private templates = new Map<string, AiPromptTemplate>();

  register(templates: AiPromptTemplate[]) {
    for (const t of templates) this.templates.set(t.key, t);
  }

  get(key: string): AiPromptTemplate | undefined {
    return this.templates.get(key);
  }

  render(key: string, vars: Record<string, any>): string {
    const tpl = this.templates.get(key);
    if (!tpl) throw new Error(`Unknown prompt template "${key}"`);
    return tpl.template.replace(/\{\{(\w+)\}\}/g, (_, name) => (vars[name] != null ? String(vars[name]) : ''));
  }
}
