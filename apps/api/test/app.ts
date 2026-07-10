import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

let app: INestApplication | null = null;

export async function getApp(): Promise<INestApplication> {
  if (app) return app;

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  return app;
}

export async function closeApp(): Promise<void> {
  if (app) {
    await app.close();
    app = null;
  }
}

export async function api(): Promise<request.SuperTest<request.Test>> {
  const a = await getApp();
  return request(a.getHttpServer());
}

export async function login(email: string, password: string): Promise<string> {
  const r = await api();
  const res = await r.post('/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.accessToken as string;
}

export async function authed(token: string) {
  const r = await api();
  const headers = { Authorization: `Bearer ${token}` };
  return {
    get: (path: string) => r.get(path).set(headers),
    post: (path: string) => r.post(path).set(headers),
    put: (path: string) => r.put(path).set(headers),
    delete: (path: string) => r.delete(path).set(headers),
  };
}

export const DEMO = {
  platformAdmin: { email: 'admin@test.com', password: 'Admin@123' },
  fitnessOwner: { email: 'admin@vrfitness.com', password: 'Admin123!' },
  fitnessMember: { email: 'member1@vrfitness.com', password: 'Member123!' },
  restaurantOwner: { email: 'admin@spicegarden.com', password: 'Admin123!' },
};