import { useState, useEffect } from 'react';
import { Camera, Plus, Pencil, Trash2, X, MapPin, Link as LinkIcon } from 'lucide-react';
import { getCameras, createCamera, updateCamera, deleteCamera } from '../services/api';
import toast from 'react-hot-toast';

export default function Cameras() {
  const [cameras, setCameras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', location: '', stream_url: '', is_active: true });

  const fetchCameras = async () => {
    setLoading(true);
    try {
      const res = await getCameras();
      setCameras(res.data.cameras);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCameras(); }, []);

  const resetForm = () => {
    setForm({ name: '', location: '', stream_url: '', is_active: true });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateCamera(editingId, form);
        toast.success('Camera updated');
      } else {
        await createCamera(form);
        toast.success('Camera added');
      }
      resetForm();
      fetchCameras();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save camera');
    }
  };

  const handleEdit = (cam: any) => {
    setForm({ name: cam.name, location: cam.location, stream_url: cam.stream_url || '', is_active: cam.is_active });
    setEditingId(cam.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this camera?')) return;
    try {
      await deleteCamera(id);
      toast.success('Camera deleted');
      fetchCameras();
    } catch {
      toast.error('Failed to delete camera');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Camera Management</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-accent flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Camera
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => resetForm()}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editingId ? 'Edit Camera' : 'Add Camera'}</h2>
              <button onClick={resetForm}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Camera Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Main Entrance Camera" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input-field" placeholder="Building A, Floor 1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stream URL (Optional)</label>
                <input value={form.stream_url} onChange={(e) => setForm({ ...form, stream_url: e.target.value })} className="input-field" placeholder="rtsp://..." />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
                <span className="text-sm">Active</span>
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={resetForm} className="btn-outline flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">{editingId ? 'Update' : 'Add Camera'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera List */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" /></div>
      ) : cameras.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No cameras configured yet</p>
          <button onClick={() => setShowForm(true)} className="btn-accent mt-4">Add Your First Camera</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cameras.map((cam) => (
            <div key={cam.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${cam.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Camera className={`w-6 h-6 ${cam.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{cam.name}</h3>
                    <span className={`text-xs font-medium ${cam.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                      {cam.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(cam)} className="p-1 text-gray-400 hover:text-primary-700"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(cam.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {cam.location && (
                <div className="flex items-center gap-1 mt-3 text-sm text-gray-500">
                  <MapPin className="w-4 h-4" /> {cam.location}
                </div>
              )}
              {cam.stream_url && (
                <div className="flex items-center gap-1 mt-1 text-sm text-gray-500 truncate">
                  <LinkIcon className="w-4 h-4 flex-shrink-0" /> <span className="truncate">{cam.stream_url}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
