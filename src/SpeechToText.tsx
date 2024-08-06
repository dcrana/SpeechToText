import React, { useState, useEffect, useCallback, useRef } from 'react'

// Custom type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult
  length: number
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative
  length: number
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: (event: SpeechRecognitionEvent) => void
  onerror: (event: SpeechRecognitionErrorEvent) => void
  start: () => void
  stop: () => void
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition
    }
    webkitSpeechRecognition: {
      new (): SpeechRecognition
    }
  }
}

const SpeechToText1: React.FC = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [note, setNote] = useState<string>('')
  const [savedNotes, setSavedNotes] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionState | null>(null)

  const recognition = useRef<SpeechRecognition | null>(null)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])
  const stream = useRef<MediaStream | null>(null)

  const debounce = <F extends (...args: any[]) => any>(
    func: F,
    wait: number
  ): ((...args: Parameters<F>) => void) => {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<F>) => {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  const checkMicrophonePermission = async () => {
    try {
      const result = await navigator.permissions.query({
        name: 'microphone' as PermissionName,
      })
      setPermissionStatus(result.state)
      result.onchange = () => setPermissionStatus(result.state)
    } catch (err) {
      console.error('Error checking microphone permission:', err)
    }
  }
  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      setPermissionStatus('granted')
      return true
    } catch (err) {
      console.error('Error requesting microphone permission:', err)
      setPermissionStatus('denied')
      setError(
        'Microphone permission denied. Please allow access to use this feature.'
      )
      return false
    }
  }

  const initializeSpeechRecognition = useCallback(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition
      recognition.current = new SpeechRecognition()
      recognition.current.continuous = true
      recognition.current.interimResults = true
      recognition.current.lang = 'en-US'

      recognition.current.onresult = debounce(
        (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0])
            .map((result) => result.transcript)
            .join('')

          setNote(transcript)
        },
        300
      )

      recognition.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        setError(`Speech recognition error: ${event.error}`)
        setIsRecording(false)
      }
    } else {
      setError('Speech recognition not supported in this browser.')
    }
  }, [])
  const startRecording = useCallback(async () => {
    if (permissionStatus !== 'granted') {
      const permissionGranted = await requestMicrophonePermission()
      if (!permissionGranted) return
    }

    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      })
      mediaRecorder.current = new MediaRecorder(stream.current)
      audioChunks.current = []

      mediaRecorder.current.ondataavailable = (event: BlobEvent) => {
        audioChunks.current.push(event.data)
      }

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' })
        const audioUrl = URL.createObjectURL(audioBlob)
        setAudioURL(audioUrl)
      }

      mediaRecorder.current.start()
      recognition.current?.start()
      setIsRecording(true)
      setError(null)
    } catch (err) {
      setError(
        `Error accessing microphone: ${
          err instanceof Error ? err.message : String(err)
        }`
      )
    }
  }, [permissionStatus])

  const stopRecording = useCallback(() => {
    if (recognition.current) {
      recognition.current.stop()
    }
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop()
    }
    if (stream.current) {
      stream.current.getTracks().forEach((track) => track.stop())
    }
    setIsRecording(false)
  }, [])

  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, stopRecording, startRecording])

  const handleSaveNote = useCallback(() => {
    if (note.trim()) {
      setSavedNotes((prev) => [...prev, note.trim()])
      setNote('')
    }
  }, [note])

  const handleDownloadAudio = useCallback(() => {
    if (audioURL) {
      const a = document.createElement('a')
      a.href = audioURL
      a.download = 'lecture_recordingTS.wav'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }, [audioURL])

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition
      recognition.current = new SpeechRecognition()
      recognition.current.continuous = true
      recognition.current.interimResults = true
      recognition.current.lang = 'en-US'

      recognition.current.onresult = debounce(
        (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0])
            .map((result) => result.transcript)
            .join('')

          setNote(transcript)
        },
        300
      )

      recognition.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        setError(`Speech recognition error: ${event.error}`)
        setIsRecording(false)
      }
    } else {
      setError('Speech recognition not supported in this browser.')
    }

    return () => {
      stopRecording()
    }
  }, [stopRecording])

  useEffect(() => {
    checkMicrophonePermission()
    initializeSpeechRecognition()

    return () => {
      stopRecording()
    }
  }, [initializeSpeechRecognition, stopRecording])

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Lecture Recorder</h2>
      {error && <div>{error}</div>}
      <div className="mb-4">
        <button onClick={handleToggleRecording} className="mr-2">
          {isRecording && 'Recording Started ....'}
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        <button
          onClick={handleSaveNote}
          disabled={!note.trim()}
          className="mr-2"
        >
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
          <p key={index} className="p-2 border rounded mb-2">
            {n}
          </p>
        ))}
      </div>
    </div>
  )
}

export default SpeechToText1
