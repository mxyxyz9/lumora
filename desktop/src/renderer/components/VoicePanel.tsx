import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Sparkles,
  Check,
  X,
  Edit2,
  Trash2,
  Copy,
  RefreshCw,
  Sliders,
  Volume2,
  VolumeX,
  AlertCircle,
  Clock,
  Layers,
  Tag,
  ChevronDown,
  ChevronUp,
  Plus,
  ArrowRight,
  ShieldCheck,
  History,
  Send,
  ExternalLink,
  Search,
} from 'lucide-react';
import { VoiceCandidateNote, VoiceSessionStatus, List } from '../lib/types';
import { VoiceStructureService, VoiceAiConfig } from '../lib/voiceStructureService';
import { AiConfig } from '../lib/aiService';
import { VoiceHistoryManager, VoiceHistorySession } from '../lib/voiceHistoryManager';
import { useBoardStore } from '../store/boardStore';
import { CustomDropdown } from './CustomDropdown';

interface VoicePanelProps {
  isOpen: boolean;
  onClose: () => void;
  lists?: List[];
  aiConfig: VoiceAiConfig | AiConfig;
}

export const VoicePanel: React.FC<VoicePanelProps> = ({
  isOpen,
  onClose,
  lists = [],
  aiConfig,
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'dictate' | 'history'>('dictate');

  // Recording & Transcription state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isStructuring, setIsStructuring] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState<number[]>(new Array(16).fill(10));
  const [transcript, setTranscript] = useState<string>('');
  const [activeHotkey, setActiveHotkey] = useState<string>(
    typeof window !== 'undefined' && window.electronAPI?.platform === 'darwin' ? '⌥ Space' : 'Alt+Space'
  );
  const [statusMessage, setStatusMessage] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);

  // Candidate review state
  const [candidateNotes, setCandidateNotes] = useState<VoiceCandidateNote[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingDesc, setEditingDesc] = useState('');
  const [editingList, setEditingList] = useState('');
  const [editingUrgency, setEditingUrgency] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  // History state
  const [historySessions, setHistorySessions] = useState<VoiceHistorySession[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Kokoro-82M TTS State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingTextKey, setSpeakingTextKey] = useState<string | null>(null);
  const [selectedKokoroVoice, setSelectedKokoroVoice] = useState('af_heart');
  const [availableKokoroVoices, setAvailableKokoroVoices] = useState<Array<{ id: string; name: string }>>([
    { id: 'af_heart', name: 'Kokoro: Heart (US Female)' },
    { id: 'af_bella', name: 'Kokoro: Bella (US Female)' },
    { id: 'am_adam', name: 'Kokoro: Adam (US Male)' },
    { id: 'am_michael', name: 'Kokoro: Michael (US Male)' },
    { id: 'bf_emma', name: 'Kokoro: Emma (UK Female)' },
    { id: 'bm_george', name: 'Kokoro: George (UK Male)' },
  ]);

  // Engine status
  const [engineInfo, setEngineInfo] = useState<{ installed: boolean; path?: string; models: string[] }>({
    installed: false,
    models: [],
  });

  // Routing loading state
  const [isRouting, setIsRouting] = useState(false);

  // Refs for Audio capture & playback
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const availableListTitles = lists.map(l => l.title);
  const activeBoard = useBoardStore(state => state.activeBoard);

  // Load history and TTS voice options on mount
  useEffect(() => {
    setHistorySessions(VoiceHistoryManager.getSessions());

    if (window.electronAPI?.voiceCheckWhisperInstalled) {
      window.electronAPI.voiceCheckWhisperInstalled().then(info => {
        setEngineInfo(info);
      });
    }

    if (window.electronAPI?.voiceGetStatus) {
      window.electronAPI.voiceGetStatus().then(st => {
        if (st.activeHotkey) {
          setActiveHotkey(st.activeHotkey.replace('Option', '⌥').replace('CommandOrControl', '⌘'));
        }
      });
    }

    if (window.electronAPI?.ttsGetStatus) {
      window.electronAPI.ttsGetStatus().then(st => {
        if (st.voices && st.voices.length > 0) {
          setAvailableKokoroVoices(st.voices.map(v => ({ id: v.id, name: `Kokoro: ${v.name}` })));
        }
        if (st.activeVoice) {
          setSelectedKokoroVoice(st.activeVoice);
        }
      });
    }

    // Listen for global hotkey trigger
    const unbindHotkey = window.electronAPI?.onVoiceHotkeyTriggered?.(() => {
      handleToggleRecording();
    });

    return () => {
      unbindHotkey?.();
      stopSpeaking();
    };
  }, [isRecording]);

  // Audio waveform visualizer loop
  const startAudioVisualizer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const render = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Normalize 16 frequency bands for visualizer bars
        const step = Math.floor(dataArray.length / 16);
        const levels = Array.from({ length: 16 }, (_, i) => {
          const val = dataArray[i * step] || 0;
          return Math.max(8, Math.min(100, Math.round((val / 255) * 100)));
        });
        setAudioLevel(levels);
        animFrameRef.current = requestAnimationFrame(render);
      };
      render();
    } catch (e) {
      console.warn('[VoicePanel] Audio visualizer not supported in this browser context:', e);
    }
  };

  const stopAudioVisualizer = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(new Array(16).fill(10));
  };

  const handleStartRecording = async () => {
    try {
      setStatusMessage(null);
      audioChunksRef.current = [];

      // Check mic permissions
      if (window.electronAPI?.voiceRequestMicPermission) {
        await window.electronAPI.voiceRequestMicPermission();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/wav';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stopAudioVisualizer();
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
          await handleProcessAudioBlob(blob, recorder.mimeType);
        }
      };

      recorder.start(250); // Slice chunk every 250ms
      setIsRecording(true);
      setRecordingSeconds(0);
      startAudioVisualizer(stream);

      // Notify Electron main process
      window.electronAPI?.voiceSetRecording?.(true);

      timerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } catch (err: any) {
      console.error('[VoicePanel] Failed to start microphone recording:', err);
      setStatusMessage({
        type: 'error',
        text: `Microphone access error: ${err?.message || 'Could not acquire audio stream'}. Check system permissions.`,
      });
      setIsRecording(false);
      window.electronAPI?.voiceSetRecording?.(false);
    }
  };

  const handleStopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    setIsRecording(false);
    window.electronAPI?.voiceSetRecording?.(false);
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  const handleProcessAudioBlob = async (blob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    setStatusMessage({ type: 'info', text: 'Transcribing speech via Whisper engine...' });

    try {
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      let textResult = '';

      if (window.electronAPI?.voiceTranscribeAudio) {
        const res = await window.electronAPI.voiceTranscribeAudio(base64, {
          mimeType,
          engine: 'auto',
          prompt: 'Structure into action items, board tasks, and notes.',
        });
        if (res.success && res.text) {
          textResult = res.text.trim();
        } else {
          throw new Error(res.error || 'Failed to transcribe audio stream');
        }
      } else {
        // Fallback placeholder for browser-only dev testing
        textResult = `Fix login token expiration bug in Safari. Also update board list column styling and add unit tests for DDP sync.`;
      }

      setTranscript(textResult);
      setStatusMessage({ type: 'success', text: 'Transcription complete! Running AI structure pass...' });

      // Automatically run Structure Pass on transcribed text
      if (textResult) {
        await handleRunStructurePass(textResult);
      }
    } catch (err: any) {
      console.error('[VoicePanel] Audio transcription error:', err);
      setStatusMessage({
        type: 'error',
        text: `Transcription error: ${err?.message || 'Check local whisper-cli or API key settings.'}`,
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleRunStructurePass = async (textToStructure?: string) => {
    const sourceText = textToStructure || transcript;
    if (!sourceText || !sourceText.trim()) {
      setStatusMessage({ type: 'error', text: 'No transcript text available to structure.' });
      return;
    }

    setIsStructuring(true);
    setStatusMessage({ type: 'info', text: 'Extracting candidate notes, lists, and urgency...' });

    try {
      const notes = await VoiceStructureService.structureTranscript(
        sourceText,
        aiConfig,
        availableListTitles.length > 0 ? availableListTitles : ['To Do', 'In Progress', 'Done']
      );

      setCandidateNotes(notes);

      // Save dictation session to persistent history
      const savedSession = VoiceHistoryManager.saveSession({
        rawTranscript: sourceText,
        audioDuration: recordingSeconds,
        notes,
        engineUsed: 'whisper',
        boardId: activeBoard?._id,
        boardTitle: activeBoard?.title,
      });
      setCurrentSessionId(savedSession.id);
      setHistorySessions(VoiceHistoryManager.getSessions());

      setStatusMessage({
        type: 'success',
        text: `Extracted ${notes.length} candidate ${notes.length === 1 ? 'task' : 'tasks'} from voice dictation.`,
      });
    } catch (err: any) {
      console.error('[VoicePanel] Structure pass error:', err);
      setStatusMessage({
        type: 'error',
        text: `Structure pass failed: ${err?.message || 'Could not parse notes'}. Falling back to sentences.`,
      });
      const fallbackNotes = VoiceStructureService.fallbackHeuristicExtraction(sourceText);
      setCandidateNotes(fallbackNotes);
    } finally {
      setIsStructuring(false);
    }
  };

  // --- Candidate Note Review Actions (Step 4 Route) ---
  const handleAcceptNote = (id: string) => {
    setCandidateNotes(prev =>
      prev.map(note =>
        note.id === id ? { ...note, status: 'accepted', acceptedAt: new Date().toISOString() } : note
      )
    );
  };

  const handleDiscardNote = (id: string) => {
    setCandidateNotes(prev =>
      prev.map(note =>
        note.id === id ? { ...note, status: 'discarded', discardedAt: new Date().toISOString() } : note
      )
    );
  };

  const handleStartEditNote = (note: VoiceCandidateNote) => {
    setEditingNoteId(note.id);
    setEditingTitle(note.title);
    setEditingDesc(note.description || '');
    setEditingList(note.suggestedList || availableListTitles[0] || 'To Do');
    setEditingUrgency(note.urgency || 'medium');
  };

  const handleSaveEditNote = (id: string) => {
    setCandidateNotes(prev =>
      prev.map(note =>
        note.id === id
          ? {
              ...note,
              title: editingTitle.trim() || note.title,
              description: editingDesc.trim() || undefined,
              suggestedList: editingList,
              urgency: editingUrgency,
            }
          : note
      )
    );
    setEditingNoteId(null);
  };

  const handleAcceptAll = () => {
    setCandidateNotes(prev =>
      prev.map(note => (note.status !== 'discarded' ? { ...note, status: 'accepted' } : note))
    );
  };

  const handleDiscardAll = () => {
    setCandidateNotes(prev => prev.map(note => ({ ...note, status: 'discarded' })));
  };

  // Step 4: Route candidate notes to Kanso / Wekan board
  const handleRouteNoteToBoard = async (note: VoiceCandidateNote) => {
    try {
      setIsRouting(true);
      let targetList = lists.find(l => l.title.toLowerCase() === (note.suggestedList || '').toLowerCase());
      if (!targetList && lists.length > 0) {
        targetList = lists[0];
      }
      if (!targetList) {
        setStatusMessage({ type: 'error', text: 'No list found on the active board to route card.' });
        return;
      }

      const description = `${note.description || ''}${
        note.tags && note.tags.length > 0 ? `\n\nTags: ${note.tags.map(t => '#' + t).join(' ')}` : ''
      }\nUrgency: ${note.urgency || 'medium'}`;

      const cardId = await useBoardStore.getState().createCard(targetList._id, note.title, description);

      // Update candidate status
      setCandidateNotes(prev =>
        prev.map(n => (n.id === note.id ? { ...n, status: 'accepted', acceptedAt: new Date().toISOString() } : n))
      );

      // Record in history audit
      if (currentSessionId) {
        VoiceHistoryManager.markNoteRouted(currentSessionId, note.id, cardId);
        setHistorySessions(VoiceHistoryManager.getSessions());
      }

      setStatusMessage({
        type: 'success',
        text: `Created card "${note.title}" in list "${targetList.title}"!`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Failed to route note: ${err?.message || 'API error'}`,
      });
    } finally {
      setIsRouting(false);
    }
  };

  const handleRouteAllAccepted = async () => {
    const acceptedNotes = candidateNotes.filter(n => n.status !== 'discarded');
    if (acceptedNotes.length === 0) {
      setStatusMessage({ type: 'info', text: 'No active candidate notes to route to board.' });
      return;
    }

    setIsRouting(true);
    let count = 0;
    try {
      for (const note of acceptedNotes) {
        await handleRouteNoteToBoard(note);
        count++;
      }
      setStatusMessage({
        type: 'success',
        text: `Successfully routed ${count} cards to your board!`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Partial routing error: ${err?.message}`,
      });
    } finally {
      setIsRouting(false);
    }
  };

  // --- Step 6: Kokoro-82M TTS Speech Synthesis ---
  const stopSpeaking = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingTextKey(null);
  };

  const fallbackSpeechSynthesis = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.onend = () => {
        setIsSpeaking(false);
        setSpeakingTextKey(null);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setSpeakingTextKey(null);
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(false);
      setSpeakingTextKey(null);
    }
  };

  const handleSpeakText = async (text: string, keyIdentifier: string) => {
    if (isSpeaking && speakingTextKey === keyIdentifier) {
      stopSpeaking();
      return;
    }

    stopSpeaking();
    setIsSpeaking(true);
    setSpeakingTextKey(keyIdentifier);

    try {
      if (window.electronAPI?.ttsSynthesize) {
        const res = await window.electronAPI.ttsSynthesize(text, {
          voice: selectedKokoroVoice,
          speed: 1.0,
        });

        if (res.audioBase64) {
          const audio = new Audio(`data:audio/wav;base64,${res.audioBase64}`);
          currentAudioRef.current = audio;
          audio.onended = () => {
            setIsSpeaking(false);
            setSpeakingTextKey(null);
          };
          audio.onerror = () => fallbackSpeechSynthesis(text);
          await audio.play();
          return;
        }
      }
      fallbackSpeechSynthesis(text);
    } catch (_) {
      fallbackSpeechSynthesis(text);
    }
  };

  // --- Step 5: History Session Actions ---
  const handleLoadHistorySession = (session: VoiceHistorySession) => {
    setTranscript(session.rawTranscript);
    setCandidateNotes(session.notes);
    setCurrentSessionId(session.id);
    setActiveTab('dictate');
    setStatusMessage({
      type: 'info',
      text: `Loaded session from ${new Date(session.timestamp).toLocaleDateString()} with ${session.notes.length} notes.`,
    });
  };

  const handleDeleteHistorySession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    VoiceHistoryManager.deleteSession(id);
    setHistorySessions(VoiceHistoryManager.getSessions());
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear all dictation history sessions?')) {
      VoiceHistoryManager.clearAllSessions();
      setHistorySessions([]);
    }
  };

  const filteredHistory = historySearchQuery.trim()
    ? VoiceHistoryManager.searchSessions(historySearchQuery)
    : historySessions;

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay" style={{ zIndex: 100 }} onClick={onClose}>
      <div
        className="voice-panel-root"
        style={{
          background: 'var(--bg-modal)',
          borderTopLeftRadius: '36px',
          borderBottomLeftRadius: '36px',
          borderLeft: '1.5px solid var(--border-medium)',
          boxShadow: 'var(--shadow-modal)',
          zIndex: 101,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Panel Header (Seamless Minimalist) ─────────────────────────── */}
        <div style={{ padding: '24px 24px 12px', borderBottom: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'var(--bg-modal)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Mic size={22} style={{ color: isRecording ? 'var(--accent-red)' : 'var(--accent-primary)', flexShrink: 0 }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>Lumora Voice</h2>
              <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '100px', background: 'var(--bg-input)', color: 'var(--accent-primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', border: '1px solid var(--border-subtle)' }}>Pipeline</span>
            </div>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>Voice → Notes → Kanso Board + Kokoro TTS</p>
          </div>
        </div>
        <button onClick={onClose} className="btn-icon" style={{ color: 'var(--text-muted)', borderRadius: '50%' }} title="Close"><X size={16} /></button>
      </div>

      {/* ── Tab Nav ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', background: 'var(--bg-input)', borderBottom: '1.5px solid var(--border-subtle)', flexShrink: 0, padding: '4px 12px', gap: '6px' }}>
        {(['dictate', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '8px 14px', fontSize: '12.5px',
              background: activeTab === tab ? 'var(--accent-primary)' : 'transparent',
              borderRadius: '100px',
              border: 'none',
              fontWeight: 800,
              color: activeTab === tab ? 'var(--accent-primary-text)' : 'var(--text-secondary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              boxShadow: activeTab === tab ? '0 2px 8px rgba(124, 92, 229, 0.25)' : 'none',
            }}
          >
            {tab === 'dictate' ? <><Mic size={13} /> Dictate & Review</> : <><History size={13} /> History ({historySessions.length})</>}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Status notification toast */}
        {statusMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--r-md)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background:
                statusMessage.type === 'error'
                  ? 'rgba(239, 68, 68, 0.12)'
                  : statusMessage.type === 'success'
                  ? 'rgba(34, 197, 94, 0.12)'
                  : 'rgba(59, 130, 246, 0.12)',
              border: `1px solid ${
                statusMessage.type === 'error'
                  ? 'rgba(239, 68, 68, 0.3)'
                  : statusMessage.type === 'success'
                  ? 'rgba(34, 197, 94, 0.3)'
                  : 'rgba(59, 130, 246, 0.3)'
              }`,
              color:
                statusMessage.type === 'error'
                  ? 'var(--accent-red)'
                  : statusMessage.type === 'success'
                  ? 'var(--accent-green)'
                  : 'var(--accent-blue)',
            }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, lineHeight: 1.4 }}>{statusMessage.text}</span>
            <button
              onClick={() => setStatusMessage(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        {activeTab === 'dictate' ? (
          <>
            {/* ── Recording Card ─────────────────────────────────────────── */}
            <div style={{
              background: isRecording ? 'rgba(239,68,68,0.04)' : 'var(--bg-card)',
              border: isRecording ? '1.5px solid rgba(239,68,68,0.3)' : '1px solid var(--border-medium)',
              borderRadius: 'var(--r-xl)',
              padding: '24px 20px 20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
              transition: 'all 0.25s ease',
            }}>
              {/* Waveform */}
              <div className="voice-waveform">
                {audioLevel.map((level, i) => (
                  <div
                    key={i}
                    className="voice-waveform-bar"
                    style={{
                      height: isRecording ? `${Math.max(6, level * 0.56)}px` : '6px',
                      background: isRecording
                        ? `hsl(${220 + i * 4}, 82%, ${55 + (level > 50 ? 10 : 0)}%)`
                        : 'var(--border-medium)',
                    }}
                  />
                ))}
              </div>

              {/* Big Record Button */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isRecording && <div className="voice-record-btn-ring" />}
                <button
                  onClick={handleToggleRecording}
                  disabled={isTranscribing}
                  className={`voice-record-btn ${isRecording ? 'recording' : 'idle'}`}
                  title={isRecording ? 'Stop Recording' : `Start Dictation (${activeHotkey})`}
                >
                  {isRecording ? <Square size={26} fill="white" strokeWidth={0} /> : <Mic size={28} />}
                </button>
              </div>

              {/* Status text */}
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
                  {isRecording
                    ? `Recording — ${recordingSeconds}s`
                    : isTranscribing
                    ? 'Transcribing audio…'
                    : 'Click mic or press hotkey to speak'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}>
                  <code style={{ fontSize: '11px', padding: '2px 8px', borderRadius: 'var(--r-xs)', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{activeHotkey}</code>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{engineInfo.installed ? '· Local Whisper' : '· BYOK Cloud'}</span>
                </div>
              </div>
            </div>

            {/* Live Transcript Box */}
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--r-lg)',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Spoken Transcript
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {transcript && (
                    <>
                      <button
                        onClick={() => handleSpeakText(transcript, 'transcript')}
                        className="btn-subtle"
                        style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Read aloud with Kokoro-82M TTS"
                      >
                        {isSpeaking && speakingTextKey === 'transcript' ? (
                          <VolumeX size={12} className="text-red-400" />
                        ) : (
                          <Volume2 size={12} className="text-cyan-400" />
                        )}
                        Speak
                      </button>
                      <button
                        onClick={() => navigator.clipboard.writeText(transcript)}
                        className="btn-subtle"
                        style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Copy transcript"
                      >
                        <Copy size={12} /> Copy
                      </button>
                      <button
                        onClick={() => handleRunStructurePass()}
                        disabled={isStructuring}
                        className="btn-subtle"
                        style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Re-run structure pass"
                      >
                        <Sparkles size={12} className={isStructuring ? 'animate-spin text-purple-400' : 'text-purple-400'} />
                        Re-extract
                      </button>
                    </>
                  )}
                </div>
              </div>

              <textarea
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                placeholder="Spoken words will appear here in real-time..."
                rows={3}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--r-md)',
                  padding: '8px 10px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  resize: 'vertical',
                }}
              />

              {/* Kokoro TTS Voice Selection Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  <Volume2 size={12} /> TTS Voice:
                </span>
                <div style={{ width: '170px' }}>
                  <CustomDropdown
                    value={selectedKokoroVoice}
                    options={availableKokoroVoices.map(v => ({ value: v.id, label: v.name }))}
                    onChange={val => {
                      setSelectedKokoroVoice(val);
                      window.electronAPI?.ttsSetVoice?.(val);
                    }}
                    size="sm"
                  />
                </div>
              </div>
            </div>

            {/* Candidate Notes Review Section (Step 4 Route) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={15} style={{ color: 'var(--accent-purple)' }} />
                  <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Candidate Board Notes ({candidateNotes.length})
                  </h3>
                </div>

                {candidateNotes.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={handleRouteAllAccepted}
                      disabled={isRouting}
                      className="btn-primary"
                      style={{
                        fontSize: '11.5px',
                        padding: '6px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        borderRadius: '100px',
                        background: '#10b981',
                        border: 'none',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                      }}
                      title="Create cards for all notes"
                    >
                      <Send size={12} />
                      Route All to Board
                    </button>
                    <button
                      onClick={handleAcceptAll}
                      className="btn-subtle"
                      style={{ fontSize: '11px', padding: '3px 8px' }}
                    >
                      Accept All
                    </button>
                    <button
                      onClick={handleDiscardAll}
                      className="btn-subtle"
                      style={{ fontSize: '11px', padding: '3px 8px' }}
                    >
                      Discard All
                    </button>
                  </div>
                )}
              </div>

              {candidateNotes.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', border: '1px dashed var(--border-medium)', borderRadius: 'var(--r-xl)', color: 'var(--text-muted)' }}>
                  <Sparkles size={28} style={{ margin: '0 auto 10px', opacity: 0.4, display: 'block', color: 'var(--accent-blue)' }} />
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Speak to generate structured board cards</p>
                  <p style={{ margin: '6px 0 0', fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.5 }}>&ldquo;Fix the Safari login bug in In Progress — high urgency&rdquo;</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {candidateNotes.map(note => {
                    const isEditing = editingNoteId === note.id;
                    const isAccepted = note.status === 'accepted';
                    const isDiscarded = note.status === 'discarded';
                    const urgencyClass = isDiscarded ? 'discarded' : isAccepted ? 'accepted' : `urgency-${note.urgency || 'medium'}`;

                    return (
                      <div key={note.id} className={`voice-note-card ${urgencyClass}`}>
                        {isEditing ? (
                          <div className="voice-note-card-inner" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <input type="text" value={editingTitle} onChange={e => setEditingTitle(e.target.value)} placeholder="Task title…"
                              style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: 'var(--r-sm)', padding: '6px 10px', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }} />
                            <textarea value={editingDesc} onChange={e => setEditingDesc(e.target.value)} placeholder="Description…" rows={2}
                              style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: 'var(--r-sm)', padding: '6px 10px', color: 'var(--text-secondary)', fontSize: '12px', resize: 'vertical' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <div style={{ flex: 1, minWidth: '120px' }}>
                                <CustomDropdown
                                  value={editingList}
                                  options={(availableListTitles.length > 0 ? availableListTitles : ['To Do', 'In Progress', 'Done']).map(t => ({ value: t, label: t }))}
                                  onChange={setEditingList}
                                  size="sm"
                                />
                              </div>
                              <div style={{ flex: 1, minWidth: '100px' }}>
                                <CustomDropdown
                                  value={editingUrgency}
                                  options={[
                                    { value: 'low', label: 'Low Urgency' },
                                    { value: 'medium', label: 'Medium Urgency' },
                                    { value: 'high', label: 'High Urgency' },
                                    { value: 'critical', label: 'Critical' },
                                  ]}
                                  onChange={v => setEditingUrgency(v as any)}
                                  size="sm"
                                />
                              </div>
                              <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                                <button onClick={() => handleSaveEditNote(note.id)} className="btn-primary" style={{ fontSize: '11px', height: '32px', padding: '0 12px' }}>Save</button>
                                <button onClick={() => setEditingNoteId(null)} className="btn-subtle" style={{ fontSize: '11px', height: '32px', padding: '0 10px' }}>Cancel</button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="voice-note-card-inner">
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: isAccepted ? 'var(--accent-green)' : 'var(--text-primary)', textDecoration: isDiscarded ? 'line-through' : 'none', display: 'block', lineHeight: 1.3 }}>{note.title}</span>
                                {note.description && <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.45, textDecoration: isDiscarded ? 'line-through' : 'none' }}>{note.description}</p>}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '8px', flexWrap: 'wrap' }}>
                                  {note.suggestedList && <span className="list-tag-pill"><Layers size={9} />{note.suggestedList}</span>}
                                  {note.urgency && <span className={`urgency-pill ${note.urgency}`}>{note.urgency}</span>}
                                  {note.tags?.map(tag => <span key={tag} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: 'var(--r-full)', background: 'rgba(168,85,247,0.1)', color: 'var(--accent-purple)', fontWeight: 600 }}>#{tag}</span>)}
                                </div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                                <button onClick={() => handleSpeakText(`${note.title}. ${note.description || ''}`, note.id)} className="btn-icon" style={{ width: '26px', height: '26px', color: isSpeaking && speakingTextKey === note.id ? 'var(--accent-red)' : 'var(--text-muted)' }} title="Read aloud">{isSpeaking && speakingTextKey === note.id ? <VolumeX size={12} /> : <Volume2 size={12} />}</button>
                                <button onClick={() => handleRouteNoteToBoard(note)} disabled={isRouting || isDiscarded} className="btn-icon" style={{ width: '26px', height: '26px', color: 'var(--accent-blue)' }} title="Route to board"><Send size={12} /></button>
                                <button onClick={() => handleAcceptNote(note.id)} className="btn-icon" style={{ width: '26px', height: '26px', color: isAccepted ? 'var(--accent-green)' : 'var(--text-muted)' }} title="Accept"><Check size={13} /></button>
                                <button onClick={() => handleStartEditNote(note)} className="btn-icon" style={{ width: '26px', height: '26px', color: 'var(--text-muted)' }} title="Edit"><Edit2 size={12} /></button>
                                <button onClick={() => handleDiscardNote(note.id)} className="btn-icon" style={{ width: '26px', height: '26px', color: isDiscarded ? 'var(--accent-red)' : 'var(--text-muted)' }} title="Discard"><X size={13} /></button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          /* History Tab (Step 5) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--r-md)',
                  padding: '6px 10px',
                  flex: 1,
                }}
              >
                <Search size={14} style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={e => setHistorySearchQuery(e.target.value)}
                  placeholder="Search dictation transcripts & tags..."
                  style={{
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    width: '100%',
                  }}
                />
              </div>

              {historySessions.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="btn-subtle"
                  style={{ fontSize: '11px', padding: '6px 8px', color: 'var(--accent-red)' }}
                  title="Clear history"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>

            {filteredHistory.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', border: '1px dashed var(--border-medium)', borderRadius: 'var(--r-xl)', color: 'var(--text-muted)' }}>
                <Clock size={24} style={{ margin: '0 auto 10px', opacity: 0.35, display: 'block' }} />
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>No dictation sessions yet</p>
                <p style={{ margin: '4px 0 0', fontSize: '11.5px' }}>Record something to see it here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredHistory.map(session => (
                  <div
                    key={session.id}
                    onClick={() => handleLoadHistorySession(session)}
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 'var(--r-lg)', padding: '13px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '7px', transition: 'border-color 0.15s ease, box-shadow 0.15s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={10} />{new Date(session.timestamp).toLocaleString()}</span>
                      <button onClick={e => handleDeleteHistorySession(e, session.id)} className="btn-icon" style={{ width: '22px', height: '22px', color: 'var(--text-muted)' }} title="Delete session"><Trash2 size={11} /></button>
                    </div>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.45, fontStyle: 'italic', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>&ldquo;{session.rawTranscript}&rdquo;</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                      <span className="list-tag-pill"><Mic size={9} />{session.notes.length} {session.notes.length === 1 ? 'note' : 'notes'}</span>
                      {session.routedCardIds && session.routedCardIds.length > 0 && <span className="status-badge connected">Routed to Board</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ShieldCheck size={12} style={{ color: 'var(--accent-green)' }} /> OpenWhispr (MIT) · Kokoro-82M (Apache-2.0)
        </span>
        <button
          onClick={() => {
            const sample = `Fix memory cache leak in whisper pipeline. Also update Kokoro voice selection dropdown and write test coverage for Wekan card routing.`;
            setTranscript(sample);
            handleRunStructurePass(sample);
          }}
          className="btn-subtle"
          style={{ fontSize: '10px', padding: '2px 8px', height: '24px' }}
        >
          Demo Dictation
        </button>
      </div>
    </div>
  </div>
  );
};
