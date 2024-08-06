import { useState, useEffect, useCallback, useRef } from 'react';


const SpeechJsx = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [note, setNote] = useState('');
    const [savedNotes, setSavedNotes] = useState([]);
    const [error, setError] = useState(null);
    const [audioURL, setAudioURL] = useState(null);

    const recognition = useRef(null);
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);
    const stream = useRef(null);

    useEffect(() => {
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            recognition.current = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            recognition.current.continuous = true;
            recognition.current.interimResults = true;
            recognition.current.lang = 'en-US';

            recognition.current.onresult = debounce((event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0])
                    .map(result => result.transcript)
                    .join('');

                setNote(transcript);
            }, 300);

            recognition.current.onerror = (event) => {
                setError(`Speech recognition error: ${event.error}`);
                setIsRecording(false);
            };
        } else {
            setError('Speech recognition not supported in this browser.');
        }

        return () => {
            stopRecording();
        };
    }, []);

    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    const startRecording = async () => {
        try {
            stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream.current);
            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (event) => {
                audioChunks.current.push(event.data);
            };

            mediaRecorder.current.onstop = () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                setAudioURL(audioUrl);
            };

            mediaRecorder.current.start();
            recognition.current.start();
            setIsRecording(true);
            setError(null);
        } catch (err) {
            setError(`Error accessing microphone: ${err.message}`);
        }
    };

    const stopRecording = useCallback(() => {
        if (recognition.current) {
            recognition.current.stop();
        }
        if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
            mediaRecorder.current.stop();
        }
        if (stream.current) {
            stream.current.getTracks().forEach(track => track.stop());
        }
        setIsRecording(false);
    }, []);

    const handleToggleRecording = useCallback(() => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }, [isRecording, stopRecording]);

    const handleSaveNote = useCallback(() => {
        if (note.trim()) {
            setSavedNotes(prev => [...prev, note.trim()]);
            setNote('');
        }
    }, [note]);

    const handleDownloadAudio = useCallback(() => {
        if (audioURL) {
            const a = document.createElement('a');
            a.href = audioURL;
            a.download = 'lecture_recording.wav';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }, [audioURL]);

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">Lecture Recorder</h2>
            {error && (
                <div>{error}</div>
            )}
            <div className="mb-4">
                <button onClick={handleToggleRecording} className="mr-2">
                    {isRecording && 'Recording...'}
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
                <button onClick={handleSaveNote} disabled={!note.trim()} className="mr-2">
                    Save Note
                </button>
                <button onClick={handleDownloadAudio} disabled={!audioURL}>
                    Download Audio
                </button>
            </div>
            <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Current Note:</h3>
                <p className="p-2 border rounded">{note}</p>
            </div>
            <div>
                <h3 className="text-lg font-semibold mb-2">Saved Notes:</h3>
                {savedNotes.map((n, index) => (
                    <p key={index} className="p-2 border rounded mb-2">{n}</p>
                ))}
            </div>
        </div>
    );
};

export default SpeechJsx;