import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaService } from '@dexo/shared';

/**
 * Catches every exception the app doesn't handle itself. Previously this
 * only shaped the client-facing JSON response and threw the actual
 * error/stack away — nothing was ever logged anywhere, so a crash mid-request
 * (e.g. tenant provisioning failing) left zero trace unless someone was
 * watching that exact terminal live. Now every 5xx is both logged via
 * Nest's Logger (always visible in whatever process is running the API) AND
 * persisted to ErrorLog (visible in platform-admin's Logs page regardless
 * of how the API was started — npm run dev, run.bat, PM2, ...).
 */
@Catch()
class CentralErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('UnhandledException');

  constructor(private readonly prisma: PrismaService) {}

  async catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const responseBody: any = exception instanceof HttpException ? exception.getResponse() : { message: 'Internal server error' };
    const message = (typeof responseBody === 'string' ? responseBody : responseBody?.message) || 'Error';
    const errorName = (typeof responseBody === 'object' && responseBody?.error) || exception?.name || 'Error';
    const body: any = {
      statusCode: status,
      message,
      error: errorName,
    };
    if (req?.tenantId) body.tenantId = req.tenantId;
    if (req?.id) body.requestId = req.id;
    if (process.env.NODE_ENV !== 'production' && !(exception instanceof HttpException)) {
      body.stack = exception?.stack?.split('\n').slice(0, 5);
    }

    // 5xx = a real bug, not a client mistake — always log and persist it.
    // 4xx (bad request, unauthorized, etc.) is expected traffic, not logged.
    if (status >= 500) {
      this.logger.error(
        `${req?.method || ''} ${req?.originalUrl || req?.url || ''} -> ${status} ${message}`,
        exception?.stack,
      );

      const tenantId = req?.tenantId || req?.user?.tenantId || null;
      // Snapshot the tenant's name/business type at log time — tenantId
      // alone is a UUID, useless for tracing an error without a separate
      // lookup. Never let this secondary lookup break the actual response.
      let tenantName: string | null = null;
      let businessType: string | null = null;
      if (tenantId) {
        try {
          const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true, domains: { where: { isActive: true }, take: 1, select: { domain: { select: { code: true } } } } },
          });
          tenantName = tenant?.name || null;
          businessType = tenant?.domains?.[0]?.domain?.code || null;
        } catch { /* tenant lookup must never break error reporting */ }
      }

      this.prisma.errorLog
        .create({
          data: {
            method: req?.method || 'UNKNOWN',
            path: req?.originalUrl || req?.url || 'unknown',
            statusCode: status,
            message: String(message).slice(0, 2000),
            errorName: String(errorName).slice(0, 200),
            stack: exception?.stack ? String(exception.stack).slice(0, 8000) : null,
            tenantId,
            tenantName,
            businessType,
            userId: req?.user?.id || null,
            requestId: req?.id || null,
          },
        })
        .catch((err: any) => this.logger.warn(`Failed to persist ErrorLog: ${err?.message}`));
    }

    res.status(status).json(body);
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // CORS: reflect the request origin instead of "*" — browsers reject
  // credentialed requests (fetch credentials:'include') when the
  // Access-Control-Allow-Origin header is the wildcard.
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin && corsOrigin !== '*' ? corsOrigin.split(',') : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new CentralErrorFilter(app.get(PrismaService)));

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Dexo Platform API')
    .setDescription('Multi-tenant SaaS Platform Engine API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('tenant', 'Tenant management')
    .addTag('business-templates', 'Business type templates (public)')
    .addTag('onboarding', 'Tenant + customer onboarding')
    .addTag('health', 'Health check')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
