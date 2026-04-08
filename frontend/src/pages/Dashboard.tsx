import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Flame, AlertTriangle, Camera, CheckCircle, ShieldAlert, TrendingUp } from 'lucide-react';
import { getDetectionStats, getAlerts, getCameras } from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [cameras, setCameras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDetectionStats(),
      getAlerts({ limit: 5 }),
      getCameras(),
    ]).then(([statsRes, alertsRes, camerasRes]) => {
      setStats(statsRes.data);
      setRecentAlerts(alertsRes.data.alerts);
      setCameras(camerasRes.data.cameras);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" /></div>;
  }

  const severityColor: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link to="/monitor" className="btn-accent flex items-center gap-2">
          <Flame className="w-4 h-4" /> Start Monitoring
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl"><TrendingUp className="w-6 h-6 text-blue-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Total Scans</p>
              <p className="text-2xl font-bold">{stats?.total_scans || 0}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-xl"><Flame className="w-6 h-6 text-red-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Fire Detections</p>
              <p className="text-2xl font-bold">{stats?.fire_detections || 0}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-xl"><AlertTriangle className="w-6 h-6 text-orange-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Unacknowledged</p>
              <p className="text-2xl font-bold">{stats?.unacknowledged || 0}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl"><Camera className="w-6 h-6 text-green-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Active Cameras</p>
              <p className="text-2xl font-bold">{cameras.filter(c => c.is_active).length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Alerts</h2>
            <Link to="/alerts" className="text-sm text-primary-700 hover:underline">View all</Link>
          </div>
          {recentAlerts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No alerts yet. Start monitoring to detect fire & smoke.</p>
          ) : (
            <div className="space-y-3">
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <ShieldAlert className={`w-5 h-5 ${alert.severity === 'critical' ? 'text-red-500' : alert.severity === 'high' ? 'text-orange-500' : 'text-yellow-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{alert.detection_type}</p>
                    <p className="text-xs text-gray-500">{alert.camera_name || 'Manual Upload'} - {new Date(alert.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${severityColor[alert.severity] || 'bg-gray-100 text-gray-700'}`}>
                    {alert.severity}
                  </span>
                  {alert.acknowledged && <CheckCircle className="w-4 h-4 text-green-500" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Camera Status */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Camera Status</h2>
            <Link to="/cameras" className="text-sm text-primary-700 hover:underline">Manage</Link>
          </div>
          {cameras.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No cameras configured. Add cameras to start monitoring.</p>
          ) : (
            <div className="space-y-3">
              {cameras.map((cam) => (
                <div key={cam.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Camera className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{cam.name}</p>
                    <p className="text-xs text-gray-500">{cam.location}</p>
                  </div>
                  <span className={`w-3 h-3 rounded-full ${cam.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Severity Breakdown */}
      {stats && stats.total_detections > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Alert Severity Breakdown</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Critical', count: stats.critical_alerts, color: 'bg-red-500' },
              { label: 'High', count: stats.high_alerts, color: 'bg-orange-500' },
              { label: 'Medium', count: stats.medium_alerts, color: 'bg-yellow-500' },
              { label: 'Low', count: stats.low_alerts, color: 'bg-green-500' },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center text-white font-bold text-lg mx-auto`}>
                  {item.count}
                </div>
                <p className="text-sm text-gray-600 mt-2">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
