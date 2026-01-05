/**
 * Dashboard Page
 * 
 * Main dashboard showing overview of batches, games, and metrics.
 */

import { Suspense } from 'react'
import { DashboardStats } from '@/components/DashboardStats'
import { RecentBatches } from '@/components/RecentBatches'
import { TopGames } from '@/components/TopGames'

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Overview of game generation and performance metrics
        </p>
      </div>

      <Suspense fallback={<div className="animate-pulse h-32 bg-gray-200 rounded-lg" />}>
        <DashboardStats />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Suspense fallback={<div className="animate-pulse h-64 bg-gray-200 rounded-lg" />}>
          <RecentBatches />
        </Suspense>
        
        <Suspense fallback={<div className="animate-pulse h-64 bg-gray-200 rounded-lg" />}>
          <TopGames />
        </Suspense>
      </div>
    </div>
  )
}
