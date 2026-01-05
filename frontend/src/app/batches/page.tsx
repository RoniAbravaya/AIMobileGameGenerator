'use client'

/**
 * Batches List Page
 * 
 * Displays all batch generations with status and actions.
 */

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { clsx } from 'clsx'
import { Plus, ChevronRight, Loader2 } from 'lucide-react'

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-yellow-100 text-yellow-800',
}

export default function BatchesPage() {
  const { data: batches, isLoading } = useQuery({
    queryKey: ['batches-all'],
    queryFn: () => api.listBatches(0, 100),
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batches</h1>
          <p className="text-gray-600">Manage your game generation batches</p>
        </div>
        <Link
          href="/batches/new"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Batch
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : batches?.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-4">No batches yet</p>
            <Link
              href="/batches/new"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Batch
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {batches?.map((batch: any) => (
              <li key={batch.id}>
                <Link
                  href={`/batches/${batch.id}`}
                  className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <p className="font-semibold text-gray-900">{batch.name}</p>
                        <span
                          className={clsx(
                            'px-2.5 py-0.5 text-xs font-medium rounded-full',
                            statusColors[batch.status] || statusColors.pending
                          )}
                        >
                          {batch.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {batch.game_count} games • {batch.completed_games || 0} completed
                        {batch.progress_percentage > 0 && batch.progress_percentage < 100 && (
                          <span className="ml-2">• {batch.progress_percentage.toFixed(0)}% progress</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(batch.created_at), { addSuffix: true })}
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

