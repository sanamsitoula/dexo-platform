import { promises as fs } from 'fs'
import path from 'path'
import ErrorLogsPanel from '@/components/ErrorLogsPanel'

export const dynamic = 'force-dynamic'

interface LogFile {
  service: string
  filename: string
  path: string
  size: number
  mtime: string
}

async function getLogFiles(): Promise<LogFile[]> {
  const logsDir = path.join(process.cwd(), '..', '..', 'logs')
  const files: LogFile[] = []

  try {
    const services = await fs.readdir(logsDir)
    for (const service of services) {
      const serviceDir = path.join(logsDir, service)
      const stat = await fs.stat(serviceDir)
      if (!stat.isDirectory()) continue

      const entries = await fs.readdir(serviceDir)
      for (const filename of entries) {
        const filePath = path.join(serviceDir, filename)
        const fstat = await fs.stat(filePath)
        if (!fstat.isFile()) continue
        files.push({
          service,
          filename,
          path: filePath.replace(/\\/g, '/'),
          size: fstat.size,
          mtime: fstat.mtime.toISOString(),
        })
      }
    }
  } catch (e) {
    // logs dir missing
  }

  return files.sort((a, b) => b.mtime.localeCompare(a.mtime))
}

async function readLogFile(absPath: string, maxBytes = 200_000): Promise<string> {
  try {
    const buf = await fs.readFile(absPath)
    const start = Math.max(0, buf.length - maxBytes)
    return buf.slice(start).toString('utf8')
  } catch (e) {
    return `[error reading file: ${(e as Error).message}]`
  }
}

interface PageProps {
  searchParams: { file?: string; service?: string }
}

export default async function LogsPage({ searchParams }: PageProps) {
  const files = await getLogFiles()
  let selectedContent = ''
  let selectedFile: LogFile | null = null

  if (searchParams.file) {
    selectedFile = files.find((f) => f.path === searchParams.file) || null
    if (selectedFile) {
      selectedContent = await readLogFile(selectedFile.path)
    }
  }

  return (
    <div className="space-y-10">
      <ErrorLogsPanel />

      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Logs</h1>
        <p className="mt-2 text-gray-600">
          Real-time logs from all Dexo platform services. Files are timestamped on every restart.
          <span className="block mt-1 text-sm text-gray-500">
            Only shows output from services launched via run.bat/run.sh — a service you started manually
            (e.g. <code className="bg-gray-100 px-1 rounded">npm run dev</code> in its own terminal) won&apos;t
            appear here. Its 5xx errors still show above regardless.
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File list */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Log Files ({files.length})</h2>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {files.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No log files found.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {files.map((f) => {
                  const isSelected = selectedFile?.path === f.path
                  return (
                    <li key={f.path}>
                      <a
                        href={`/logs?file=${encodeURIComponent(f.path)}`}
                        className={`block px-4 py-3 hover:bg-gray-50 ${
                          isSelected ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-semibold text-indigo-700">
                            {f.service}
                          </span>
                          <span className="text-xs text-gray-500">
                            {(f.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <div className="text-xs text-gray-700 mt-1 font-mono truncate">
                          {f.filename}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {new Date(f.mtime).toLocaleString()}
                        </div>
                      </a>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Log content */}
        <div className="lg:col-span-2 bg-gray-900 rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              {selectedFile ? selectedFile.filename : 'Select a log file'}
            </h2>
            {selectedFile && (
              <span className="text-xs text-gray-400">
                Last {(selectedFile.size / 1024).toFixed(1)} KB
              </span>
            )}
          </div>
          <div className="p-4 overflow-auto max-h-[600px]">
            {selectedFile ? (
              <pre className="text-xs text-gray-200 font-mono whitespace-pre-wrap break-all">
                {selectedContent || '(empty)'}
              </pre>
            ) : (
              <p className="text-sm text-gray-500">Click a log file on the left to view its contents.</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <p className="font-semibold mb-1">How to use logs</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Each run of <code className="bg-blue-100 px-1 rounded">run.bat</code> creates a new timestamped log file.</li>
          <li>Files in <code className="bg-blue-100 px-1 rounded">logs/&lt;service&gt;/</code> are also viewable from the file system.</li>
          <li>Use <code className="bg-blue-100 px-1 rounded">powershell scripts/show-errors.ps1</code> for quick error summaries.</li>
        </ul>
      </div>
    </div>
  )
}
