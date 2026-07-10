import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

@Catch()
class CentralErrorFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const responseBody: any = exception instanceof HttpException ? exception.getResponse() : { message: 'Internal server error' };
    const body: any = {
      statusCode: status,
      message: (typeof responseBody === 'string' ? responseBody : responseBody?.message) || 'Error',
      error: (typeof responseBody === 'object' && responseBody?.error) || exception?.name || 'Error',
    };
    if (req?.tenantId) body.tenantId = req.tenantId;
    if (req?.id) body.requestId = req.id;
    if (process.env.NODE_ENV !== 'production' && !(exception instanceof HttpException)) {
      body.stack = exception?.stack?.split('\n').slice(0, 5);
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

  app.useGlobalFilters(new CentralErrorFilter());

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
