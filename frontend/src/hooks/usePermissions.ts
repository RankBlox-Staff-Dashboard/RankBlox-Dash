import { useState, useEffect } from 'react';
import { permissionsAPI } from '../services/api';
import type { PermissionFlag } from '../types';

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionFlag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await permissionsAPI.getPermissions();
        setPermissions(response.data.permissions);
      } catch (error) {
        console.error('Error fetching permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  const hasPermission = (permission: PermissionFlag): boolean => {
    return permissions.includes(permission);
  };

  return { permissions, loading, hasPermission };
}

