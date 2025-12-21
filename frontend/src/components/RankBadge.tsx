
interface RankBadgeProps {
  rank: number | null;
  rankName: string | null;
}

export function RankBadge({ rank, rankName }: RankBadgeProps) {
  if (!rank) {
    return (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-600 text-gray-300">
        Unranked
      </span>
    );
  }

  const isAdmin = rank >= 16 && rank <= 255;
  const bgColor = isAdmin ? 'bg-red-600' : 'bg-blue-600';

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${bgColor} text-white`}>
      {rankName || `Rank ${rank}`}
    </span>
  );
}

