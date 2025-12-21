import React, { useState, useEffect } from 'react';
import { InfractionCard } from '../components/InfractionCard';
import { dashboardAPI } from '../services/api';
import type { Infraction } from '../types';

export function InfractionsPage() {
  const [infractions, setInfractions] = useState<Infraction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInfractions = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getInfractions();
        setInfractions(response.data);
      } catch (error) {
        console.error('Error fetching infractions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInfractions();
  }, []);

  return (
    <div className="flex-1 p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Your Infractions</h2>
        <p className="text-gray-400">View your current and past infractions</p>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading infractions...</div>
      ) : infractions.length === 0 ? (
        <div className="bg-dark-card rounded-lg p-12 border border-dark-border text-center">
          <p className="text-gray-400 text-lg">No infractions found</p>
          <p className="text-gray-500 text-sm mt-2">Keep up the good work!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {infractions.map((infraction) => (
            <InfractionCard key={infraction.id} infraction={infraction} />
          ))}
        </div>
      )}

      <div className="mt-8 bg-blue-500/10 border border-blue-500/50 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">About Infractions</h3>
            <p className="text-gray-300 text-sm">
              Infractions are issued for violations of staff policies. Warnings are minor infractions, while strikes are more serious. Multiple strikes may result in demotion or removal from staff. Voided infractions have been removed from your record and no longer count against you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

