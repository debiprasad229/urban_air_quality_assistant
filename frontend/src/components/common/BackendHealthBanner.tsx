import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface BackendHealthBannerProps {
  status: 'checking' | 'healthy' | 'waking' | 'offline';
  onRetry: () => void;
}

export const BackendHealthBanner: React.FC<BackendHealthBannerProps> = ({
  status,
  onRetry,
}) => {
  if (status === 'healthy') return null;

  return (
    <div
      role="status"
      className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
        status === 'waking'
          ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
          : status === 'checking'
          ? 'bg-slate-800 border-slate-700 text-slate-300'
          : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
      }`}
    >
      <div className="flex items-center space-x-2">
        {status === 'checking' || status === 'waking' ? (
          <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
        ) : (
          <AlertCircle className="w-4 h-4 text-rose-400" />
        )}
        <span>
          {status === 'waking'
            ? 'Render Free Web Service is waking up from standby (~30-45s). Demo presets and deterministic offline planners are active.'
            : status === 'checking'
            ? 'Verifying backend service connectivity...'
            : 'Backend API is currently offline. Operating in resilient standalone demo mode with deterministic algorithms.'}
        </span>
      </div>

      <button
        onClick={onRetry}
        className="text-[11px] font-semibold underline hover:no-underline ml-4 cursor-pointer"
      >
        Retry Connection
      </button>
    </div>
  );
};
