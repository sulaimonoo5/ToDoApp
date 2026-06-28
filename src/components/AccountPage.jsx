import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import * as syncService from "../services/syncService";

function AccountPage({ onBack }) {
  const { user, signOut, updateUser } = useAuth();
  const [tab, setTab] = useState("profile");
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNew, setConfirmNew] = useState("");
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");
  const [passSubmitting, setPassSubmitting] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess("");
    if (!currentPassword || !newPassword || !confirmNew) {
      setPassError("All fields are required"); return;
    }
    if (newPassword.length < 8) {
      setPassError("New password must be at least 8 characters"); return;
    }
    if (newPassword !== confirmNew) {
      setPassError("Passwords do not match"); return;
    }
    setPassSubmitting(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setPassSuccess("Password changed successfully");
      setCurrentPassword(""); setNewPassword(""); setConfirmNew("");
    } catch (err) {
      setPassError(err.message);
    } finally {
      setPassSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError("");
    if (deleteConfirm !== "DELETE") {
      setDeleteError('Type "DELETE" to confirm'); return;
    }
    if (!deletePassword) {
      setDeleteError("Enter your password"); return;
    }
    setDeleteSubmitting(true);
    try {
      await api.deleteAccount({ password: deletePassword });
      await signOut();
    } catch (err) {
      setDeleteError(err.message);
      setDeleteSubmitting(false);
    }
  };

  const [importStatus, setImportStatus] = useState(null);

  const handleImport = async () => {
    setImportStatus("importing");
    try {
      await syncService.importLocalData();
      setImportStatus("done");
      const s = await syncService.fetchStats();
      setStats(s);
    } catch (err) {
      setImportStatus("error");
    }
  };

  useEffect(() => {
    syncService.fetchStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  if (!user) return null;

  const joined = new Date(user.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="sticky top-0 z-20 bg-black/70 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-zinc-800/80 rounded-xl hover:scale-110 active:scale-95 transition-all duration-200">
            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-white">Account</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-8 space-y-6">
          {/* Profile card */}
          <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/30 px-5 py-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-xl font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{user.name}</h2>
                <p className="text-sm text-zinc-400">{user.email}</p>
                <p className="text-xs text-zinc-600 mt-0.5">Joined {joined}</p>
              </div>
            </div>
            {statsLoading ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="bg-zinc-800/50 rounded-lg px-3 py-2 animate-pulse h-12" />
                <div className="bg-zinc-800/50 rounded-lg px-3 py-2 animate-pulse h-12" />
              </div>
            ) : stats && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
                  <p className="text-zinc-500 text-xs">Tasks</p>
                  <p className="text-white text-lg font-bold">{stats.tasks} <span className="text-emerald-400 text-xs font-normal">({stats.completedTasks} done)</span></p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
                  <p className="text-zinc-500 text-xs">Goals</p>
                  <p className="text-white text-lg font-bold">{stats.goals}</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
                  <p className="text-zinc-500 text-xs">Current Streak</p>
                  <p className="text-emerald-400 text-lg font-bold">{stats.currentStreak} days</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
                  <p className="text-zinc-500 text-xs">Best Streak</p>
                  <p className="text-emerald-400 text-lg font-bold">{stats.longestStreak} days</p>
                </div>
              </div>
            )}
            <button onClick={signOut} className="mt-4 w-full bg-zinc-800/50 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border border-zinc-700/30 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200">
              Logout
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {["profile", "password", "danger"].map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === t ? "bg-emerald-500 text-white" : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50"
              }`}>
                {t === "profile" ? "Settings" : t === "password" ? "Password" : "Danger Zone"}
              </button>
            ))}
          </div>

          {tab === "password" && (
            <form onSubmit={handleChangePassword} className="bg-zinc-800/30 rounded-xl border border-zinc-700/30 px-5 py-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">Change Password</h3>
              <input type="password" placeholder="Current Password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full bg-zinc-800/50 px-4 py-2.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-zinc-800/50 px-4 py-2.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              <input type="password" placeholder="Confirm New Password" value={confirmNew} onChange={(e) => setConfirmNew(e.target.value)} className="w-full bg-zinc-800/50 px-4 py-2.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              {passError && <p className="text-red-400 text-xs">{passError}</p>}
              {passSuccess && <p className="text-emerald-400 text-xs">{passSuccess}</p>}
              <button type="submit" disabled={passSubmitting} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-medium py-2.5 rounded-xl transition-all disabled:opacity-50">
                {passSubmitting ? "Changing..." : "Change Password"}
              </button>
            </form>
          )}

          {tab === "danger" && (
            <div className="bg-red-500/5 rounded-xl border border-red-500/20 px-5 py-5 space-y-4">
              <h3 className="text-sm font-semibold text-red-400">Delete Account</h3>
              <p className="text-xs text-zinc-500">This action is irreversible. All your data will be permanently deleted.</p>
              <input type="text" placeholder='Type "DELETE" to confirm' value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} className="w-full bg-zinc-800/50 px-4 py-2.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50" />
              <input type="password" placeholder="Enter your password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="w-full bg-zinc-800/50 px-4 py-2.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50" />
              {deleteError && <p className="text-red-400 text-xs">{deleteError}</p>}
              <button onClick={handleDeleteAccount} disabled={deleteSubmitting} className="w-full bg-red-500 hover:bg-red-400 text-white font-medium py-2.5 rounded-xl transition-all disabled:opacity-50">
                {deleteSubmitting ? "Deleting..." : "Delete My Account"}
              </button>
            </div>
          )}

          {/* Import local data */}
          <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/30 px-5 py-5">
            <h3 className="text-sm font-semibold text-white mb-2">Cloud Sync</h3>
            <p className="text-xs text-zinc-500 mb-4">Your data is automatically synced to the cloud. You can also manually import local data from this device.</p>
            {importStatus === "done" ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-center">
                <p className="text-emerald-400 text-sm font-medium">Data imported successfully!</p>
              </div>
            ) : (
              <button onClick={handleImport} disabled={importStatus === "importing"} className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-medium py-2.5 rounded-xl transition-all disabled:opacity-50">
                {importStatus === "importing" ? "Importing..." : "Import local data"}
              </button>
            )}
            {importStatus === "error" && (
              <p className="text-red-400 text-xs mt-2">Import failed. Try again later.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountPage;
