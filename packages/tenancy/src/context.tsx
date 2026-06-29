import { createContext, useContext } from 'react';
import type { TenantContext } from './resolver';

export const TenantReactContext = createContext<TenantContext | null>(null);

export function useTenant(): TenantContext | null {
  return useContext(TenantReactContext);
}
