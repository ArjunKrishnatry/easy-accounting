import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

export default function Settings() {
  const { user, checkAuth, logout } = useAuth();
  const navigate = useNavigate();

  // Username change state
  const [newUsername, setNewUsername] = useState('');
  const [usernamePassword, setUsernamePassword] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const [isSubmittingUsername, setIsSubmittingUsername] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Theme state - for now just a placeholder, will implement properly
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const handleUsernameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError(null);
    setUsernameSuccess(false);

    if (!newUsername.trim()) {
      setUsernameError('Please enter a new username');
      return;
    }

    if (!usernamePassword.trim()) {
      setUsernameError('Please enter your current password');
      return;
    }

    setIsSubmittingUsername(true);

    try {
      const response = await api.post('/api/auth/change-username', {
        new_username: newUsername.trim(),
        current_password: usernamePassword
      });

      if (response.data.ok) {
        setUsernameSuccess(true);
        setNewUsername('');
        setUsernamePassword('');
        // Refresh auth to update user info
        await checkAuth();
      }
    } catch (err: any) {
      console.error('Username change error:', err);
      if (err.response?.status === 403) {
        setUsernameError('Incorrect password');
      } else if (err.response?.data?.detail) {
        setUsernameError(err.response.data.detail);
      } else {
        setUsernameError('Failed to update username. Please try again.');
      }
    } finally {
      setIsSubmittingUsername(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword.trim()) {
      setPasswordError('Please enter your current password');
      return;
    }

    if (!newPassword.trim()) {
      setPasswordError('Please enter a new password');
      return;
    }

    if (newPassword.length < 4) {
      setPasswordError('New password must be at least 4 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setIsSubmittingPassword(true);

    try {
      const response = await api.post('/api/auth/change-password', {
        new_password: newPassword,
        current_password: currentPassword
      });

      if (response.data.ok) {
        setPasswordSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      console.error('Password change error:', err);
      if (err.response?.status === 403) {
        setPasswordError('Incorrect current password');
      } else if (err.response?.data?.detail) {
        setPasswordError(err.response.data.detail);
      } else {
        setPasswordError('Failed to update password. Please try again.');
      }
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 fixed top-0 left-0 right-0 z-50 shadow-sm w-full">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Back to Dashboard</span>
              </button>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">
                Logged in as <strong className="text-slate-900">{user?.name}</strong>
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 mt-[88px]">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-600 mt-2">Manage your account settings and preferences</p>
        </div>

        <div className="space-y-6">
          {/* Account Settings Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Account Settings</h2>

            {/* Change Username */}
            <div className="mb-8 pb-8 border-b border-slate-200">
              <h3 className="text-lg font-medium text-slate-900 mb-4">Change Username</h3>
              <form onSubmit={handleUsernameChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Current Username
                  </label>
                  <input
                    type="text"
                    value={user?.name || ''}
                    disabled
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    New Username
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-slate-900"
                    placeholder="Enter new username"
                    disabled={isSubmittingUsername}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={usernamePassword}
                    onChange={(e) => setUsernamePassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-slate-900"
                    placeholder="Enter your current password"
                    disabled={isSubmittingUsername}
                  />
                </div>

                {usernameError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">{usernameError}</p>
                  </div>
                )}

                {usernameSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">Username updated successfully!</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingUsername}
                  className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-60"
                >
                  {isSubmittingUsername ? 'Updating...' : 'Update Username'}
                </button>
              </form>
            </div>

            {/* Change Password */}
            <div>
              <h3 className="text-lg font-medium text-slate-900 mb-4">Change Password</h3>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-slate-900"
                    placeholder="Enter your current password"
                    disabled={isSubmittingPassword}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-slate-900"
                    placeholder="Enter new password"
                    disabled={isSubmittingPassword}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-slate-900"
                    placeholder="Confirm new password"
                    disabled={isSubmittingPassword}
                  />
                </div>

                {passwordError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">{passwordError}</p>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">Password updated successfully!</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingPassword}
                  className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-60"
                >
                  {isSubmittingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>

          {/* Appearance Settings Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Appearance</h2>

            <div>
              <h3 className="text-lg font-medium text-slate-900 mb-4">Theme</h3>
              <div className="flex gap-4">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    theme === 'light'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-300 flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-slate-900">Light</div>
                      <div className="text-sm text-slate-600">Bright and clear</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setTheme('dark')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    theme === 'dark'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                      <svg className="w-5 h-5 text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-slate-900">Dark</div>
                      <div className="text-sm text-slate-600">Easy on the eyes</div>
                    </div>
                  </div>
                </button>
              </div>

              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Theme toggle functionality is coming soon. Currently, only light mode is available.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
