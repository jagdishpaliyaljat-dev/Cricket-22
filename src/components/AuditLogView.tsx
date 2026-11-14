import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Clock, User, ShieldCheck } from 'lucide-react';

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

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const logsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AuditLogEntry[];
        setLogs(logsData);
        setLoading(false);
      },
      (error) => {
        console.error("AuditLogView error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <ShieldCheck className="text-[#1554B8]" />
        Admin Audit Log
      </h2>
      
      {loading ? (
        <p className="text-slate-500">Loading logs...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100">
                <th className="pb-3 font-medium">Timestamp</th>
                <th className="pb-3 font-medium">Admin</th>
                <th className="pb-3 font-medium">Action</th>
                <th className="pb-3 font-medium">Target</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-50">
                  <td className="py-4 text-slate-600 flex items-center gap-2">
                    <Clock size={14} />
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-4 text-slate-800">{log.adminEmail}</td>
                  <td className="py-4 font-medium text-[#1554B8]">{log.action}</td>
                  <td className="py-4 text-slate-600">{log.targetType} ({log.targetId})</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
