import React, { useState, useEffect, useRef, useMemo } from 'react';
import io from 'socket.io-client';
import { 
  Trophy, 
  Brain, 
  CheckCircle, 
  Lock,
  Star,
  Menu, 
  Wifi,
  WifiOff,
  AlertCircle,
  RefreshCw,
  X
} from 'lucide-react';

// --- Configuration ---
// Nginx handles routing. We use relative paths.
const BACKEND_URL = ''; 

// --- Game Constants & Shapes ---
const CANVAS_SIZE = 600;

// Defined as polygon vertices relative to center (0,0)
const PIECES_DEF = [
  { id: 1, color: '#FF6B6B', vertices: [{x:-40,y:-20}, {x:40,y:-20}, {x:40,y:20}, {x:-40,y:20}] }, // Rect
  { id: 2, color: '#4ECDC4', vertices: [{x:-40,y:40}, {x:0,y:-40}, {x:40,y:40}] }, // Triangle
  { id: 3, color: '#45B7D1', vertices: [{x:-30,y:-30}, {x:30,y:-30}, {x:30,y:30}, {x:-30,y:30}] }, // Square
  { id: 4, color: '#FFA07A', vertices: [{x:-40,y:20}, {x:0,y:-20}, {x:40,y:20}, {x:20,y:20}, {x:-20,y:20}] } // Trap
];

// --- PUZZLE PRESETS ---
const PUZZLE_PRESETS = [
  [{ x: -40, y: -40, r: 0 }, { x: 40, y: -40, r: 90 }, { x: -40, y: 40, r: 0 }, { x: 40, y: 40, r: 180 }],
  [{ x: -120, y: 0, r: 0 }, { x: -40, y: 0, r: 0 }, { x: 40, y: 0, r: 0 }, { x: 120, y: 0, r: 0 }],
  [{ x: 0, y: -100, r: 90 }, { x: 0, y: -20, r: 0 }, { x: 0, y: 50, r: 0 }, { x: 0, y: 120, r: 180 }],
  [{ x: 0, y: -80, r: 90 }, { x: 0, y: 0, r: 90 }, { x: 0, y: 80, r: 90 }, { x: 80, y: 80, r: 0 }],
  [{ x: -60, y: -40, r: 0 }, { x: 0, y: 0, r: 0 }, { x: 60, y: 40, r: 0 }, { x: 0, y: 80, r: 45 }],
  [{ x: -80, y: -60, r: 0 }, { x: 0, y: -60, r: 0 }, { x: 80, y: -60, r: 0 }, { x: 0, y: 20, r: 90 }],
  [{ x: 0, y: -60, r: 0 }, { x: -50, y: 20, r: 0 }, { x: 0, y: 20, r: 0 }, { x: 50, y: 20, r: 0 }]
];

// --- Helper Math ---
const isPointInPolygon = (p, vertices) => {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    const intersect = ((yi > p.y) !== (yj > p.y)) &&
      (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

// --- Components ---

const Leaderboard = ({ users = [], currentUserId, isConnected, onRefresh, compact = false }) => {
  return (
    <div className={`bg-white h-full flex flex-col relative overflow-hidden ${compact ? 'shadow-none' : 'shadow-lg rounded-xl p-4'}`}>
      <div className={`flex justify-between items-center ${compact ? 'pb-4 border-b border-gray-100' : 'mb-4'}`}>
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          {!compact && <Trophy className="text-yellow-500" size={24} />} 
          {compact ? 'Global Ranking' : 'Top Minds'}
        </h3>
        <button onClick={onRefresh} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 active:scale-95 transition">
          <RefreshCw size={16} className="text-slate-600" />
        </button>
      </div>
      
      <div className={`flex items-center gap-2 text-xs font-bold mb-4 ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
        {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
        {isConnected ? 'LIVE CONNECTION' : 'OFFLINE'}
      </div>

      <div className={`overflow-y-auto flex-1 ${compact ? 'pt-2' : 'pr-1'}`}>
        {!users || users.length === 0 ? (
          <div className="text-gray-400 text-center mt-10 p-4 border-2 border-dashed border-gray-200 rounded-xl">
            {isConnected ? "Waiting for players..." : "No connection to server"}
          </div>
        ) : (
          users.map((u, idx) => (
            <div 
              key={u.id} 
              className={`flex justify-between items-center p-3 mb-2 rounded-lg transition-all ${u.id === currentUserId ? 'bg-blue-50 border border-blue-200 shadow-sm' : 'bg-gray-50'}`}
            >
              <div className="flex items-center gap-3">
                <span className={`font-bold w-6 text-center text-lg ${idx < 3 ? 'text-yellow-500 drop-shadow-sm' : 'text-gray-400'}`}>
                  {idx + 1}
                </span>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm truncate max-w-[120px]">{u.name || 'Anonymous'}</span>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Level {u.currentLevel}</span>
                </div>
              </div>
              <div className="font-mono font-bold text-blue-600">{u.score}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const App = () => {
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [view, setView] = useState('menu'); 
  const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false); 
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Game State
  const canvasRef = useRef(null);
  const [pieces, setPieces] = useState([]);
  const [targetShape, setTargetShape] = useState([]);
  const [feedback, setFeedback] = useState(null); 
  const [dragState, setDragState] = useState({ id: null, offsetX: 0, offsetY: 0, startX: 0, startY: 0 });

  // --- Level Generation Logic ---
  const levels = useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => {
      const presetIndex = i % PUZZLE_PRESETS.length;
      const preset = PUZZLE_PRESETS[presetIndex];
      const globalRotation = (Math.floor(i / PUZZLE_PRESETS.length) * 90) % 360;

      return {
        id: i + 1,
        score: (i + 1) * 100,
        difficulty: i < 20 ? 'Novice' : i < 50 ? 'Advanced' : 'Genius',
        solution: PIECES_DEF.map((p, idx) => {
          const conf = preset[idx % preset.length];
          const rad = (globalRotation * Math.PI) / 180;
          const rotatedX = conf.x * Math.cos(rad) - conf.y * Math.sin(rad);
          const rotatedY = conf.x * Math.sin(rad) + conf.y * Math.cos(rad);

          return {
            ...p,
            x: 300 + rotatedX, 
            y: 300 + rotatedY,
            rotation: (conf.r + globalRotation) % 360 
          };
        })
      };
    });
  }, []);

  // --- Initialization ---
  useEffect(() => {
    // CACHE BUSTER: This log verifies you have the new code. 
    console.log("VERSION: 3.0 (Mobile Modal Fix) - Time: " + new Date().toISOString());
    
    let storedId = localStorage.getItem('iq_gym_uid');
    if (!storedId) {
      storedId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('iq_gym_uid', storedId);
    }
    setUserId(storedId);

    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/user/${storedId}`);
        
        if (res.ok) {
           // CASE 1: User exists on server
           const data = await res.json();
           setScore(data.score);
           setCurrentLevel(data.currentLevel);
           setUserName(data.name);
           syncScore(storedId, data.name, data.score, data.currentLevel);
        } else {
           // CASE 2: Server forgot us (Restarted) -> Re-register
           console.log("User not found on server (404). Re-registering...");
           const newName = `Mind_${storedId.slice(0, 5)}`;
           setUserName(newName);
           syncScore(storedId, newName, 0, 1);
        }
      } catch (err) {
        console.warn("Backend connection issue:", err.message);
      }
    };
    fetchProfile();

    // SOCKET SETUP
    // Explicitly use window.location.origin.
    // If you are on https://puzzle.alhassan.life, this connects to https://puzzle.alhassan.life/socket.io
    const socketOrigin = window.location.origin;
    console.log(`Initializing Socket connection to: ${socketOrigin}`);
    
    const newSocket = io(socketOrigin, {
      path: '/socket.io/', 
      reconnectionAttempts: 20,
      transports: ['websocket', 'polling']
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log("Socket Connected Successfully");
      syncScore(storedId, userName, score, currentLevel);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error("Socket Connect Error:", err.message);
    });

    newSocket.on('leaderboardUpdate', (data) => {
      if(Array.isArray(data)) {
        setLeaderboardData(data);
      }
    });

    return () => newSocket.disconnect();
  }, []);

  const syncScore = async (uid, name, s, lvl) => {
    try {
      await fetch(`/api/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: uid || userId,
          name: name || userName,
          score: s !== undefined ? s : score,
          currentLevel: lvl || currentLevel
        })
      });
    } catch (err) {
      console.error("Sync failed");
    }
  };

  const initLevel = (levelId) => {
    const level = levels.find(l => l.id === levelId);
    setTargetShape(level.solution);
    const scrambled = PIECES_DEF.map((p, i) => ({
      ...p,
      x: 100 + (i * 120),
      y: 500,
      rotation: 0 
    }));
    setPieces(scrambled);
    setFeedback(null);
    setView('game');
    setShowMobileLeaderboard(false);
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // TARGET
    ctx.globalAlpha = 1.0; 
    ctx.fillStyle = '#1e293b'; 
    targetShape.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.beginPath();
      if (p.vertices.length > 0) {
        ctx.moveTo(p.vertices[0].x, p.vertices[0].y);
        p.vertices.forEach(v => ctx.lineTo(v.x, v.y));
      }
      ctx.closePath();
      ctx.fill(); 
      ctx.restore();
    });

    // PIECES
    ctx.globalAlpha = 1.0;
    pieces.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(p.vertices[0].x, p.vertices[0].y);
      p.vertices.forEach(v => ctx.lineTo(v.x, v.y));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    });
  };

  useEffect(() => {
    if (view === 'game') {
      const anim = requestAnimationFrame(drawCanvas);
      return () => cancelAnimationFrame(anim);
    }
  }, [pieces, targetShape, view]);

  // Pointer Handlers
  const getPointerPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const handleStart = (e) => {
    if(e.type === 'touchstart') e.preventDefault();
    const pos = getPointerPos(e);
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i];
      const rad = (-p.rotation * Math.PI) / 180;
      const dx = pos.x - p.x;
      const dy = pos.y - p.y;
      const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
      const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

      if (isPointInPolygon({x: localX, y: localY}, p.vertices)) {
        setDragState({
          id: p.id,
          offsetX: pos.x - p.x,
          offsetY: pos.y - p.y,
          startX: pos.x,
          startY: pos.y,
          startTime: Date.now()
        });
        const newPieces = [...pieces];
        const [moved] = newPieces.splice(i, 1);
        newPieces.push(moved);
        setPieces(newPieces);
        return;
      }
    }
  };

  const handleMove = (e) => {
    if (!dragState.id) return;
    if(e.type === 'touchmove') e.preventDefault();
    const pos = getPointerPos(e);
    setPieces(prev => prev.map(p => {
      if (p.id === dragState.id) {
        return { ...p, x: pos.x - dragState.offsetX, y: pos.y - dragState.offsetY };
      }
      return p;
    }));
  };

  const handleEnd = (e) => {
    if (!dragState.id) return;
    const pos = e.changedTouches ? getPointerPos({touches: e.changedTouches}) : getPointerPos(e);
    const dist = Math.hypot(pos.x - dragState.startX, pos.y - dragState.startY);
    const time = Date.now() - dragState.startTime;
    if (dist < 10 && time < 300) {
      setPieces(prev => prev.map(p => {
        if (p.id === dragState.id) return { ...p, rotation: (p.rotation + 90) % 360 };
        return p;
      }));
    }
    setDragState({ id: null, offsetX: 0, offsetY: 0 });
  };

  const checkSolution = async () => {
    const TOLERANCE = 45; 
    const ROTATION_TOLERANCE = 15;
    let allCorrect = true;

    pieces.forEach(p => {
      const target = targetShape.find(t => t.id === p.id);
      const dist = Math.hypot(p.x - target.x, p.y - target.y);
      const rotDiff = Math.abs(p.rotation - target.rotation) % 360;
      const rotMatch = rotDiff < ROTATION_TOLERANCE || Math.abs(rotDiff - 360) < ROTATION_TOLERANCE;
      if (dist > TOLERANCE || !rotMatch) allCorrect = false;
    });

    if (allCorrect) {
      setFeedback('success');
      const levelPoints = levels.find(l => l.id === currentLevel).score;
      const newScore = score + levelPoints;
      const newLevel = currentLevel + 1;
      
      setScore(newScore);
      setCurrentLevel(newLevel);
      await syncScore(userId, userName, newScore, newLevel);

      setTimeout(() => {
        setView('menu');
        setFeedback(null);
      }, 2000);
    } else {
      setFeedback('fail');
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-100 font-sans text-slate-800 flex flex-col md:flex-row overflow-hidden">
      
      {/* DESKTOP SIDEBAR (Hidden on Mobile) */}
      <div className="hidden md:flex w-80 bg-white border-r border-slate-200 flex-col h-screen z-10">
        <div className="p-6 bg-blue-600 text-white shadow-md">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8" /> IQ GYM
          </h1>
          <div className="mt-4 flex justify-between items-end">
            <div>
              <div className="text-xs uppercase tracking-wider opacity-75">Score</div>
              <div className="text-3xl font-bold">{score}</div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider opacity-75">Lvl</div>
              <div className="text-xl font-bold">#{currentLevel}</div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden p-2 bg-slate-50">
          <Leaderboard 
            users={leaderboardData} 
            currentUserId={userId} 
            isConnected={isConnected} 
            onRefresh={() => syncScore(userId, userName, score, currentLevel)}
          />
        </div>
      </div>

      {/* MOBILE MAIN CONTENT (Full Width/Height) */}
      <div className="flex-1 flex flex-col h-[100dvh] relative overflow-hidden">
        
        {/* Mobile Header with Dropdown Toggle */}
        <div className="md:hidden h-14 bg-blue-600 text-white flex items-center justify-between px-4 shadow-md shrink-0 z-20 relative">
          <div className="font-bold flex items-center gap-2"><Brain size={20} /> IQ GYM</div>
          
          <div className="flex items-center gap-3">
            <div className="text-xs font-bold bg-blue-700 px-2 py-1 rounded">LVL {currentLevel}</div>
            
            {/* LEADERBOARD TOGGLE BUTTON */}
            <button 
              onClick={() => setShowMobileLeaderboard(!showMobileLeaderboard)}
              className={`p-2 rounded-full transition-colors ${showMobileLeaderboard ? 'bg-white text-blue-600' : 'bg-blue-500 text-white active:bg-blue-700'}`}
            >
              {showMobileLeaderboard ? <X size={20} /> : <Trophy size={20} />}
            </button>
          </div>
        </div>

        {/* MOBILE LEADERBOARD FULL SCREEN MODAL */}
        {showMobileLeaderboard && (
          <div className="md:hidden fixed inset-0 z-50 bg-slate-100 flex flex-col animate-in fade-in duration-200">
             {/* Header */}
             <div className="flex items-center justify-between p-4 bg-white shadow-sm shrink-0">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                  <Trophy className="text-yellow-500" /> Leaderboard
                </h2>
                <button 
                  onClick={() => setShowMobileLeaderboard(false)} 
                  className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 active:scale-95"
                >
                  <X size={24} className="text-slate-600" />
                </button>
             </div>
             
             {/* List Content */}
             <div className="flex-1 overflow-hidden p-4">
                 <Leaderboard 
                    users={leaderboardData} 
                    currentUserId={userId} 
                    isConnected={isConnected} 
                    onRefresh={() => syncScore(userId, userName, score, currentLevel)}
                    compact={true} 
                  />
             </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden bg-slate-100">
          {view === 'menu' && (
            <div className="flex-1 overflow-y-auto p-4 md:p-8 h-full">
              <div className="max-w-4xl mx-auto pb-20">
                <h2 className="text-2xl font-bold mb-6 text-slate-700">Select Challenge</h2>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-3">
                  {levels.map((lvl) => {
                    const isLocked = lvl.id > currentLevel;
                    const isCompleted = lvl.id < currentLevel;
                    return (
                      <button
                        key={lvl.id}
                        disabled={isLocked}
                        onClick={() => initLevel(lvl.id)}
                        className={`
                          aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all active:scale-95
                          ${isLocked ? 'bg-slate-200 text-slate-400 opacity-50' : isCompleted ? 'bg-green-100 border-2 border-green-500 text-green-700' : 'bg-white shadow-md border-2 border-blue-500 text-blue-600'}
                        `}
                      >
                        {isLocked ? <Lock size={16} /> : isCompleted ? <CheckCircle size={20} /> : <span className="text-lg font-bold">{lvl.id}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {view === 'game' && (
            <div className="flex-1 flex flex-col relative bg-slate-200 h-full">
              <div className="h-12 bg-white shadow-sm flex items-center justify-between px-4 shrink-0 z-10">
                <button onClick={() => setView('menu')} className="flex items-center gap-2 text-slate-600 font-medium">
                  <Menu size={20} /> Levels
                </button>
                <div className="text-sm font-bold text-slate-500">{levels.find(l=>l.id===currentLevel)?.difficulty}</div>
              </div>
              
              <div className="flex-1 relative touch-none flex items-center justify-center overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  onMouseDown={handleStart}
                  onMouseMove={handleMove}
                  onMouseUp={handleEnd}
                  onMouseLeave={handleEnd}
                  onTouchStart={handleStart}
                  onTouchMove={handleMove}
                  onTouchEnd={handleEnd}
                  className="bg-slate-300 shadow-inner max-w-full max-h-full aspect-square"
                />
                
                {/* Floating Action Button for Check */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20 pointer-events-none">
                  <button onClick={checkSolution} className="pointer-events-auto bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full text-xl font-bold shadow-lg transform active:scale-95 flex items-center gap-2">
                    <CheckCircle /> Check
                  </button>
                </div>
              </div>

              {feedback && (
                <div className={`absolute inset-0 flex items-center justify-center bg-black/60 z-50 backdrop-blur-sm animate-in fade-in`}>
                  <div className={`bg-white p-8 rounded-2xl shadow-2xl transform scale-110 flex flex-col items-center ${feedback === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                    {feedback === 'success' ? (
                      <><Trophy className="w-20 h-20 mb-4 animate-bounce" /><h2 className="text-3xl font-black">SOLVED!</h2></>
                    ) : (
                      <><AlertCircle className="w-20 h-20 mb-4 animate-pulse" /><h2 className="text-3xl font-black">Try Again</h2></>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;