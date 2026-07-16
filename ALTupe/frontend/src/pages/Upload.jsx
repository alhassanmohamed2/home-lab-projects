import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { Upload as UploadIcon, FileVideo, AlertCircle } from "lucide-react";

export default function Upload() {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected && selected.type.startsWith("video/")) {
            setFile(selected);
            setError("");
        } else {
            setFile(null);
            setError("Please select a valid video file.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setError("Please select a video file.");
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append("title", title);
        formData.append("description", description);
        formData.append("file", file);

        try {
            await api.post("/videos/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                },
            });
            navigate("/");
        } catch (err) {
            setError("Upload failed. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white">
            <div className="max-w-3xl mx-auto">
                <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-8 shadow-2xl">
                    <div className="flex items-center space-x-3 mb-8">
                        <UploadIcon className="h-8 w-8 text-blue-500" />
                        <h1 className="text-2xl font-bold">Upload Video</h1>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center space-x-2 text-red-200">
                            <AlertCircle className="h-5 w-5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-400">Video File</label>
                            <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 transition-colors hover:border-blue-500/50 hover:bg-gray-900/50 group text-center cursor-pointer relative">
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {file ? (
                                    <div className="flex items-center justify-center space-x-2 text-blue-400">
                                        <FileVideo className="h-6 w-6" />
                                        <span className="font-medium">{file.name}</span>
                                    </div>
                                ) : (
                                    <div className="space-y-2 text-gray-400 group-hover:text-gray-300">
                                        <UploadIcon className="h-8 w-8 mx-auto mb-2" />
                                        <p>Drag and drop or click to select</p>
                                        <p className="text-xs text-gray-500">MP4, WebM up to 500MB</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-400">Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white"
                                placeholder="Give your video a catchy title"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-400">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white resize-none"
                                placeholder="Tell viewers what your video is about"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all transform hover:scale-[1.01] ${loading
                                ? "bg-gray-700 cursor-not-allowed text-gray-400"
                                : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-900/20"
                                }`}
                        >
                            {loading ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <span>Uploading... {uploadProgress}%</span>
                                </div>
                            ) : "Publish Video"}
                        </button>

                        {loading && (
                            <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
