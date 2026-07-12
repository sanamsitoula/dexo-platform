import { useState, useEffect } from 'react';
import { domainsApi } from './api';

export interface DomainMenuItem {
  id: string;
  code: string;
  label: string;
  icon: string;
  route: string;
  moduleCode: string;
  sortOrder: number;
  isVisible: boolean;
  parentId: string | null;
  children: DomainMenuItem[];
}

export function useDomainMenus(domainCode: string | undefined, roleCode: string | undefined) {
  const [menus, setMenus] = useState<DomainMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!domainCode) {
      setMenus([]);
      setLoading(false);
      return;
    }

    const fetchMenus = async () => {
      try {
        setLoading(true);
        const response = await domainsApi.getMenus(domainCode, roleCode);
        if (response.data) {
          setMenus(buildMenuTree(response.data));
        } else if (response.error) {
          setError(response.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch menus');
      } finally {
        setLoading(false);
      }
    };

    fetchMenus();
  }, [domainCode, roleCode]);

  return { menus, loading, error };
}

function buildMenuTree(flatMenus: any[]): DomainMenuItem[] {
  const menuMap = new Map<string, DomainMenuItem>();
  const roots: DomainMenuItem[] = [];

  for (const flat of flatMenus) {
    menuMap.set(flat.id, { ...flat, children: [] });
  }

  for (const flat of flatMenus) {
    const menuItem = menuMap.get(flat.id)!;
    if (flat.parentId) {
      const parent = menuMap.get(flat.parentId);
      if (parent) {
        parent.children.push(menuItem);
      } else {
        roots.push(menuItem);
      }
    } else {
      roots.push(menuItem);
    }
  }

  const sortMenus = (items: DomainMenuItem[]) => {
    items.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const item of items) {
      sortMenus(item.children);
    }
  };
  sortMenus(roots);

  return roots;
}
