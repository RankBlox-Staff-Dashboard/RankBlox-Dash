import React from 'react';
import type { Ticket } from '../types';
import { ticketsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface TicketCardProps {
  ticket: Ticket;
  onUpdate?: () => void;
}

export function TicketCard({ ticket, onUpdate }: TicketCardProps) {
  const { user } = useAuth();
  const handleClaim = async () => {
    try {
      await ticketsAPI.claim(ticket.id);
      onUpdate?.();
    } catch (error) {
      console.error('Error claiming ticket:', error);
      alert('Failed to claim ticket');
    }
  };

  const handleResolve = async () => {
    try {
      await ticketsAPI.resolve(ticket.id);
      onUpdate?.();
    } catch (error) {
      console.error('Error resolving ticket:', error);
      alert('Failed to resolve ticket');
    }
  };

  const statusColors = {
    open: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    claimed: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    resolved: 'bg-green-500/20 text-green-400 border-green-500/50',
    closed: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
  };

  return (
    <div className="bg-dark-card rounded-lg p-4 border border-dark-border">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className={`px-2 py-1 text-xs font-semibold rounded border ${statusColors[ticket.status]}`}>
              {ticket.status.toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-gray-400">Channel ID: {ticket.discord_channel_id}</p>
          {ticket.claimed_by_username && (
            <p className="text-sm text-gray-400 mt-1">
              Claimed by: {ticket.claimed_by_roblox || ticket.claimed_by_username}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {ticket.status === 'open' && (
          <button
            onClick={handleClaim}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition"
          >
            Claim
          </button>
        )}
        {ticket.status === 'claimed' && ticket.claimed_by === user?.id && (
          <button
            onClick={handleResolve}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold transition"
          >
            Resolve
          </button>
        )}
        <span className="text-xs text-gray-500">
          {new Date(ticket.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

