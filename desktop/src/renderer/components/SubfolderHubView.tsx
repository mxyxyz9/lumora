import React, { useState } from 'react';
import { useBoardStore } from '../store/boardStore';
import {
  Folder,
  Plus,
  ArrowRight,
  MoreHorizontal,
  Edit2,
  Trash2,
  X,
  Check,
  CheckCircle2,
  Kanban,
  Zap,
  Loader2,
  Layers,
} from 'lucide-react';

const SUBFOLDER_PALETTE = ['#4f8ef7', '#9b8af7', '#34d399', '#fbbf24', '#f87171', '#22d3ee', '#fb923c'];

export const SubfolderHubView: React.FC = () => {
  const {
    activeBoard,
    activeBoardId,
    swimlanes,
    lists,
    cards,
    createSwimlane,
    updateSwimlane,
    deleteSwimlane,
    setActiveSwimlaneId,
    setActiveView,
    createCard,
    showConfirm,
    seedDemoData,
    switchBoard,
  } = useBoardStore();

  const [isAdding, setIsAdding] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  React.useEffect(() => {
    if (activeBoardId && (lists.length === 0 || swimlanes.length === 0)) {
      switchBoard(activeBoardId);
    }
  }, [activeBoardId]);

  const doneListIds = lists
    .filter(l => l.title.toLowerCase().includes('done') || l.title.toLowerCase().includes('complete'))
    .map(l => l._id);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const newId = await createSwimlane(newTitle.trim());
    setNewTitle('');
    setIsAdding(false);
    if (newId) {
      setActiveSwimlaneId(newId);
      setActiveView('board');
    }
  };

  const handleSaveEdit = async (swimlaneId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editTitle.trim()) {
      await updateSwimlane(swimlaneId, { title: editTitle.trim() });
    }
    setEditingId(null);
  };

  const handleDelete = (swimlaneId: string, title: string) => {
    setOpenMenuId(null);
    showConfirm({
      title: 'Delete Subfolder',
      message: `Are you sure you want to delete subfolder "${title}"? Cards will remain in the board.`,
      confirmText: 'Delete Subfolder',
      isDestructive: true,
      onConfirm: async () => {
        await deleteSwimlane(swimlaneId);
      },
    });
  };

  const totalCards = cards.length;
  const totalDone = cards.filter(c => doneListIds.includes(c.listId)).length;
  const overallProgress = totalCards > 0 ? Math.round((totalDone / totalCards) * 100) : 0;

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '36px 48px',
        background: 'var(--bg-canvas)',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        color: 'var(--text-primary)',
      }}
    >
      {/* Project Header Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '24px',
          gap: '20px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Project Overview & Workstreams
            </span>
          </div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              lineHeight: 1.2,
            }}
          >
            {activeBoard?.title || 'Project Workspace'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
            Subdivided into {swimlanes.length} subfolders. Each subfolder tracks a distinct workstream or domain.
          </p>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={isSeeding}
            onClick={async () => {
              setIsSeeding(true);
              try {
                await seedDemoData();
              } finally {
                setIsSeeding(false);
              }
            }}
            className="btn-subtle"
            style={{ height: '32px', fontSize: '12.5px', gap: '6px' }}
            title="Seed rich engineering tasks, subfolders & checklists"
          >
            {isSeeding ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
            <span>{isSeeding ? 'Seeding...' : 'Seed Demo Data'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSwimlaneId('all');
              setActiveView('board');
            }}
            className="btn-subtle"
            style={{ height: '32px', fontSize: '12.5px', gap: '6px' }}
          >
            <Kanban size={13} />
            <span>Open All Cards</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="btn-primary"
            style={{ height: '32px', fontSize: '12.5px', gap: '6px' }}
          >
            <Plus size={13} />
            <span>New Subfolder</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', maxWidth: '860px' }}>
        <div className="stat-card">
          <span className="stat-label">Subfolders</span>
          <span className="stat-value">{swimlanes.length}</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Total Work Items</span>
          <span className="stat-value">{totalCards}</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Completed Items</span>
          <span className="stat-value" style={{ color: 'var(--accent-green)' }}>
            {totalDone} <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>({overallProgress}%)</span>
          </span>
        </div>
      </div>

      {/* Subfolder Cards Grid */}
      <div>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Folder size={15} style={{ color: 'var(--text-muted)' }} />
          <span>Subfolders Directory</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {swimlanes.map((sw, idx) => {
            const swCards = cards.filter(c => c.swimlaneId === sw._id);
            const swDone = swCards.filter(c => doneListIds.includes(c.listId)).length;
            const progress = swCards.length > 0 ? Math.round((swDone / swCards.length) * 100) : 0;
            const accentColor = SUBFOLDER_PALETTE[idx % SUBFOLDER_PALETTE.length];

            return (
              <div
                key={sw._id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--r-lg)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  boxShadow: 'var(--shadow-card)',
                  position: 'relative',
                  transition: 'border-color var(--t-fast) var(--ease-out), box-shadow var(--t-fast) var(--ease-out)',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--r-md)',
                        background: 'var(--bg-badge)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: accentColor,
                        flexShrink: 0,
                      }}
                    >
                      <Folder size={18} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editingId === sw._id ? (
                        <form onSubmit={e => handleSaveEdit(sw._id, e)} style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            autoFocus
                            className="form-input"
                            style={{ padding: '3px 8px', fontSize: '13px', height: '28px' }}
                          />
                          <button type="submit" className="btn-primary" style={{ height: '28px', padding: '0 8px' }}>
                            <Check size={12} />
                          </button>
                        </form>
                      ) : (
                        <h3
                          style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          onClick={() => {
                            setActiveSwimlaneId(sw._id);
                            setActiveView('board');
                          }}
                          title={sw.title}
                        >
                          {sw.title}
                        </h3>
                      )}
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                        {swCards.length} work items · {swDone} completed
                      </span>
                    </div>
                  </div>

                  {/* Menu Button */}
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setOpenMenuId(openMenuId === sw._id ? null : sw._id)}
                      className="btn-icon"
                      style={{ width: '26px', height: '26px' }}
                      title="Subfolder options"
                    >
                      <MoreHorizontal size={13} />
                    </button>

                    {openMenuId === sw._id && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          right: 0,
                          width: '150px',
                          background: 'var(--bg-modal)',
                          border: '1px solid var(--border-medium)',
                          borderRadius: 'var(--r-md)',
                          boxShadow: 'var(--shadow-modal)',
                          padding: '4px',
                          zIndex: 60,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                        <button
                          onClick={() => {
                            setEditTitle(sw.title);
                            setEditingId(sw._id);
                            setOpenMenuId(null);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '7px 10px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-primary)',
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            borderRadius: 'var(--r-sm)',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-button-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          <Edit2 size={12} style={{ color: 'var(--text-muted)' }} />
                          <span>Rename</span>
                        </button>

                        <button
                          onClick={() => handleDelete(sw._id, sw.title)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '7px 10px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--danger)',
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            borderRadius: 'var(--r-sm)',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11.5px',
                      color: 'var(--text-muted)',
                      marginBottom: '6px',
                    }}
                  >
                    <span>Progress</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{progress}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progress}%`, background: accentColor }} />
                  </div>
                </div>

                {/* Open Subfolder Button */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSwimlaneId(sw._id);
                    setActiveView('board');
                  }}
                  className="btn-subtle"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    height: '34px',
                  }}
                >
                  <span>Open Subfolder Board</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            );
          })}

          {/* "+ New Subfolder" Creation Card */}
          {isAdding ? (
            <form
              noValidate
              onSubmit={handleCreate}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--r-lg)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                New Subfolder / Workstream
              </div>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Frontend, Backend, Infra, Design..."
                className="form-input"
                autoFocus
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    opacity: !newTitle.trim() ? 0.6 : 1,
                    cursor: !newTitle.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  Create & Open
                </button>
                <button type="button" onClick={() => setIsAdding(false)} className="btn-subtle">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div
              onClick={() => setIsAdding(true)}
              style={{
                background: 'var(--bg-input)',
                border: '1px dashed var(--border-medium)',
                borderRadius: 'var(--r-lg)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: 'pointer',
                minHeight: '170px',
                color: 'var(--text-muted)',
                transition: 'all var(--t-fast) var(--ease-out)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-button-subtle)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-input)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--bg-button-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus size={18} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Create New Subfolder</span>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Add another workstream to this project
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
