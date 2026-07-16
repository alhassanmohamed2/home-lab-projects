import { useState, useRef, useEffect } from 'react'
import { Mic } from 'lucide-react'
import './index.css'

function App() {
    const [isRecording, setIsRecording] = useState(false)
    const [status, setStatus] = useState('Hold to Talk')
    const mediaRecorderRef = useRef(null)
    const chunksRef = useRef([])

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            mediaRecorderRef.current = new MediaRecorder(stream)
            chunksRef.current = []

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data)
                }
            }

            mediaRecorderRef.current.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
                sendAudio(blob)
                // Stop all tracks to release the microphone
                stream.getTracks().forEach(track => track.stop())
            }

            mediaRecorderRef.current.start()
            setIsRecording(true)
            setStatus('Recording...')
        } catch (err) {
            console.error('Error accessing microphone:', err)
            setStatus('Error: No Microphone Access')
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
            setStatus('Sending...')
        }
    }

    const sendAudio = async (blob) => {
        const formData = new FormData()
        formData.append('file', blob, 'recording.webm')

        try {
            const response = await fetch('/api/play', {
                method: 'POST',
                body: formData,
            })
            const data = await response.json()
            if (data.status === 'success') {
                setStatus('Sent!')
                setTimeout(() => setStatus('Hold to Talk'), 2000)
            } else {
                setStatus('Error playing audio')
            }
        } catch (err) {
            console.error('Error sending audio:', err)
            setStatus('Backend unreachable')
        }
    }

    return (
        <div className="App">
            <h1>Voice Intercom</h1>
            <div className="card">
                <button
                    className={isRecording ? 'recording' : ''}
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onMouseLeave={isRecording ? stopRecording : undefined}
                    onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                    onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                >
                    <Mic size={64} color={isRecording ? 'white' : '#646cff'} />
                </button>
                <div className="status">{status}</div>
            </div>
        </div>
    )
}

export default App
