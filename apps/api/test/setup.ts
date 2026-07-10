import { afterAll } from '@jest/globals';
import { closeApp } from './app';

afterAll(async () => {
  await closeApp();
}, 30000);