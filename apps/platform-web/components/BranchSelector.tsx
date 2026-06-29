'use client'

import { useState, useEffect } from 'react'
import { branchesApi, branchReportsApi } from '@/lib/api'

interface Branch {
  id: string
  code: string
  name: string
  city?: string
  isHeadquarters: boolean
  status: string
}

interface BranchSelectorProps {
  selectedBranchId: string | null
  onChange: (branchId: string | null) => void
  showAll?: boolean
}

export default function BranchSelector({ selectedBranchId, onChange, showAll = true }: BranchSelectorProps) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    loadBranches()
  }, [])

  async function loadBranches() {
    setLoading(true)
    const result = await branchesApi.list({ status: 'active' })
    if (result.data) {
      setBranches(result.data)
    }
    setLoading(false)
  }

  const selectedBranch = branches.find(b => b.id === selectedBranchId)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
      >
        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <span className="font-medium text-gray-700">
          {selectedBranch ? selectedBranch.name : 'All Branches'}
        </span>
        {selectedBranch?.isHeadquarters && (
          <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">HQ</span>
        )}
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg z-50 border border-gray-200">
          <div className="py-1">
            {showAll && (
              <button
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2 hover:bg-gray-50 text-sm ${
                  !selectedBranchId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span>All Branches</span>
                </div>
              </button>
            )}
            {branches.map((branch) => (
              <button
                key={branch.id}
                onClick={() => {
                  onChange(branch.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2 hover:bg-gray-50 text-sm ${
                  selectedBranchId === branch.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <div>
                      <div className="font-medium">{branch.name}</div>
                      {branch.city && (
                        <div className="text-xs text-gray-500">{branch.city}</div>
                      )}
                    </div>
                  </div>
                  {branch.isHeadquarters && (
                    <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">HQ</span>
                  )}
                </div>
              </button>
            ))}
            {branches.length === 0 && !loading && (
              <div className="px-4 py-3 text-sm text-gray-500">No branches available</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
