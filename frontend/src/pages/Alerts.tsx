import { useState, useEffect } from 'react';
import { Bell, CheckCircle, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAlerts, acknowledgeAlert } from '../services/api';
import toast from 'react-hot-toast';

export default function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [severityFilter, setSeverityFilter] = useState('');
  const [ackFilter, setAckFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (severityFilter) params.severity = severityFilter;
      if (ackFilter !== '') params.acknowledged = ackFilter === 'true';
      const res = await getAlerts(params);
      setAlerts(res.data.alerts);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, [page, severityFilter, ackFilter]);

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeAlert(id, { notes: '' });
      toast.success('Alert acknowledged');
      fetchAlerts();
    } catch {
      toast.error('Failed to acknowledge alert');
    }
  };

  const severityColor: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Alert Log</h1>
        <span className="text-sm text-gray-500">{total} total alerts</span>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <select value={severityFilter} onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }} className="input-field w-auto">
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={ackFilter} onChange={(e) => { setAckFilter(e.target.value); setPage(1); }} className="input-field w-auto">
            <option value="">All Status</option>
            <option value="false">Unacknowledged</option>
            <option value="true">Acknowledged</option>
          </select>
        </div>
      </div>

      {/* Alert List */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" /></div>
      ) : alerts.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No alerts found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="card flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{alert.detection_type}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityColor[alert.severity] || ''}`}>
                    {alert.severity}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {alert.camera_name || 'Manual Upload'} | Confidence: {alert.confidence}%
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(alert.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {alert.acknowledged ? (
                  <span className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle className="w-4 h-4" /> Acknowledged
                  </span>
                ) : (
                  <button onClick={() => handleAcknowledge(alert.id)} className="btn-primary text-sm py-1 px-3">
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-outline p-2 disabled:opacity-50">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-600">Page {page} of {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn-outline p-2 disabled:opacity-50">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
