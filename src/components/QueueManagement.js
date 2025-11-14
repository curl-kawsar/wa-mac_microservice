'use client';

import { useState, useEffect } from 'react';

const QueueManagement = () => {
  const [queues, setQueues] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Job form states
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', body: '', priority: 'normal' });
  const [userForm, setUserForm] = useState({ userId: '', action: 'welcome_email', delay: 0 });
  const [exportForm, setExportForm] = useState({ format: 'json', filters: '{}' });
  const [notificationForm, setNotificationForm] = useState({ 
    userId: '', 
    type: 'welcome', 
    message: '', 
    channel: 'in_app', 
    priority: 'normal' 
  });

  // Fetch queue statistics
  const fetchQueues = async () => {
    try {
      const response = await fetch('/api/queues');
      const data = await response.json();
      if (data.success) {
        setQueues(data.queues);
      }
    } catch (error) {
      console.error('Error fetching queues:', error);
    }
  };

  useEffect(() => {
    fetchQueues();
    const interval = setInterval(fetchQueues, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Submit job functions
  const submitEmailJob = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/jobs/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailForm),
      });

      const data = await response.json();
      if (data.success) {
        setMessage(`✅ Email job queued successfully! Job ID: ${data.job.id}`);
        setEmailForm({ to: '', subject: '', body: '', priority: 'normal' });
        fetchQueues();
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const submitUserJob = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/jobs/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      });

      const data = await response.json();
      if (data.success) {
        setMessage(`✅ User processing job queued! Job ID: ${data.job.id}`);
        setUserForm({ userId: '', action: 'welcome_email', delay: 0 });
        fetchQueues();
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const submitExportJob = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/jobs/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...exportForm,
          filters: JSON.parse(exportForm.filters || '{}')
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage(`✅ Export job queued! Job ID: ${data.job.id}`);
        setExportForm({ format: 'json', filters: '{}' });
        fetchQueues();
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const submitNotificationJob = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/jobs/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationForm),
      });

      const data = await response.json();
      if (data.success) {
        setMessage(`✅ Notification job queued! Job ID: ${data.job.id}`);
        setNotificationForm({ 
          userId: '', 
          type: 'welcome', 
          message: '', 
          channel: 'in_app', 
          priority: 'normal' 
        });
        fetchQueues();
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Queue Overview', icon: '📊' },
    { id: 'email', label: 'Email Jobs', icon: '📧' },
    { id: 'user', label: 'User Jobs', icon: '👤' },
    { id: 'export', label: 'Data Export', icon: '📄' },
    { id: 'notification', label: 'Notifications', icon: '🔔' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">🚀 Queue Management</h2>
        <p className="text-gray-600">Manage background jobs with BullMQ</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white shadow-md text-blue-600 font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-3 rounded-md mb-4 ${
          message.includes('Error') || message.includes('❌')
            ? 'bg-red-100 text-red-700 border border-red-200'
            : 'bg-green-100 text-green-700 border border-green-200'
        }`}>
          {message}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Queue Statistics</h3>
            <div className="flex space-x-2">
              <button
                onClick={fetchQueues}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition duration-200"
              >
                🔄 Refresh
              </button>
              <a
                href="http://localhost:3001"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 transition duration-200"
              >
                📊 Dashboard
              </a>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(queues).map(([name, stats]) => (
              <div key={name} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-gray-800 mb-2 capitalize">
                  {name.replace('-queue', '').replace('-', ' ')}
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Waiting:</span>
                    <span className="font-medium text-yellow-600">{stats.waiting}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active:</span>
                    <span className="font-medium text-blue-600">{stats.active}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed:</span>
                    <span className="font-medium text-green-600">{stats.completed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Failed:</span>
                    <span className="font-medium text-red-600">{stats.failed}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-2">
                    <span className="text-gray-800 font-medium">Total:</span>
                    <span className="font-bold text-gray-800">{stats.total}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'email' && (
        <form onSubmit={submitEmailJob} className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center space-x-2">
            <span>📧</span>
            <span>Queue Email Job</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Email</label>
              <input
                type="email"
                value={emailForm.to}
                onChange={(e) => setEmailForm({...emailForm, to: e.target.value})}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={emailForm.priority}
                onChange={(e) => setEmailForm({...emailForm, priority: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <input
              type="text"
              value={emailForm.subject}
              onChange={(e) => setEmailForm({...emailForm, subject: e.target.value})}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Email subject"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Body</label>
            <textarea
              value={emailForm.body}
              onChange={(e) => setEmailForm({...emailForm, body: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Email body (optional - will use default if empty)"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition duration-200"
          >
            {loading ? 'Queueing...' : '📧 Queue Email Job'}
          </button>
        </form>
      )}

      {activeTab === 'user' && (
        <form onSubmit={submitUserJob} className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center space-x-2">
            <span>👤</span>
            <span>Queue User Processing Job</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
              <input
                type="text"
                value={userForm.userId}
                onChange={(e) => setUserForm({...userForm, userId: e.target.value})}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="user123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
              <select
                value={userForm.action}
                onChange={(e) => setUserForm({...userForm, action: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="welcome_email">Send Welcome Email</option>
                <option value="profile_verification">Profile Verification</option>
                <option value="account_cleanup">Account Cleanup</option>
                <option value="data_backup">Data Backup</option>
                <option value="preferences_update">Update Preferences</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Delay (seconds)</label>
            <input
              type="number"
              value={userForm.delay}
              onChange={(e) => setUserForm({...userForm, delay: parseInt(e.target.value) || 0})}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 transition duration-200"
          >
            {loading ? 'Queueing...' : '👤 Queue User Job'}
          </button>
        </form>
      )}

      {activeTab === 'export' && (
        <form onSubmit={submitExportJob} className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center space-x-2">
            <span>📄</span>
            <span>Queue Data Export Job</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
              <select
                value={exportForm.format}
                onChange={(e) => setExportForm({...exportForm, format: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="xlsx">Excel (XLSX)</option>
                <option value="pdf">PDF Report</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filters (JSON)</label>
              <input
                type="text"
                value={exportForm.filters}
                onChange={(e) => setExportForm({...exportForm, filters: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder='{"verified": true}'
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 transition duration-200"
          >
            {loading ? 'Queueing...' : '📄 Queue Export Job'}
          </button>
        </form>
      )}

      {activeTab === 'notification' && (
        <form onSubmit={submitNotificationJob} className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center space-x-2">
            <span>🔔</span>
            <span>Queue Notification Job</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
              <input
                type="text"
                value={notificationForm.userId}
                onChange={(e) => setNotificationForm({...notificationForm, userId: e.target.value})}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="user123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={notificationForm.type}
                onChange={(e) => setNotificationForm({...notificationForm, type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="welcome">Welcome</option>
                <option value="verification">Verification</option>
                <option value="reminder">Reminder</option>
                <option value="alert">Alert</option>
                <option value="update">Update</option>
                <option value="promotion">Promotion</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Channel</label>
              <select
                value={notificationForm.channel}
                onChange={(e) => setNotificationForm({...notificationForm, channel: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="in_app">In-App</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="push">Push Notification</option>
                <option value="webhook">Webhook</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
            <textarea
              value={notificationForm.message}
              onChange={(e) => setNotificationForm({...notificationForm, message: e.target.value})}
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your notification message here..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              value={notificationForm.priority}
              onChange={(e) => setNotificationForm({...notificationForm, priority: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 disabled:opacity-50 transition duration-200"
          >
            {loading ? 'Queueing...' : '🔔 Queue Notification Job'}
          </button>
        </form>
      )}
    </div>
  );
};

export default QueueManagement;
