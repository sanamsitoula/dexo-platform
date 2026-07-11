import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AiContext, AiModuleRegistration, AiTool } from './types';

/**
 * Global registry of every module's AI tools. A module calls
 * `toolRegistry.registerModule({ moduleKey, tools })` once, typically in its
 * NestJS module constructor — see FitnessAiModule for the reference pattern.
 * Nothing else in the platform needs to change to add a new module's tools.
 */
@Injectable()
export class ToolRegistry {
  private modules = new Map<string, AiModuleRegistration>();

  registerModule(reg: AiModuleRegistration) {
    this.modules.set(reg.moduleKey, reg);
  }

  getModule(moduleKey: string): AiModuleRegistration | undefined {
    return this.modules.get(moduleKey);
  }

  /** All tools across the given module keys — what an agent is allowed to call. */
  getToolsFor(moduleKeys: string[]): AiTool[] {
    return moduleKeys.flatMap((key) => this.modules.get(key)?.tools ?? []);
  }

  findTool(moduleKeys: string[], toolName: string): AiTool | undefined {
    return this.getToolsFor(moduleKeys).find((t) => t.name === toolName);
  }

  /**
   * Executes a tool by name after checking `requiredPermission` against the
   * caller's resolved permissions. This is the ONLY path an agent uses to
   * touch data — never direct Prisma access.
   */
  async execute(moduleKeys: string[], toolName: string, rawArgs: unknown, ctx: AiContext): Promise<any> {
    const tool = this.findTool(moduleKeys, toolName);
    if (!tool) throw new Error(`Unknown tool "${toolName}" (not registered for modules: ${moduleKeys.join(', ')})`);

    if (tool.requiredPermission && !ctx.isPlatformAdmin && !ctx.permissions.includes(tool.requiredPermission)) {
      throw new ForbiddenException(`Missing permission "${tool.requiredPermission}" for tool "${toolName}"`);
    }

    const args = tool.argsSchema.parse(rawArgs ?? {});
    return tool.execute(args, ctx);
  }
}
