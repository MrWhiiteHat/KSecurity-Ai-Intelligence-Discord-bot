'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import ThreatCard from '@/components/ThreatCard';
import { fetchStats } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-white mb-8">Dashboard Overview</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <ThreatCard
            title="Total Messages Scanned"
            value={stats?.totalMessages || 0}
            color="blue"
          />
          <ThreatCard
            title="Threats Detected"
            value={stats?.totalThreats || 0}
            color="danger"
          />
          <ThreatCard
            title="Messages Deleted"
            value={stats?.actionBreakdown?.delete || 0}
            color="danger"
            trend="Auto-removed"
          />
          <ThreatCard
            title="Warnings Issued"
            value={stats?.actionBreakdown?.warn || 0}
            color="warning"
            trend="Flagged for review"
          />
        </div>

        {stats?.threatTypes && stats.threatTypes.length > 0 && (
          <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Threat Breakdown</h2>
            <div className="space-y-3">
              {stats.threatTypes.map((t: any) => (
                <div key={t.type} className="flex justify-between items-center">
                  <span className="text-gray-300 capitalize">{t.type}</span>
                  <span className="text-white font-medium">{t.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
