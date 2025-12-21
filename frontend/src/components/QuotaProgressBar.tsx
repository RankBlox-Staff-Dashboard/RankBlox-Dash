
interface QuotaProgressBarProps {
  current: number;
  quota: number;
}

export function QuotaProgressBar({ current, quota }: QuotaProgressBarProps) {
  const percentage = Math.min((current / quota) * 100, 100);
  const isComplete = current >= quota;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-400">Message Quota</span>
        <span className={`text-sm font-semibold ${isComplete ? 'text-green-400' : 'text-gray-400'}`}>
          {current}/{quota}
        </span>
      </div>
      <div className="w-full bg-dark-border rounded-full h-3 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

