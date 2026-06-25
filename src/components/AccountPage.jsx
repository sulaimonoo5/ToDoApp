import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";

function AccountPage({ onBack }) {
  const { user, signOut, updateUser } = useAuth();
  const [tab, setTab] = useState("profile");
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

  const handleImport = async () => {
    try {
      const payload = {
        tasks: JSON.parse(localStorage.getItem("todoLists") || "[]"),
        goals: JSON.parse(localStorage.getItem("goals") || "[]"),
        schedule: JSON.parse(localStorage.getItem("scheduleData") || "{}"),
        statistics: JSON.parse(localStorage.getItem("dailyStreak") || "{}"),
      };
      const token = localStorage.getItem("access_token");
      const res = await fetch("http://localhost:3001/api/data/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        alert("Data imported successfully!");
      } else {
        const data = await res.json();
        alert("Import failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Import failed: " + err.message);
    }
  };

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
            <h3 className="text-sm font-semibold text-white mb-2">Import Local Data</h3>
            <p className="text-xs text-zinc-500 mb-4">Sync your existing local Tasks, Goals, and Schedule to your account.</p>
            <button onClick={handleImport} className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-medium py-2.5 rounded-xl transition-all">
              Import local data to my account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountPage;
