import React from 'react';
import {
  BookOpen,
  ArrowRight,
  Shield,
  Layers,
  Smartphone,
  Laptop,
  Server,
  Zap,
  Globe,
  CheckCircle2,
} from 'lucide-react';

interface WebRtcGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WebRtcGuideModal: React.FC<WebRtcGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">WebRTC P2P Architecture & Guide</h3>
              <p className="text-xs text-slate-500">How PeerDrop transfers files directly peer-to-peer</p>
            </div>
          </div>
          <button
            id="close-guide-btn"
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Section 1: Visual Signaling Diagram */}
        <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 font-sans">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            1. Signaling & Handshake Flow
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs py-2">
            <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700">
              <Laptop className="w-5 h-5 mx-auto text-indigo-400 mb-1" />
              <p className="font-semibold text-slate-200">Sender (Peer A)</p>
              <p className="text-[10px] text-slate-400 mt-1">Creates Offer + DataChannel</p>
            </div>
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 flex flex-col justify-center">
              <Server className="w-5 h-5 mx-auto text-amber-400 mb-1" />
              <p className="font-semibold text-slate-200">Socket.IO Server</p>
              <p className="text-[10px] text-amber-300 mt-1">Exchanges SDP & ICE Only</p>
            </div>
            <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700">
              <Smartphone className="w-5 h-5 mx-auto text-teal-400 mb-1" />
              <p className="font-semibold text-slate-200">Receiver (Peer B)</p>
              <p className="text-[10px] text-slate-400 mt-1">Answers Offer + Reassembles</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            The Socket.IO server acts exclusively as a matchmaker: when Peer A generates code <span className="font-mono text-indigo-300">123456</span>, Peer B joins the room. They exchange SDP Session Descriptions and STUN ICE candidates. Once connected, <strong className="text-white">0 bytes of file data</strong> touch the server.
          </p>
        </div>

        {/* Section 2: Chunking & Backpressure */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-600" />
            2. Binary Slicing & Backpressure Flow Control
          </h4>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2 leading-relaxed">
            <p>
              • <strong>Chunk Sizing:</strong> Large files are sliced into standard <strong>64 KB (65,536 bytes)</strong> chunks using JavaScript <code className="font-mono text-slate-800">Blob.slice()</code> and sent as raw binary <code className="font-mono text-slate-800">ArrayBuffer</code> packets over the reliable WebRTC DataChannel.
            </p>
            <p>
              • <strong>Backpressure Control:</strong> To prevent browser memory exhaustion on multi-gigabyte files, we monitor <code className="font-mono text-slate-800">dataChannel.bufferedAmount</code> with a <code className="font-mono text-slate-800">bufferedAmountLowThreshold</code> (256 KB). When the buffer exceeds 1 MB, chunk sending automatically pauses until the network drains, preventing tab crashes.
            </p>
            <p>
              • <strong>Receiver Assembly:</strong> Chunks are collected in sequence and combined into a final client-side <code className="font-mono text-slate-800">Blob</code> which creates an instantaneous browser download URL.
            </p>
          </div>
        </div>

        {/* Section 3: Dual-Device Testing Guide */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-teal-600" />
            3. How to Test on Two Devices
          </h4>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2.5 leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                1
              </span>
              <p>
                <strong>Sender:</strong> Open this app on Device 1 (e.g. Laptop), select a file to generate a 6-digit code or display the QR code.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                2
              </span>
              <p>
                <strong>Receiver:</strong> Open the app on Device 2 (e.g. Mobile phone or incognito tab), click <em>Receive</em>, and enter the 6-digit key or scan the QR code.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                3
              </span>
              <p>
                Watch real-time live speed meters, progress bars, and ETA meters on both screens as the file streams directly P2P!
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: STUN & TURN Servers */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-amber-600" />
            4. STUN vs TURN Servers
          </h4>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2 leading-relaxed">
            <p>
              • <strong>STUN (Default):</strong> Google STUN servers discover each peer's public IP and port to establish direct P2P connections (works for ~85% of standard home WiFi/cellular networks).
            </p>
            <p>
              • <strong>TURN (Relay):</strong> If both devices are behind strict symmetric NATs or corporate enterprise firewalls that block direct UDP/TCP holes, a TURN relay server can be configured in the <strong>Settings</strong> modal.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            id="done-guide-btn"
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
          >
            Got it, Let's Transfer!
          </button>
        </div>
      </div>
    </div>
  );
};
