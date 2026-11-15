import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Clock, ShieldCheck, Activity } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetId: string;
  targetType: string;
  timestamp: string;
  details: any;
}

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const logsRef = collection(db, 'auditLogs');
    const q = query(logsRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AuditLogEntry[];
        setLogs(logsData);
        setLoading(false);
      },
      (error) => {
        console.error('AuditLogView error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <div className="stadium-card rounded-3xl p-5 sm:p-6 shadow-2xl border border-white/10 text-slate-100 font-sans space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00F2FE]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">Admin Audit Trail</h2>
            <p className="text-[11px] text-slate-400">Security event log of privileged administrative actions</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-cyan-400">
          {logs.length} Records
        </span>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
          <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-[#00F2FE] rounded-full animate-spin" />
          <span className="text-xs font-mono">Loading audit logs...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs font-medium space-y-1">
          <Activity className="w-8 h-8 text-slate-600 mx-auto" />
          <p>No audit events logged yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-white/10 text-[11px] font-bold uppercase tracking-wider">
                <th className="pb-3 font-semibold">Timestamp</th>
                <th className="pb-3 font-semibold">Admin</th>
                <th className="pb-3 font-semibold">Action</th>
                <th className="pb-3 font-semibold">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
                    <Clock size={13} className="text-[#00F2FE] shrink-0" />
                    <span>{new Date(log.timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td className="py-3.5 text-white font-medium truncate max-w-[140px]">
                    {log.adminEmail}
                  </td>
                  <td className="py-3.5">
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-[#00F2FE] font-bold text-[10px] uppercase">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 text-slate-400 truncate max-w-[160px]">
                    <span className="text-slate-300 font-semibold">{log.targetType}</span>
                    <span className="text-[10px] text-slate-400 ml-1">({log.targetId.substring(0, 10)})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
