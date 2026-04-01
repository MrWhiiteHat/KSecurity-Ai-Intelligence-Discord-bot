'use client';

import { useState, useEffect } from 'react';
import { fetchConfig, updateConfig } from '@/lib/api';

interface SettingsFormProps {
  serverId: string;
}

export default function SettingsForm({ serverId }: SettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    aiWeight: 0.5,
    urlWeight: 0.3,
    behaviorWeight: 0.2,
    deleteThreshold: 80,
    warnThreshold: 50,
    moderationRoleId: '',
  });

  useEffect(() => {
    if (serverId) {
      fetchConfig(serverId)
        .then((config) => {
          setFormData({
            aiWeight: config.aiWeight ?? 0.5,
            urlWeight: config.urlWeight ?? 0.3,
            behaviorWeight: config.behaviorWeight ?? 0.2,
            deleteThreshold: config.deleteThreshold ?? 80,
            warnThreshold: config.warnThreshold ?? 50,
            moderationRoleId: config.server?.moderationRoleId || '',
          });
        })
        .catch(() => {
          // Use defaults if config not found
        });
    }
  }, [serverId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    try {
      await updateConfig({ serverId, ...formData });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Error handled by API
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: parseFloat(value) || value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            AI Weight ({formData.aiWeight})
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={formData.aiWeight}
            onChange={(e) => handleChange('aiWeight', e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            URL Weight ({formData.urlWeight})
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={formData.urlWeight}
            onChange={(e) => handleChange('urlWeight', e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Behavior Weight ({formData.behaviorWeight})
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={formData.behaviorWeight}
            onChange={(e) => handleChange('behaviorWeight', e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Delete Threshold ({formData.deleteThreshold})
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={formData.deleteThreshold}
            onChange={(e) => handleChange('deleteThreshold', e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Warn Threshold ({formData.warnThreshold})
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={formData.warnThreshold}
            onChange={(e) => handleChange('warnThreshold', e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Moderation Role ID
          </label>
          <input
            type="text"
            value={formData.moderationRoleId}
            onChange={(e) => handleChange('moderationRoleId', e.target.value)}
            className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Role ID for mod alerts"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-md transition-colors"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>

        {saved && (
          <span className="text-safe text-sm">Settings saved!</span>
        )}
      </div>
    </form>
  );
}
