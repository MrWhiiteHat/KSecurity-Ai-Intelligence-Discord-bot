interface ThreatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  color: 'danger' | 'warning' | 'safe' | 'blue';
}

const colorClasses = {
  danger: 'border-danger/30 bg-danger/5',
  warning: 'border-warning/30 bg-warning/5',
  safe: 'border-safe/30 bg-safe/5',
  blue: 'border-blue-500/30 bg-blue-500/5',
};

const textClasses = {
  danger: 'text-danger',
  warning: 'text-warning',
  safe: 'text-safe',
  blue: 'text-blue-500',
};

export default function ThreatCard({ title, value, trend, color }: ThreatCardProps) {
  return (
    <div className={`p-6 rounded-lg border ${colorClasses[color]}`}>
      <h3 className="text-sm font-medium text-gray-400">{title}</h3>
      <p className={`text-3xl font-bold mt-2 ${textClasses[color]}`}>{value}</p>
      {trend && <p className="text-xs text-gray-500 mt-2">{trend}</p>}
    </div>
  );
}
