import React, { useState, useEffect } from 'react';
import './App.css';
import { loadData, saveData, generateId } from './storage';
import { generateDashboardHtml } from './exportHtml';

/* ─── file type helpers ─── */
const ACCEPTED_TYPES = 'application/pdf,image/png,image/jpeg,image/gif,image/webp,image/svg+xml';

function getFileCategory(mimeType) {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  return 'file';
}

function fileIcon(type) {
  if (type === 'link') return '🔗';
  if (type === 'pdf') return '📄';
  if (type === 'image') return '🖼️';
  return '📎';
}

function openFileBlob(data, mimeType) {
  const base64 = data.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  window.open(URL.createObjectURL(blob), '_blank');
}

/* ─── useDashboards hook ─── */
function useDashboards() {
  const [data, setData] = useState(null);

  useEffect(() => {
    loadData().then(raw => {
      setData({
        dashboards: (raw.dashboards || []).map(d => ({
          ...d,
          folderId: d.folderId ?? null,
          resourceFolders: d.resourceFolders ?? [],
          resources: (d.resources || []).map(r => ({ ...r, folderId: r.folderId ?? null })),
        })),
        dashboardFolders: raw.dashboardFolders || [],
      });
    });
  }, []);

  function update(next) { setData(next); saveData(next); }

  /* Dashboard Folders */
  function createDashboardFolder(name) {
    const f = { id: generateId(), name, createdAt: new Date().toISOString() };
    update({ ...data, dashboardFolders: [f, ...data.dashboardFolders] });
  }
  function renameDashboardFolder(id, name) {
    update({ ...data, dashboardFolders: data.dashboardFolders.map(f => f.id === id ? { ...f, name } : f) });
  }
  function deleteDashboardFolder(id) {
    update({
      ...data,
      dashboardFolders: data.dashboardFolders.filter(f => f.id !== id),
      dashboards: data.dashboards.map(d => d.folderId === id ? { ...d, folderId: null } : d),
    });
  }
  function moveDashboardToFolder(dashboardId, folderId) {
    update({ ...data, dashboards: data.dashboards.map(d => d.id === dashboardId ? { ...d, folderId } : d) });
  }

  /* Dashboards */
  function createDashboard(title, folderId = null) {
    const d = { id: generateId(), title, folderId, createdAt: new Date().toISOString(), resources: [], resourceFolders: [] };
    update({ ...data, dashboards: [d, ...data.dashboards] });
    return d.id;
  }
  function renameDashboard(id, title) {
    update({ ...data, dashboards: data.dashboards.map(d => d.id === id ? { ...d, title } : d) });
  }
  function deleteDashboard(id) {
    update({ ...data, dashboards: data.dashboards.filter(d => d.id !== id) });
  }

  /* Resource Folders */
  function createResourceFolder(dashboardId, name) {
    const f = { id: generateId(), name };
    update({
      ...data,
      dashboards: data.dashboards.map(d =>
        d.id === dashboardId ? { ...d, resourceFolders: [...d.resourceFolders, f] } : d
      ),
    });
  }
  function renameResourceFolder(dashboardId, folderId, name) {
    update({
      ...data,
      dashboards: data.dashboards.map(d =>
        d.id === dashboardId
          ? { ...d, resourceFolders: d.resourceFolders.map(f => f.id === folderId ? { ...f, name } : f) }
          : d
      ),
    });
  }
  function deleteResourceFolder(dashboardId, folderId) {
    update({
      ...data,
      dashboards: data.dashboards.map(d =>
        d.id === dashboardId
          ? {
              ...d,
              resourceFolders: d.resourceFolders.filter(f => f.id !== folderId),
              resources: d.resources.map(r => r.folderId === folderId ? { ...r, folderId: null } : r),
            }
          : d
      ),
    });
  }
  function moveResourceToFolder(dashboardId, resourceId, folderId) {
    update({
      ...data,
      dashboards: data.dashboards.map(d =>
        d.id === dashboardId
          ? { ...d, resources: d.resources.map(r => r.id === resourceId ? { ...r, folderId } : r) }
          : d
      ),
    });
  }

  /* Resources */
  function addResource(dashboardId, resource) {
    update({
      ...data,
      dashboards: data.dashboards.map(d =>
        d.id === dashboardId
          ? { ...d, resources: [...d.resources, { id: generateId(), folderId: null, ...resource }] }
          : d
      ),
    });
  }
  function deleteResource(dashboardId, resourceId) {
    update({
      ...data,
      dashboards: data.dashboards.map(d =>
        d.id === dashboardId ? { ...d, resources: d.resources.filter(r => r.id !== resourceId) } : d
      ),
    });
  }
  function renameResource(dashboardId, resourceId, title) {
    update({
      ...data,
      dashboards: data.dashboards.map(d =>
        d.id === dashboardId
          ? { ...d, resources: d.resources.map(r => r.id === resourceId ? { ...r, title } : r) }
          : d
      ),
    });
  }

  return {
    loading: data === null,
    dashboards: data?.dashboards ?? [],
    dashboardFolders: data?.dashboardFolders ?? [],
    createDashboard, renameDashboard, deleteDashboard, moveDashboardToFolder,
    createDashboardFolder, renameDashboardFolder, deleteDashboardFolder,
    addResource, deleteResource, renameResource, moveResourceToFolder,
    createResourceFolder, renameResourceFolder, deleteResourceFolder,
  };
}

/* ─── NameModal (create / rename 공용) ─── */
function NameModal({ title, label, placeholder, initial = '', onClose, onConfirm }) {
  const [value, setValue] = useState(initial);
  function handleSubmit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    onConfirm(value.trim());
    onClose();
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{label}</label>
            <input className="form-input" placeholder={placeholder} value={value}
              onChange={e => setValue(e.target.value)} autoFocus />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>취소</button>
            <button type="submit" className="btn btn-primary" disabled={!value.trim()}>확인</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── ConfirmModal ─── */
function ConfirmModal({ message, onClose, onConfirm }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">삭제 확인</div>
        <p style={{ fontSize: 14, color: '#4a5568', lineHeight: 1.6 }}>{message}</p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-danger" onClick={() => { onConfirm(); onClose(); }}>삭제</button>
        </div>
      </div>
    </div>
  );
}

/* ─── MoveToFolderModal ─── */
function MoveToFolderModal({ folders, currentFolderId, onClose, onMove }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">폴더로 이동</div>
        <div className="folder-pick-list">
          <button className={`folder-pick-item ${currentFolderId === null ? 'active' : ''}`}
            onClick={() => { onMove(null); onClose(); }}>
            🏠 루트 (폴더 없음)
          </button>
          {folders.map(f => (
            <button key={f.id}
              className={`folder-pick-item ${currentFolderId === f.id ? 'active' : ''}`}
              onClick={() => { onMove(f.id); onClose(); }}>
              📁 {f.name}
            </button>
          ))}
        </div>
        {folders.length === 0 && (
          <p style={{ fontSize: 13, color: '#a0aec0', textAlign: 'center', padding: '8px 0' }}>
            생성된 폴더가 없습니다
          </p>
        )}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
        </div>
      </div>
    </div>
  );
}

/* ─── AddResourceModal ─── */
function extractTitleFromUrl(rawUrl) {
  try {
    const u = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : 'https://' + rawUrl);
    const host = u.hostname.replace(/^www\./, '');
    const segments = u.pathname.split('/').filter(Boolean);
    if (segments.length >= 2) return `${host} / ${segments.slice(0, 2).join(' / ')}`;
    if (segments.length === 1) return `${host} / ${segments[0]}`;
    return host;
  } catch { return ''; }
}

function AddResourceModal({ onClose, onAdd }) {
  const [tab, setTab] = useState('link');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [titleAutoFilled, setTitleAutoFilled] = useState(false);

  function handleUrlChange(val) {
    setUrl(val);
    if (!title.trim() || titleAutoFilled) {
      const auto = extractTitleFromUrl(val);
      if (auto) { setTitle(auto); setTitleAutoFilled(true); }
    }
  }
  function handleTitleChange(val) { setTitle(val); setTitleAutoFilled(false); }
  function handleFileChange(f) {
    if (!f) return;
    const category = getFileCategory(f.type);
    if (category === 'file') return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => setFileData(e.target.result);
    reader.readAsDataURL(f);
    if (!title.trim() || titleAutoFilled) {
      setTitle(f.name.replace(/\.[^.]+$/, ''));
      setTitleAutoFilled(true);
    }
  }
  function handleDrop(e) { e.preventDefault(); setDragging(false); handleFileChange(e.dataTransfer.files[0]); }
  function handleSubmit(e) {
    e.preventDefault();
    if (tab === 'link') {
      if (!title.trim() || !url.trim()) return;
      let finalUrl = url.trim();
      if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;
      onAdd({ type: 'link', title: title.trim(), url: finalUrl });
    } else {
      if (!file || !fileData) return;
      const type = getFileCategory(file.type);
      onAdd({ type, mimeType: file.type, title: title.trim() || file.name, filename: file.name, data: fileData });
    }
    onClose();
  }
  const canSubmit = tab === 'link' ? title.trim() && url.trim() : !!file && !!fileData;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">자료 추가</div>
        <div className="tab-row">
          <button type="button" className={`tab-btn ${tab === 'link' ? 'active' : ''}`} onClick={() => setTab('link')}>🔗 링크</button>
          <button type="button" className={`tab-btn ${tab === 'pdf' ? 'active' : ''}`} onClick={() => setTab('pdf')}>📎 파일</button>
        </div>
        <form onSubmit={handleSubmit}>
          {tab === 'link' ? (
            <div className="form-group">
              <label className="form-label">URL</label>
              <input className="form-input" placeholder="https://..." value={url}
                onChange={e => handleUrlChange(e.target.value)} autoFocus />
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">파일</label>
              {file ? (
                <div className="file-selected">
                  {fileIcon(getFileCategory(file.type))} {file.name}
                  <button type="button" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', fontSize: 16 }}
                    onClick={() => { setFile(null); setFileData(null); setTitle(''); setTitleAutoFilled(false); }}>✕</button>
                </div>
              ) : (
                <div className={`file-drop ${dragging ? 'dragging' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-input').click()}>
                  <div className="drop-icon">📂</div>
                  <p>PDF · PNG · JPEG · GIF · WEBP</p>
                  <p style={{ marginTop: 4, fontSize: 12, color: '#cbd5e0' }}>드래그하거나 클릭해서 선택</p>
                </div>
              )}
              <input id="file-input" type="file" accept={ACCEPTED_TYPES} style={{ display: 'none' }}
                onChange={e => handleFileChange(e.target.files[0])} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">
              자료 제목
              {titleAutoFilled && <span className="auto-label">자동 생성됨</span>}
            </label>
            <input className="form-input"
              placeholder={tab === 'link' ? 'URL 입력 시 자동 생성' : '파일 선택 시 자동 생성'}
              value={title} onChange={e => handleTitleChange(e.target.value)} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>취소</button>
            <button type="submit" className="btn btn-primary" disabled={!canSubmit}>추가</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── ResourceCard ─── */
function ResourceCard({ resource, onDelete, onCopy, onRename, onMove, isCopied, showMoveBtn }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = React.useRef(null);

  function startEdit(e) {
    e.stopPropagation();
    setEditValue(resource.title);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }
  function commitEdit() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== resource.title) onRename(trimmed);
    setEditing(false);
  }
  function handleKeyDown(e) {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditing(false);
  }
  function handleClick(e) {
    if (editing) return;
    if (e.target.closest('.resource-card-actions')) return;
    if (resource.type === 'link') {
      window.open(resource.url, '_blank', 'noopener');
    } else {
      openFileBlob(resource.data, resource.mimeType || 'application/pdf');
    }
  }

  const cardClass = resource.type === 'link' ? 'link-card'
    : resource.type === 'image' ? 'image-card'
    : 'pdf-card';

  return (
    <div className={`resource-card ${cardClass}${isCopied ? ' is-copied' : ''}`} onClick={handleClick}>
      {resource.type === 'image' ? (
        <img className="resource-card-thumbnail" src={resource.data} alt={resource.title} />
      ) : (
        <div className="resource-card-type">{fileIcon(resource.type)}</div>
      )}
      {editing ? (
        <input ref={inputRef} className="resource-card-title-input" value={editValue}
          onChange={e => setEditValue(e.target.value)} onBlur={commitEdit}
          onKeyDown={handleKeyDown} onClick={e => e.stopPropagation()} autoFocus />
      ) : (
        <div className="resource-card-title">{resource.title}</div>
      )}
      {resource.type === 'link' && <div className="resource-card-subtitle">{resource.url}</div>}
      {resource.type !== 'link' && resource.type !== 'image' && resource.filename && (
        <div className="resource-card-subtitle">{resource.filename}</div>
      )}
      <div className="resource-card-actions">
        <button className="resource-card-btn resource-card-edit" onClick={startEdit} title="제목 수정">✏️</button>
        <button className="resource-card-btn resource-card-copy" onClick={e => { e.stopPropagation(); onCopy(); }}>
          {isCopied ? '복사됨' : '복사'}
        </button>
        {showMoveBtn && (
          <button className="resource-card-btn resource-card-move"
            onClick={e => { e.stopPropagation(); onMove(); }} title="폴더로 이동">📁</button>
        )}
        <button className="resource-card-btn resource-card-delete"
          onClick={e => { e.stopPropagation(); onDelete(); }}>삭제</button>
      </div>
    </div>
  );
}

/* ─── ResourceFolderCard ─── */
function ResourceFolderCard({ folder, count, onClick, onRename, onDelete }) {
  return (
    <div className="resource-card resource-folder-card" onClick={onClick}>
      <div className="resource-card-type">📁</div>
      <div className="resource-card-title">{folder.name}</div>
      <div className="resource-card-subtitle">자료 {count}개</div>
      <div className="resource-card-actions">
        <button className="resource-card-btn resource-card-edit"
          onClick={e => { e.stopPropagation(); onRename(); }}>✏️</button>
        <button className="resource-card-btn resource-card-delete"
          onClick={e => { e.stopPropagation(); onDelete(); }}>삭제</button>
      </div>
    </div>
  );
}

/* ─── DashboardDetail ─── */
function DashboardDetail({
  dashboard, onBack, onAddResource, onDeleteResource, onRenameResource, onMoveResource,
  onRename, onCreateResourceFolder, onRenameResourceFolder, onDeleteResourceFolder,
  clipboard, onCopy, onPaste,
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [renameFolderTarget, setRenameFolderTarget] = useState(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState(null);
  const [showRenameModal, setShowRenameModal] = useState(false);

  const resourceFolders = dashboard.resourceFolders || [];
  const allResources = dashboard.resources || [];
  const currentFolder = resourceFolders.find(f => f.id === currentFolderId) ?? null;
  const visibleFolders = currentFolderId === null ? resourceFolders : [];
  const visibleResources = allResources.filter(r => (r.folderId ?? null) === currentFolderId);
  const hasContent = visibleFolders.length > 0 || visibleResources.length > 0 || clipboard;

  function handleExport() {
    const html = generateDashboardHtml(dashboard);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${dashboard.title}.html`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <button className="back-btn" onClick={onBack}>← 목록으로</button>

      <div className="dashboard-detail-header">
        <div>
          <div className="dashboard-detail-title">📚 {dashboard.title}</div>
          {currentFolder ? (
            <div className="breadcrumb">
              <button className="breadcrumb-btn" onClick={() => setCurrentFolderId(null)}>전체 자료</button>
              <span className="breadcrumb-sep">›</span>
              <span className="breadcrumb-current">📁 {currentFolder.name}</span>
            </div>
          ) : null}
        </div>
        <div className="dashboard-detail-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowRenameModal(true)}>✏️ 이름 변경</button>
          {currentFolderId === null && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowNewFolderModal(true)}>📁 새 폴더</button>
          )}
          <button className="btn btn-success btn-sm" onClick={handleExport}>⬇️ HTML 다운로드</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>+ 자료 추가</button>
        </div>
      </div>

      {!hasContent ? (
        <div className="empty-state">
          <div className="empty-icon">{currentFolder ? '📁' : '📭'}</div>
          <h3>{currentFolder ? '폴더가 비어있어요' : '아직 자료가 없어요'}</h3>
          <p>링크나 파일을 추가해보세요</p>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ 자료 추가</button>
        </div>
      ) : (
        <div className="resource-grid">
          {visibleFolders.map(f => (
            <ResourceFolderCard key={f.id} folder={f}
              count={allResources.filter(r => r.folderId === f.id).length}
              onClick={() => setCurrentFolderId(f.id)}
              onRename={() => setRenameFolderTarget(f)}
              onDelete={() => setDeleteFolderTarget(f)} />
          ))}
          {visibleResources.map(r => (
            <ResourceCard key={r.id} resource={r}
              onDelete={() => onDeleteResource(r.id)}
              onCopy={() => onCopy(r)}
              onRename={title => onRenameResource(r.id, title)}
              onMove={() => setMoveTarget(r)}
              showMoveBtn={resourceFolders.length > 0}
              isCopied={clipboard?.id === r.id} />
          ))}
          {clipboard && (
            <button className="resource-card resource-card-paste" onClick={() => onPaste(currentFolderId)}>
              <div className="paste-icon">{fileIcon(clipboard.type)}</div>
              <div className="paste-label">붙여넣기</div>
              <div className="paste-title">{clipboard.title}</div>
            </button>
          )}
          <button className="resource-card resource-card-new" onClick={() => setShowAddModal(true)}>
            <div className="new-icon">+</div>
            <span>자료 추가</span>
          </button>
        </div>
      )}

      {showAddModal && (
        <AddResourceModal onClose={() => setShowAddModal(false)}
          onAdd={r => onAddResource({ ...r, folderId: currentFolderId })} />
      )}
      {showRenameModal && (
        <NameModal title="대시보드 이름 변경" label="새 제목" placeholder="" initial={dashboard.title}
          onClose={() => setShowRenameModal(false)} onConfirm={onRename} />
      )}
      {showNewFolderModal && (
        <NameModal title="새 폴더 만들기" label="폴더 이름" placeholder="폴더 이름"
          onClose={() => setShowNewFolderModal(false)} onConfirm={onCreateResourceFolder} />
      )}
      {renameFolderTarget && (
        <NameModal title="폴더 이름 변경" label="새 이름" placeholder="" initial={renameFolderTarget.name}
          onClose={() => setRenameFolderTarget(null)}
          onConfirm={name => { onRenameResourceFolder(renameFolderTarget.id, name); setRenameFolderTarget(null); }} />
      )}
      {deleteFolderTarget && (
        <ConfirmModal
          message={`"${deleteFolderTarget.name}" 폴더를 삭제할까요? 폴더 안의 자료는 루트로 이동됩니다.`}
          onClose={() => setDeleteFolderTarget(null)}
          onConfirm={() => {
            onDeleteResourceFolder(deleteFolderTarget.id);
            if (currentFolderId === deleteFolderTarget.id) setCurrentFolderId(null);
            setDeleteFolderTarget(null);
          }} />
      )}
      {moveTarget && (
        <MoveToFolderModal folders={resourceFolders} currentFolderId={moveTarget.folderId ?? null}
          onClose={() => setMoveTarget(null)}
          onMove={folderId => { onMoveResource(moveTarget.id, folderId); setMoveTarget(null); }} />
      )}
    </div>
  );
}

/* ─── FolderCard (dashboard list) ─── */
function FolderCard({ folder, count, onClick, onRename, onDelete }) {
  return (
    <div className="dashboard-card folder-card" onClick={onClick}>
      <div className="dashboard-card-header">
        <span className="dashboard-card-icon">📁</span>
        <div className="dashboard-card-actions" onClick={e => e.stopPropagation()}>
          <button className="btn-icon" title="이름 변경" onClick={() => onRename()}>✏️</button>
          <button className="btn-icon" title="삭제" onClick={() => onDelete()}>🗑️</button>
        </div>
      </div>
      <div className="dashboard-card-title">{folder.name}</div>
      <div className="dashboard-card-count">대시보드 {count}개</div>
    </div>
  );
}

/* ─── DashboardList ─── */
function DashboardList({ dashboards, dashboardFolders, onSelect, onCreate, onDelete, onRename,
  onMove, onCreateFolder, onRenameFolder, onDeleteFolder }) {
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [renameFolderTarget, setRenameFolderTarget] = useState(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);

  const currentFolder = dashboardFolders.find(f => f.id === currentFolderId) ?? null;
  const visibleFolders = currentFolderId === null ? dashboardFolders : [];
  const visibleDashboards = dashboards.filter(d => (d.folderId ?? null) === currentFolderId);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div className="page-title">수업 자료 대시보드</div>
          {currentFolder ? (
            <div className="breadcrumb">
              <button className="breadcrumb-btn" onClick={() => setCurrentFolderId(null)}>홈</button>
              <span className="breadcrumb-sep">›</span>
              <span className="breadcrumb-current">📁 {currentFolder.name}</span>
            </div>
          ) : (
            <div className="page-subtitle">수업별로 자료를 정리하고 HTML로 내보내 USB에 담아가세요</div>
          )}
        </div>
        {currentFolderId === null && (
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 6 }}
            onClick={() => setShowNewFolder(true)}>📁 새 폴더</button>
        )}
      </div>

      <div className="dashboard-grid">
        {visibleFolders.map(f => (
          <FolderCard key={f.id} folder={f}
            count={dashboards.filter(d => d.folderId === f.id).length}
            onClick={() => setCurrentFolderId(f.id)}
            onRename={() => setRenameFolderTarget(f)}
            onDelete={() => setDeleteFolderTarget(f)} />
        ))}
        {visibleDashboards.map(d => (
          <div key={d.id} className="dashboard-card" onClick={() => onSelect(d.id)}>
            <div className="dashboard-card-header">
              <span className="dashboard-card-icon">📚</span>
              <div className="dashboard-card-actions" onClick={e => e.stopPropagation()}>
                <button className="btn-icon" title="이름 변경" onClick={() => onRename(d)}>✏️</button>
                {dashboardFolders.length > 0 && (
                  <button className="btn-icon" title="폴더로 이동" onClick={() => setMoveTarget(d)}>📁</button>
                )}
                <button className="btn-icon" title="삭제" onClick={() => setConfirmDelete(d)}>🗑️</button>
              </div>
            </div>
            <div className="dashboard-card-title">{d.title}</div>
            <div className="dashboard-card-count">자료 {d.resources.length}개</div>
            <div className="dashboard-card-date">{new Date(d.createdAt).toLocaleDateString('ko-KR')}</div>
          </div>
        ))}
        <button className="dashboard-card dashboard-card-new" onClick={() => setShowCreate(true)}>
          <div className="new-icon">+</div>
          <span>새 대시보드</span>
        </button>
      </div>

      {showCreate && (
        <NameModal title="새 대시보드 만들기" label="수업명 / 제목" placeholder="예) 2학년 1반 수학"
          onClose={() => setShowCreate(false)}
          onConfirm={title => onCreate(title, currentFolderId)} />
      )}
      {showNewFolder && (
        <NameModal title="새 폴더 만들기" label="폴더 이름" placeholder="폴더 이름"
          onClose={() => setShowNewFolder(false)} onConfirm={onCreateFolder} />
      )}
      {renameFolderTarget && (
        <NameModal title="폴더 이름 변경" label="새 이름" placeholder="" initial={renameFolderTarget.name}
          onClose={() => setRenameFolderTarget(null)}
          onConfirm={name => { onRenameFolder(renameFolderTarget.id, name); setRenameFolderTarget(null); }} />
      )}
      {deleteFolderTarget && (
        <ConfirmModal
          message={`"${deleteFolderTarget.name}" 폴더를 삭제할까요? 폴더 안의 대시보드는 루트로 이동됩니다.`}
          onClose={() => setDeleteFolderTarget(null)}
          onConfirm={() => { onDeleteFolder(deleteFolderTarget.id); setDeleteFolderTarget(null); }} />
      )}
      {confirmDelete && (
        <ConfirmModal
          message={`"${confirmDelete.title}"을(를) 삭제할까요? 이 작업은 되돌릴 수 없습니다.`}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => { onDelete(confirmDelete.id); setConfirmDelete(null); }} />
      )}
      {moveTarget && (
        <MoveToFolderModal folders={dashboardFolders} currentFolderId={moveTarget.folderId ?? null}
          onClose={() => setMoveTarget(null)}
          onMove={folderId => { onMove(moveTarget.id, folderId); setMoveTarget(null); }} />
      )}
    </div>
  );
}

/* ─── App ─── */
export default function App() {
  const {
    loading, dashboards, dashboardFolders,
    createDashboard, renameDashboard, deleteDashboard, moveDashboardToFolder,
    createDashboardFolder, renameDashboardFolder, deleteDashboardFolder,
    addResource, deleteResource, renameResource, moveResourceToFolder,
    createResourceFolder, renameResourceFolder, deleteResourceFolder,
  } = useDashboards();

  const [selectedId, setSelectedId] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [clipboard, setClipboard] = useState(null);

  const selected = dashboards.find(d => d.id === selectedId);

  if (loading) return <div className="app"><div className="loading-screen">불러오는 중...</div></div>;

  return (
    <div className="app">
      <header className="header">
        <button className="header-title" onClick={() => setSelectedId(null)}>
          <span className="icon">🏫</span>
          <h1>ClassRoom Board</h1>
        </button>
        {clipboard && (
          <div className="clipboard-badge">
            <span>{fileIcon(clipboard.type)} <strong>{clipboard.title}</strong> 복사됨</span>
            <button onClick={() => setClipboard(null)}>✕</button>
          </div>
        )}
      </header>

      {selected ? (
        <DashboardDetail
          dashboard={selected}
          onBack={() => setSelectedId(null)}
          onAddResource={r => addResource(selected.id, r)}
          onDeleteResource={rid => deleteResource(selected.id, rid)}
          onRenameResource={(rid, title) => renameResource(selected.id, rid, title)}
          onMoveResource={(rid, folderId) => moveResourceToFolder(selected.id, rid, folderId)}
          onRename={title => renameDashboard(selected.id, title)}
          onCreateResourceFolder={name => createResourceFolder(selected.id, name)}
          onRenameResourceFolder={(fid, name) => renameResourceFolder(selected.id, fid, name)}
          onDeleteResourceFolder={fid => deleteResourceFolder(selected.id, fid)}
          clipboard={clipboard}
          onCopy={r => setClipboard(r)}
          onPaste={folderId => {
            const { id: _id, ...rest } = clipboard;
            addResource(selected.id, { ...rest, folderId });
          }}
        />
      ) : (
        <DashboardList
          dashboards={dashboards}
          dashboardFolders={dashboardFolders}
          onSelect={setSelectedId}
          onCreate={(title, folderId) => { const id = createDashboard(title, folderId); setSelectedId(id); }}
          onDelete={deleteDashboard}
          onRename={setRenameTarget}
          onMove={moveDashboardToFolder}
          onCreateFolder={createDashboardFolder}
          onRenameFolder={renameDashboardFolder}
          onDeleteFolder={deleteDashboardFolder}
        />
      )}

      {renameTarget && (
        <NameModal title="대시보드 이름 변경" label="새 제목" placeholder="" initial={renameTarget.title}
          onClose={() => setRenameTarget(null)}
          onConfirm={title => { renameDashboard(renameTarget.id, title); setRenameTarget(null); }} />
      )}
    </div>
  );
}
