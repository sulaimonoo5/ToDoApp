import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import * as syncService from "../services/syncService";
import { getDeviceIcon } from "../utils/deviceInfo";

const STAT_ICONS = {
  tasks: "📝",
  goals: "🎯",
  lessons: "📚",
  streak: "🔥",
  completed: "✅",
};

const STAT_DESCRIPTIONS = {
  tasks: (s) => `${s.completedTasks} completed`,
  goals: (s) => "Active goals",
  lessons: (s) => "Scheduled lessons",
  streak: (s) => s.currentStreak > 0 ? "Keep it up!" : "Start today!",
  completed: (s) => s.completedTasks > 0 ? "Great progress!" : "No tasks yet",
};

function formatTimeAgo(dateStr) {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Active now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString();
}

function isActive(dateStr) {
  if (!dateStr) return false;
  const diff = Date.now() - new Date(dateStr).getTime();
  return diff < 120000;
}

function StatCard({ icon, label, value, description, accent }) {
  return (
    <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl px-4 py-4 flex flex-col items-start gap-1 min-h-[130px]">
      <span className="text-xl leading-none">{icon}</span>
      <p className="text-zinc-500 text-xs font-medium whitespace-nowrap">{label}</p>
      <p className={`text-2xl font-bold leading-tight truncate w-full ${accent ? "text-emerald-400" : "text-white"}`}>{value}</p>
      <p className="text-zinc-600 text-[10px] leading-tight">{description}</p>
    </div>
  );
}

function ProfileCard({ user, onEditProfile, onChangePassword }) {
  const joined = new Date(user.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl px-5 py-5">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-xl font-bold text-white flex-shrink-0">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white truncate">{user.name}</h2>
          <p className="text-sm text-zinc-400 truncate">{user.email}</p>
          <p className="text-xs text-zinc-600 mt-0.5">Joined {joined}</p>
          <p className="text-xs text-zinc-700 mt-0.5 font-mono">ID: {user.id}</p>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={onEditProfile} className="flex-1 bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 hover:text-white border border-zinc-700/30 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200">
          Edit Profile
        </button>
        <button onClick={onChangePassword} className="flex-1 bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 hover:text-white border border-zinc-700/30 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200">
          Change Password
        </button>
      </div>
    </div>
  );
}

function AccountPage({ onBack }) {
  const { user, signOut, updateUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [security, setSecurity] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [passOpen, setPassOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNew, setConfirmNew] = useState("");
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");
  const [passSubmitting, setPassSubmitting] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [syncStatus, setSyncStatus] = useState("synced");
  const [lastSyncStr, setLastSyncStr] = useState("");
  const [syncing, setSyncing] = useState(false);

  const [signOutAllConfirm, setSignOutAllConfirm] = useState(false);
  const [signOutAllSubmitting, setSignOutAllSubmitting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, sessionsData, historyData, securityData] = await Promise.all([
        syncService.fetchStats(),
        api.getSessions(),
        api.getLoginHistory(20),
        api.getSecurity(),
      ]);
      setStats(statsData);
      setSessions(sessionsData.sessions || []);
      setLoginHistory(historyData.history || []);
      setSecurity(securityData);
    } catch (err) {
      console.error("Failed to load account data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const last = syncService.getLastSyncedAt();
    if (last) {
      const diff = Date.now() - last;
      if (diff < 60000) setLastSyncStr("Just now");
      else if (diff < 3600000) setLastSyncStr(`${Math.floor(diff / 60000)} min ago`);
      else if (diff < 86400000) setLastSyncStr(`${Math.floor(diff / 3600000)}h ago`);
      else setLastSyncStr(new Date(last).toLocaleDateString());
    }
  }, []);

  const handleEditProfile = () => {
    setEditName(user.name);
    setEditError("");
    setEditModal(true);
  };

  const saveEditProfile = async () => {
    if (!editName.trim()) { setEditError("Name cannot be empty"); return; }
    setEditSaving(true);
    try {
      const data = await api.updateProfile({ name: editName.trim() });
      updateUser(data.user);
      setEditModal(false);
      setEditSaving(false);
    } catch (err) {
      setEditError(err.message);
      setEditSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassError(""); setPassSuccess("");
    if (!currentPassword || !newPassword || !confirmNew) {
      setPassError("All fields are required"); return;
    }
    if (newPassword.length < 8) { setPassError("New password must be at least 8 characters"); return; }
    if (newPassword !== confirmNew) { setPassError("Passwords do not match"); return; }
    setPassSubmitting(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setPassSuccess("Password changed successfully");
      setCurrentPassword(""); setNewPassword(""); setConfirmNew("");
      setPassOpen(false);
    } catch (err) {
      setPassError(err.message);
    } finally {
      setPassSubmitting(false);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await api.deleteSession(sessionId);
      setSessions(sessions.filter((s) => s.sessionId !== sessionId));
    } catch (err) {
      console.error("Failed to end session:", err);
    }
  };

  const handleSignOutAll = async () => {
    setSignOutAllSubmitting(true);
    try {
      await api.logoutAllSessions();
      setSessions(sessions.filter((s) => s.isCurrent));
      setSignOutAllConfirm(false);
    } catch (err) {
      console.error("Failed to sign out all:", err);
    } finally {
      setSignOutAllSubmitting(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await syncService.saveToServer();
      setLastSyncStr("Just now");
      setSyncStatus("synced");
    } catch {
      setSyncStatus("offline");
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError("");
    if (deleteConfirm !== "DELETE") { setDeleteError('Type "DELETE" to confirm'); return; }
    if (!deletePassword) { setDeleteError("Enter your password"); return; }
    setDeleteSubmitting(true);
    try {
      await api.deleteAccount({ password: deletePassword });
      await signOut();
    } catch (err) {
      setDeleteError(err.message);
      setDeleteSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="sticky top-0 z-20 bg-black/70 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-zinc-800/80 rounded-xl hover:scale-110 active:scale-95 transition-all duration-200">
            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-white">Account</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-12 space-y-6">

          {/* Profile Card */}
          <ProfileCard user={user} onEditProfile={handleEditProfile} onChangePassword={() => setPassOpen(true)} />

          {/* Account Statistics */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">Account Statistics</h3>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[...Array(5)].map((_, i) => <div key={i} className="bg-zinc-800/30 rounded-xl px-4 py-4 animate-pulse min-h-[130px]" />)}
              </div>
            ) : stats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 items-stretch">
                <StatCard icon={STAT_ICONS.tasks} label="Tasks" value={stats.tasks} description={STAT_DESCRIPTIONS.tasks(stats)} />
                <StatCard icon={STAT_ICONS.goals} label="Goals" value={stats.goals} description={STAT_DESCRIPTIONS.goals(stats)} />
                <StatCard icon={STAT_ICONS.lessons} label="Lessons" value={stats.lessons || 0} description={STAT_DESCRIPTIONS.lessons(stats)} />
                <StatCard icon={STAT_ICONS.streak} label="Current Streak" value={`${stats.currentStreak} Days`} description={STAT_DESCRIPTIONS.streak(stats)} accent />
                <StatCard icon={STAT_ICONS.completed} label="Completed Tasks" value={stats.completedTasks} description={STAT_DESCRIPTIONS.completed(stats)} accent />
              </div>
            )}
          </div>

          {/* Connected Devices */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">Connected Devices</h3>
            <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl px-5 py-5 space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => <div key={i} className="bg-zinc-800/50 rounded-xl px-4 py-3.5 animate-pulse h-[72px]" />)}
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-4">No active sessions</p>
              ) : (
                sessions.map((s) => {
                  const active = isActive(s.lastActive);
                  return (
                    <div key={s.sessionId} className={`bg-zinc-800/50 rounded-xl px-4 py-3.5 flex items-center justify-between gap-3 ${s.isCurrent ? "ring-1 ring-emerald-500/30" : ""}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl flex-shrink-0">{getDeviceIcon(s.deviceType)}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white text-sm font-medium truncate">{s.deviceType || "Unknown"}</span>
                            {s.isCurrent && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">Current Device</span>}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${active ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-700/50 text-zinc-500"}`}>
                              {active ? "Active" : "Offline"}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-2 mt-0.5">
                            <span className="text-zinc-500 text-xs">{s.browser}</span>
                            <span className="text-zinc-500 text-xs">&bull;</span>
                            <span className="text-zinc-500 text-xs">{s.os}</span>
                          </div>
                          <p className="text-zinc-600 text-xs mt-0.5">
                            {active ? "Active now" : `Last active: ${formatTimeAgo(s.lastActive)}`}
                          </p>
                        </div>
                      </div>
                      {!s.isCurrent && (
                        <button onClick={() => handleDeleteSession(s.sessionId)} className="text-xs text-zinc-400 hover:text-red-400 bg-zinc-800/80 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-all flex-shrink-0">
                          Sign Out
                        </button>
                      )}
                    </div>
                  );
                })
              )}
              {sessions.length > 1 && (
                <div>
                  {signOutAllConfirm ? (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3.5 space-y-3">
                      <p className="text-zinc-300 text-sm">Sign out from all other devices?</p>
                      <div className="flex gap-2">
                        <button onClick={handleSignOutAll} disabled={signOutAllSubmitting} className="bg-red-500 hover:bg-red-400 text-white text-xs font-medium px-4 py-2 rounded-lg transition-all disabled:opacity-50">
                          {signOutAllSubmitting ? "Signing Out..." : "Confirm"}
                        </button>
                        <button onClick={() => setSignOutAllConfirm(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium px-4 py-2 rounded-lg transition-all">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setSignOutAllConfirm(true)} className="w-full bg-zinc-800/50 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border border-zinc-700/30 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200">
                      Sign Out From All Devices
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Security */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">Security</h3>
            <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl px-5 py-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">Password</p>
                  {security && (
                    <p className="text-zinc-500 text-xs mt-0.5">
                      Last changed {security.lastPasswordChange ? new Date(security.lastPasswordChange).toLocaleDateString() : "Never"}
                    </p>
                  )}
                </div>
                <button onClick={() => setPassOpen(true)} className="text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition-all">
                  Change
                </button>
              </div>

              {passOpen && (
                <form onSubmit={handleChangePassword} className="bg-zinc-800/50 rounded-xl px-4 py-4 space-y-3 animate-fade-in">
                  <input type="password" placeholder="Current Password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full bg-zinc-800/50 px-4 py-2.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm" />
                  <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-zinc-800/50 px-4 py-2.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm" />
                  <input type="password" placeholder="Confirm New Password" value={confirmNew} onChange={(e) => setConfirmNew(e.target.value)} className="w-full bg-zinc-800/50 px-4 py-2.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm" />
                  {passError && <p className="text-red-400 text-xs">{passError}</p>}
                  {passSuccess && <p className="text-emerald-400 text-xs">{passSuccess}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={passSubmitting} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-medium py-2 rounded-xl text-sm transition-all disabled:opacity-50">
                      {passSubmitting ? "Changing..." : "Change Password"}
                    </button>
                    <button type="button" onClick={() => setPassOpen(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2 rounded-xl text-sm transition-all">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">Two-Factor Authentication</p>
                  <p className="text-zinc-500 text-xs mt-0.5">Coming soon</p>
                </div>
                <span className="text-xs text-zinc-600 bg-zinc-800/50 px-3 py-1.5 rounded-lg">Soon</span>
              </div>

              {/* Login History */}
              <div>
                <button onClick={() => setHistoryOpen(!historyOpen)} className="flex items-center justify-between w-full text-left">
                  <p className="text-white text-sm font-medium">Login History</p>
                  <svg className={`w-4 h-4 text-zinc-400 transition-transform ${historyOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {historyOpen && (
                  <div className="mt-3 space-y-2 animate-fade-in">
                    {loginHistory.length === 0 ? (
                      <p className="text-zinc-500 text-xs text-center py-3">No login history</p>
                    ) : (
                      loginHistory.slice(0, 10).map((h, i) => (
                        <div key={i} className="bg-zinc-800/50 rounded-lg px-3.5 py-2.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-base flex-shrink-0">{getDeviceIcon(h.deviceType)}</span>
                              <span className="text-white text-xs font-medium">{h.deviceType || "Unknown"}</span>
                            </div>
                            <div className="flex gap-2 mt-0.5">
                              <span className="text-zinc-500 text-xs">{h.browser}</span>
                              <span className="text-zinc-500 text-xs">&bull;</span>
                              <span className="text-zinc-500 text-xs">{h.os}</span>
                            </div>
                          </div>
                          <span className="text-zinc-600 text-xs flex-shrink-0 text-right">{new Date(h.createdAt).toLocaleDateString()} {new Date(h.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cloud Sync */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">Storage</h3>
            <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl px-5 py-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white text-sm font-medium">Cloud Sync</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${syncStatus === "synced" ? "bg-emerald-500" : "bg-red-500"}`} />
                    <span className="text-xs text-zinc-400">{syncStatus === "synced" ? "Synced" : "Offline"}</span>
                  </div>
                </div>
                <div className="text-right">
                  {lastSyncStr && <p className="text-zinc-500 text-xs">Last sync: {lastSyncStr}</p>}
                </div>
              </div>
              <button onClick={handleSyncNow} disabled={syncing} className="w-full bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 hover:text-white border border-zinc-700/30 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50">
                {syncing ? "Syncing..." : "Sync Now"}
              </button>
            </div>
          </div>

          {/* Settings (placeholder) */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">Settings</h3>
            <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl px-5 py-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-white text-sm font-medium">Theme</p>
                <p className="text-zinc-500 text-xs">Dark</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-white text-sm font-medium">Notifications</p>
                <p className="text-zinc-500 text-xs">Enabled</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-white text-sm font-medium">Language</p>
                <p className="text-zinc-500 text-xs">English</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-white text-sm font-medium">Privacy</p>
                <p className="text-zinc-500 text-xs">Standard</p>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">Danger Zone</h3>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-5 py-5 space-y-4">
              <div>
                <p className="text-white text-sm font-medium text-red-400">Delete Account</p>
                <p className="text-zinc-500 text-xs mt-1">This action is irreversible. All your data will be permanently deleted.</p>
              </div>
              {deleteSubmitting ? (
                <p className="text-red-400 text-sm">Deleting account...</p>
              ) : (
                <div className="space-y-3">
                  <input type="text" placeholder='Type "DELETE" to confirm' value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} className="w-full bg-zinc-800/50 px-4 py-2.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm" />
                  <input type="password" placeholder="Enter your password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="w-full bg-zinc-800/50 px-4 py-2.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm" />
                  {deleteError && <p className="text-red-400 text-xs">{deleteError}</p>}
                  <button onClick={handleDeleteAccount} className="w-full bg-red-500 hover:bg-red-400 text-white font-medium py-2.5 rounded-xl text-sm transition-all">
                    Delete My Account
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Logout */}
          <button onClick={signOut} className="w-full bg-zinc-800/30 hover:bg-zinc-800/50 text-zinc-400 hover:text-white border border-zinc-700/30 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200">
            Logout
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl shadow-black/40 p-6 animate-scale-in">
            <h2 className="text-lg font-bold text-white mb-4">Edit Profile</h2>
            <div className="space-y-4">
              <div>
                <p className="text-zinc-500 text-xs mb-1.5">Name</p>
                <input type="text" value={editName} onChange={(e) => { setEditName(e.target.value); setEditError(""); }} className="w-full bg-zinc-800/50 px-4 py-2.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm" />
              </div>
              <div>
                <p className="text-zinc-500 text-xs mb-1.5">Email</p>
                <p className="text-zinc-400 text-sm bg-zinc-800/30 px-4 py-2.5 rounded-xl">{user.email}</p>
                <p className="text-zinc-600 text-xs mt-1">Email cannot be changed</p>
              </div>
              {editError && <p className="text-red-400 text-xs">{editError}</p>}
              <div className="flex gap-2">
                <button onClick={saveEditProfile} disabled={editSaving} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-medium py-2.5 rounded-xl text-sm transition-all disabled:opacity-50">
                  {editSaving ? "Saving..." : "Save"}
                </button>
                <button onClick={() => setEditModal(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 rounded-xl text-sm transition-all">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountPage;
