'use client'

/**
 * Recent Batches Component
 * 
 * Shows the most recent batch generations.
 */

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { clsx } from 'clsx'
import { ChevronRight, Plus } from 'lucide-react'

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-yellow-100 text-yellow-800',
}

export function RecentBatches() {
  const { data: batches, isLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: () => api.listBatches(0, 5),
  })

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Recent Batches</h2>
        <Link
          href="/batches/new"
          className="inline-flex items-center px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-1" />
          New Batch
        </Link>
      </div>

      {isLoading ? (
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-16 bg-gray-100 rounded" />
          ))}
        </div>
      ) : batches?.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          No batches yet. Create your first batch to start generating games.
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {batches?.map((batch: any) => (
            <li key={batch.id}>
              <Link
                href={`/batches/${batch.id}`}
                className="block px-6 py-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{batch.name}</p>
                    <p className="text-sm text-gray-500">
                      {batch.game_count} games • {batch.completed_games || 0} completed
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={clsx(
                        'px-2 py-1 text-xs font-medium rounded-full',
                        statusColors[batch.status] || statusColors.pending
                      )}
                    >
                      {batch.status}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(batch.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
        <Link
          href="/batches"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View all batches →
        </Link>
      </div>
    </div>
  )
}
