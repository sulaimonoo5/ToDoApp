import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

function LoginPage({ onNavigate }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("All fields are required"); return; }
    setSubmitting(true);
    try {
      await signIn(email, password, remember);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📋</div>
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-zinc-500 text-sm mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-800/70 px-4 py-3 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-800/70 px-4 py-3 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
            />
            <span className="text-xs text-zinc-400">Remember Me</span>
          </label>

          {error && (
            <p className="text-red-400 text-xs text-center animate-fade-in">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-medium py-3 rounded-xl transition-all duration-200 disabled:opacity-50"
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center mt-6">
          <span className="text-zinc-500 text-sm">Don't have an account? </span>
          <button onClick={() => onNavigate("register")} className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors">
            Create Account
          </button>
        </p>

        <p className="text-center mt-3">
          <span className="text-zinc-600 text-xs">Forgot Password — </span>
          <span className="text-zinc-600 text-xs italic">Coming Soon</span>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
