import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, X } from 'lucide-react';

export const InstallPWA: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-xl bg-[#1554B8] px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-[#0B3F91] transition-all active:scale-95 animate-in slide-in-from-top duration-300"
      >
        <Download className="w-4 h-4" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-xl border border-[#DFE7F2] bg-white px-4 py-2 text-xs font-bold text-[#1554B8] shadow-sm hover:bg-slate-50 transition-all active:scale-95 animate-in slide-in-from-top duration-300"
        >
          <Share2 className="w-4 h-4" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-[#DFE7F2]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-[#17211D]">Install on iPhone</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-2 text-[#68746F] hover:text-[#17211D] rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4 bg-[#F2F6FC] p-4 rounded-2xl">
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-xl">1</span>
                  </div>
                  <p className="text-sm text-[#17211D] font-medium leading-relaxed">
                    Tap the <strong className="text-[#1554B8]">Share</strong> button in the bottom menu.
                  </p>
                </div>

                <div className="flex items-start gap-4 bg-[#F2F6FC] p-4 rounded-2xl">
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-xl">2</span>
                  </div>
                  <p className="text-sm text-[#17211D] font-medium leading-relaxed">
                    Scroll down and tap <strong className="text-[#1554B8]">Add to Home Screen</strong>.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-2xl bg-[#1554B8] py-4 text-sm font-black text-white hover:bg-[#0B3F91] shadow-lg shadow-blue-200 transition-all active:scale-95"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
