import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import './AudioPlayer.css';

export function AudioPlayer({ onVerseChange }) {
    // --- DATA STATE ---
    const [selectedReciter, setSelectedReciter] = useState('ar.abdulbasitmurattal');
    const [reciters, setReciters] = useState([]);
    const [audioData, setAudioData] = useState(null);
    const { id } = useParams();

    // --- KURDISH STATE ---
    const [kurdishReciter, setKurdishReciter] = useState(null); // null = disabled
    const [playbackPhase, setPlaybackPhase] = useState('arabic'); // 'arabic' or 'kurdish'

    // --- PLAYER STATE ---
    const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // --- DRAGGING STATE (For Slider) ---
    const [isDragging, setIsDragging] = useState(false);
    const [dragPercentage, setDragPercentage] = useState(0);

    const [kurdishTimestamps, setKurdishTimestamps] = useState([]);

    // --- REFS ---
    const audioRef = useRef(null);       // Arabic Engine
    const kurdishRef = useRef(null);     // Kurdish Engine
    const progressBarRef = useRef(null);

    // --- MOCK DATA FOR KURDISH ---
    // Note: Replace this with your dynamic JSON fetch later.
    // Notice verses 4 and 5 are 'null' to simulate merged audio.
    const paddedId = String(id).padStart(3, '0');
    const kurdishAudioSrc = `https://download.tvquran.com/download/recitations/343/266/${[paddedId]}.mp3`; 

    // ==========================================
    // 1. HELPERS (Declared first to avoid "hoisting" errors)
    // ==========================================

    const handleNextVerse = () => {
        if (audioData && currentVerseIndex < audioData.ayahs.length - 1) {
            setCurrentVerseIndex(prev => prev + 1);
            setPlaybackPhase('arabic'); // Always start new verse in Arabic
        } else {
            setIsPlaying(false);
            setPlaybackPhase('arabic'); // Reset for next play
        }
    };

    const handleKurdishSegmentEnd = () => {
        setPlaybackPhase('arabic'); // Switch phase
        handleNextVerse();          // Move to next verse
    };


    // ==========================================
    // 2. EFFECTS
    // ==========================================

    // EFFECT: Fetch Reciters List on Load
    useEffect(() => {
        fetch('https://api.alquran.cloud/v1/edition/format/audio')
            .then(response => response.json())
            .then(data => {
                setReciters(data.data);
                if(data.data.length > 0) setSelectedReciter('ar.abdulbasitmurattal'); 
            })
            .catch(err => console.error("Failed to load reciters", err));
    }, []);

    // EFFECT: Playback Coordinator (Arabic vs Kurdish)
    useEffect(() => {
        if (!audioRef.current || !audioData) return;

        // If paused, stop both engines
        if (!isPlaying) {
            audioRef.current.pause();
            if (kurdishRef.current) kurdishRef.current.pause();
            return;
        }

        // If Playing, decide which engine to run
        if (playbackPhase === 'arabic') {
            if (kurdishRef.current) kurdishRef.current.pause();
            audioRef.current.play().catch(e => console.log("Play interrupted", e));
        } 
        else if (playbackPhase === 'kurdish' && kurdishRef.current) {
            audioRef.current.pause();
            
            const timestamps = kurdishTimestamps[currentVerseIndex];
            
            if (timestamps) {
                // Seek if we are not already at the right spot
                if (Math.abs(kurdishRef.current.currentTime - timestamps.start) > 0.5) {
                    kurdishRef.current.currentTime = timestamps.start;
                }
                kurdishRef.current.play().catch(e => console.log("Kurdish Play interrupted", e));
            } else {
                // FIXED: Use setTimeout to prevent "cascading renders" error
                setTimeout(() => {
                    handleKurdishSegmentEnd();
                }, 0);
            }
        }
    }, [currentVerseIndex, isPlaying, audioData, playbackPhase]);

    // EFFECT: Notify Parent (ReadingPage) to Scroll
    useEffect(() => {
        if (onVerseChange) {
            onVerseChange(currentVerseIndex);
        }
    }, [currentVerseIndex, onVerseChange]);

    // EFFECT: Global Drag Events
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            const p = calculatePercentage(e.clientX);
            setDragPercentage(p);
        };

        const handleMouseUp = () => {
            if (!isDragging) return;
            setIsDragging(false);
            
            if (audioData) {
                const totalVerses = audioData.ayahs.length;
                const targetIndex = Math.floor(dragPercentage * totalVerses);
                const safeIndex = Math.min(Math.max(targetIndex, 0), totalVerses - 1);
                
                setCurrentVerseIndex(safeIndex);
                setPlaybackPhase('arabic'); // Always restart from Arabic when seeking
                setIsPlaying(true);
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', (e) => handleMouseMove(e.touches[0]));
            window.addEventListener('touchend', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', (e) => handleMouseMove(e.touches[0]));
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, [isDragging, dragPercentage, audioData]);


    // ==========================================
    // 3. HANDLERS
    // ==========================================

    // HANDLER: Arabic Audio Ended
    const handleArabicEnded = () => {
        // FIXED: Only switch to Kurdish if a timestamp actually exists
        const hasKurdishTimestamp = kurdishTimestamps[currentVerseIndex] !== null && kurdishTimestamps[currentVerseIndex] !== undefined;

        if (kurdishReciter && hasKurdishTimestamp) {
            setPlaybackPhase('kurdish');
        } else {
            handleNextVerse(); // Skip directly to next Arabic verse
        }
    };

    // HANDLER: Kurdish Time Monitor
    const handleKurdishTimeUpdate = () => {
        const timestamps = kurdishTimestamps[currentVerseIndex];
        if (!timestamps || !kurdishRef.current) return;

        if (kurdishRef.current.currentTime >= timestamps.end && !kurdishRef.current.paused) {
            kurdishRef.current.pause();
            handleKurdishSegmentEnd();
        }
    };

    const calculatePercentage = (clientX) => {
        if (!progressBarRef.current) return 0;
        const rect = progressBarRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        return Math.min(Math.max(x / rect.width, 0), 1);
    };

    const handleMouseDown = (e) => {
        if(!audioData) return;
        setIsDragging(true);
        setDragPercentage(calculatePercentage(e.clientX));
    };

// --- HANDLER ---
    const handlePlayClick = () => {
        if (audioData) {
            setIsPlaying(!isPlaying);
            return;
        }

        // 1. Fetch Arabic Audio API
        const fetchArabic = fetch(`https://api.alquran.cloud/v1/surah/${id}/${selectedReciter}`).then(res => res.json());
        
        // 2. Fetch Your Local Kurdish Timestamps
        // If your id is "1", this fetches "/timestamps/1.json" from your public folder
        const fetchTimestamps = fetch(`/timestamps/${id}.json`)
            .then(res => {
                if (!res.ok) throw new Error("No timestamps found for this Surah");
                return res.json();
            })
            .catch(() => []); // If the file doesn't exist yet, default to an empty array

        // 3. Wait for BOTH to finish before playing
        Promise.all([fetchArabic, fetchTimestamps])
            .then(([arabicData, timestampsData]) => {
                setAudioData(arabicData.data);
                setKurdishTimestamps(timestampsData); // Save your JSON data to state
                
                setCurrentVerseIndex(0);
                setPlaybackPhase('arabic');
                setIsPlaying(true);
            });
    };

    const handleNext = () => {
        if (audioData && currentVerseIndex < audioData.ayahs.length - 1) {
            setCurrentVerseIndex(prev => prev + 1);
            setPlaybackPhase('arabic');
            setIsPlaying(true);
        }
    };

    const handlePrev = () => {
        if (audioData && currentVerseIndex > 0) {
            setCurrentVerseIndex(prev => prev - 1);
            setPlaybackPhase('arabic');
            setIsPlaying(true);
        }
    };

    const getDisplayPercentage = () => {
        if (isDragging) return dragPercentage * 100;
        if (!audioData || !audioData.ayahs) return 0;
        
        const totalVerses = audioData.ayahs.length;
        let progress = (currentVerseIndex / totalVerses) * 100;
        
        // Show micro-progress only when playing Arabic
        if (playbackPhase === 'arabic' && duration > 0) {
            progress += ((currentTime / duration) / totalVerses) * 100;
        }
        return progress;
    };

    const getTooltipText = () => {
        if (!audioData) return "";
        const p = isDragging ? dragPercentage : (getDisplayPercentage() / 100);
        const verseNum = Math.floor(p * audioData.ayahs.length) + 1;
        return `Verse ${verseNum}`;
    };

    // ==========================================
    // 4. RENDER
    // ==========================================

    return (
        <div className="audio-player-floating">
            
            {/* ENGINE 1: ARABIC (API) */}
            {audioData && audioData.ayahs && (
                <audio
                    ref={audioRef}
                    src={audioData.ayahs[currentVerseIndex].audio}
                    onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                    onLoadedMetadata={(e) => setDuration(e.target.duration)}
                    onEnded={handleArabicEnded}
                />
            )}

            {/* ENGINE 2: KURDISH (Local File) */}
            {kurdishReciter && (
                <audio
                    ref={kurdishRef}
                    src={kurdishAudioSrc}
                    onTimeUpdate={handleKurdishTimeUpdate}
                />
            )}

            {/* LEFT SIDE: Info Section */}
            <div className="player-info-section">
                <div className="info-row">
                    <span className="info-label">Reciter</span>
                    <select 
                        className="reciter-select"
                        value={selectedReciter}
                        onChange={(e) => {
                            setSelectedReciter(e.target.value);
                            setAudioData(null); 
                            setIsPlaying(false);
                            setPlaybackPhase('arabic');
                        }}
                    >
                        {reciters.length === 0 && <option>Loading...</option>}
                        {reciters.map(r => (
                            <option key={r.identifier} value={r.identifier}>{r.englishName}</option>
                        ))}
                    </select>
                </div>
                
                <div className="info-row">
                    <span className="info-label">Translation</span>
                    <select 
                        className="reciter-select"
                        onChange={(e) => setKurdishReciter(e.target.value === "" ? null : e.target.value)}
                    >
                        <option value="">None (Arabic Only)</option>
                        <option value="ku.hindren">Hindren</option>
                        <option value="ku.mikaal">Mikaal</option>
                    </select>
                </div>
            </div>

            {/* RIGHT SIDE: Controls */}
            <div className="player-controls-section">
                <button className="control-btn" onClick={handlePrev}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12L5 12" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 19L5 12L12 5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>

                <button className="control-btn play-btn" onClick={handlePlayClick}>
                    {isPlaying ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                             <rect x="6" y="4" width="4" height="16" rx="1" />
                             <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M5 3L19 12L5 21V3Z" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    )}
                </button>

                <button className="control-btn" onClick={handleNext}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12H19" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 5L19 12L12 19" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
            </div>

            {/* BOTTOM: Draggable Progress Bar */}
            <div 
                className={`progress-container ${isDragging ? 'dragging' : ''}`}
                ref={progressBarRef}
                onMouseDown={handleMouseDown}
                onTouchStart={(e) => handleMouseDown(e.touches[0])}
            >
                <div 
                    className="progress-fill" 
                    style={{ width: `${getDisplayPercentage()}%` }}
                >
                    <div className="seek-tooltip">
                        {getTooltipText()}
                    </div>
                </div>
            </div>

        </div>
    );
}