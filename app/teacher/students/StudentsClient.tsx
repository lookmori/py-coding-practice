"use client";

import { useState, useEffect } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Student {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export default function StudentsClient() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createUsername, setCreateUsername] = useState("");
  const [createDisplayName, setCreateDisplayName] = useState("");
  const [createPassword, setCreatePassword] = useState("123456");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Reset password
  const [resetTarget, setResetTarget] = useState<Student | null>(null);
  const [resetPwd, setResetPwd] = useState("123456");
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  // Delete
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId: string; displayName: string }>({
    open: false, userId: "", displayName: "",
  });
  const [deleting, setDeleting] = useState(false);

  async function fetchStudents() {
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/students");
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchStudents(); }, []);

  const filtered = students.filter(s =>
    s.displayName.includes(search) || s.username.includes(search)
  );

  async function handleCreate() {
    setCreateError(null);
    if (!createUsername.trim() || !createDisplayName.trim() || !createPassword) {
      setCreateError("请填写所有必填字段"); return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/teacher/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: createUsername.trim(), displayName: createDisplayName.trim(), password: createPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error ?? "创建失败"); return; }
      setShowCreate(false);
      setCreateUsername(""); setCreateDisplayName(""); setCreatePassword("123456");
      fetchStudents();
    } finally {
      setCreating(false);
    }
  }

  async function handleResetPassword() {
    if (!resetTarget) return;
    setResetting(true);
    setResetMsg(null);
    try {
      const res = await fetch("/api/teacher/students/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resetTarget.id, password: resetPwd }),
      });
      if (res.ok) {
        setResetMsg(`已重置「${resetTarget.displayName}」的密码`);
        setResetTarget(null);
      }
    } finally {
      setResetting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/teacher/students/${deleteDialog.userId}`, { method: "DELETE" });
      setStudents(prev => prev.filter(s => s.id !== deleteDialog.userId));
      setDeleteDialog({ open: false, userId: "", displayName: "" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={deleteDialog.open}
        title={`删除学生「${deleteDialog.displayName}」`}
        description="此操作不可撤销，学生的考试和练习记录将被软删除。"
        confirmText={deleting ? "删除中..." : "确认删除"}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, userId: "", displayName: "" })}
      />

      {/* 操作栏 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-th-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜索姓名或账号..."
            className="w-full rounded-lg border border-th-border bg-th-bg pl-9 pr-4 py-2 text-sm text-th-text placeholder-th-muted focus:border-[#58a6ff] focus:outline-none" />
        </div>
        <button
          onClick={() => { setShowCreate(v => !v); setCreateError(null); }}
          className="flex items-center gap-1.5 rounded-lg bg-[#238636] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2ea043] transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          创建学生
        </button>
      </div>

      {/* 创建表单 */}
      {showCreate && (
        <div className="rounded-xl border border-[#388bfd]/30 bg-[#388bfd]/10 p-5 space-y-3">
          <p className="text-sm font-semibold text-[#58a6ff]">创建学生账号</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-th-text2 mb-1">
                账号
                <span className="ml-1 text-th-muted">（格式：{"{学校编号}_{用户名}"}）</span>
              </label>
              <input
                value={createUsername}
                onChange={e => setCreateUsername(e.target.value)}
                placeholder="例：SC01_student1"
                className="w-full rounded-lg border border-th-border bg-th-bg px-3 py-2 text-sm text-th-text font-mono placeholder-th-muted focus:border-[#58a6ff] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-th-text2 mb-1">显示名称</label>
              <input
                value={createDisplayName}
                onChange={e => setCreateDisplayName(e.target.value)}
                placeholder="例：张三"
                className="w-full rounded-lg border border-th-border bg-th-bg px-3 py-2 text-sm text-th-text placeholder-th-muted focus:border-[#58a6ff] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-th-text2 mb-1">初始密码</label>
              <input
                value={createPassword}
                onChange={e => setCreatePassword(e.target.value)}
                placeholder="至少6位"
                className="w-full rounded-lg border border-th-border bg-th-bg px-3 py-2 text-sm text-th-text placeholder-th-muted focus:border-[#58a6ff] focus:outline-none"
              />
            </div>
          </div>
          {createError && <p className="text-xs text-[#f85149]">{createError}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowCreate(false); setCreateError(null); }}
              className="rounded-lg border border-th-border bg-th-bg px-4 py-2 text-sm text-th-text2 hover:bg-th-hover">取消</button>
            <button onClick={handleCreate} disabled={creating}
              className="rounded-lg bg-[#238636] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2ea043] disabled:opacity-50">
              {creating ? "创建中..." : "创建"}
            </button>
          </div>
        </div>
      )}

      {/* 重置密码面板 */}
      {resetTarget && (
        <div className="rounded-xl border border-[#f78166]/30 bg-[#f78166]/10 p-4 space-y-3">
          <p className="text-sm font-semibold text-[#f78166]">重置「{resetTarget.displayName}」的密码</p>
          <div className="flex items-center gap-3">
            <input value={resetPwd} onChange={e => setResetPwd(e.target.value)}
              placeholder="新密码（至少 6 位）" type="text"
              className="flex-1 rounded-lg border border-th-border bg-th-bg px-3 py-2 text-sm text-th-text focus:border-[#f78166] focus:outline-none" />
            <button onClick={handleResetPassword} disabled={resetting || resetPwd.length < 6}
              className="rounded-lg bg-[#da3633] px-4 py-2 text-sm font-semibold text-white hover:bg-[#f85149] disabled:opacity-50">
              {resetting ? "重置中..." : "确认重置"}
            </button>
            <button onClick={() => setResetTarget(null)} className="rounded-lg border border-th-border bg-th-bg px-4 py-2 text-sm text-th-text2 hover:bg-th-hover">取消</button>
          </div>
        </div>
      )}

      {resetMsg && (
        <div className="rounded-lg border border-[#3fb950]/30 bg-[#3fb950]/10 px-4 py-3 text-sm text-[#3fb950] font-medium">
          ✓ {resetMsg}
        </div>
      )}

      {/* 学生表格 */}
      <div className="overflow-x-auto rounded-xl border border-th-border bg-th-card">
        <table className="w-full text-sm">
          <thead className="bg-th-bg2 border-b border-th-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-th-text2">姓名</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">账号</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">注册时间</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">最后登录</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-th-border">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-th-muted">加载中...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-th-muted">{search ? "未找到匹配学生" : "暂无学生"}</td></tr>
            ) : filtered.map(s => (
              <tr key={s.id} className="hover:bg-th-hover transition-colors">
                <td className="px-4 py-3 font-medium text-th-text">{s.displayName}</td>
                <td className="px-4 py-3 font-mono text-th-text2">{s.username}</td>
                <td className="px-4 py-3 text-th-muted text-xs">{new Date(s.createdAt).toLocaleDateString("zh-CN")}</td>
                <td className="px-4 py-3 text-th-muted text-xs">{s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleDateString("zh-CN") : "从未登录"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button onClick={() => { setResetTarget(s); setResetPwd("123456"); }}
                      className="text-[#e3b341] hover:text-[#f0c040] text-xs font-medium">重置密码</button>
                    <button onClick={() => setDeleteDialog({ open: true, userId: s.id, displayName: s.displayName })}
                      className="text-[#f85149] hover:text-[#ff7b72] text-xs font-medium">删除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="border-t border-th-border px-4 py-2.5 text-xs text-th-muted">共 {filtered.length} 名学生</div>
        )}
      </div>
    </div>
  );
}
