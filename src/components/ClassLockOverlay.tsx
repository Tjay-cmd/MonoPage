'use client';

import { Lock } from 'lucide-react';

interface ClassLockOverlayProps {
  buttonColor?: string;
  onGetAccess?: () => void;
}

export default function ClassLockOverlay({
  buttonColor = '#f59e0b',
  onGetAccess,
}: ClassLockOverlayProps) {
  return (
    <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center z-20 pointer-events-none">
      <div className="text-center pointer-events-auto">
        <Lock className="h-16 w-16 text-white mx-auto mb-4" />
        <button
          onClick={onGetAccess}
          className="px-8 py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90"
          style={{ backgroundColor: buttonColor }}
        >
          Get Access
        </button>
      </div>
    </div>
  );
}



