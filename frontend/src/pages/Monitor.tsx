import { useState, useRef } from 'react';
import { Upload, Camera, AlertTriangle, CheckCircle, Flame, Info } from 'lucide-react';
import { analyzeImage, getCameras } from '../services/api';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

export default function Monitor() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCameras().then((res) => setCameras(res.data.cameras));
  }, []);

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) handleFile(f);
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (selectedCamera) formData.append('camera_id', selectedCamera);
      const res = await analyzeImage(formData);
      setResult(res.data);
      if (res.data.detected) {
        toast.error(`${res.data.type} detected! Severity: ${res.data.severity}`, { duration: 5000 });
      } else {
        toast.success('No fire or smoke detected');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const severityStyles: Record<string, { bg: string; text: string; border: string }> = {
    critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
    high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
    medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300' },
    low: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300' },
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Fire & Smoke Monitor</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Area */}
        <div className="card">
          <h2 className="font-semibold mb-4">Upload Image</h2>

          {cameras.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Camera Source (Optional)</label>
              <select value={selectedCamera} onChange={(e) => setSelectedCamera(e.target.value)} className="input-field">
                <option value="">Manual Upload</option>
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} - {c.location}</option>
                ))}
              </select>
            </div>
          )}

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-700 hover:bg-primary-700/5 transition-colors"
          >
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
            ) : (
              <div className="space-y-3">
                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                <p className="text-gray-600">Drag & drop an image or click to browse</p>
                <p className="text-sm text-gray-400">JPEG, PNG, WebP, BMP (max 10MB)</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

          <button onClick={analyze} disabled={!file || loading} className="btn-accent w-full mt-4 py-3 flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? (
              <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> Analyzing...</>
            ) : (
              <><Flame className="w-5 h-5" /> Analyze for Fire & Smoke</>
            )}
          </button>
        </div>

        {/* Results */}
        <div className="card">
          <h2 className="font-semibold mb-4">Detection Results</h2>

          {!result ? (
            <div className="text-center py-16 text-gray-400">
              <Camera className="w-16 h-16 mx-auto mb-3 opacity-50" />
              <p>Upload an image to start detection</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status Badge */}
              <div className={`p-4 rounded-xl border ${result.detected ? (severityStyles[result.severity]?.bg || 'bg-red-50') + ' ' + (severityStyles[result.severity]?.border || 'border-red-300') : 'bg-green-50 border-green-300'}`}>
                <div className="flex items-center gap-3">
                  {result.detected ? (
                    <AlertTriangle className={`w-8 h-8 ${severityStyles[result.severity]?.text || 'text-red-700'}`} />
                  ) : (
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  )}
                  <div>
                    <p className={`font-bold text-lg ${result.detected ? (severityStyles[result.severity]?.text || 'text-red-700') : 'text-green-700'}`}>
                      {result.detected ? `${result.type} Detected` : 'All Clear'}
                    </p>
                    <p className="text-sm opacity-75">Confidence: {result.confidence}%</p>
                  </div>
                </div>
              </div>

              {/* Severity */}
              {result.severity && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">Severity:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase ${
                    result.severity === 'critical' ? 'bg-red-500 text-white' :
                    result.severity === 'high' ? 'bg-orange-500 text-white' :
                    result.severity === 'medium' ? 'bg-yellow-500 text-white' :
                    'bg-green-500 text-white'
                  }`}>{result.severity}</span>
                </div>
              )}

              {/* Regions */}
              {result.regions && result.regions.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Detected Regions ({result.regions.length})</p>
                  <div className="space-y-2">
                    {result.regions.map((r: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg text-sm">
                        <span>{r.label}</span>
                        <span className="font-medium">{r.confidence}% confidence</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendation */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-800">Recommendation</p>
                    <p className="text-sm text-blue-700 mt-1">{result.recommendation}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
