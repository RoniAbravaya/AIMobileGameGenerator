'use client'

/**
 * Game Detail Page
 * 
 * Shows game details, step progress, and logs for monitoring generation.
 */

import { useQuery } from '@tanstack/react-query'
import { api, LogEntry } from '@/lib/api'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { clsx } from 'clsx'
import { 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  PlayCircle,
  Github,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  AlertTriangle
} from 'lucide-react'
import { useState } from 'react'

const stepNames: Record<number, string> = {
  1: 'Pre-Production (GDD)',
  2: 'Project Setup',
  3: 'Architecture',
  4: 'Analytics Design',
  5: 'Analytics Implementation',
  6: 'Core Prototype',
  7: 'Asset Generation',
  8: 'Vertical Slice',
  9: 'Content Production',
  10: 'Testing',
  11: 'Release Prep',
  12: 'Post-Launch',
}

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-5 w-5 text-gray-400" />,
  running: <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />,
  completed: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  failed: <XCircle className="h-5 w-5 text-red-500" />,
  skipped: <Clock className="h-5 w-5 text-gray-300" />,
}

const statusColors: Record<string, string> = {
  created: 'bg-gray-100 text-gray-800',
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  generating: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-yellow-100 text-yellow-800',
}

interface Step {
  id: string
  step_number: number
  step_name: string
  status: string
  started_at?: string
  completed_at?: string
  error_message?: string
  artifacts?: Record<string, unknown>
  validation_results?: Record<string, unknown>
}

interface Game {
  id: string
  name: string
  slug: string
  genre: string
  status: string
  current_step: number
  github_repo_url?: string
  gdd_spec?: Record<string, unknown>
  created_at: string
  updated_at: string
  steps?: Step[]
}

export default function GameDetailPage() {
  const params = useParams()
  const gameId = params.id as string
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())

  const { data: game, isLoading, error } = useQuery<Game>({
    queryKey: ['game', gameId],
    queryFn: () => api.getGame(gameId),
    refetchInterval: (query) => {
      // Auto-refresh while game is in progress
      const status = query.state.data?.status
      if (status === 'in_progress' || status === 'generating') return 3000
      return false
    },
  })

  // Fetch logs for this game
  const { data: logs } = useQuery<LogEntry[]>({
    queryKey: ['game-logs', gameId],
    queryFn: () => api.getGameLogs(gameId, 200),
    refetchInterval: (query) => {
      // Auto-refresh logs while game is in progress
      if (game?.status === 'in_progress' || game?.status === 'generating') return 2000
      return false
    },
    enabled: !!game,
  })

  const toggleStep = (stepNumber: number) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev)
      if (newSet.has(stepNumber)) {
        newSet.delete(stepNumber)
      } else {
        newSet.add(stepNumber)
      }
      return newSet
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
        <p className="text-red-600 mb-4">Failed to load game</p>
        <Link href="/batches" className="text-indigo-600 hover:underline">
          Back to batches
        </Link>
      </div>
    )
  }

  const progressPercentage = (game.current_step / 12) * 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href={`/batches`}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{game.name}</h1>
              <span
                className={clsx(
                  'px-3 py-1 text-sm font-medium rounded-full',
                  statusColors[game.status] || statusColors.pending
                )}
              >
                {game.status}
              </span>
            </div>
            <p className="text-gray-600">
              {game.genre} • Step {game.current_step}/12 • 
              Created {formatDistanceToNow(new Date(game.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        {game.github_repo_url && (
          <a
            href={game.github_repo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Github className="h-5 w-5 mr-2" />
            View on GitHub
            <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        )}
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Generation Progress</span>
          <span className="text-sm text-gray-500">
            Step {game.current_step} / 12
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={clsx(
              'h-3 rounded-full transition-all duration-500',
              game.status === 'completed' ? 'bg-green-500' :
              game.status === 'failed' ? 'bg-red-500' :
              'bg-indigo-600'
            )}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* GDD Summary */}
      {game.gdd_spec && Object.keys(game.gdd_spec).length > 0 && (() => {
        const gdd = game.gdd_spec as Record<string, string | number | boolean | null>
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Game Design Document</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {gdd.name && (
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{String(gdd.name)}</p>
                </div>
              )}
              {gdd.genre && (
                <div>
                  <p className="text-sm text-gray-500">Genre</p>
                  <p className="font-medium">{String(gdd.genre)}</p>
                </div>
              )}
              {gdd.art_style && (
                <div>
                  <p className="text-sm text-gray-500">Art Style</p>
                  <p className="font-medium">{String(gdd.art_style)}</p>
                </div>
              )}
              {gdd.session_length && (
                <div>
                  <p className="text-sm text-gray-500">Session Length</p>
                  <p className="font-medium">{String(gdd.session_length)}</p>
                </div>
              )}
            </div>
            {gdd.description && (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Description</p>
                <p className="text-gray-700">{String(gdd.description)}</p>
              </div>
            )}
          </div>
        )
      })()}

      {/* Steps Progress */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Pipeline Steps</h2>
          <p className="text-sm text-gray-500">Click on a step to see details and logs</p>
        </div>

        <div className="divide-y divide-gray-200">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((stepNumber) => {
            const step = game.steps?.find(s => s.step_number === stepNumber)
            const isExpanded = expandedSteps.has(stepNumber)
            const isCurrent = stepNumber === game.current_step
            const isPast = stepNumber < game.current_step
            const isFuture = stepNumber > game.current_step

            return (
              <div key={stepNumber} className={clsx(
                'transition-colors',
                isCurrent && 'bg-blue-50',
                step?.status === 'failed' && 'bg-red-50'
              )}>
                <button
                  onClick={() => step && toggleStep(stepNumber)}
                  disabled={!step}
                  className={clsx(
                    'w-full px-6 py-4 flex items-center justify-between text-left',
                    step ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
                  )}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {step ? statusIcons[step.status] : (
                        isFuture ? <Clock className="h-5 w-5 text-gray-300" /> :
                        <PlayCircle className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className={clsx(
                        'font-medium',
                        isFuture ? 'text-gray-400' : 'text-gray-900'
                      )}>
                        Step {stepNumber}: {stepNames[stepNumber]}
                      </p>
                      {step?.started_at && (
                        <p className="text-sm text-gray-500">
                          Started {formatDistanceToNow(new Date(step.started_at), { addSuffix: true })}
                          {step.completed_at && ` • Completed ${formatDistanceToNow(new Date(step.completed_at), { addSuffix: true })}`}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {step?.status === 'failed' && (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                    {step && (
                      isExpanded ? 
                        <ChevronDown className="h-5 w-5 text-gray-400" /> :
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Step Details */}
                {step && isExpanded && (
                  <div className="px-6 pb-4 space-y-4">
                    {/* Error Message */}
                    {step.error_message && (
                      <div className="bg-red-100 border border-red-200 rounded-lg p-4">
                        <h4 className="font-medium text-red-800 mb-2">Error</h4>
                        <pre className="text-sm text-red-700 whitespace-pre-wrap font-mono overflow-x-auto">
                          {step.error_message}
                        </pre>
                      </div>
                    )}

                    {/* Validation Results */}
                    {step.validation_results && Object.keys(step.validation_results).length > 0 && (
                      <div className="bg-gray-100 rounded-lg p-4">
                        <h4 className="font-medium text-gray-800 mb-2">Validation Results</h4>
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono overflow-x-auto">
                          {JSON.stringify(step.validation_results, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Artifacts */}
                    {step.artifacts && Object.keys(step.artifacts).length > 0 && (
                      <div className="bg-gray-100 rounded-lg p-4">
                        <h4 className="font-medium text-gray-800 mb-2">Artifacts</h4>
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono overflow-x-auto max-h-64 overflow-y-auto">
                          {JSON.stringify(step.artifacts, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* No details available */}
                    {!step.error_message && 
                     (!step.validation_results || Object.keys(step.validation_results).length === 0) &&
                     (!step.artifacts || Object.keys(step.artifacts).length === 0) && (
                      <p className="text-sm text-gray-500 italic">No additional details available for this step.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Live Logs */}
      <div className="bg-gray-900 rounded-lg shadow-sm border border-gray-700">
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Live Logs</h2>
            <p className="text-sm text-gray-400">
              {game.status === 'in_progress' || game.status === 'generating' 
                ? '🔴 Auto-refreshing every 2 seconds...' 
                : 'Generation complete'}
            </p>
          </div>
          <span className="text-sm text-gray-500">{logs?.length || 0} entries</span>
        </div>
        
        <div className="p-4 max-h-96 overflow-y-auto font-mono text-sm">
          {!logs || logs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              <p>No logs yet.</p>
              <p className="text-xs mt-2">Logs will appear here when the game generation starts.</p>
              <p className="text-xs text-yellow-500 mt-4">
                💡 Make sure the batch has been started and Celery worker is running.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className={clsx(
                    'py-1 px-2 rounded',
                    log.log_level === 'error' && 'bg-red-900/30 text-red-300',
                    log.log_level === 'warning' && 'bg-yellow-900/30 text-yellow-300',
                    log.log_level === 'info' && 'text-green-300',
                    log.log_level === 'debug' && 'text-gray-400',
                  )}
                >
                  <span className="text-gray-500">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                  {' '}
                  <span className={clsx(
                    'font-bold',
                    log.log_level === 'error' && 'text-red-400',
                    log.log_level === 'warning' && 'text-yellow-400',
                    log.log_level === 'info' && 'text-blue-400',
                    log.log_level === 'debug' && 'text-gray-500',
                  )}>
                    [{log.log_level.toUpperCase()}]
                  </span>
                  {' '}
                  <span className="text-purple-400">[{log.log_type}]</span>
                  {log.step_number !== null && log.step_number !== undefined && (
                    <span className="text-cyan-400"> [Step {log.step_number}]</span>
                  )}
                  {' '}
                  <span className="text-gray-200">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Raw Game Data (for debugging) */}
      <details className="bg-white rounded-lg shadow-sm border border-gray-200">
        <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50">
          <span className="font-medium text-gray-700">Raw Game Data (Debug)</span>
        </summary>
        <div className="px-6 pb-4">
          <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono overflow-x-auto bg-gray-50 p-4 rounded">
            {JSON.stringify(game, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  )
}
