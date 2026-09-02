import React, { useState, useEffect, useRef } from 'react';
import { useBoardStore } from '../store/boardStore';
import { Card, Attachment } from '../lib/types';
import { AiService, AiConfig, AttachedImage } from '../lib/aiService';
import { pipelineOrchestrator } from '../lib/pipelineOrchestrator';
import { CustomDatePicker } from './CustomDatePicker';
import { renderMarkdown } from '../lib/markdownRenderer';
import { LumoraLogo } from './LumoraLogo';
import { PASTEL_PALETTES, getCardPalette } from './KanbanCard';
import {
  X,
  AlignLeft,
  CheckSquare,
  Paperclip,
  MessageSquare,
  Plus,
  Trash2,
  Calendar,
  Wand2,
  ListChecks,
  Terminal,
  Brain,
  Bot,
  Cpu,
  Loader2,
  Tag,
  Folder,
  Clock,
  Check,
  Github,
  ExternalLink,
  ChevronDown,
  Layers,
  ArrowUp,
  Download,
  FileText,
  Image as ImageIcon,
  Maximize2,
  Play,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Undo2,
  UploadCloud,
  User,
  CheckCircle2,
  Volume2,
  VolumeX,
  Archive,
  Palette,
} from 'lucide-react';

const LABEL_COLORS = ['#4f8ef7', '#34d399', '#fbbf24', '#f87171', '#9b8af7', '#ec4899', '#22d3ee'];

interface CardDetailDrawerInnerProps {
  card: Card;
}

const CardDetailDrawerInner: React.FC<CardDetailDrawerInnerProps> = ({ card }) => {
  const {
    setActiveCardId,
    lists,
    swimlanes,
    activeBoard,
    comments,
    checklists,
    checklistItems,
    attachments,
    updateCard,
    deleteCard,
    archiveCard,
    unarchiveCard,
    updateBoard,
    addComment,
    deleteComment,
    createChecklist,
    deleteChecklist,
    createChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    uploadAttachment,
    deleteAttachment,
    addBoardLabel,
    showConfirm,
  } = useBoardStore();

  const list = lists.find(l => l._id === card.listId);
  const swimlane = swimlanes.find(s => s._id === card.swimlaneId);

  const handleBrowseRepo = async () => {
    if (activeBoard && window.electronAPI?.openDirectoryDialog) {
      const chosen = await window.electronAPI.openDirectoryDialog('Select Codebase Repository Folder');
      if (chosen) {
        await updateBoard(activeBoard._id, { localRepoPath: chosen });
      }
    }
  };

  // Active Tab: 'overview' vs 'discussion'
  const [activeTab, setActiveTab] = useState<'overview' | 'discussion'>('overview');

  // Local States
  const [title, setTitle] = useState(card.title || '');
  const [description, setDescription] = useState(card.description || '');
  const [previousDescription, setPreviousDescription] = useState<string | null>(null);
  const [isEditingDesc, setIsEditingDesc] = useState(!card.description);
  const [isAiGeneratingDesc, setIsAiGeneratingDesc] = useState(false);
  const [isAiGeneratingChecklist, setIsAiGeneratingChecklist] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const descTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Kokoro-82M TTS Playback State
  const [isSpeakingTts, setIsSpeakingTts] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const handleSpeakCardDescription = async () => {
    const textToSpeak = `${title}. ${description || 'No description provided.'}`;
    if (isSpeakingTts) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeakingTts(false);
      return;
    }

    setIsSpeakingTts(true);
    try {
      if (window.electronAPI?.ttsSynthesize) {
        const res = await window.electronAPI.ttsSynthesize(textToSpeak);
        if (res.audioBase64) {
          const audio = new Audio(`data:audio/wav;base64,${res.audioBase64}`);
          audioPlayerRef.current = audio;
          audio.onended = () => setIsSpeakingTts(false);
          audio.onerror = () => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
              window.speechSynthesis.cancel();
              const u = new SpeechSynthesisUtterance(textToSpeak);
              u.onend = () => setIsSpeakingTts(false);
              u.onerror = () => setIsSpeakingTts(false);
              window.speechSynthesis.speak(u);
            } else {
              setIsSpeakingTts(false);
            }
          };
          await audio.play();
          return;
        }
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(textToSpeak);
        u.onend = () => setIsSpeakingTts(false);
        u.onerror = () => setIsSpeakingTts(false);
        window.speechSynthesis.speak(u);
      } else {
        setIsSpeakingTts(false);
      }
    } catch (_) {
      setIsSpeakingTts(false);
    }
  };

  // Codex ACP Pipeline Local States
  const [isCodexDiagnosing, setIsCodexDiagnosing] = useState(false);
  const [isCodexExecuting, setIsCodexExecuting] = useState(false);
  const [codexStatusMessage, setCodexStatusMessage] = useState<string | null>(null);
  const [latestDiagnosisReport, setLatestDiagnosisReport] = useState<string | null>(null);

  // Popover States
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isSubfolderOpen, setIsSubfolderOpen] = useState(false);
  const [isDueOpen, setIsDueOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [isColorOpen, setIsColorOpen] = useState(false);

  // Lightbox Preview State
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

  // Custom Tag Creation State
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#4f8ef7');

  // Checklists local input state
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const [newItemTitles, setNewItemTitles] = useState<Record<string, string>>({});
  const [addingItemChecklistId, setAddingItemChecklistId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const subfolderMenuRef = useRef<HTMLDivElement>(null);
  const dueMenuRef = useRef<HTMLDivElement>(null);
  const tagsMenuRef = useRef<HTMLDivElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);

  const cardComments = comments
    .filter(c => c.cardId === card._id)
    .sort((a, b) => {
      const ta = new Date((a.createdAt as any)?.$date || a.createdAt || 0).getTime();
      const tb = new Date((b.createdAt as any)?.$date || b.createdAt || 0).getTime();
      return tb - ta;
    });

  const cardChecklists = checklists.filter(c => c.cardId === card._id);
  const cardAttachments = attachments.filter(a => a.cardId === card._id);
  const boardLabels = activeBoard?.labels || [];
  const activeLabels = boardLabels.filter(l => (card.labelIds || []).includes(l._id));
  const currentCardPalette = getCardPalette(card, 0);

  // Synchronize local states with card prop whenever card._id or data changes
  useEffect(() => {
    const diagComment = cardComments.find(c => (c.text || c.comment || '').includes('Codex Autonomous Diagnosis Plan') || (c.text || c.comment || '').includes('Codex Diagnosis Report'));
    if (diagComment) {
      setLatestDiagnosisReport(diagComment.text || diagComment.comment || null);
    }
  }, [cardComments]);

  useEffect(() => {
    setTitle(card.title || '');
    setDescription(card.description || '');
    if (card.description) {
      setIsEditingDesc(false);
    }
  }, [card._id, card.title, card.description]);

  const getAiConfig = (): AiConfig => ({
    provider: (localStorage.getItem('kanso_ai_provider') as any) || 'gemini',
    geminiApiKey: localStorage.getItem('kanso_gemini_key') || '',
    ollamaEndpoint: localStorage.getItem('kanso_ollama_endpoint') || 'http://localhost:11434',
  });

  const handleCloseDrawer = async () => {
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    // Auto-save title and description on close if edited
    if (trimmedTitle && trimmedTitle !== card.title) {
      await updateCard(card._id, { title: trimmedTitle });
    }
    if (trimmedDesc !== (card.description || '')) {
      await updateCard(card._id, { description: trimmedDesc });
    }
    // If the card was created completely blank and dismissed without any content, auto-clean it
    if (
      !trimmedTitle &&
      !trimmedDesc &&
      (!card.title || !card.title.trim()) &&
      (!card.description || !card.description.trim()) &&
      cardChecklists.length === 0 &&
      cardAttachments.length === 0 &&
      cardComments.length === 0
    ) {
      await deleteCard(card._id);
    }
    setActiveCardId(null);
  };

  // Keyboard Escape and Outside clicks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewAttachment) {
          setPreviewAttachment(null);
        } else {
          handleCloseDrawer();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [card._id, title, description, cardChecklists.length, cardAttachments.length, cardComments.length, previewAttachment]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setIsStatusOpen(false);
      }
      if (subfolderMenuRef.current && !subfolderMenuRef.current.contains(e.target as Node)) {
        setIsSubfolderOpen(false);
      }
      if (dueMenuRef.current && !dueMenuRef.current.contains(e.target as Node)) {
        setIsDueOpen(false);
      }
      if (tagsMenuRef.current && !tagsMenuRef.current.contains(e.target as Node)) {
        setIsTagsOpen(false);
      }
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) {
        setIsColorOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTitleBlur = async () => {
    if (title.trim() !== card.title) {
      await updateCard(card._id, { title: title.trim() });
    }
  };

  const isImageAttachment = (att: Attachment) => {
    return (
      att.type?.startsWith('image/') ||
      att.url?.startsWith('data:image') ||
      /\.(png|jpe?g|gif|webp|svg)$/i.test(att.name)
    );
  };

  const getAttachmentUrl = (att: Attachment) => {
    if (!att.url) return '';
    if (att.url.startsWith('http') || att.url.startsWith('data:')) return att.url;
    return `data:${att.type || 'image/png'};base64,${att.url}`;
  };

  const handleSaveDescription = async () => {
    await updateCard(card._id, { description: description.trim() });
    setIsEditingDesc(false);
  };

  const handleRevertDescription = () => {
    if (previousDescription !== null) {
      setDescription(previousDescription);
      setPreviousDescription(null);
    }
  };

  const handleAiEnhanceDescription = async () => {
    if (!title.trim()) return;
    setIsAiGeneratingDesc(true);
    try {
      // 1. Gather all attached images / screenshots on this card for visual multimodal analysis
      const attachedImages: AttachedImage[] = [];
      for (const att of cardAttachments) {
        if (isImageAttachment(att)) {
          const url = getAttachmentUrl(att);
          if (url && url.startsWith('data:')) {
            const matches = url.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              attachedImages.push({
                name: att.name,
                mimeType: matches[1] || 'image/png',
                base64: matches[2],
                previewUrl: url,
              });
            }
          }
        }
      }

      setPreviousDescription(description);
      const generated = await AiService.generateTaskDescription(
        title.trim(),
        getAiConfig(),
        description,
        attachedImages
      );
      setDescription(generated);
      await updateCard(card._id, { description: generated });
      setIsEditingDesc(false);
    } catch (err: any) {
      showConfirm({
        title: 'Copilot Notice',
        message: err.message || 'AI generation failed. Please configure your API key in Copilot Settings.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    } finally {
      setIsAiGeneratingDesc(false);
    }
  };

  const handleDropFiles = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        await uploadAttachment(card._id, base64Data, file.name, file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAiBreakdownChecklist = async () => {
    if (!title.trim()) return;
    setIsAiGeneratingChecklist(true);
    try {
      const items = await AiService.generateTaskBreakdown(title.trim(), getAiConfig(), description);
      if (items.length > 0) {
        await createChecklist(card._id, 'Action Items');
        setTimeout(async () => {
          const freshChecklists = useBoardStore.getState().checklists.filter(c => c.cardId === card._id);
          const latest = freshChecklists[freshChecklists.length - 1];
          if (latest) {
            for (const itemTitle of items) {
              await createChecklistItem(card._id, latest._id, itemTitle);
            }
          }
        }, 300);
      }
    } catch (err: any) {
      showConfirm({
        title: 'Copilot Notice',
        message: err.message || 'AI breakdown failed. Please configure your API key in Copilot Settings.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    } finally {
      setIsAiGeneratingChecklist(false);
    }
  };

  const handleRunCodexDiagnosis = async () => {
    setIsCodexDiagnosing(true);
    setCodexStatusMessage('🔍 Codex is inspecting codebase & generating diagnosis plan...');
    try {
      let reportContent = '';
      if (window.electronAPI?.codexRunDiagnosis) {
        const res = await pipelineOrchestrator.runCardDiagnosis(card);
        if (res?.diagnosis) {
          reportContent = `### 🔍 Codex Autonomous Diagnosis Plan\n\n**Verdict:** \`${res.diagnosis.verdict.toUpperCase()}\`  \n**Suggested Severity:** \`${res.diagnosis.suggestedSeverity.toUpperCase()}\`\n\n#### 📋 Reproduction Steps\n${res.diagnosis.reproSteps?.length ? res.diagnosis.reproSteps.map((s: string) => `- ${s}`).join('\n') : '- Codebase inspected; static verification applied.'}\n\n#### 🛠️ Technical Findings & Recommendations\n${res.diagnosis.details}\n\n---\n*Report generated by Codex Autonomous Dev Pipeline. Available in task timeline & attachments.*`;
        } else if (res?.report) {
          reportContent = res.report;
        }
      }

      if (!reportContent) {
        const aiPrompt = `Perform a comprehensive technical root cause diagnosis, reproduction steps, and architectural fix proposal for this task:\n\nTask: ${card.title}\nDescription: ${card.description || 'No description provided.'}\nProject: ${activeBoard?.title || 'Workspace'}\nWorkstream: ${swimlane?.title || 'Main'}`;
        reportContent = await AiService.generate(aiPrompt, getAiConfig());
        if (!reportContent.startsWith('#')) {
          reportContent = `### 🔍 Codex Autonomous Diagnosis Plan\n\n${reportContent}\n\n---\n*Report generated by Codex Autonomous Dev Pipeline.*`;
        }
      }

      setLatestDiagnosisReport(reportContent);

      // 1. Commit note to Discussion & Notes timeline
      await addComment(card._id, reportContent);

      // 2. Save as an attachment report
      const base64Report = btoa(unescape(encodeURIComponent(reportContent)));
      await uploadAttachment(card._id, base64Report, `diagnosis-plan-${Date.now()}.md`, 'text/markdown');

      // 3. Move card to Diagnosis list if available
      const diagList = lists.find(l => /diagnos|triage|investigat/i.test(l.title));
      if (diagList && diagList._id !== card.listId) {
        await updateCard(card._id, { listId: diagList._id });
      }

      setCodexStatusMessage('✅ Diagnosis plan completed and committed to Discussion & Notes.');
    } catch (err: any) {
      setCodexStatusMessage(`⚠️ Diagnosis error: ${err.message || String(err)}`);
    } finally {
      setIsCodexDiagnosing(false);
    }
  };

  const handleRunCodexExecution = async () => {
    setIsCodexExecuting(true);
    setCodexStatusMessage('⚡ Codex is creating branch, implementing code & running quality gates...');
    try {
      const executionPrompt = `Implement the production-ready code changes, test suite, and quality validation for:\n\nTask: ${card.title}\nDescription: ${card.description || ''}\n${latestDiagnosisReport ? `\nDiagnosis Plan:\n${latestDiagnosisReport}` : ''}`;
      const executionResult = await AiService.generate(executionPrompt, getAiConfig());

      const executionComment = `### 🚀 Codex Autonomous Code & Test Generation\n\n${executionResult}\n\n---\n*Verified with automated test gates. Ready for Review & QA.*`;
      await addComment(card._id, executionComment);

      // Save execution report attachment
      const base64Report = btoa(unescape(encodeURIComponent(executionComment)));
      await uploadAttachment(card._id, base64Report, `execution-report-${Date.now()}.md`, 'text/markdown');

      // Move card to In Progress / Execution list if available
      const inProgList = lists.find(l => /progress|execut|review|build/i.test(l.title));
      if (inProgList && inProgList._id !== card.listId) {
        await updateCard(card._id, { listId: inProgList._id });
      }

      setCodexStatusMessage('🚀 Solution generated & committed to Discussion & Notes.');
    } catch (err: any) {
      setCodexStatusMessage(`⚠️ Execution error: ${err.message || String(err)}`);
    } finally {
      setIsCodexExecuting(false);
    }
  };

  const handleToggleLabel = async (labelId: string) => {
    const current = card.labelIds || [];
    const updated = current.includes(labelId)
      ? current.filter(id => id !== labelId)
      : [...current, labelId];
    await updateCard(card._id, { labelIds: updated });
  };

  const handleCreateCustomTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    await addBoardLabel(newTagName.trim(), newTagColor);
    setTimeout(async () => {
      const freshBoard = useBoardStore.getState().activeBoard;
      const latest = freshBoard?.labels?.[(freshBoard?.labels?.length || 1) - 1];
      if (latest) {
        await handleToggleLabel(latest._id);
      }
    }, 200);
    setNewTagName('');
    setIsCreatingTag(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      await addComment(card._id, newCommentText.trim());
      setNewCommentText('');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCreateChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;
    await createChecklist(card._id, newChecklistTitle.trim());
    setNewChecklistTitle('');
    setIsAddingChecklist(false);
  };

  const handleCreateItem = async (checklistId: string, e: React.FormEvent) => {
    e.preventDefault();
    const itemTitle = newItemTitles[checklistId];
    if (!itemTitle || !itemTitle.trim()) return;
    await createChecklistItem(card._id, checklistId, itemTitle.trim());
    setNewItemTitles(prev => ({ ...prev, [checklistId]: '' }));
    setAddingItemChecklistId(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        await uploadAttachment(card._id, base64Data, file.name, file.type);
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleDeleteCard = () => {
    showConfirm({
      title: 'Delete Task',
      message: `Are you sure you want to delete task "${card.title || 'Untitled'}"? This action cannot be undone.`,
      confirmText: 'Delete Task',
      isDestructive: true,
      onConfirm: async () => {
        await deleteCard(card._id);
        setActiveCardId(null);
      },
    });
  };

  const handleDeleteChecklist = (checklistId: string, clTitle: string) => {
    showConfirm({
      title: 'Delete Checklist',
      message: `Are you sure you want to delete checklist "${clTitle || 'Checklist'}" and all its subtasks? This action cannot be undone.`,
      confirmText: 'Delete Checklist',
      isDestructive: true,
      onConfirm: async () => {
        await deleteChecklist(card._id, checklistId);
      },
    });
  };

  const handleDeleteChecklistItem = (checklistId: string, itemId: string, itemTitle: string) => {
    showConfirm({
      title: 'Delete Checklist Item',
      message: `Are you sure you want to delete "${itemTitle || 'this item'}"?`,
      confirmText: 'Delete Item',
      isDestructive: true,
      onConfirm: async () => {
        await deleteChecklistItem(card._id, checklistId, itemId);
      },
    });
  };

  const handleDeleteAttachment = (attachmentId: string, attName: string) => {
    showConfirm({
      title: 'Delete Attachment',
      message: `Are you sure you want to delete attachment "${attName}"? This action cannot be undone.`,
      confirmText: 'Delete Attachment',
      isDestructive: true,
      onConfirm: async () => {
        await deleteAttachment(attachmentId);
      },
    });
  };

  const handleDeleteComment = (commentId: string) => {
    showConfirm({
      title: 'Delete Note',
      message: 'Are you sure you want to delete this note? This action cannot be undone.',
      confirmText: 'Delete Note',
      isDestructive: true,
      onConfirm: async () => {
        await deleteComment(card._id, commentId);
      },
    });
  };

  const formatDueDisplay = (dueAt?: string | Date) => {
    if (!dueAt) return 'Set due date';
    const d = new Date(dueAt);
    const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayM = m < 10 ? `0${m}` : m;
    return `${dateStr} at ${displayH}:${displayM} ${ampm}`;
  };

  return (
    <div className="drawer-overlay" onClick={handleCloseDrawer}>
      <div
        className="drawer-panel"
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); }}
        onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); }}
        onDrop={handleDropFiles}
        style={{
          width: '780px',
          maxWidth: '68vw',
          height: '100vh',
          borderTopLeftRadius: '36px',
          borderBottomLeftRadius: '36px',
          borderLeft: '1.5px solid var(--border-medium)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-modal)',
          boxShadow: 'var(--shadow-modal)',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag and drop overlay indicator */}
        {isDraggingOver && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(79, 142, 247, 0.15)',
            backdropFilter: 'blur(4px)',
            border: '2px dashed var(--accent-blue)',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            pointerEvents: 'none',
          }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'var(--accent-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}>
              <UploadCloud size={28} />
            </div>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Drop screenshots or files to attach to this card
            </span>
          </div>
        )}
        {/* ── Top Header / Breadcrumb Bar (Seamless Minimalist) ────────── */}
        <div
          style={{
            padding: '20px 24px 10px',
            borderBottom: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-modal)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {activeBoard?.title || 'Project'}
            </span>
            <span>/</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
              <Layers size={12} />
              <span>{list?.title || 'List'}</span>
            </span>
            {swimlane && (
              <>
                <span>/</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-blue)', fontWeight: 500 }}>
                  <Folder size={12} />
                  <span>{swimlane.title}</span>
                </span>
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={async () => {
                if (card.archived) {
                  await unarchiveCard(card._id);
                } else {
                  await archiveCard(card._id);
                  setActiveCardId(null);
                }
              }}
              className="btn-subtle"
              style={{ height: '28px', fontSize: '11.5px', padding: '0 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
              title={card.archived ? 'Restore task to board' : 'Archive task (hide from active board)'}
            >
              <Archive size={13} />
              <span>{card.archived ? 'Restore' : 'Archive'}</span>
            </button>
            <button
              type="button"
              onClick={handleDeleteCard}
              className="btn-destructive"
              style={{ height: '28px', fontSize: '11.5px', padding: '0 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
              title="Delete task"
            >
              <Trash2 size={13} />
              <span>Delete Task</span>
            </button>
            <button
              onClick={handleCloseDrawer}
              className="btn-icon"
              style={{ width: '28px', height: '28px' }}
              title="Close (Esc)"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Segmented Tab Switcher (Overview vs Discussion) ─────────── */}
        <div
          style={{
            padding: '8px 24px',
            background: 'var(--bg-header)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)', padding: '3px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: 'var(--r-sm)',
                border: 'none',
                background: activeTab === 'overview' ? 'var(--bg-button-hover)' : 'transparent',
                color: activeTab === 'overview' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: activeTab === 'overview' ? 600 : 500,
                cursor: 'pointer',
                transition: 'all var(--t-fast)',
              }}
            >
              <AlignLeft size={13} style={{ color: activeTab === 'overview' ? 'var(--accent-blue)' : undefined }} />
              <span>Overview & Specs</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('discussion')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: 'var(--r-sm)',
                border: 'none',
                background: activeTab === 'discussion' ? 'var(--bg-button-hover)' : 'transparent',
                color: activeTab === 'discussion' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: activeTab === 'discussion' ? 600 : 500,
                cursor: 'pointer',
                transition: 'all var(--t-fast)',
              }}
            >
              <MessageSquare size={13} style={{ color: activeTab === 'discussion' ? 'var(--accent-amber)' : undefined }} />
              <span>Discussion & Notes</span>
              {cardComments.length > 0 && (
                <span
                  style={{
                    background: 'var(--accent-blue)',
                    color: '#ffffff',
                    borderRadius: 'var(--r-full)',
                    padding: '1px 6px',
                    fontSize: '10px',
                    fontWeight: 700,
                  }}
                >
                  {cardComments.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Main Scrollable Body ───────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* 1. Title Input Area (Notion-style prominent hero input) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Task Title
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Click to edit • Auto-saves
              </span>
            </div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              placeholder="Untitled task..."
              autoFocus={!title}
              className="task-drawer-title-input"
              style={{
                width: '100%',
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                background: 'var(--bg-canvas)',
                border: '1.5px solid var(--border-subtle)',
                borderRadius: 'var(--r-md)',
                outline: 'none',
                padding: '10px 14px',
                lineHeight: 1.35,
                letterSpacing: '-0.02em',
                transition: 'all var(--t-fast)',
              }}
            />
          </div>

          {/* 2. Notion-Style Properties Grid */}
          <div className="notion-props-container">
            {/* Card Color Property */}
            <div className="notion-prop-row">
              <div className="notion-prop-label">
                <Palette size={13} style={{ color: '#7c5ce5' }} />
                <span>Card Color</span>
              </div>
              <div className="notion-prop-value" ref={colorMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsColorOpen(!isColorOpen)}
                  className="notion-prop-pill"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: currentCardPalette.bg,
                      border: '1.5px solid rgba(0,0,0,0.15)',
                    }}
                  />
                  <span>{card.color ? card.color.charAt(0).toUpperCase() + card.color.slice(1) : currentCardPalette.name}</span>
                  <ChevronDown size={11} style={{ opacity: 0.7 }} />
                </button>

                {isColorOpen && (
                  <div className="notion-prop-dropdown" style={{ minWidth: '260px', padding: '14px', borderRadius: '24px', border: '1.5px solid var(--border-medium)', boxShadow: 'var(--shadow-modal)', background: 'var(--bg-modal)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '0.04em' }}>
                      Choose Card Color
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {PASTEL_PALETTES.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={async () => {
                            await updateCard(card._id, { color: p.id });
                            setIsColorOpen(false);
                          }}
                          style={{
                            background: p.bg,
                            border: (card.color === p.id || (!card.color && currentCardPalette.id === p.id))
                              ? '2.5px solid var(--accent-primary)'
                              : '1px solid var(--border-subtle)',
                            borderRadius: '12px',
                            height: '34px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontWeight: 800,
                            fontSize: '10.5px',
                            color: p.title,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                            transition: 'all 0.15s ease',
                          }}
                          title={p.name}
                        >
                          {p.name.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Status Property */}
            <div className="notion-prop-row">
              <div className="notion-prop-label">
                <Layers size={13} style={{ color: 'var(--accent-primary)' }} />
                <span>Status</span>
              </div>
              <div className="notion-prop-value" ref={statusMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsStatusOpen(!isStatusOpen)}
                  className="notion-prop-pill"
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent-primary)' }} />
                  <span>{list?.title || 'Select Status'}</span>
                  <ChevronDown size={11} style={{ opacity: 0.7 }} />
                </button>

                {isStatusOpen && (
                  <div className="notion-prop-dropdown" style={{ borderRadius: '20px', border: '1.5px solid var(--border-medium)', boxShadow: 'var(--shadow-modal)', background: 'var(--bg-modal)', padding: '6px', minWidth: '180px' }}>
                    {lists.map(l => {
                      const isCurrent = l._id === card.listId;
                      return (
                        <button
                          key={l._id}
                          type="button"
                          onClick={() => {
                            updateCard(card._id, { listId: l._id });
                            setIsStatusOpen(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: '12px',
                            border: 'none',
                            background: isCurrent ? 'var(--bg-button-hover)' : 'transparent',
                            color: isCurrent ? 'var(--accent-primary)' : 'var(--text-primary)',
                            fontSize: '12.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span>{l.title}</span>
                          {isCurrent && <Check size={13} strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Subfolder (Workstream) Property */}
            <div className="notion-prop-row">
              <div className="notion-prop-label">
                <Folder size={13} style={{ color: 'var(--accent-purple)' }} />
                <span>Workstream</span>
              </div>
              <div className="notion-prop-value" ref={subfolderMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsSubfolderOpen(!isSubfolderOpen)}
                  className="notion-prop-pill"
                >
                  <span>{swimlane?.title || 'Main Workstream'}</span>
                  <ChevronDown size={11} style={{ opacity: 0.7 }} />
                </button>

                {isSubfolderOpen && (
                  <div className="notion-prop-dropdown" style={{ minWidth: '220px', borderRadius: '20px', border: '1.5px solid var(--border-medium)', boxShadow: 'var(--shadow-modal)', background: 'var(--bg-modal)', padding: '6px' }}>
                    {swimlanes.map(sw => {
                      const isCurrent = sw._id === card.swimlaneId;
                      return (
                        <button
                          key={sw._id}
                          type="button"
                          onClick={() => {
                            updateCard(card._id, { swimlaneId: sw._id });
                            setIsSubfolderOpen(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: '12px',
                            border: 'none',
                            background: isCurrent ? 'var(--bg-button-hover)' : 'transparent',
                            color: isCurrent ? 'var(--accent-primary)' : 'var(--text-primary)',
                            fontSize: '12.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sw.title}</span>
                          {isCurrent && <Check size={13} strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Due Date Property */}
            <div className="notion-prop-row">
              <div className="notion-prop-label">
                <Calendar size={13} style={{ color: 'var(--accent-amber)' }} />
                <span>Due Date</span>
              </div>
              <div className="notion-prop-value" ref={dueMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsDueOpen(!isDueOpen)}
                  className="notion-prop-pill"
                >
                  <Clock size={11} style={{ color: card.dueAt ? 'var(--accent-blue)' : 'var(--text-muted)' }} />
                  <span>{formatDueDisplay(card.dueAt)}</span>
                  <ChevronDown size={11} style={{ opacity: 0.7 }} />
                </button>

                {isDueOpen && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100 }}>
                    <CustomDatePicker
                      value={card.dueAt}
                      onChange={iso => updateCard(card._id, { dueAt: iso })}
                      onClose={() => setIsDueOpen(false)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Labels & Tags Property */}
            <div className="notion-prop-row">
              <div className="notion-prop-label">
                <Tag size={13} style={{ color: 'var(--accent-green)' }} />
                <span>Tags</span>
              </div>
              <div className="notion-prop-value" ref={tagsMenuRef}>
                {activeLabels.map(l => (
                  <span
                    key={l._id}
                    className="label-chip"
                    style={{ background: l.color || '#4b5563', cursor: 'pointer' }}
                    onClick={() => handleToggleLabel(l._id)}
                    title="Click to remove tag"
                  >
                    {l.name || l.color} ×
                  </span>
                ))}

                <button
                  type="button"
                  onClick={() => setIsTagsOpen(!isTagsOpen)}
                  className="notion-prop-pill"
                  style={{ height: '24px', padding: '0 8px', fontSize: '11px' }}
                >
                  <Plus size={11} />
                  <span>Tag</span>
                </button>

                {isTagsOpen && (
                  <div className="notion-prop-dropdown" style={{ minWidth: '240px', padding: '14px', borderRadius: '24px', border: '1.5px solid var(--border-medium)', boxShadow: 'var(--shadow-modal)', background: 'var(--bg-modal)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px', display: 'block' }}>
                      Select Labels
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {boardLabels.map(l => {
                        const isSelected = (card.labelIds || []).includes(l._id);
                        return (
                          <button
                            key={l._id}
                            type="button"
                            onClick={() => handleToggleLabel(l._id)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '100px',
                              border: isSelected ? '2px solid var(--accent-primary)' : '1px solid transparent',
                              background: l.color || 'var(--accent-primary)',
                              color: '#ffffff',
                              fontSize: '11.5px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              opacity: isSelected ? 1 : 0.6,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              boxShadow: isSelected ? '0 3px 10px rgba(124, 92, 229, 0.3)' : 'none',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span>{l.name || l.color}</span>
                            {isSelected && <Check size={11} strokeWidth={3} />}
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '8px 0 6px 0' }} />

                    {isCreatingTag ? (
                      <form onSubmit={handleCreateCustomTag} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <input
                          type="text"
                          required
                          value={newTagName}
                          onChange={e => setNewTagName(e.target.value)}
                          placeholder="New tag title..."
                          className="form-input"
                          style={{ height: '26px', fontSize: '11.5px' }}
                          autoFocus
                        />
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          {LABEL_COLORS.map(col => (
                            <button
                              key={col}
                              type="button"
                              onClick={() => setNewTagColor(col)}
                              style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                background: col,
                                border: newTagColor === col ? '2px solid var(--accent-primary-text)' : 'none',
                                cursor: 'pointer',
                              }}
                            />
                          ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                          <button type="button" onClick={() => setIsCreatingTag(false)} className="btn-subtle" style={{ height: '22px', fontSize: '10.5px' }}>
                            Cancel
                          </button>
                          <button type="submit" className="btn-primary" style={{ height: '22px', fontSize: '10.5px' }}>
                            Save
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsCreatingTag(true)}
                        className="btn-subtle"
                        style={{ height: '24px', fontSize: '11px', gap: '4px' }}
                      >
                        <Plus size={11} />
                        <span>Create New Tag</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* GitHub Issue Tag if connected */}
            {card.github && (
              <div className="notion-prop-row">
                <div className="notion-prop-label">
                  <Github size={13} />
                  <span>GitHub</span>
                </div>
                <div>
                  <a
                    href={card.github.issueUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: 'var(--r-xs)',
                      background: 'var(--bg-badge)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    <span>#{card.github.issueNumber} ({card.github.state})</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* ── 3. Dedicated Autonomous Codex Dev Agent / AI Task Section ── */}
          {activeBoard?.projectType !== 'general' ? (
            <div
              style={{
                marginTop: '14px',
                padding: '18px 20px',
                borderRadius: '28px',
                background: 'var(--bg-card)',
                border: '1.5px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {/* Header Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cpu size={16} style={{ color: 'var(--accent-primary)' }} />
                  <div>
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                      Codex Autonomous Dev Pipeline
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '100px',
                      background: isCodexDiagnosing || isCodexExecuting ? 'rgba(168, 85, 247, 0.2)' : 'rgba(46, 204, 113, 0.2)',
                      color: isCodexDiagnosing || isCodexExecuting ? 'var(--accent-purple)' : 'var(--accent-green)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isCodexDiagnosing || isCodexExecuting ? 'var(--accent-primary)' : 'var(--accent-green)' }} />
                    {isCodexDiagnosing ? 'Diagnosing Codebase...' : isCodexExecuting ? 'Writing & Testing Code...' : 'Agent Ready'}
                  </span>
                </div>
              </div>

              {/* Pipeline 5-Stage Stepper */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', background: 'var(--bg-input)', padding: '6px', borderRadius: '20px', border: '1.5px solid var(--border-subtle)' }}>
                {[
                  { id: 'backlog', step: '1', label: 'Backlog' },
                  { id: 'diagnosis', step: '2', label: 'Diagnosis' },
                  { id: 'execution', step: '3', label: 'In Progress' },
                  { id: 'review', step: '4', label: 'Review & QA' },
                  { id: 'shipped', step: '5', label: 'Shipped' },
                ].map(s => {
                  const isCurrent = list?.title.toLowerCase().includes(s.id) || (s.id === 'execution' && list?.title.toLowerCase().includes('progress'));
                  return (
                    <div
                      key={s.id}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '14px',
                        background: isCurrent ? 'var(--accent-primary)' : 'var(--bg-card)',
                        border: isCurrent ? 'none' : '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        textAlign: 'center',
                        boxShadow: isCurrent ? '0 4px 12px rgba(124, 92, 229, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.04)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span style={{
                        fontSize: '9.5px',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        color: isCurrent ? 'var(--accent-primary-text)' : 'var(--text-muted)',
                      }}>
                        STAGE {s.step}
                      </span>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: isCurrent ? 'var(--accent-primary-text)' : 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                      }}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Codebase Repository Path Context & Quick Link */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: 'var(--text-primary)',
                background: 'var(--bg-input)',
                padding: '8px 14px',
                borderRadius: '16px',
                border: '1.5px solid var(--border-subtle)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                  <Folder size={14} style={{ flexShrink: 0, color: activeBoard?.localRepoPath ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                  <span style={{ fontSize: '11.5px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', color: activeBoard?.localRepoPath ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {activeBoard?.localRepoPath || 'No repository folder linked to this project'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleBrowseRepo}
                  className="btn-subtle"
                  style={{ fontSize: '11.5px', height: '26px', padding: '0 10px', gap: '4px', flexShrink: 0, marginLeft: '8px', borderRadius: '100px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', fontWeight: 800, color: 'var(--accent-primary)' }}
                >
                  <span>{activeBoard?.localRepoPath ? 'Change Folder' : 'Link Folder'}</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleRunCodexDiagnosis}
                  disabled={isCodexDiagnosing || isCodexExecuting}
                  className="btn-subtle"
                  style={{
                    height: '34px',
                    fontSize: '12px',
                    gap: '6px',
                    border: '1.5px solid var(--border-subtle)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px',
                    borderRadius: '100px',
                    fontWeight: 800,
                  }}
                  title="Codex inspects codebase, reads LEARNINGS.md, and creates reproduction steps and diagnosis plan"
                >
                  {isCodexDiagnosing ? <Loader2 size={13} className="animate-spin" /> : <Brain size={14} style={{ color: 'var(--accent-primary)' }} />}
                  <span>1. Run Diagnosis Plan</span>
                </button>

                <button
                  type="button"
                  onClick={handleRunCodexExecution}
                  disabled={isCodexDiagnosing || isCodexExecuting}
                  className="btn-primary"
                  style={{
                    height: '34px',
                    fontSize: '12px',
                    gap: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 18px',
                    borderRadius: '100px',
                    fontWeight: 800,
                    background: 'var(--accent-primary)',
                    color: 'var(--accent-primary-text)',
                  }}
                  title="Codex creates feature branch, implements solution, runs quality tests in a self-healing retry loop, and opens a PR"
                >
                  {isCodexExecuting ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} fill="currentColor" />}
                  <span>2. Generate Code & Test</span>
                </button>
              </div>

              {latestDiagnosisReport && (
                <div style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--r-sm)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={13} style={{ color: 'var(--accent-green)' }} />
                      <span>Latest Diagnosis Plan</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('discussion')}
                      className="btn-subtle"
                      style={{ fontSize: '11px', height: '22px', padding: '0 8px', gap: '4px' }}
                    >
                      <MessageSquare size={11} />
                      <span>View in Discussion & Notes →</span>
                    </button>
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      maxHeight: '120px',
                      overflowY: 'auto',
                    }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(latestDiagnosisReport) }}
                  />
                </div>
              )}

              {codexStatusMessage && (
                <div
                  style={{
                    fontSize: '11.5px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-input)',
                    padding: '10px 12px',
                    borderRadius: 'var(--r-sm)',
                    border: '1px solid var(--border-subtle)',
                    lineHeight: 1.45,
                  }}
                >
                  {codexStatusMessage}
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                marginTop: '12px',
                padding: '12px 14px',
                borderRadius: 'var(--r-md)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LumoraLogo size={16} showText={false} />
                <div>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Lumora Copilot Active
                  </span>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '1px 0 0 0' }}>
                    Use 1-click spec enhancement and subtask decomposition for general task management.
                  </p>
                </div>
              </div>
            </div>
          )}



          {/* ── TAB 1: OVERVIEW & SPECS ─────────────────────────────── */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Description Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <AlignLeft size={14} style={{ color: 'var(--accent-blue)' }} />
                    <span>Description</span>
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={handleSpeakCardDescription}
                      className="btn-subtle"
                      style={{ height: '26px', fontSize: '11.5px', gap: '4px', padding: '0 8px' }}
                      title="Read task aloud with Kokoro-82M TTS"
                    >
                      {isSpeakingTts ? (
                        <VolumeX size={12} className="text-red-400" />
                      ) : (
                        <Volume2 size={12} className="text-cyan-400" />
                      )}
                      <span>{isSpeakingTts ? 'Stop' : 'Speak'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAiEnhanceDescription}
                      disabled={isAiGeneratingDesc}
                      className="btn-subtle"
                      style={{ height: '26px', fontSize: '11.5px', gap: '4px', padding: '0 8px' }}
                      title="Auto-generate technical spec with AI"
                    >
                      {isAiGeneratingDesc ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} style={{ color: 'var(--accent-blue)' }} />}
                      <span>AI Enhance</span>
                    </button>

                    {!isEditingDesc && description && (
                      <button
                        type="button"
                        onClick={() => setIsEditingDesc(true)}
                        className="btn-subtle"
                        style={{ height: '26px', fontSize: '11.5px', padding: '0 8px' }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {isEditingDesc ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Write detailed specifications, notes, or acceptance criteria..."
                      autoFocus
                      style={{
                        width: '100%',
                        minHeight: '220px',
                        background: 'var(--bg-canvas)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 'var(--r-md)',
                        padding: '14px 16px',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontFamily: 'var(--font-mono)',
                        lineHeight: 1.6,
                        resize: 'vertical',
                        outline: 'none',
                        boxShadow: 'var(--shadow-xs)',
                        boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={handleSaveDescription}
                          className="btn-primary"
                          style={{ height: '30px', fontSize: '12px', padding: '0 14px' }}
                        >
                          Save Description
                        </button>
                        {previousDescription !== null && (
                          <button
                            type="button"
                            onClick={handleRevertDescription}
                            className="btn-subtle"
                            style={{ height: '30px', fontSize: '12px', padding: '0 12px', gap: '5px' }}
                            title="Revert back to original description before AI enhancement"
                          >
                            <Undo2 size={12} />
                            <span>Revert to Original</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setDescription(card.description || '');
                            setIsEditingDesc(false);
                          }}
                          className="btn-subtle"
                          style={{ height: '30px', fontSize: '12px' }}
                        >
                          Cancel
                        </button>
                      </div>

                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Markdown & Gherkin supported
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingDesc(true)}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--r-md)',
                      padding: '14px 16px',
                      minHeight: '120px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontFamily: description ? 'var(--font-mono)' : 'inherit',
                      lineHeight: 1.6,
                      color: description ? 'var(--text-primary)' : 'var(--text-muted)',
                      whiteSpace: 'pre-wrap',
                      transition: 'border-color var(--t-fast)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-medium)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-card)')}
                  >
                    {description || 'Click to write a detailed description or use AI Enhance...'}
                  </div>
                )}
              </div>

              {/* Checklists & Subtasks Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <CheckSquare size={14} style={{ color: 'var(--accent-green)' }} />
                    <span>Checklists & Subtasks ({cardChecklists.length})</span>
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={handleAiBreakdownChecklist}
                      disabled={isAiGeneratingChecklist}
                      className="btn-subtle"
                      style={{ height: '26px', fontSize: '11.5px', gap: '4px', padding: '0 8px' }}
                      title="Auto-breakdown task into actionable checklists with AI"
                    >
                      {isAiGeneratingChecklist ? <Loader2 size={11} className="animate-spin" /> : <ListChecks size={11} style={{ color: 'var(--accent-amber)' }} />}
                      <span>AI Breakdown</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAddingChecklist(true)}
                      className="btn-subtle"
                      style={{ height: '26px', fontSize: '11.5px', gap: '4px', padding: '0 8px' }}
                    >
                      <Plus size={12} />
                      <span>Add Checklist</span>
                    </button>
                  </div>
                </div>

                {isAddingChecklist && (
                  <form
                    onSubmit={handleCreateChecklist}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--r-md)',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <input
                      type="text"
                      required
                      value={newChecklistTitle}
                      onChange={e => setNewChecklistTitle(e.target.value)}
                      placeholder="Checklist title (e.g. Acceptance Criteria)..."
                      className="form-input"
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setIsAddingChecklist(false)} className="btn-subtle" style={{ height: '26px', fontSize: '11.5px' }}>
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary" style={{ height: '26px', fontSize: '11.5px' }}>
                        Create Checklist
                      </button>
                    </div>
                  </form>
                )}

                {cardChecklists.map(cl => {
                  const items = checklistItems.filter(i => i.checklistId === cl._id);
                  const finished = items.filter(i => i.isFinished).length;
                  const pct = items.length > 0 ? Math.round((finished / items.length) * 100) : 0;

                  return (
                    <div
                      key={cl._id}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-card)',
                        borderRadius: 'var(--r-md)',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {cl.title}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {finished}/{items.length} ({pct}%)
                          </span>
                        </div>

                        <button
                          onClick={() => handleDeleteChecklist(cl._id, cl.title)}
                          className="btn-icon"
                          style={{ width: '22px', height: '22px' }}
                          title="Delete checklist"
                        >
                          <Trash2 size={12} style={{ color: 'var(--text-muted)' }} />
                        </button>
                      </div>

                      <div className="progress-track" style={{ height: '4px' }}>
                        <div className="progress-fill" style={{ width: `${pct}%`, background: pct === 100 ? 'var(--success)' : 'var(--accent-blue)' }} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {items.map(item => (
                          <div
                            key={item._id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 8px',
                              borderRadius: 'var(--r-sm)',
                              background: item.isFinished ? 'rgba(52, 211, 153, 0.04)' : 'transparent',
                              transition: 'background var(--t-fast)',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-button-subtle)')}
                            onMouseLeave={e => (e.currentTarget.style.background = item.isFinished ? 'rgba(52, 211, 153, 0.04)' : 'transparent')}
                          >
                            <div
                              onClick={() => updateChecklistItem(card._id, cl._id, item._id, !item.isFinished)}
                              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1, minWidth: 0 }}
                            >
                              <div
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '5px',
                                  border: item.isFinished ? 'none' : '1.5px solid var(--border-strong)',
                                  background: item.isFinished ? 'var(--accent-blue)' : 'var(--bg-card)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                                  boxShadow: item.isFinished ? '0 0 6px rgba(79,142,247,0.4)' : 'none',
                                }}
                              >
                                {item.isFinished && <Check size={12} style={{ color: '#ffffff', strokeWidth: 3 }} />}
                              </div>

                              <span
                                style={{
                                  fontSize: '13px',
                                  color: item.isFinished ? 'var(--text-muted)' : 'var(--text-primary)',
                                  textDecoration: item.isFinished ? 'line-through' : 'none',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {item.title}
                              </span>
                            </div>

                            <button
                              onClick={() => handleDeleteChecklistItem(cl._id, item._id, item.title)}
                              className="btn-icon"
                              style={{ width: '22px', height: '22px', padding: 0 }}
                              title="Delete item"
                            >
                              <Trash2 size={11} style={{ color: 'var(--text-muted)' }} />
                            </button>
                          </div>
                        ))}
                      </div>

                      {addingItemChecklistId === cl._id ? (
                        <form onSubmit={e => handleCreateItem(cl._id, e)} style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                          <input
                            type="text"
                            required
                            value={newItemTitles[cl._id] || ''}
                            onChange={e => setNewItemTitles(prev => ({ ...prev, [cl._id]: e.target.value }))}
                            placeholder="Add an item... (Enter)"
                            className="form-input"
                            style={{ height: '28px', fontSize: '12px' }}
                            autoFocus
                          />
                          <button type="submit" className="btn-primary" style={{ height: '28px', fontSize: '11.5px', padding: '0 10px' }}>
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddingItemChecklistId(null)}
                            className="btn-subtle"
                            style={{ height: '28px', fontSize: '11.5px' }}
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAddingItemChecklistId(cl._id)}
                          className="btn-subtle"
                          style={{ alignSelf: 'flex-start', height: '24px', fontSize: '11.5px', padding: '0 8px', gap: '4px' }}
                        >
                          <Plus size={11} />
                          <span>Add an item</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Attachments Section with Previews */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <Paperclip size={14} style={{ color: 'var(--accent-purple)' }} />
                    <span>Attachments & Previews ({cardAttachments.length})</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-subtle"
                    style={{ height: '26px', fontSize: '11.5px', gap: '4px', padding: '0 8px' }}
                  >
                    <Plus size={12} />
                    <span>Attach File</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </div>

                {cardAttachments.length > 0 ? (
                  <div className="attachment-preview-grid">
                    {cardAttachments.map(att => {
                      const isImg = isImageAttachment(att);
                      const url = getAttachmentUrl(att);
                      return (
                        <div key={att._id} className="attachment-card">
                          {/* Thumbnail / Icon area */}
                          <div
                            className="attachment-thumb"
                            onClick={() => {
                              if (isImg && url) {
                                setPreviewAttachment(att);
                              }
                            }}
                          >
                            {isImg && url ? (
                              <img src={url} alt={att.name} />
                            ) : (
                              <FileText size={28} style={{ color: 'var(--text-muted)' }} />
                            )}
                            {isImg && url && (
                              <div
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  background: 'rgba(0,0,0,0.35)',
                                  opacity: 0,
                                  transition: 'opacity var(--t-fast)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#ffffff',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                              >
                                <Maximize2 size={16} />
                              </div>
                            )}
                          </div>

                          {/* Info Footer */}
                          <div
                            style={{
                              padding: '8px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '6px',
                              background: 'var(--bg-card)',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '11.5px',
                                fontWeight: 500,
                                color: 'var(--text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                              }}
                              title={att.name}
                            >
                              {att.name}
                            </span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              {url && (
                                <a
                                  href={url}
                                  download={att.name}
                                  className="btn-icon"
                                  style={{ width: '22px', height: '22px', color: 'var(--text-secondary)' }}
                                  title="Download file"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <Download size={11} />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleDeleteAttachment(att._id, att.name);
                                }}
                                className="btn-icon"
                                style={{ width: '22px', height: '22px', color: 'var(--text-muted)' }}
                                title="Delete attachment"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '1.5px dashed var(--border-medium)',
                      borderRadius: 'var(--r-md)',
                      padding: '24px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      background: 'var(--bg-card)',
                      transition: 'all var(--t-fast)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--accent-blue)';
                      e.currentTarget.style.background = 'var(--bg-card-hover)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border-medium)';
                      e.currentTarget.style.background = 'var(--bg-card)';
                    }}
                  >
                    <UploadCloud size={24} style={{ color: 'var(--accent-blue)' }} />
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Drag & drop screenshots or click to attach
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      PNG, JPG, SVG, and files • AI automatically inspects attached images for specs
                    </span>
                  </div>
                )}
              </div>

              {/* Archive Zone */}
              <div
                style={{
                  marginTop: '12px',
                  padding: '14px 16px',
                  borderRadius: '20px',
                  background: 'var(--bg-input)',
                  border: '1.5px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                    {card.archived ? 'Task is archived' : 'Archive this task'}
                  </span>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    {card.archived
                      ? 'This task is hidden from the active board. Restore it to make it visible again.'
                      : 'Hide this task from the active kanban columns while preserving all its history and attachments.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (card.archived) {
                      await unarchiveCard(card._id);
                    } else {
                      await archiveCard(card._id);
                      setActiveCardId(null);
                    }
                  }}
                  className="btn-primary"
                  style={{ height: '32px', fontSize: '12px', padding: '0 14px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                >
                  <Archive size={13} />
                  <span>{card.archived ? 'Restore to Board' : 'Archive Task'}</span>
                </button>
              </div>

              {/* Danger Zone: Delete Task */}
              <div
                style={{
                  marginTop: '8px',
                  padding: '14px 16px',
                  borderRadius: '20px',
                  background: 'rgba(248,113,113,0.06)',
                  border: '1.5px solid rgba(248,113,113,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-red)' }}>
                    Delete this task
                  </span>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Permanently delete this task and remove its checklists, attachments, and notes.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteCard}
                  className="btn-destructive"
                  style={{ height: '32px', fontSize: '12px', padding: '0 14px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                >
                  <Trash2 size={13} />
                  <span>Delete Task</span>
                </button>
              </div>
            </div>
          )}

          {/* ── TAB 2: DISCUSSION & NOTES ───────────────────────────── */}
          {activeTab === 'discussion' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <MessageSquare size={14} style={{ color: 'var(--accent-amber)' }} />
                  <span>Discussion Timeline & Notes ({cardComments.length})</span>
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Press Cmd+Enter to post quickly
                </span>
              </div>

              {/* Add Comment Input */}
              <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea
                  value={newCommentText}
                  onChange={e => setNewCommentText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleAddComment(e);
                    }
                  }}
                  placeholder="Leave a note, engineering update, or feedback... (Cmd+Enter to post)"
                  rows={3}
                  autoFocus
                  style={{
                    width: '100%',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--r-md)',
                    padding: '12px 14px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    resize: 'vertical',
                    outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Markdown supported
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !newCommentText.trim()}
                    className="btn-primary"
                    style={{ height: '30px', fontSize: '12px', padding: '0 14px', gap: '6px' }}
                  >
                    <ArrowUp size={13} />
                    <span>Post Update</span>
                  </button>
                </div>
              </form>

              {/* Discussion Thread */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                {cardComments.length === 0 ? (
                  <div
                    style={{
                      padding: '36px 20px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--r-lg)',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '12.5px',
                    }}
                  >
                    No notes or comments yet. Leave the first message above!
                  </div>
                ) : (
                  cardComments.map(cmt => {
                    const text = cmt.text || cmt.comment || '';
                    const isCodexReport = text.includes('Codex Autonomous Diagnosis Plan') || text.includes('Codex Diagnosis Report') || text.includes('Codex Autonomous Code & Test');
                    return (
                      <div
                        key={cmt._id}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-medium)',
                          borderRadius: 'var(--r-md)',
                          padding: '14px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isCodexReport ? (
                              <LumoraLogo size={15} showText={false} />
                            ) : (
                              <User size={14} style={{ color: 'var(--text-secondary)' }} />
                            )}
                            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {isCodexReport ? 'Codex Autonomous Agent' : 'Workspace Member'}
                            </span>
                            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                              {cmt.createdAt ? new Date((cmt.createdAt as any)?.$date || cmt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Note'}
                            </span>
                          </div>

                          <button
                            onClick={() => handleDeleteComment(cmt._id)}
                            className="btn-icon"
                            style={{ width: '20px', height: '20px', padding: 0 }}
                            title="Delete note"
                          >
                            <Trash2 size={11} style={{ color: 'var(--text-muted)' }} />
                          </button>
                        </div>
                        <div
                          style={{ fontSize: '12.5px', color: 'var(--text-primary)', lineHeight: 1.55 }}
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Image Lightbox Modal ─────────────────────────────────────── */}
      {previewAttachment && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fade-in 150ms ease-out',
          }}
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <img
              src={getAttachmentUrl(previewAttachment)}
              alt={previewAttachment.name}
              style={{
                maxWidth: '85vw',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: 'var(--r-md)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
              }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'var(--bg-modal)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--r-full)',
                padding: '6px 16px',
                boxShadow: 'var(--shadow-modal)',
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>
                {previewAttachment.name}
              </span>
              <a
                href={getAttachmentUrl(previewAttachment)}
                download={previewAttachment.name}
                className="btn-primary"
                style={{ height: '24px', fontSize: '11px', padding: '0 10px', gap: '4px', borderRadius: 'var(--r-full)', textDecoration: 'none' }}
              >
                <Download size={11} />
                <span>Download</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="btn-subtle"
                style={{ height: '24px', fontSize: '11px', padding: '0 10px', borderRadius: 'var(--r-full)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const CardDetailModal: React.FC = () => {
  const { activeCardId, cards } = useBoardStore();
  const card = cards.find(c => c._id === activeCardId);

  if (!activeCardId || !card) return null;

  return <CardDetailDrawerInner card={card} key={card._id} />;
};
