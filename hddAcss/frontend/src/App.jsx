import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, File, ArrowLeft, Download, Trash2, 
  Copy, Scissors, Clipboard, Upload, Plus,
  HardDrive, RefreshCw, Home, LogOut, Lock, Archive
} from 'lucide-react';

const API_BASE_URL = ""; 

export default function App() {
  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clipboard, setClipboard] = useState({ action: null, path: null, name: null });
  const [uploadQueue, setUploadQueue] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });

  const fileInputRef = useRef(null);

  // --- AUTH HELPERS ---
  const getAuthHeaders = () => {
    const { username, password } = credentials;
    return {
      'Authorization': 'Basic ' + btoa(username + ":" + password)
    };
  };

  useEffect(() => {
    // Check local storage for saved session
    const saved = localStorage.getItem('fm_creds');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCredentials(parsed);
        // Optimistically set auth to true, verify with fetch later
        setIsAuthenticated(true);
      } catch (e) {
        console.error("Auth parse error", e);
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && credentials.username) {
      fetchFiles("");
    }
  }, [isAuthenticated]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const user = e.target.username.value;
    const pass = e.target.password.value;
    
    // Create temp creds for the check
    const tempCreds = { username: user, password: pass };
    const headers = { 'Authorization': 'Basic ' + btoa(user + ":" + pass) };

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/login`, { method: 'POST', headers });
      if (res.ok) {
        setCredentials(tempCreds);
        setIsAuthenticated(true);
        localStorage.setItem('fm_creds', JSON.stringify(tempCreds));
      } else {
        setStatusMsg("Invalid credentials");
      }
    } catch (err) {
      setStatusMsg("Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCredentials({ username: '', password: '' });
    setFiles([]);
    localStorage.removeItem('fm_creds');
  };

  // --- API CALLS ---

  const fetchFiles = async (path) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/files?path=${encodeURIComponent(path)}`, {
        headers: getAuthHeaders()
      });
      if (res.status === 401) {
        handleLogout(); // Session expired/invalid
        return;
      }
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setFiles(data);
      setCurrentPath(path);
    } catch (err) {
      console.error(err);
      setStatusMsg("Error loading files.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (path, filename, isDir) => {
    try {
      setStatusMsg(isDir ? "Zipping and downloading..." : "Downloading...");
      const res = await fetch(`${API_BASE_URL}/api/download?path=${encodeURIComponent(path)}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Download failed");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Auto-append .zip if it was a folder, otherwise use the filename
      a.download = isDir ? `${filename}.zip` : filename; 
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      setStatusMsg("");
    } catch (err) {
      setStatusMsg("Download failed.");
    }
  };

  const handleDelete = async (path) => {
    if (!confirm(`Are you sure you want to delete ${path}?`)) return;
    try {
      await fetch(`${API_BASE_URL}/api/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ action: "delete", source_path: path })
      });
      fetchFiles(currentPath);
      setStatusMsg("Deleted successfully.");
    } catch (err) {
      setStatusMsg("Delete failed.");
    }
  };

  const handleCopyMove = (action, file) => {
    setClipboard({ 
      action, 
      path: file.path,
      name: file.name
    });
    setStatusMsg(`${action === 'copy' ? 'Copied' : 'Cut'} ${file.name} to clipboard`);
  };

  const handlePaste = async () => {
    if (!clipboard.path) return;
    try {
      await fetch(`${API_BASE_URL}/api/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ 
          action: clipboard.action, 
          source_path: clipboard.path, 
          dest_path: currentPath 
        })
      });
      fetchFiles(currentPath);
      setClipboard({ action: null, path: null, name: null });
      setStatusMsg("Paste successful.");
    } catch (err) {
      setStatusMsg("Paste failed.");
    }
  };

  const handleCreateFolder = async () => {
    const name = prompt("Enter folder name:");
    if (!name) return;
    try {
      await fetch(`${API_BASE_URL}/api/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ 
          action: "create_folder", 
          source_path: currentPath, 
          dest_path: name 
        })
      });
      fetchFiles(currentPath);
    } catch (err) {
      setStatusMsg("Failed to create folder.");
    }
  };

  // --- UPLOAD & DRAG DROP ---

  const performUpload = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", currentPath);

    setUploadQueue(file.name);
    try {
      await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: getAuthHeaders(), // Note: Content-Type is auto-set by FormData
        body: formData
      });
      setStatusMsg(`Uploaded ${file.name}`);
    } catch (err) {
      setStatusMsg(`Failed to upload ${file.name}`);
    } finally {
      setUploadQueue(null);
    }
  };

  const handleUploadInput = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    await performUpload(e.target.files[0]);
    fetchFiles(currentPath);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Handle multiple files if dropped
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        await performUpload(file);
      }
      fetchFiles(currentPath);
    }
  };

  // --- RENDER HELPERS ---

  const formatSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getBreadcrumbs = () => {
    if (!currentPath || currentPath === "/") return [];
    // Handle root path variations
    const cleanPath = currentPath.startsWith("/") ? currentPath.substring(1) : currentPath;
    const parts = cleanPath.split("/").filter(Boolean);
    let accum = "";
    return parts.map(part => {
      accum += "/" + part;
      return { name: part, path: accum };
    });
  };

  const navigateUp = () => {
    if (!currentPath || currentPath === "/") return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    fetchFiles(parts.length ? "/" + parts.join("/") : "/");
  };

  // --- LOGIN VIEW ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-3 rounded-full">
              <Lock className="text-blue-600 w-8 h-8" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Server Login</h2>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input 
                name="username" 
                type="text" 
                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input 
                name="password" 
                type="password" 
                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••"
              />
            </div>
            
            {statusMsg && <div className="text-red-500 text-sm text-center">{statusMsg}</div>}
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Access Files"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- MAIN APP VIEW ---
  return (
    <div 
      className="min-h-screen bg-slate-100 text-slate-800 font-sans relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* DRAG OVERLAY */}
      {isDragging && (
        <div className="fixed inset-0 bg-blue-500/20 z-50 flex items-center justify-center backdrop-blur-sm border-4 border-blue-500 border-dashed m-4 rounded-xl pointer-events-none">
          <div className="bg-white/90 p-8 rounded-xl shadow-2xl flex flex-col items-center animate-bounce">
            <Upload className="w-16 h-16 text-blue-600 mb-4" />
            <h3 className="text-2xl font-bold text-blue-700">Drop files to upload</h3>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <HardDrive className="text-blue-600" size={24} />
            <h1 className="text-xl font-bold text-slate-700">Debian Server Manager</h1>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
             <button 
                onClick={() => fetchFiles("/")}
                className="p-2 hover:bg-slate-100 rounded text-slate-600"
                title="Go to Root"
              >
                <Home size={18} />
              </button>
             <button 
                onClick={navigateUp}
                disabled={!currentPath || currentPath === "/"}
                className="p-2 hover:bg-slate-100 rounded text-slate-600 disabled:opacity-30"
              >
                <ArrowLeft size={18} />
              </button>
              
              <div className="flex items-center text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded flex-grow whitespace-nowrap overflow-hidden">
                <span className="text-slate-400 mr-1">/</span>
                {getBreadcrumbs().map((crumb, i) => (
                  <span key={crumb.path} className="flex items-center">
                    <button 
                      onClick={() => fetchFiles(crumb.path)} 
                      className="hover:text-blue-600 hover:underline px-1"
                    >
                      {crumb.name}
                    </button>
                    <span className="text-slate-400 mx-1">/</span>
                  </span>
                ))}
              </div>

              <button 
                onClick={handleLogout}
                className="p-2 text-red-500 hover:bg-red-50 rounded ml-2"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
          </div>
        </div>
      </header>

      {/* TOOLBAR */}
      <div className="bg-white border-b border-slate-200 px-4 py-2">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-3">
          <button 
            onClick={handleCreateFolder}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-sm font-medium transition-colors"
          >
            <Plus size={16} /> New Folder
          </button>

          <label className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-sm font-medium cursor-pointer transition-colors">
            <Upload size={16} /> Upload File
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleUploadInput}
            />
          </label>

          {clipboard.path && (
            <div className="flex items-center gap-2 ml-auto bg-yellow-50 px-3 py-1 rounded border border-yellow-200">
               <span className="text-xs text-yellow-800">
                 {clipboard.action === 'copy' ? <Copy size={12} className="inline"/> : <Scissors size={12} className="inline"/>} 
                 {' '}{clipboard.name}
               </span>
               <button 
                 onClick={handlePaste}
                 className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500 hover:bg-yellow-600 text-white text-xs rounded shadow-sm"
               >
                 <Clipboard size={12} /> Paste
               </button>
               <button 
                 onClick={() => setClipboard({ action: null, path: null })}
                 className="text-yellow-600 hover:text-yellow-800 text-xs px-1"
               >✕</button>
            </div>
          )}

          {loading && <RefreshCw size={16} className="animate-spin text-blue-500 ml-auto" />}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="max-w-6xl mx-auto p-4 pb-20">
        {statusMsg && (
          <div className="mb-4 px-4 py-2 bg-slate-800 text-white text-sm rounded flex justify-between items-center animate-pulse">
            {statusMsg}
            <button onClick={() => setStatusMsg("")} className="ml-2">✕</button>
          </div>
        )}

        {uploadQueue && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
            Uploading <b>{uploadQueue}</b>...
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden min-h-[50vh]">
          {files.length === 0 && !loading ? (
             <div className="p-16 text-center text-slate-400 flex flex-col items-center">
                <Folder className="w-16 h-16 mb-4 text-slate-200" />
                <p>Directory is empty</p>
                <p className="text-sm mt-2">Drag files here to upload</p>
             </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold w-32">Size</th>
                  <th className="p-4 font-semibold w-48 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {files.map((file) => (
                  <tr key={file.name} className="hover:bg-slate-50 group transition-colors">
                    <td className="p-3">
                      <div 
                        onClick={() => file.is_dir && fetchFiles(file.path)}
                        className={`flex items-center gap-3 cursor-pointer ${file.is_dir ? 'text-slate-800 font-medium' : 'text-slate-600'}`}
                      >
                        {file.is_dir ? (
                          <Folder className="text-yellow-400 fill-yellow-400" size={20} />
                        ) : (
                          <File className="text-slate-400" size={20} />
                        )}
                        <span className="truncate max-w-[200px] sm:max-w-md">{file.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-slate-400">
                      {file.is_dir ? "-" : formatSize(file.size)}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleDownload(file.path, file.name, file.is_dir)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title={file.is_dir ? "Download Zip" : "Download"}
                        >
                          {file.is_dir ? <Archive size={16} /> : <Download size={16} />}
                        </button>
                        <button 
                          onClick={() => handleCopyMove('copy', file)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Copy"
                        >
                          <Copy size={16} />
                        </button>
                        <button 
                          onClick={() => handleCopyMove('move', file)}
                          className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded"
                          title="Move"
                        >
                          <Scissors size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(file.path)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}