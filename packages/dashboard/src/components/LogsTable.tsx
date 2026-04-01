'use client';

interface Message {
  id: string;
  content: string;
  riskScore: number;
  action: string;
  createdAt: string;
  user: {
    username: string;
    discordId: string;
  };
  threats: Array<{
    type: string;
    severity: string;
    reasoning: string;
  }>;
}

interface LogsTableProps {
  messages: Message[];
}

const actionColors: Record<string, string> = {
  delete: 'bg-danger/20 text-danger',
  warn: 'bg-warning/20 text-warning',
  allow: 'bg-safe/20 text-safe',
};

function getRiskColor(score: number): string {
  if (score > 80) return 'text-danger';
  if (score > 50) return 'text-warning';
  return 'text-safe';
}

export default function LogsTable({ messages }: LogsTableProps) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No messages found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-dark-700">
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">User</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Content</th>
            <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Risk</th>
            <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Action</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Threat Type</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Time</th>
          </tr>
        </thead>
        <tbody>
          {messages.map((msg) => (
            <tr key={msg.id} className="border-b border-dark-700/50 hover:bg-dark-800/50">
              <td className="py-3 px-4 text-sm text-white">
                {msg.user?.username || 'Unknown'}
              </td>
              <td className="py-3 px-4 text-sm text-gray-300 max-w-xs truncate">
                {msg.content}
              </td>
              <td className="py-3 px-4 text-sm text-center">
                <span className={`font-bold ${getRiskColor(msg.riskScore)}`}>
                  {msg.riskScore}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-center">
                <span className={`px-2 py-1 rounded text-xs font-medium ${actionColors[msg.action] || ''}`}>
                  {msg.action.toUpperCase()}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-gray-400">
                {msg.threats?.[0]?.type || '—'}
              </td>
              <td className="py-3 px-4 text-sm text-gray-500 text-right">
                {new Date(msg.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
