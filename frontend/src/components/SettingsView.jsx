import { useState } from 'react';
import { Edit2, Shield, Bell, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../api';
import EditProfileModal from './EditProfileModal';
import ChangePasswordModal from './ChangePasswordModal';

export default function SettingsView({ vendor, setVendor }) {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [togglingSms, setTogglingSms] = useState(false);

  const toggleSms = async () => {
    setTogglingSms(true);
    const res = await API.patch('/vendor/toggle-sms');
    if (res.data.success) {
      setVendor({ ...vendor, sms_enabled: res.data.sms_enabled });
      toast.success(res.data.sms_enabled ? 'SMS notifications on' : 'SMS notifications off');
    }
    setTogglingSms(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-6">Settings</h2>

        <div className="space-y-4">
          <button onClick={() => setShowProfileModal(true)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition">
            <div className="flex items-center gap-3">
              <Edit2 className="text-brand-orange" size={20} />
              <div className="text-left">
                <p className="font-medium">Edit Profile</p>
                <p className="text-sm text-gray-500">Update business info, images, and hours</p>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </button>

          <button onClick={() => setShowPasswordModal(true)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition">
            <div className="flex items-center gap-3">
              <Shield className="text-brand-orange" size={20} />
              <div className="text-left">
                <p className="font-medium">Change Password</p>
                <p className="text-sm text-gray-500">Update your login credentials</p>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </button>

          <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition">
            <div className="flex items-center gap-3">
              <Bell className="text-brand-orange" size={20} />
              <div className="text-left">
                <p className="font-medium">SMS Notifications</p>
                <p className="text-sm text-gray-500">Receive SMS for new orders</p>
              </div>
            </div>
            <button
              onClick={toggleSms}
              disabled={togglingSms}
              className={`px-4 py-2 rounded-lg font-medium ${vendor.sms_enabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
            >
              {vendor.sms_enabled ? 'On' : 'Off'}
            </button>
          </div>

          <div className="border-t pt-4">
            <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 hover:bg-red-50 rounded-xl transition text-red-600">
              <div className="flex items-center gap-3">
                <LogOut size={20} />
                <span className="font-medium">Logout</span>
              </div>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {showProfileModal && (
        <EditProfileModal vendor={vendor} onClose={() => setShowProfileModal(false)} onSave={() => {
          // Refresh vendor data after saving
          API.get('/vendor/me').then(res => setVendor(res.data.data));
        }} />
      )}
      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </div>
  );
}