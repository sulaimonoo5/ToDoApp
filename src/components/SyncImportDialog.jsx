import React from "react";

function SyncImportDialog({ onImport, onSkip, importing }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl shadow-black/40 p-6 animate-scale-in">
        <h2 className="text-lg font-bold text-white mb-2">Import Local Data?</h2>
        <p className="text-sm text-zinc-400 mb-6">
          We found tasks and goals saved on this device. Would you like to import them to your account so they're available on all your devices?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onImport}
            disabled={importing}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-medium py-2.5 rounded-xl transition-all disabled:opacity-50"
          >
            {importing ? "Importing..." : "Import"}
          </button>
          <button
            onClick={onSkip}
            disabled={importing}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 rounded-xl transition-all disabled:opacity-50"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

export default SyncImportDialog;
