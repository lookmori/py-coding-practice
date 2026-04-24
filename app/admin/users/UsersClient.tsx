"use client";

import { useState, useEffect } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import Select from "@/components/Select";
import BulkImportPanel from "./BulkImportPanel";

interface User {
  id: string;
  displayName: string;
  username: string;
  role: string;
  schoolId: string | null;
  teacherId: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  school: { id: string; name: string; code: string } | null;
  teacher: { id: string; displayName: string; username: string } | null;
}

interface School {
  id: string;
  name: string;
  code: string;
}

interface Teacher {
  id: string;
  displayName: string;
  username: string;
  schoolId: string | null;
}

type RoleTab = "ALL" | "ADMIN" | "TEACHER" | "STUDENT";

const ROLE_TABS: { key: RoleTab; label: string }[] = [
  { key: "ALL", label: "全部" },
  { key: "ADMIN", label: "管理员" },
  { key: "TEACHER", label: "老师" },
  { key: "STUDENT", label: "学生" },
];

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  ADMIN: { label: "管理员", cls: "bg-[#bc8cff]/15 text-[#bc8cff]" },
  TEACHER: { label: "老师", cls: "bg-[#388bfd]/15 text-[#58a6ff]" },
  STUDENT: { label: "学生", cls: "bg-[#3fb950]/15 text-[#3fb950]" },
};

export default function UsersClient() {
  const [activeTab, setActiveTab] = useState<RoleTab>("ALL");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create user form
  const [showCreate, setShowCreate] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [createRole, setCreateRole] = useState<"TEACHER" | "STUDENT">("TEACHER");
  const [createUsername, setCreateUsername] = useState("");
  const [createDisplayName, setCreateDisplayName] = useState("");
  const [createPassword, setCreatePassword] = useState("123456");
  const [createSchoolId, setCreateSchoolId] = useState("");
  const [createTeacherId, setCreateTeacherId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Schools & teachers for student creation
  const [schools, setSchools] = useState<School[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  // Reset password
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [newPassword, setNewPassword] = useState("123456");
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);

  // Delete
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId: string; displayName: string }>({
    open: false, userId: "", displayName: "",
  });
  const [deleting, setDeleting] = useState(false);

  async function fetchUsers(tab: RoleTab) {
    setLoading(true);
    try {
      const url = tab === "ALL" ? "/api/admin/users" : `/api/admin/users?role=${tab}`;
      const res = await fetch(url);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(activeTab); }, [activeTab]);

  useEffect(() => {
    fetch("/api/admin/schools").then(r => r.json()).then(d => setSchools(Array.isArray(d) ? d : []));
    fetch("/api/admin/users?role=TEACHER").then(r => r.json()).then(d => setTeachers(Array.isArray(d) ? d : []));
  }, []);

  const filteredTeachers = createSchoolId
    ? teachers.filter(t => t.schoolId === createSchoolId)
    : teachers;

  const filteredUsers = users.filter(u =>
    u.displayName.includes(search) || u.username.includes(search)
  );

  function handleTabChange(tab: RoleTab) {
    setActiveTab(tab);
    setSelectedIds(new Set());
    setSearch("");
  }

  async function handleCreate() {
    setCreateError(null);
    if (!createSchoolId) {
      setCreateError("请选择学校"); return;
    }
    if (!createDisplayName.trim() || !createPassword) {
      setCreateError("请填写所有必填字段"); return;
    }
    if (createRole === "STUDENT" && !createTeacherId) {
      setCreateError("创建学生需要选择老师"); return;
    }
    setCreating(true);
    try {
      const body: Record<string, string> = {
        displayName: createDisplayName.trim(),
        password: createPassword,
        role: createRole,
        schoolId: createSchoolId,
      };
      if (createRole === "STUDENT") {
        body.teacherId = createTeacherId;
      }
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error ?? "创建失败"); return; }
      setShowCreate(false);
      setCreateDisplayName(""); setCreatePassword("123456");
      setCreateSchoolId(""); setCreateTeacherId("");
      fetchUsers(activeTab);
      if (createRole === "TEACHER") {
        fetch("/api/admin/users?role=TEACHER").then(r => r.json()).then(d => setTeachers(Array.isArray(d) ? d : []));
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleResetPassword() {
    if (selectedIds.size === 0 || !newPassword) return;
    setResetting(true);
    setResetResult(null);
    try {
      const res = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: Array.from(selectedIds), password: newPassword }),
      });
      const data = await res.json();
      setResetResult(`已成功重置 ${data.success} 个用户的密码`);
      setSelectedIds(new Set());
      setShowResetPwd(false);
    } finally {
      setResetting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/admin/users/${deleteDialog.userId}`, { method: "DELETE" });
      setUsers(prev => prev.filter(u => u.id !== deleteDialog.userId));
      setDeleteDialog({ open: false, userId: "", displayName: "" });
    } finally {
      setDeleting(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleSelectAll() {
    const selectable = filteredUsers.filter(u => u.role !== "ADMIN");
    if (selectedIds.size === selectable.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(selectable.map(u => u.id)));
  }

  const nonAdminFiltered = filteredUsers.filter(u => u.role !== "ADMIN");
  const allSelected = nonAdminFiltered.length > 0 && selectedIds.size === nonAdminFiltered.length;

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={deleteDialog.open}
        title={`删除用户「${deleteDialog.displayName}」`}
        description="此操作不可撤销，用户的考试和练习记录将被软删除。"
        confirmText={deleting ? "删除中..." : "确认删除"}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, userId: "", displayName: "" })}
      />

      {/* 角色过滤 Tab */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 border-b border-th-border">
          {ROLE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? "border-[#58a6ff] text-[#58a6ff]" : "border-transparent text-th-text2 hover:text-th-text"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowBulkImport(v => !v); setShowCreate(false); }}
            className="flex items-center gap-1.5 rounded-lg border border-th-border bg-th-bg px-4 py-2 text-sm font-medium text-th-text2 hover:bg-th-hover transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
            </svg>
            批量导入
          </button>
          <button
            onClick={() => { setShowCreate(v => !v); setShowBulkImport(false); setCreateError(null); }}
            className="flex items-center gap-1.5 rounded-lg bg-[#238636] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2ea043] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            创建用户
          </button>
        </div>
      </div>

      {/* 创建用户表单 */}
      {showCreate && (
        <div className="rounded-xl border border-[#388bfd]/30 bg-[#388bfd]/10 p-5 space-y-4">
          <p className="text-sm font-semibold text-[#58a6ff]">创建用户</p>
          {/* 角色选择：仅老师/学生 */}
          <div className="flex gap-3">
            {(["TEACHER", "STUDENT"] as const).map(r => (
              <button
                key={r}
                onClick={() => { setCreateRole(r); setCreateError(null); setCreateSchoolId(""); setCreateTeacherId(""); setCreateUsername(""); }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${createRole === r ? "border-[#58a6ff] bg-[#388bfd]/20 text-[#58a6ff]" : "border-th-border bg-th-bg text-th-text2 hover:bg-th-hover"}`}
              >
                {r === "TEACHER" ? "老师" : "学生"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 学校下拉（老师和学生都需要） */}
            <div>
              <label className="block text-xs text-th-text2 mb-1">所属学校</label>
              <Select
                value={createSchoolId}
                onChange={sid => {
                  setCreateSchoolId(sid);
                  setCreateTeacherId("");
                  const school = schools.find(s => s.id === sid);
                  setCreateUsername(school ? school.code + "_" : "");
                }}
                options={schools.map(s => ({ value: s.id, label: `${s.name}（${s.code}）` }))}
                placeholder="请选择学校"
              />
            </div>
            {/* 老师下拉（仅学生需要） */}
            {createRole === "STUDENT" && (
              <div>
                <label className="block text-xs text-th-text2 mb-1">所属老师</label>
                <Select
                  value={createTeacherId}
                  onChange={setCreateTeacherId}
                  options={filteredTeachers.map(t => ({ value: t.id, label: `${t.displayName}（${t.username}）` }))}
                  placeholder="请选择老师"
                  disabled={!createSchoolId}
                />
              </div>
            )}
            {/* 账号：自动生成，只展示格式说明 */}
            <div>
              <label className="block text-xs text-th-text2 mb-1">账号</label>
              <div className="w-full rounded-lg border border-th-border bg-th-bg2 px-3 py-2 text-sm font-mono text-th-muted">
                {createSchoolId
                  ? createRole === "TEACHER"
                    ? `${schools.find(s => s.id === createSchoolId)?.code ?? "XXXX"}LS** （自动生成）`
                    : `${schools.find(s => s.id === createSchoolId)?.code ?? "XXXX"}**** （自动生成）`
                  : "请先选择学校"}
              </div>
            </div>
            <div>
              <label className="block text-xs text-th-text2 mb-1">显示名称</label>
              <input
                value={createDisplayName}
                onChange={e => setCreateDisplayName(e.target.value)}
                placeholder={createRole === "TEACHER" ? "例：张老师" : "例：张三"}
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
            <button
              onClick={() => { setShowCreate(false); setCreateError(null); setCreateSchoolId(""); setCreateTeacherId(""); setCreateUsername(""); setCreateDisplayName(""); setCreatePassword("123456"); }}
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

      {/* 批量导入面板 */}
      {showBulkImport && (
        <div className="rounded-xl border border-th-border bg-th-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-th-text">批量导入用户</p>
            <button onClick={() => setShowBulkImport(false)} className="text-th-muted hover:text-th-text">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <BulkImportPanel onSuccess={() => { fetchUsers(activeTab); }} />
        </div>
      )}

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
        {selectedIds.size > 0 && (
          <button onClick={() => setShowResetPwd(true)}
            className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors">
            重置密码（{selectedIds.size}）
          </button>
        )}
      </div>

      {/* 重置密码面板 */}
      {showResetPwd && (
        <div className="rounded-xl border border-[#f78166]/30 bg-[#f78166]/10 p-4 space-y-3">
          <p className="text-sm font-semibold text-[#f78166]">批量重置密码 — 已选 {selectedIds.size} 个用户</p>
          <div className="flex items-center gap-3">
            <input value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="新密码（至少 6 位）" type="text"
              className="flex-1 rounded-lg border border-th-border bg-th-bg px-3 py-2 text-sm text-th-text focus:border-[#f78166] focus:outline-none" />
            <button onClick={handleResetPassword} disabled={resetting || !newPassword || newPassword.length < 6}
              className="rounded-lg bg-[#da3633] px-4 py-2 text-sm font-semibold text-white hover:bg-[#f85149] disabled:opacity-50">
              {resetting ? "重置中..." : "确认重置"}
            </button>
            <button onClick={() => setShowResetPwd(false)} className="rounded-lg border border-th-border bg-th-bg px-4 py-2 text-sm text-th-text2 hover:bg-th-hover">取消</button>
          </div>
        </div>
      )}

      {resetResult && (
        <div className="rounded-lg border border-[#3fb950]/30 bg-[#3fb950]/10 px-4 py-3 text-sm text-[#3fb950] font-medium">
          ✓ {resetResult}
        </div>
      )}

      {/* 用户表格 */}
      <div className="overflow-x-auto rounded-xl border border-th-border bg-th-card">
        <table className="w-full text-sm">
          <thead className="bg-th-bg2 border-b border-th-border">
            <tr>
              <th className="px-4 py-3 text-left w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="rounded border-th-border" />
              </th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">姓名</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">账号</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">角色</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">所属学校</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">所属老师</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">注册时间</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">最后登录</th>
              <th className="px-4 py-3 text-left font-medium text-th-text2">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-th-border">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-th-muted">加载中...</td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-th-muted">
                  {search ? "未找到匹配用户" : "暂无用户"}
                </td>
              </tr>
            ) : filteredUsers.map(u => {
              const badge = ROLE_BADGE[u.role] ?? { label: u.role, cls: "bg-th-hover text-th-text2" };
              return (
                <tr key={u.id} className={`hover:bg-th-hover transition-colors ${selectedIds.has(u.id) ? "bg-[#388bfd]/10" : ""}`}>
                  <td className="px-4 py-3">
                    {u.role !== "ADMIN" && (
                      <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggleSelect(u.id)} className="rounded border-th-border" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-th-text">{u.displayName}</td>
                  <td className="px-4 py-3 font-mono text-th-text2 text-xs">{u.username}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {u.school ? (
                      <span className="text-th-text2">
                        {u.school.name}
                        <span className="ml-1 font-mono text-th-muted">({u.school.code})</span>
                      </span>
                    ) : (
                      <span className="text-th-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {u.teacher ? (
                      <span className="text-th-text2">
                        {u.teacher.displayName}
                        <span className="ml-1 font-mono text-th-muted">({u.teacher.username})</span>
                      </span>
                    ) : (
                      <span className="text-th-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-th-muted text-xs">{new Date(u.createdAt).toLocaleDateString("zh-CN")}</td>
                  <td className="px-4 py-3 text-th-muted text-xs">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("zh-CN") : "从未登录"}
                  </td>
                  <td className="px-4 py-3">
                    {u.role !== "ADMIN" && (
                      <button
                        onClick={() => setDeleteDialog({ open: true, userId: u.id, displayName: u.displayName })}
                        className="text-[#f85149] hover:text-[#ff7b72] text-xs font-medium"
                      >
                        删除
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredUsers.length > 0 && (
          <div className="border-t border-th-border px-4 py-2.5 text-xs text-th-muted">
            共 {filteredUsers.length} 个用户
            {selectedIds.size > 0 && <span className="ml-2 text-[#58a6ff] font-medium">已选 {selectedIds.size} 个</span>}
          </div>
        )}
      </div>
    </div>
  );
}
