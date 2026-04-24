"use client";

import { useState, useRef } from "react";
import { truncateContent } from "@/lib/utils";
import ConfirmDialog from "@/components/ConfirmDialog";
import ImageUploadPanel from "./ImageUploadPanel";

type BankType = "EXAM" | "PRACTICE";

interface Bank {
  id: string;
  name: string;
  type: BankType;
  description: string | null;
  durationSecs: number;
  isActive: boolean;
  createdAt: string;
  questionCount: number;
  scheduledAt?: string | null;
  endAt?: string | null;
}

interface Question {
  id: string;
  type: string;
  category: string;
  content: string;
}

interface Props {
  banks: Bank[];
  questions: Question[];
}

const TYPE_LABEL: Record<BankType, string> = { EXAM: "考试", PRACTICE: "练习" };
const TYPE_COLOR: Record<BankType, string> = {
  EXAM: "bg-[#f78166]/15 text-[#f78166]",
  PRACTICE: "bg-[#388bfd]/15 text-[#58a6ff]",
};
const Q_TYPE_LABEL: Record<string, string> = { MCQ: "单选", TFQ: "判断", CODING: "编程" };
const Q_TYPE_COLOR: Record<string, string> = {
  MCQ: "bg-[#388bfd]/15 text-[#58a6ff]",
  TFQ: "bg-[#3fb950]/15 text-[#3fb950]",
  CODING: "bg-[#bc8cff]/15 text-[#bc8cff]",
};

function formatDuration(secs: number) {
  if (!secs) return "—";
  return `${Math.floor(secs / 60)} 分钟`;
}

// 示例 JSON 数据（纯合法 JSON，含说明字段）
const EXAM_SAMPLE_JSON = JSON.stringify([
  {
    "_说明": "单选题示例 - type固定为MCQ",
    "type": "MCQ",
    "category": "基础语法",
    "content": "Python 中用于定义函数的关键字是？",
    "optionA": "func",
    "optionB": "def",
    "optionC": "function",
    "optionD": "define",
    "correctAnswer": "B",
    "_correctAnswer说明": "MCQ正确答案只能是 A / B / C / D"
  },
  {
    "_说明": "判断题示例 - type固定为TFQ",
    "type": "TFQ",
    "category": "数据类型",
    "content": "Python 中字符串（str）是不可变类型。",
    "correctAnswer": "true",
    "_correctAnswer说明": "TFQ正确答案只能是 true（正确）或 false（错误）"
  },
  {
    "_说明": "编程题示例 - type固定为CODING",
    "type": "CODING",
    "category": "算法",
    "content": "实现一个函数计算列表中所有元素的和",
    "description": "请编写函数 `sum_list(lst)`，返回列表所有元素之和。\n\n**示例：**\n- sum_list([1, 2, 3]) → 6\n- sum_list([]) → 0",
    "_description说明": "CODING必填：详细题目描述，支持Markdown格式",
    "correctAnswer": "def sum_list(lst):\n    return sum(lst)",
    "_correctAnswer说明": "CODING参考答案：填写标准Python代码",
    "scoringCriteria": "1. 函数定义正确（2分）\n2. 处理空列表（3分）\n3. 返回值正确（5分）\n满分：10分",
    "_scoringCriteria说明": "CODING必填：评分标准，供管理员手动评分参考"
  },
  {
    "_说明": "以下是字段完整说明（此条目导入时会被跳过，因为缺少type/content/category）",
    "_type可选值": "MCQ=单选题 | TFQ=判断题 | CODING=编程题",
    "_category示例": "基础语法 | 数据类型 | 控制流 | 函数 | 面向对象 | 算法 | 数据结构",
    "_MCQ必填字段": "type, category, content, optionA, optionB, optionC, optionD, correctAnswer(A/B/C/D)",
    "_TFQ必填字段": "type, category, content, correctAnswer(true/false)",
    "_CODING必填字段": "type, category, content, description, correctAnswer, scoringCriteria",
    "_注意": "以_开头的字段为说明字段，导入时自动忽略，不影响正常导入"
  }
], null, 2);

const PRACTICE_SAMPLE_JSON = JSON.stringify([
  {
    "_说明": "编程题示例 - 练习题库只支持编程题（CODING）",
    "type": "CODING",
    "category": "算法",
    "content": "实现一个函数计算列表中所有元素的和",
    "description": "请编写函数 `sum_list(lst)`，返回列表所有元素之和。\n\n**示例：**\n- sum_list([1, 2, 3]) → 6\n- sum_list([]) → 0",
    "_description说明": "必填：详细题目描述，支持Markdown格式",
    "correctAnswer": "def sum_list(lst):\n    return sum(lst)",
    "_correctAnswer说明": "参考答案：填写标准Python代码，供教师批改参考",
    "scoringCriteria": "1. 函数定义正确（2分）\n2. 处理空列表（3分）\n3. 返回值正确（5分）\n满分：10分",
    "_scoringCriteria说明": "必填：评分标准，供教师手动批改参考"
  },
  {
    "_说明": "第二道编程题示例",
    "type": "CODING",
    "category": "字符串",
    "content": "实现一个函数判断字符串是否为回文",
    "description": "请编写函数 `is_palindrome(s)`，判断字符串 s 是否为回文（正读反读相同）。\n\n**示例：**\n- is_palindrome('racecar') → True\n- is_palindrome('hello') → False",
    "correctAnswer": "def is_palindrome(s):\n    return s == s[::-1]",
    "scoringCriteria": "1. 函数定义正确（2分）\n2. 逻辑正确（5分）\n3. 处理空字符串（3分）\n满分：10分"
  },
  {
    "_说明": "字段说明（此条目导入时会被跳过）",
    "_type说明": "练习题库只支持 CODING（编程题），MCQ/TFQ 会被自动跳过",
    "_必填字段": "type, category, content, description, correctAnswer, scoringCriteria",
    "_category示例": "基础语法 | 数据类型 | 控制流 | 函数 | 面向对象 | 算法 | 数据结构 | 字符串",
    "_注意": "以_开头的字段为说明字段，导入时自动忽略，不影响正常导入"
  }
], null, 2);

export default function BankManagerClient({ banks: initialBanks }: Props) {
  const [banks, setBanks] = useState(initialBanks);
  const [activeTab, setActiveTab] = useState<BankType>("EXAM");
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; skipped: number; errors: { index: number; reason: string }[] } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState({ name: "", type: activeTab, description: "", durationSecs: "5400", scheduledAt: "", endAt: "" });
  const [creating, setCreating] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [loadingBankQ, setLoadingBankQ] = useState(false);
  const [qPage, setQPage] = useState(1);
  const Q_PAGE_SIZE = 20;

  function downloadSample() {
    const isPractice = selectedBank?.type === "PRACTICE" || activeTab === "PRACTICE";
    const json = isPractice ? PRACTICE_SAMPLE_JSON : EXAM_SAMPLE_JSON;
    const filename = isPractice ? "练习题导入示例_coding_sample.json" : "考试题导入示例_questions_sample.json";
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 编辑时间面板
  const [showEditSchedule, setShowEditSchedule] = useState(false);
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [editEndAt, setEditEndAt] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);

  // 确认弹窗状态
  const [dialog, setDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
    onConfirm: () => void;
  }>({ open: false, title: "", onConfirm: () => {} });

  function openDialog(title: string, description: string, onConfirm: () => void) {
    setDialog({ open: true, title, description, onConfirm });
  }
  function closeDialog() {
    setDialog(d => ({ ...d, open: false }));
  }

  const filteredBanks = banks.filter(b => b.type === activeTab);

  // ── 新建题库组 ──────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type || activeTab,
          description: form.description || null,
          durationSecs: parseInt(form.durationSecs) || 5400,
          scheduledAt: form.scheduledAt || null,
          endAt: form.endAt || null,
        }),
      });
      if (res.ok) {
        const newBank = await res.json();
        // 直接更新本地 state，立即显示新建的题库组
        const bankWithCount: Bank = { ...newBank, questionCount: 0 };
        setBanks(prev => [bankWithCount, ...prev]);
        setShowCreateForm(false);
        setForm({ name: "", type: activeTab, description: "", durationSecs: "5400", scheduledAt: "", endAt: "" });
        // 自动选中新建的题库组
        setSelectedBank(bankWithCount);
        setBankQuestions([]);
        setImportResult(null);
      }
    } finally {
      setCreating(false);
    }
  }

  // ── 保存考试时间 ──────────────────────────────────────────────────────────
  async function handleSaveSchedule() {
    if (!selectedBank) return;
    setSavingSchedule(true);
    try {
      const res = await fetch(`/api/admin/banks/${selectedBank.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: editScheduledAt || null,
          endAt: editEndAt || null,
        }),
      });
      if (res.ok) {
        const updated = {
          ...selectedBank,
          scheduledAt: editScheduledAt || null,
          endAt: editEndAt || null,
        };
        setBanks(prev => prev.map(b => b.id === selectedBank.id ? updated : b));
        setSelectedBank(updated);
        setShowEditSchedule(false);
      }
    } finally {
      setSavingSchedule(false);
    }
  }

  // ── 切换启用/停用 ────────────────────────────────────────────────────────
  async function handleToggleActive(bank: Bank) {
    const res = await fetch(`/api/admin/banks/${bank.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !bank.isActive }),
    });
    if (res.ok) {
      const updated = { ...bank, isActive: !bank.isActive };
      setBanks(prev => prev.map(b => b.id === bank.id ? updated : b));
      if (selectedBank?.id === bank.id) setSelectedBank(updated);
    }
  }

  // ── 删除题库组 ────────────────────────────────────────────────────────────
  async function handleDeleteBank(bank: Bank) {
    openDialog(
      `删除题库组「${bank.name}」`,
      "此操作不可撤销，题库组内的关联关系将一并删除。",
      async () => {
        closeDialog();
        const res = await fetch(`/api/admin/banks/${bank.id}`, { method: "DELETE" });
        if (res.ok) {
          setBanks(prev => prev.filter(b => b.id !== bank.id));
          if (selectedBank?.id === bank.id) { setSelectedBank(null); setBankQuestions([]); }
        }
      }
    );
  }

  // ── 导入题目 ──────────────────────────────────────────────────────────────
  async function handleImportQuestions(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedBank) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      let json: unknown;
      try { json = JSON.parse(text); } catch {
        setImportResult({ success: 0, skipped: 0, errors: [{ index: -1, reason: "JSON 格式错误，请检查文件内容" }] });
        return;
      }
      if (!Array.isArray(json)) {
        setImportResult({ success: 0, skipped: 0, errors: [{ index: -1, reason: "文件格式错误：根节点必须是数组 []" }] });
        return;
      }
      const res = await fetch(`/api/admin/banks/${selectedBank.id}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      setImportResult(data);
      if (data.success > 0) {
        const qRes = await fetch(`/api/admin/banks/${selectedBank.id}/questions`);
        const qData = await qRes.json();
        setBankQuestions(qData.questions ?? []);
        const newCount = qData.questions?.length ?? 0;
        setBanks(prev => prev.map(b => b.id === selectedBank.id ? { ...b, questionCount: newCount } : b));
        setSelectedBank(prev => prev ? { ...prev, questionCount: newCount } : prev);
        setQPage(1);
      }
    } catch {
      setImportResult({ success: 0, skipped: 0, errors: [{ index: -1, reason: "文件读取失败，请重试" }] });
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = "";
    }
  }

  // ── 移除题目 ──────────────────────────────────────────────────────────────
  async function handleDeleteQuestion(questionId: string) {
    if (!selectedBank) return;
    openDialog(
      "移除题目",
      "确认从该题库组移除此题目？题目本身不会被删除。",
      async () => {
        closeDialog();
        const res = await fetch(`/api/admin/banks/${selectedBank.id}/questions/${questionId}`, { method: "DELETE" });
        if (res.ok) {
          setBankQuestions(prev => prev.filter(q => q.id !== questionId));
          const newCount = bankQuestions.length - 1;
          setBanks(prev => prev.map(b => b.id === selectedBank.id ? { ...b, questionCount: newCount } : b));
          setSelectedBank(prev => prev ? { ...prev, questionCount: newCount } : prev);
        }
      }
    );
  }

  // ── 选中题库组 ────────────────────────────────────────────────────────────
  async function selectBank(bank: Bank) {
    setSelectedBank(bank);
    setImportResult(null);
    setQPage(1);
    setLoadingBankQ(true);
    try {
      const res = await fetch(`/api/admin/banks/${bank.id}/questions`);
      const data = await res.json();
      setBankQuestions(data.questions ?? []);
    } finally {
      setLoadingBankQ(false);
    }
  }

  return (
    <div className="flex gap-6 min-h-[600px]">
      <ConfirmDialog
        open={dialog.open}
        title={dialog.title}
        description={dialog.description}
        confirmText="确认删除"
        onConfirm={dialog.onConfirm}
        onCancel={closeDialog}
      />
      {/* 左侧：题库组列表 */}
      <div className="w-72 shrink-0">
        {/* Tab */}
        <div className="flex mb-3 rounded-lg overflow-hidden border border-th-border">
          {(["EXAM", "PRACTICE"] as BankType[]).map(t => (
            <button key={t}
              onClick={() => { setActiveTab(t); setSelectedBank(null); setBankQuestions([]); setForm(f => ({ ...f, type: t })); setShowCreateForm(false); }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTab === t ? "bg-[#388bfd]/15 text-[#58a6ff]" : "bg-th-bg2 text-th-text2 hover:bg-th-hover"}`}>
              {TYPE_LABEL[t]}题库
            </button>
          ))}
        </div>

        {/* 新建按钮 */}
        <button onClick={() => setShowCreateForm(v => !v)}
          className="w-full mb-3 rounded-lg border-2 border-dashed border-th-border py-2.5 text-sm font-medium text-th-text2 hover:border-[#58a6ff]/50 hover:text-[#58a6ff] transition-colors">
          + 新建{TYPE_LABEL[activeTab]}题库组
        </button>

        {/* 新建表单 */}
        {showCreateForm && (
          <div className="mb-3 rounded-xl border border-[#388bfd]/30 bg-[#388bfd]/10 p-4 space-y-3">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="题库组名称（必填）"
              className="w-full rounded-lg border border-th-border bg-th-bg px-3 py-2 text-sm text-th-text placeholder-th-muted focus:border-[#58a6ff] focus:outline-none" />
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="简介（可选）"
              className="w-full rounded-lg border border-th-border bg-th-bg px-3 py-2 text-sm text-th-text placeholder-th-muted focus:border-[#58a6ff] focus:outline-none" />
            {activeTab === "EXAM" && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-th-text2 shrink-0">时长（分钟）</label>
                  <input type="number"
                    value={Math.floor(parseInt(form.durationSecs || "5400") / 60)}
                    onChange={e => setForm(f => ({ ...f, durationSecs: String(parseInt(e.target.value || "90") * 60) }))}
                    className="w-full rounded-lg border border-th-border bg-th-bg px-3 py-2 text-sm text-th-text focus:border-[#58a6ff] focus:outline-none" min={1} />
                </div>
                <div>
                  <label className="block text-xs text-th-text2 mb-1">开始时间（可选）</label>
                  <input type="datetime-local"
                    value={form.scheduledAt}
                    onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                    className="w-full rounded-lg border border-th-border bg-th-bg px-3 py-2 text-sm text-th-text focus:border-[#58a6ff] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-th-text2 mb-1">截止时间（可选）</label>
                  <input type="datetime-local"
                    value={form.endAt}
                    onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))}
                    className="w-full rounded-lg border border-th-border bg-th-bg px-3 py-2 text-sm text-th-text focus:border-[#58a6ff] focus:outline-none" />
                </div>
              </>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowCreateForm(false)} className="flex-1 rounded-lg border border-th-border bg-th-bg py-2 text-xs text-th-text2 hover:bg-th-hover">取消</button>
              <button onClick={handleCreate} disabled={creating || !form.name.trim()}
                className="flex-1 rounded-lg bg-[#238636] py-2 text-xs font-semibold text-white hover:bg-[#2ea043] disabled:opacity-50">
                {creating ? "创建中..." : "创建"}
              </button>
            </div>
          </div>
        )}

        {/* 题库组列表 */}
        <div className="space-y-2">
          {filteredBanks.length === 0 && (
            <p className="text-center text-sm text-th-muted py-8">暂无{TYPE_LABEL[activeTab]}题库组</p>
          )}
          {filteredBanks.map(bank => (
            <div key={bank.id} onClick={() => selectBank(bank)}
              className={`cursor-pointer rounded-xl border p-3 transition-all ${selectedBank?.id === bank.id ? "border-[#58a6ff]/50 bg-[#388bfd]/10" : "border-th-border bg-th-card hover:border-th-text2/30"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-th-text truncate">{bank.name}</p>
                  {bank.description && <p className="text-xs text-th-muted mt-0.5 truncate">{bank.description}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${bank.isActive ? "bg-[#3fb950]/15 text-[#3fb950]" : "bg-th-hover text-th-muted"}`}>
                  {bank.isActive ? "启用" : "停用"}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-th-muted">
                <span>{bank.questionCount} 道题</span>
                {bank.type === "EXAM" && <span>⏱ {formatDuration(bank.durationSecs)}</span>}
                <span>{new Date(bank.createdAt).toLocaleDateString("zh-CN")}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧：题库组详情 */}
      <div className="flex-1 min-w-0">
        {!selectedBank ? (
          <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-th-border">
            <div className="text-center text-th-muted">
              <p className="text-4xl mb-3">📚</p>
              <p className="text-sm">选择左侧题库组查看详情</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 题库组信息头 */}
            <div className="rounded-xl border border-th-border bg-th-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_COLOR[selectedBank.type]}`}>
                      {TYPE_LABEL[selectedBank.type]}
                    </span>
                    <h2 className="text-lg font-bold text-th-text">{selectedBank.name}</h2>
                  </div>
                  {selectedBank.description && <p className="text-sm text-th-text2">{selectedBank.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-th-muted">
                    <span>{selectedBank.questionCount} 道题</span>
                    {selectedBank.type === "EXAM" && <span>⏱ {formatDuration(selectedBank.durationSecs)}</span>}
                    <span>创建于 {new Date(selectedBank.createdAt).toLocaleDateString("zh-CN")}</span>
                    {selectedBank.scheduledAt && (
                      <span className="text-[#e3b341]">🗓 开始：{new Date(selectedBank.scheduledAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    )}
                    {selectedBank.endAt && (
                      <span className="text-[#f85149]">⏰ 截止：{new Date(selectedBank.endAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  {selectedBank.type === "EXAM" && (
                    <button
                      onClick={() => {
                        setEditScheduledAt(selectedBank.scheduledAt ? new Date(selectedBank.scheduledAt).toISOString().slice(0, 16) : "");
                        setEditEndAt(selectedBank.endAt ? new Date(selectedBank.endAt).toISOString().slice(0, 16) : "");
                        setShowEditSchedule(v => !v);
                      }}
                      className="rounded-lg border border-[#e3b341]/40 bg-[#e3b341]/10 px-3 py-1.5 text-xs font-medium text-[#e3b341] hover:bg-[#e3b341]/20 transition-colors"
                    >
                      🗓 设置时间
                    </button>
                  )}
                  <button onClick={() => handleToggleActive(selectedBank)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${selectedBank.isActive ? "bg-th-hover text-th-text2 hover:bg-th-border" : "bg-[#3fb950]/15 text-[#3fb950] hover:bg-[#3fb950]/25"}`}>
                    {selectedBank.isActive ? "停用" : "启用"}
                  </button>
                  <button onClick={() => handleDeleteBank(selectedBank)}
                    className="rounded-lg bg-[#f85149]/10 px-3 py-1.5 text-xs font-medium text-[#f85149] hover:bg-[#f85149]/20">
                    删除组
                  </button>
                </div>
              </div>

              {/* 时间编辑面板 */}
              {showEditSchedule && selectedBank.type === "EXAM" && (
                <div className="mt-4 pt-4 border-t border-th-border space-y-3">
                  <p className="text-xs font-semibold text-th-text2">设置考试时间窗口</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-th-muted mb-1">开始时间（留空 = 立即可用）</label>
                      <input type="datetime-local"
                        value={editScheduledAt}
                        onChange={e => setEditScheduledAt(e.target.value)}
                        className="w-full rounded-lg border border-th-border bg-th-bg px-3 py-2 text-sm text-th-text focus:border-[#58a6ff] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-th-muted mb-1">截止时间（留空 = 无截止）</label>
                      <input type="datetime-local"
                        value={editEndAt}
                        onChange={e => setEditEndAt(e.target.value)}
                        className="w-full rounded-lg border border-th-border bg-th-bg px-3 py-2 text-sm text-th-text focus:border-[#58a6ff] focus:outline-none" />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowEditSchedule(false)}
                      className="rounded-lg border border-th-border bg-th-bg px-3 py-1.5 text-xs text-th-text2 hover:bg-th-hover">
                      取消
                    </button>
                    <button onClick={handleSaveSchedule} disabled={savingSchedule}
                      className="rounded-lg bg-[#238636] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2ea043] disabled:opacity-50">
                      {savingSchedule ? "保存中..." : "保存"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 题目列表 */}
            <div className="rounded-xl border border-th-border bg-th-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-th-text">
                  题目列表
                  {bankQuestions.length > 0 && <span className="ml-2 text-xs text-th-muted">共 {bankQuestions.length} 道</span>}
                </h3>
                <div className="flex items-center gap-2">
                  {/* 下载示例 */}
                  <button onClick={downloadSample}
                    className="flex items-center gap-1 rounded-lg border border-th-border bg-th-bg px-3 py-1.5 text-xs font-medium text-th-text2 hover:bg-th-hover transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    下载示例
                  </button>
                  {/* 导入 */}
                  <label className={`cursor-pointer flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors ${importing ? "bg-[#238636]/60 cursor-not-allowed" : "bg-[#238636] hover:bg-[#2ea043]"}`}>
                    {importing ? (
                      <>
                        <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        导入中...
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                        </svg>
                        导入 JSON
                      </>
                    )}
                    <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportQuestions} disabled={importing} />
                  </label>
                </div>
              </div>

              {importResult && (
                <div className={`mb-3 rounded-lg border p-3 text-xs ${(importResult.errors?.length ?? 0) > 0 ? "border-[#f78166]/30 bg-[#f78166]/10 text-[#f78166]" : "border-[#3fb950]/30 bg-[#3fb950]/10 text-[#3fb950]"}`}>
                  <p className="font-medium">
                    导入结果：成功 <span className="font-bold">{importResult.success}</span> 条，跳过 {importResult.skipped ?? 0} 条
                  </p>
                  {(importResult.errors?.length ?? 0) > 0 && (
                    <ul className="mt-1 space-y-0.5 max-h-20 overflow-auto">
                      {importResult.errors.map((e, i) => <li key={i}>第 {e.index + 1} 条：{e.reason}</li>)}
                    </ul>
                  )}
                </div>
              )}

              {loadingBankQ ? (
                <div className="flex items-center justify-center py-8">
                  <svg className="h-6 w-6 animate-spin text-[#58a6ff]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              ) : bankQuestions.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-th-border py-10 text-center">
                  <p className="text-2xl mb-2">📄</p>
                  <p className="text-sm text-th-muted mb-2">暂无题目</p>
                  <p className="text-xs text-th-muted">点击「下载示例」查看 JSON 格式，再点击「导入 JSON」上传题目</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border border-th-border">
                    <table className="w-full text-sm">
                      <thead className="bg-th-bg2 text-xs text-th-text2">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium w-14">类型</th>
                          <th className="px-3 py-2 text-left font-medium w-20">分类</th>
                          <th className="px-3 py-2 text-left font-medium">题目内容</th>
                          <th className="px-3 py-2 text-left font-medium w-14">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-th-border">
                        {bankQuestions.slice((qPage - 1) * Q_PAGE_SIZE, qPage * Q_PAGE_SIZE).map(q => (
                          <tr key={q.id} className="hover:bg-th-hover transition-colors">
                            <td className="px-3 py-2.5">
                              <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${Q_TYPE_COLOR[q.type] ?? "bg-th-hover text-th-text2"}`}>
                                {Q_TYPE_LABEL[q.type] ?? q.type}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-th-text2 text-xs">{q.category}</td>
                            <td className="px-3 py-2.5 text-th-text text-xs">{truncateContent(q.content, 60)}</td>
                            <td className="px-3 py-2.5">
                              <button onClick={() => handleDeleteQuestion(q.id)} className="text-[#f85149] hover:text-[#ff7b72] text-xs">移除</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* 分页 */}
                  {Math.ceil(bankQuestions.length / Q_PAGE_SIZE) > 1 && (
                    <div className="flex items-center justify-between mt-3 text-xs text-th-muted">
                      <span>{(qPage - 1) * Q_PAGE_SIZE + 1}–{Math.min(qPage * Q_PAGE_SIZE, bankQuestions.length)} / 共 {bankQuestions.length} 道</span>
                      <div className="flex gap-1">
                        <button disabled={qPage <= 1} onClick={() => setQPage(p => p - 1)}
                          className="px-2 py-1 rounded border border-th-border hover:bg-th-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                          上一页
                        </button>
                        <span className="px-2 py-1 font-mono">{qPage} / {Math.ceil(bankQuestions.length / Q_PAGE_SIZE)}</span>
                        <button disabled={qPage >= Math.ceil(bankQuestions.length / Q_PAGE_SIZE)} onClick={() => setQPage(p => p + 1)}
                          className="px-2 py-1 rounded border border-th-border hover:bg-th-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                          下一页
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            {/* 图片上传面板 */}
            <div className="rounded-xl border border-th-border bg-th-card p-4">
              <h3 className="text-sm font-semibold text-th-text mb-3 flex items-center gap-2">
                <svg className="h-4 w-4 text-th-text2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                图片上传
                <span className="text-xs font-normal text-th-muted">上传后复制 URL 粘贴到题目内容中</span>
              </h3>
              <ImageUploadPanel defaultBankType={selectedBank.type} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
