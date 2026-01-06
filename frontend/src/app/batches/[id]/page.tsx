'use client'

/**
 * Batch Detail Page
 * 
 * Shows batch details and all games in the batch.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { clsx } from 'clsx'
import { ArrowLeft, Loader2, Play, XCircle, ChevronRight, Gamepad2 } from 'lucide-react'

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-yellow-100 text-yellow-800',
}

const gameStatusColors: Record<string, string> = {
  created: 'bg-gray-100 text-gray-600',
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-600',
  generating: 'bg-blue-100 text-blue-600',
  completed: 'bg-green-100 text-green-600',
  failed: 'bg-red-100 text-red-600',
  cancelled: 'bg-yellow-100 text-yellow-600',
}

export default function BatchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const batchId = params.id as string

  const { data: batch, isLoading, error } = useQuery({
    queryKey: ['batch', batchId],
    queryFn: () => api.getBatch(batchId),
    refetchInterval: (query) => {
      // Auto-refresh while batch is running
      if (query.state.data?.status === 'running') return 5000
      return false
    },
  })

  const startBatch = useMutation({
    mutationFn: () => api.startBatch(batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch', batchId] })
      queryClient.invalidateQueries({ queryKey: ['batches'] })
    },
  })

  const cancelBatch = useMutation({
    mutationFn: () => api.cancelBatch(batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch', batchId] })
      queryClient.invalidateQueries({ queryKey: ['batches'] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error || !batch) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Failed to load batch</p>
        <Link href="/batches" className="text-indigo-600 hover:underline">
          Back to batches
        </Link>
      </div>
    )
  }

  const completedGames = batch.games?.filter((g: any) => g.status === 'completed').length || 0
  const progressPercentage = batch.game_count > 0 ? (completedGames / batch.game_count) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/batches"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{batch.name}</h1>
              <span
                className={clsx(
                  'px-3 py-1 text-sm font-medium rounded-full',
                  statusColors[batch.status] || statusColors.pending
                )}
              >
                {batch.status}
              </span>
            </div>
            <p className="text-gray-600">
              Created {formatDistanceToNow(new Date(batch.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {batch.status === 'pending' && (
            <button
              onClick={() => startBatch.mutate()}
              disabled={startBatch.isPending}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              {startBatch.isPending ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Play className="h-5 w-5 mr-2" />
              )}
              Start Batch
            </button>
          )}
          {(batch.status === 'pending' || batch.status === 'running') && (
            <button
              onClick={() => cancelBatch.mutate()}
              disabled={cancelBatch.isPending}
              className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 transition-colors"
            >
              {cancelBatch.isPending ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-5 w-5 mr-2" />
              )}
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-500">
            {completedGames} / {batch.game_count} games
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={clsx(
              'h-3 rounded-full transition-all duration-500',
              batch.status === 'completed' ? 'bg-green-500' :
              batch.status === 'failed' ? 'bg-red-500' :
              batch.status === 'cancelled' ? 'bg-yellow-500' :
              'bg-indigo-600'
            )}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{batch.game_count}</p>
            <p className="text-sm text-gray-500">Total Games</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{completedGames}</p>
            <p className="text-sm text-gray-500">Completed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {batch.genre_mix?.length || 0}
            </p>
            <p className="text-sm text-gray-500">Genres</p>
          </div>
        </div>
      </div>

      {/* Genre Mix */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Genre Mix</h2>
        <div className="flex flex-wrap gap-2">
          {batch.genre_mix?.map((genre: string) => (
            <span
              key={genre}
              className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
            >
              {genre}
            </span>
          ))}
        </div>
      </div>

      {/* Games List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Games</h2>
        </div>

        {!batch.games || batch.games.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Gamepad2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No games generated yet</p>
            <p className="text-sm">Games will appear here as they are created</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {batch.games.map((game: any) => (
              <li key={game.id}>
                <Link
                  href={`/games/${game.id}`}
                  className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className={clsx(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          gameStatusColors[game.status] || 'bg-gray-100'
                        )}
                      >
                        <Gamepad2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{game.name}</p>
                        <p className="text-sm text-gray-500">
                          {game.genre} • Step {game.current_step}/12
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span
                        className={clsx(
                          'px-2.5 py-0.5 text-xs font-medium rounded-full',
                          gameStatusColors[game.status] || 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {game.status}
                      </span>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

