"use client";

import { useState } from "react";

interface School {
  id: string;
  name: string;
  code: string;
  teacherCount: number;
  studentCount: number;
  createdAt: string;
}

interface Props {
  schools: School[];
}

export default function SchoolsClient({ schools: initialSchools }: Props) {
  const [schools, setSchools] = useState(initialSchools);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createCode, setCreateCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const SCHOOL_CODE_REGEX = /^[A-Za-z0-9]{4}$/;

  async function handleCreate() {
    setCreateError(null);
    if (!createName.trim()) { setCreateError("请输入学校名称"); return; }
    if (!SCHOOL_CODE_REGEX.test(createCode)) { setCreateError("学校编号必须为4位字母数字"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName.trim(), code: createCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error ?? "创建失败"); return; }
      setSchools(prev => [{ ...data, teacherCount: 0, studentCount: 0 }, ...prev]);
      setShowCreate(false);
      setCreateName("");
      setCreateCode("");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(school: School) {
    setEditingId(school.id);
    setEditName(school.name);
    setEditError(null);
  }

  async function handleSaveEdit(school: School) {
    setEditError(null);
    if (!editName.trim()) { setEditError("学校名称不能为空"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/schools/${school.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setEditError(data.error ?? "保存失败"); return; }
      setSchools(prev => prev.map(s => s.id === school.id ? { ...s, name: editName.trim() } : s));
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 操作栏 */}
      <div className="flex justify-end">
        <button
          onClick={() => { setShowCreate(v => !v); setCreateError(null); }}
          className="flex items-center gap-1.5 rounded-lg bg-[#238636] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2ea043] transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建学校
        </button>
      </div>

      {/* 创建表单 */}
      {showCreate && (
        <div className="rounded-xl border border-[#388bfd]/30 bg-[#388bfd]/10 p-5 space-y-3">
          <p className="text-sm font-semibold text-[#58a6ff]">新建学校</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-th-text2 mb-1">学校名称</label>
              <input
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                placeholder="例：第一中学"
                className="w-full rounded-lg border border-th-border bg-th-bg px-3 py-2 text-sm text-th-text placeholder-th-muted focus:border-[#58a6ff] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-th-text2 mb-1">学校编号（4位字母数字）</label>
              <input
                value={createCode}
                onChange={e => setCreateCode(e.target.value.toUpperCase())}
                placeholder="例：SC01"
                maxLength={4}
                className="w-full rounded-lg border border-th-border bg-th-bg px-3 py-2 text-sm text-th-text font-mono placeholder-th-muted focus:border-[#58a6ff] focus:outline-none"
              />
            </div>
          </div>
          {createError && (
            <p className="text-xs text-[#f85149]">{createError}</p>
          )}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowCreate(false); setCreateName(""); setCreateCode(""); setCreateError(null); }}
              className="rounded-lg border border-th-border bg-th-bg px-4 py-2 text-sm text-th-text2 hover:bg-th-hover"
            >
              取消
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="rounded-lg bg-[#238636] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2ea043] disabled:opacity-50"
            >
              {creating ? "创建中..." : "创建"}
            </button>
          </div>
        </div>
      )}

      {/* 学校表格 */}
      <div className="overflow-x-auto rounded-xl border border-th-border bg-th-card">
        <table className="w-full text-sm">
          <thead className="bg-th-bg2 border-b border-th-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-th-text2">学校名称</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">编号</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">老师数</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">学生数</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">创建时间</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-th-border">
            {schools.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-th-muted">暂无学校</td>
              </tr>
            )}
            {schools.map(school => (
              <tr key={school.id} className="hover:bg-th-hover transition-colors">
                <td className="px-4 py-3 font-medium text-th-text">
                  {editingId === school.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="rounded-lg border border-[#58a6ff] bg-th-bg px-2 py-1 text-sm text-th-text focus:outline-none"
                        autoFocus
                        onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(school); if (e.key === "Escape") setEditingId(null); }}
                      />
                      {editError && <span className="text-xs text-[#f85149]">{editError}</span>}
                    </div>
                  ) : (
                    school.name
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-th-text2">{school.code}</td>
                <td className="px-4 py-3 text-th-text2">{school.teacherCount}</td>
                <td className="px-4 py-3 text-th-text2">{school.studentCount}</td>
                <td className="px-4 py-3 text-th-muted text-xs">{new Date(school.createdAt).toLocaleDateString("zh-CN")}</td>
                <td className="px-4 py-3">
                  {editingId === school.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(school)}
                        disabled={saving}
                        className="text-[#3fb950] hover:text-[#56d364] text-xs font-medium disabled:opacity-50"
                      >
                        {saving ? "保存中..." : "保存"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-th-muted hover:text-th-text2 text-xs"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(school)}
                      className="text-[#58a6ff] hover:text-[#79c0ff] text-xs font-medium"
                    >
                      修改名称
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {schools.length > 0 && (
          <div className="border-t border-th-border px-4 py-2.5 text-xs text-th-muted">
            共 {schools.length} 所学校
          </div>
        )}
      </div>
    </div>
  );
}
