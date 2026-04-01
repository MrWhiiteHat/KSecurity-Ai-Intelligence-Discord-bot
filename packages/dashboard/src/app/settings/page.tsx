'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import SettingsForm from '@/components/SettingsForm';
import { isAuthenticated } from '@/lib/auth';

export default function SettingsPage() {
  const router = useRouter();
  const [serverId, setServerId] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-dark-900">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

        <div className="bg-dark-800 rounded-lg border border-dark-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Select Server</h2>
          <input
            type="text"
            value={serverId}
            onChange={(e) => setServerId(e.target.value)}
            className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter Discord Server ID"
          />
          <p className="text-sm text-gray-500 mt-2">
            Right-click your server icon - Copy Server ID (enable Developer Mode in Discord settings)
          </p>
        </div>

        {serverId && (
          <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-6">
              Detection Configuration
            </h2>
            <SettingsForm serverId={serverId} />
          </div>
        )}
      </main>
    </div>
  );
}
