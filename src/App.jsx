import { useState } from 'react';
import './App.css';
import { loadData, saveData, generateId } from './storage';
import { generateDashboardHtml } from './exportHtml';

/* ─────────────── helpers ─────────────── */
function useDashboards() {
  const [data, setData] = useState(() => loadData());

  function update(newData) {
    setData(newData);
    saveData(newData);
  }

  function createDashboard(title) {
    const d = {
      id: generateId(),
      title,
      createdAt: new Date().toISOString(),
      resources: [],
    };
    const next = { ...data, dashboards: [d, ...data.dashboards] };
    update(next);
    return d.id;
  }

  function renameDashboard(id, title) {
    update({
      ...data,
      dashboards: data.dashboards.map((d) => d.id === id ? { ...d, title } : d),
    });
  }

  function deleteDashboard(id) {
    update({ ...data, dashboards: data.dashboards.filter((d) => d.id !== id) });
  }

  function addResource(dashboardId, resource) {
    update({
      ...data,
      dashboards: data.dashboards.map((d) =>
        d.id === dashboardId
          ? { ...d, resources: [...d.resources, { ...resource, id: generateId() }] }
          : d
      ),
    });
  }

  function deleteResource(dashboardId, resourceId) {
    update({
      ...data,
      dashboards: data.dashboards.map((d) =>
        d.id === dashboardId
          ? { ...d, resources: d.resources.filter((r) => r.id !== resourceId) }
          : d
      ),
    });
  }

  return { dashboards: data.dashboards, createDashboard, renameDashboard, deleteDashboard, addResource, deleteResource };
}

/* ─────────────── CreateDashboardModal ─────────────── */
function CreateDashboardModal({ onClose, onCreate }) {
  const [title, setTitle] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate(title.trim());
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">새 대시보드 만들기</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">수업명 / 제목</label>
            <input
              className="form-input"
              placeholder="예) 2학년 1반 수학, 영어 발표 자료..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>취소</button>
            <button type="submit" className="btn btn-primary" disabled={!title.trim()}>만들기</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────── RenameModal ─────────────── */
function RenameModal({ dashboard, onClose, onRename }) {
  const [title, setTitle] = useState(dashboard.title);

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onRename(title.trim());
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">대시보드 이름 변경</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">새 제목</label>
            <input
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>취소</button>
            <button type="submit" className="btn btn-primary" disabled={!title.trim()}>저장</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────── AddResourceModal ─────────────── */
function AddResourceModal({ onClose, onAdd }) {
  const [tab, setTab] = useState('link');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [dragging, setDragging] = useState(false);

  function handleFileChange(f) {
    if (!f || f.type !== 'application/pdf') return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setFileData(e.target.result);
    reader.readAsDataURL(f);
    if (!title) setTitle(f.name.replace(/\.pdf$/i, ''));
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    handleFileChange(f);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (tab === 'link') {
      if (!title.trim() || !url.trim()) return;
      let finalUrl = url.trim();
      if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;
      onAdd({ type: 'link', title: title.trim(), url: finalUrl });
    } else {
      if (!file || !fileData) return;
      onAdd({ type: 'pdf', title: title.trim() || file.name, filename: file.name, data: fileData });
    }
    onClose();
  }

  const canSubmit = tab === 'link' ? title.trim() && url.trim() : !!file && !!fileData;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">자료 추가</div>

        <div className="tab-row">
          <button type="button" className={`tab-btn ${tab === 'link' ? 'active' : ''}`} onClick={() => setTab('link')}>
            🔗 링크
          </button>
          <button type="button" className={`tab-btn ${tab === 'pdf' ? 'active' : ''}`} onClick={() => setTab('pdf')}>
            📄 PDF 파일
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">자료 제목</label>
            <input
              className="form-input"
              placeholder="자료를 설명하는 제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {tab === 'link' ? (
            <div className="form-group">
              <label className="form-label">URL</label>
              <input
                className="form-input"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">PDF 파일</label>
              {file ? (
                <div className="file-selected">
                  📄 {file.name}
                  <button
                    type="button"
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', fontSize: 16 }}
                    onClick={() => { setFile(null); setFileData(null); }}
                  >✕</button>
                </div>
              ) : (
                <div
                  className={`file-drop ${dragging ? 'dragging' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('pdf-input').click()}
                >
                  <div className="drop-icon">📂</div>
                  <p>PDF 파일을 드래그하거나 클릭해서 선택</p>
                </div>
              )}
              <input
                id="pdf-input"
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={(e) => handleFileChange(e.target.files[0])}
              />
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>취소</button>
            <button type="submit" className="btn btn-primary" disabled={!canSubmit}>추가</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────── ResourceCard ─────────────── */
function ResourceCard({ resource, onDelete, onCopy, isCopied }) {
  function handleClick(e) {
    if (e.target.closest('.resource-card-actions')) return;
    if (resource.type === 'link') {
      window.open(resource.url, '_blank', 'noopener');
    } else {
      const base64 = resource.data.split(',')[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      window.open(URL.createObjectURL(blob), '_blank');
    }
  }

  return (
    <div
      className={`resource-card ${resource.type === 'link' ? 'link-card' : 'pdf-card'}${isCopied ? ' is-copied' : ''}`}
      onClick={handleClick}
    >
      <div className="resource-card-type">{resource.type === 'link' ? '🔗' : '📄'}</div>
      <div className="resource-card-title">{resource.title}</div>
      {resource.type === 'link' && (
        <div className="resource-card-subtitle">{resource.url}</div>
      )}
      {resource.type === 'pdf' && resource.filename && (
        <div className="resource-card-subtitle">{resource.filename}</div>
      )}
      <div className="resource-card-actions">
        <button
          className="resource-card-btn resource-card-copy"
          onClick={(e) => { e.stopPropagation(); onCopy(); }}
          title="복사"
        >
          {isCopied ? '복사됨' : '복사'}
        </button>
        <button
          className="resource-card-btn resource-card-delete"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="삭제"
        >
          삭제
        </button>
      </div>
    </div>
  );
}

/* ─────────────── DashboardDetail ─────────────── */
function DashboardDetail({ dashboard, onBack, onAddResource, onDeleteResource, onRename, clipboard, onCopy, onPaste }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);

  function handleExport() {
    const html = generateDashboardHtml(dashboard);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dashboard.title}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <button className="back-btn" onClick={onBack}>
        ← 목록으로
      </button>

      <div className="dashboard-detail-header">
        <div className="dashboard-detail-title">📚 {dashboard.title}</div>
        <div className="dashboard-detail-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowRenameModal(true)}>
            ✏️ 이름 변경
          </button>
          <button className="btn btn-success btn-sm" onClick={handleExport}>
            ⬇️ HTML 다운로드
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            + 자료 추가
          </button>
        </div>
      </div>

      {dashboard.resources.length === 0 && !clipboard ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>아직 자료가 없어요</h3>
          <p>링크나 PDF 파일을 추가해보세요</p>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + 자료 추가
          </button>
        </div>
      ) : (
        <div className="resource-grid">
          {dashboard.resources.map((r) => (
            <ResourceCard
              key={r.id}
              resource={r}
              onDelete={() => onDeleteResource(r.id)}
              onCopy={() => onCopy(r)}
              isCopied={clipboard?.id === r.id}
            />
          ))}
          {clipboard && (
            <button className="resource-card resource-card-paste" onClick={onPaste}>
              <div className="paste-icon">{clipboard.type === 'link' ? '🔗' : '📄'}</div>
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
        <AddResourceModal
          onClose={() => setShowAddModal(false)}
          onAdd={(resource) => onAddResource(resource)}
        />
      )}

      {showRenameModal && (
        <RenameModal
          dashboard={dashboard}
          onClose={() => setShowRenameModal(false)}
          onRename={onRename}
        />
      )}
    </div>
  );
}

/* ─────────────── DashboardList ─────────────── */
function DashboardList({ dashboards, onSelect, onCreate, onDelete, onRename }) {
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  return (
    <div>
      <div className="page-title">수업 자료 대시보드</div>
      <div className="page-subtitle">수업별로 자료를 정리하고 HTML로 내보내 USB에 담아가세요</div>

      <div className="dashboard-grid">
        {dashboards.map((d) => (
          <div key={d.id} className="dashboard-card" onClick={() => onSelect(d.id)}>
            <div className="dashboard-card-header">
              <span className="dashboard-card-icon">📚</span>
              <div className="dashboard-card-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className="btn-icon"
                  title="이름 변경"
                  onClick={() => onRename(d)}
                >✏️</button>
                <button
                  className="btn-icon"
                  title="삭제"
                  onClick={() => setConfirmDelete(d)}
                >🗑️</button>
              </div>
            </div>
            <div className="dashboard-card-title">{d.title}</div>
            <div className="dashboard-card-count">자료 {d.resources.length}개</div>
            <div className="dashboard-card-date">
              {new Date(d.createdAt).toLocaleDateString('ko-KR')}
            </div>
          </div>
        ))}

        <button className="dashboard-card dashboard-card-new" onClick={() => setShowCreate(true)}>
          <div className="new-icon">+</div>
          <span>새 대시보드</span>
        </button>
      </div>

      {showCreate && (
        <CreateDashboardModal
          onClose={() => setShowCreate(false)}
          onCreate={onCreate}
        />
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">대시보드 삭제</div>
            <p style={{ fontSize: 14, color: '#4a5568' }}>
              <strong>{confirmDelete.title}</strong>을(를) 삭제하시겠어요?<br />
              이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>취소</button>
              <button className="btn btn-danger" onClick={() => { onDelete(confirmDelete.id); setConfirmDelete(null); }}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── App ─────────────── */
export default function App() {
  const { dashboards, createDashboard, renameDashboard, deleteDashboard, addResource, deleteResource } = useDashboards();
  const [selectedId, setSelectedId] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [clipboard, setClipboard] = useState(null); // copied resource slot

  const selected = dashboards.find((d) => d.id === selectedId);

  return (
    <div className="app">
      <header className="header">
        <button className="header-title" onClick={() => setSelectedId(null)}>
          <span className="icon">🏫</span>
          <h1>ClassRoom Board</h1>
        </button>
        {clipboard && (
          <div className="clipboard-badge">
            <span>{clipboard.type === 'link' ? '🔗' : '📄'} <strong>{clipboard.title}</strong> 복사됨</span>
            <button onClick={() => setClipboard(null)}>✕</button>
          </div>
        )}
      </header>

      {selected ? (
        <DashboardDetail
          dashboard={selected}
          onBack={() => setSelectedId(null)}
          onAddResource={(r) => addResource(selected.id, r)}
          onDeleteResource={(rid) => deleteResource(selected.id, rid)}
          onRename={(title) => renameDashboard(selected.id, title)}
          clipboard={clipboard}
          onCopy={(r) => setClipboard(r)}
          onPaste={() => {
            const { id: _id, ...rest } = clipboard;
            addResource(selected.id, rest);
          }}
        />
      ) : (
        <DashboardList
          dashboards={dashboards}
          onSelect={setSelectedId}
          onCreate={(title) => {
            const id = createDashboard(title);
            setSelectedId(id);
          }}
          onDelete={deleteDashboard}
          onRename={setRenameTarget}
        />
      )}

      {renameTarget && (
        <RenameModal
          dashboard={renameTarget}
          onClose={() => setRenameTarget(null)}
          onRename={(title) => { renameDashboard(renameTarget.id, title); setRenameTarget(null); }}
        />
      )}
    </div>
  );
}
