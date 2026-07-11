/**
 * ModuleAccessGuard now lives in @dexo/shared so that feature packages
 * (e.g. @dexo/blog) can use it without a cross-boundary import into the app.
 * This shim keeps existing '../../common/guards/module-access.guard' imports working.
 */
export { ModuleAccessGuard, RequireModule, REQUIRED_MODULE_KEY } from '@dexo/shared';
