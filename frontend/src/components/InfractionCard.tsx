import type { Infraction } from '../types';

interface InfractionCardProps {
  infraction: Infraction;
}

export function InfractionCard({ infraction }: InfractionCardProps) {
  const date = new Date(infraction.created_at).toLocaleDateString();

  return (
    <div className={`bg-dark-card rounded-lg p-4 border ${infraction.voided ? 'border-gray-600 opacity-60' : infraction.type === 'strike' ? 'border-red-500/50' : 'border-yellow-500/50'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">
              {infraction.voided ? '❌' : infraction.type === 'strike' ? '⚠️' : 'ℹ️'}
            </span>
            <h3 className="font-semibold text-white">{infraction.type === 'strike' ? 'Strike' : 'Warning'}</h3>
            {infraction.voided && (
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-600 text-gray-300">
                Voided
              </span>
            )}
          </div>
          <p className="text-gray-300 mb-2">{infraction.reason}</p>
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>{date}</span>
            {infraction.issued_by_username && (
              <span>By {infraction.issued_by_username}</span>
            )}
            {!infraction.issued_by_username && <span>By Activity System</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

