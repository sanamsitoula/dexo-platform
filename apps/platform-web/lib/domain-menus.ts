'use client'

import { useState, useEffect, useMemo } from 'react'
import { domainsApi } from '@/lib/api'

interface MenuItem {
  id: string
  code: string
  label: string
  icon: string
  route: string
  moduleCode: string
  sortOrder: number
  isPublic: boolean
  isVisible: boolean
  requiredPlan: string | null
  parentId: string | null
  children: MenuItem[]
}

interface MenuItemFlat {
  id: string
  code: string
  label: string
  icon: string
  route: string
  moduleCode: string
  sortOrder: number
  isPublic: boolean
  isVisible: boolean
  requiredPlan: string | null
  parentId: string | null
}

export function useDomainMenus(domainCode: string | undefined, roleCode: string | undefined) {
  const [menus, setMenus] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!domainCode) {
      setMenus([])
      setLoading(false)
      return
    }

    const fetchMenus = async () => {
      try {
        setLoading(true)
        const response = await domainsApi.getMenus(domainCode, roleCode)
        if (response.data) {
          setMenus(buildMenuTree(response.data))
        } else if (response.error) {
          setError(response.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch menus')
      } finally {
        setLoading(false)
      }
    }

    fetchMenus()
  }, [domainCode, roleCode])

  return { menus, loading, error }
}

function buildMenuTree(flatMenus: MenuItemFlat[]): MenuItem[] {
  const menuMap = new Map<string, MenuItem>()
  const roots: MenuItem[] = []

  // First pass: create all menu items
  for (const flat of flatMenus) {
    menuMap.set(flat.id, {
      ...flat,
      children: [],
    })
  }

  // Second pass: build tree structure
  for (const flat of flatMenus) {
    const menuItem = menuMap.get(flat.id)!
    if (flat.parentId) {
      const parent = menuMap.get(flat.parentId)
      if (parent) {
        parent.children.push(menuItem)
      } else {
        roots.push(menuItem)
      }
    } else {
      roots.push(menuItem)
    }
  }

  // Sort by sortOrder
  const sortMenus = (items: MenuItem[]) => {
    items.sort((a, b) => a.sortOrder - b.sortOrder)
    for (const item of items) {
      sortMenus(item.children)
    }
  }
  sortMenus(roots)

  return roots
}

export function getMenuRoutes(menus: MenuItem[]): string[] {
  const routes: string[] = []
  for (const menu of menus) {
    if (menu.route) routes.push(menu.route)
    if (menu.children.length > 0) {
      routes.push(...getMenuRoutes(menu.children))
    }
  }
  return routes
}