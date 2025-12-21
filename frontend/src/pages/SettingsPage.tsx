import { authAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

export function SettingsPage() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      localStorage.removeItem('token');
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  return (
    <div className="flex-1 p-8">
      <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>

      <div className="space-y-6">
        {/* Staff Settings */}
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Staff Settings</h3>
          <p className="text-sm text-gray-400 mb-4">Manage your staff account settings</p>

          <div className="space-y-4">
            <div className="bg-dark-card rounded-lg p-6 border border-dark-border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">💬</span>
                    <h4 className="text-lg font-semibold text-white">Custom Messages</h4>
                  </div>
                  <p className="text-sm text-gray-400">
                    Set custom greeting and ending messages for tickets
                  </p>
                </div>
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition">
                  Set Custom Messages
                </button>
              </div>
            </div>

            <div className="bg-dark-card rounded-lg p-6 border border-dark-border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">📅</span>
                    <h4 className="text-lg font-semibold text-white">Request Leave of Absence</h4>
                  </div>
                  <p className="text-sm text-gray-400">
                    Request time off from staff duties
                  </p>
                </div>
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition">
                  Request LOA
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Staff Information */}
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Staff Information</h3>
          <p className="text-sm text-gray-400 mb-4">Important information for staff members</p>

          <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">ℹ️</span>
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Staff Guidelines</h4>
                <p className="text-gray-300 text-sm">
                  Remember to complete your weekly message quota of 150 messages in the tracked channels. If you need time off, submit an LOA request through the settings page. Failure to meet quota without an approved LOA may result in infractions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Account Actions</h3>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

