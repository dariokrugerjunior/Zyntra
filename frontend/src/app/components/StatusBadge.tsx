import React from 'react';
import { SessionStatus } from '../../types';

interface StatusBadgeProps {
  status: SessionStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusConfig: Record<SessionStatus, { bg: string; text: string; label: string }> = {
    created: { bg: 'bg-gray-600', text: 'text-gray-200', label: 'Created' },
    starting: { bg: 'bg-blue-600', text: 'text-blue-200', label: 'Starting' },
    qr: { bg: 'bg-yellow-600', text: 'text-yellow-200', label: 'QR Code' },
    ready: { bg: 'bg-green-600', text: 'text-green-200', label: 'Ready' },
    disconnected: { bg: 'bg-orange-600', text: 'text-orange-200', label: 'Disconnected' },
    stopped: { bg: 'bg-gray-700', text: 'text-gray-300', label: 'Stopped' },
    error: { bg: 'bg-red-600', text: 'text-red-200', label: 'Error' },
  };

  const config = statusConfig[status] || { bg: 'bg-gray-600', text: 'text-gray-200', label: status || 'Unknown' };

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${config.bg} ${config.text}
      `}
    >
      {config.label}
    </span>
  );
};