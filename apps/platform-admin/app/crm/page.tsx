'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ContactMessage {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  subject: string | null
  message: string
  screenshot: string | null
  source: string | null
  status: 'NEW' | 'READ' | 'REPLIED' | 'ARCHIVED' | 'SPAM'
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  notes: string | null
  createdAt: string
  repliedAt: string | null
  assignedTo?: { id: string; firstName: string; lastName: string; email: string } | null
}

interface Stats {
  total: number
  new: number
  read: number
  replied: number
  archived: number
  spam: number
}

export default function CRMPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, new: 0, read: 0, replied: 0, archived: 0, spam: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null)
  const [showScreenshot, setShowScreenshot] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  const limit = 20

  useEffect(() => {
    fetchMessages()
    fetchStats()
  }, [page, statusFilter, search])

  async function fetchMessages() {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('accessToken')
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (search) params.append('search', search)

      const res = await fetch(`http://localhost:4000/api/contact?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.status === 401) {
        router.push('/login')
        return
      }

      const data = await res.json()
      if (data.data) {
        setMessages(data.data)
        setTotal(data.pagination.total)
        setTotalPages(data.pagination.totalPages)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load messages')
    }
    setLoading(false)
  }

  async function fetchStats() {
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('http://localhost:4000/api/contact/stats', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data && !data.error) setStats(data)
    } catch {}
  }

  async function updateStatus(id: string, status: string) {
    const token = localStorage.getItem('accessToken')
    await fetch(`http://localhost:4000/api/contact/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    })
    fetchMessages()
    fetchStats()
  }

  async function sendReply(id: string) {
    if (!replyText.trim()) return
    const token = localStorage.getItem('accessToken')
    await fetch(`http://localhost:4000/api/contact/${id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ replyMessage: replyText }),
    })
    setReplyText('')
    setSelectedMessage(null)
    fetchMessages()
    fetchStats()
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      NEW: 'bg-blue-100 text-blue-800',
      READ: 'bg-gray-100 text-gray-800',
      REPLIED: 'bg-green-100 text-green-800',
      ARCHIVED: 'bg-yellow-100 text-yellow-800',
      SPAM: 'bg-red-100 text-red-800',
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  function getPriorityBadge(priority: string) {
    const styles: Record<string, string> = {
      LOW: 'bg-gray-100 text-gray-700',
      NORMAL: 'bg-blue-100 text-blue-700',
      HIGH: 'bg-orange-100 text-orange-700',
      URGENT: 'bg-red-100 text-red-700',
    }
    return styles[priority] || 'bg-gray-100'
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CRM · Contact Messages</h1>
          <p className="mt-1 text-gray-600">Customer inquiries from the platform contact form</p>
        </div>
        <button
          onClick={() => { fetchMessages(); fetchStats() }}
          className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="Total" value={stats.total} color="indigo" />
        <StatCard label="New" value={stats.new} color="blue" pulse={stats.new > 0} />
        <StatCard label="Read" value={stats.read} color="gray" />
        <StatCard label="Replied" value={stats.replied} color="green" />
        <StatCard label="Archived" value={stats.archived} color="yellow" />
        <StatCard label="Spam" value={stats.spam} color="red" />
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="🔍 Search by name, email, subject, company…"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="NEW">New</option>
            <option value="READ">Read</option>
            <option value="REPLIED">Replied</option>
            <option value="ARCHIVED">Archived</option>
            <option value="SPAM">Spam</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">⚠️ {error}</div>
      )}

      {/* Messages Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-2xl mb-2">📭</p>
            <p>No messages found</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {messages.map((m) => (
                <tr key={m.id} className={`hover:bg-gray-50 ${m.status === 'NEW' ? 'bg-blue-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{m.name}</div>
                    <div className="text-xs text-gray-500">{m.email}</div>
                    {m.phone && <div className="text-xs text-gray-500">📞 {m.phone}</div>}
                    {m.company && <div className="text-xs text-indigo-600">🏢 {m.company}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {m.subject || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-700 line-clamp-2 max-w-xs">{m.message}</p>
                    {m.screenshot && (
                      <button
                        onClick={() => setShowScreenshot(m.screenshot)}
                        className="text-xs text-indigo-600 hover:text-indigo-700 mt-1"
                      >
                        📎 View attachment
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(m.status)}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityBadge(m.priority)}`}>
                      {m.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(m.createdAt).toLocaleDateString()}
                    <div className="text-gray-400">{new Date(m.createdAt).toLocaleTimeString()}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedMessage(m)}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white shadow rounded-lg px-4 py-3">
          <div className="text-sm text-gray-600">
            Showing page {page} of {totalPages} · {total} total
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm disabled:opacity-50"
            >
              ← Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1
                if (totalPages > 5) {
                  if (page > 3) pageNum = page - 2 + i
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i)
                }
                return (
                  <button
                    key={i}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded text-sm ${
                      page === pageNum ? 'bg-indigo-600 text-white' : 'border border-gray-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedMessage.subject || 'Contact Message'}</h2>
                <p className="text-sm text-gray-500">From {selectedMessage.name}</p>
              </div>
              <button onClick={() => setSelectedMessage(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Email</p>
                  <a href={`mailto:${selectedMessage.email}`} className="text-sm text-indigo-600 hover:underline">{selectedMessage.email}</a>
                </div>
                {selectedMessage.phone && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Phone</p>
                    <a href={`tel:${selectedMessage.phone}`} className="text-sm text-indigo-600 hover:underline">{selectedMessage.phone}</a>
                  </div>
                )}
                {selectedMessage.company && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Company</p>
                    <p className="text-sm text-gray-900">{selectedMessage.company}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 uppercase">Received</p>
                  <p className="text-sm text-gray-900">{new Date(selectedMessage.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(selectedMessage.status)}`}>
                  {selectedMessage.status}
                </span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityBadge(selectedMessage.priority)}`}>
                  {selectedMessage.priority}
                </span>
                {selectedMessage.screenshot && (
                  <button
                    onClick={() => setShowScreenshot(selectedMessage.screenshot)}
                    className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-full"
                  >
                    📎 Attachment
                  </button>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Message</p>
                <div className="bg-gray-50 rounded-md p-4 text-sm text-gray-900 whitespace-pre-wrap">
                  {selectedMessage.message}
                </div>
              </div>

              {selectedMessage.notes && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Internal Notes</p>
                  <div className="bg-yellow-50 rounded-md p-3 text-sm text-gray-900 whitespace-pre-wrap border border-yellow-200">
                    {selectedMessage.notes}
                  </div>
                </div>
              )}

              {/* Status actions */}
              <div>
                <p className="text-xs text-gray-500 uppercase mb-2">Quick Actions</p>
                <div className="flex flex-wrap gap-2">
                  {selectedMessage.status === 'NEW' && (
                    <button
                      onClick={() => { updateStatus(selectedMessage.id, 'READ'); setSelectedMessage({ ...selectedMessage, status: 'READ' }) }}
                      className="px-3 py-1.5 text-xs bg-gray-100 rounded hover:bg-gray-200"
                    >
                      Mark as Read
                    </button>
                  )}
                  {selectedMessage.status !== 'REPLIED' && (
                    <button
                      onClick={() => { updateStatus(selectedMessage.id, 'REPLIED'); setSelectedMessage({ ...selectedMessage, status: 'REPLIED' }) }}
                      className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      Mark as Replied
                    </button>
                  )}
                  {selectedMessage.status !== 'ARCHIVED' && (
                    <button
                      onClick={() => { updateStatus(selectedMessage.id, 'ARCHIVED'); setSelectedMessage({ ...selectedMessage, status: 'ARCHIVED' }) }}
                      className="px-3 py-1.5 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                    >
                      Archive
                    </button>
                  )}
                  {selectedMessage.status !== 'SPAM' && (
                    <button
                      onClick={() => { updateStatus(selectedMessage.id, 'SPAM'); setSelectedMessage({ ...selectedMessage, status: 'SPAM' }) }}
                      className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Mark as Spam
                    </button>
                  )}
                </div>
              </div>

              {/* Reply form */}
              {selectedMessage.status !== 'REPLIED' && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Reply</p>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={4}
                    placeholder={`Hi ${selectedMessage.name},\n\nThank you for reaching out…`}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => sendReply(selectedMessage.id)}
                    disabled={!replyText.trim()}
                    className="mt-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Send Reply
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Viewer Modal */}
      {showScreenshot && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setShowScreenshot(null)}>
          <div className="max-w-4xl max-h-[90vh] overflow-auto">
            <img src={showScreenshot} alt="Screenshot" className="rounded" />
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color, pulse }: { label: string; value: number; color: string; pulse?: boolean }) {
  const colorClasses: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-900',
    blue: 'bg-blue-50 text-blue-900',
    gray: 'bg-gray-50 text-gray-900',
    green: 'bg-green-50 text-green-900',
    yellow: 'bg-yellow-50 text-yellow-900',
    red: 'bg-red-50 text-red-900',
  }
  return (
    <div className={`rounded-lg p-4 ${colorClasses[color]} ${pulse ? 'ring-2 ring-blue-400' : ''}`}>
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  )
}
