import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from './storage';

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  domain?: string;
  logo?: string;
  primaryColor?: string;
  favicon?: string;
  siteTitle?: string;
  tagline?: string;
  domainCode?: string;
  domainName?: string;
  icon?: string;
}

interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
  setTenant: (tenant: Tenant | null) => Promise<void>;
  clearTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenantState] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTenant();
  }, []);

  async function loadTenant() {
    try {
      const tenantData = await storage.getItem('currentTenant');
      if (tenantData) {
        setTenantState(JSON.parse(tenantData));
      }
    } catch {
      await storage.removeItem('currentTenant');
    } finally {
      setIsLoading(false);
    }
  }

  const setTenant = useCallback(async (newTenant: Tenant | null) => {
    if (newTenant) {
      await storage.setItem('currentTenant', JSON.stringify(newTenant));
      setTenantState(newTenant);
    } else {
      await storage.removeItem('currentTenant');
      setTenantState(null);
    }
  }, []);

  const clearTenant = useCallback(async () => {
    await storage.removeItem('currentTenant');
    setTenantState(null);
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, isLoading, setTenant, clearTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
