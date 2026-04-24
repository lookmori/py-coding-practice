# Design Document: Python Quiz Platform

## Overview

本项目是一个基于 **Next.js 14 (App Router)**、**TailwindCSS** 和 **PostgreSQL** 构建的在线 Python 答题平台，支持考试模式（含防作弊）和练习模式（含排行榜），并提供个人历史记录查询功能。

### 技术选型

| 层次 | 技术 |
|------|------|
| 前端框架 | Next.js 14 (App Router + Server Components) |
| 样式 | TailwindCSS |
| 数据库 | Vercel Postgres（托管 PostgreSQL） |
| ORM | Prisma + `@vercel/postgres` |
| 认证 | NextAuth.js（Credentials Provider，Session Cookie） |
| 密码哈希 | bcryptjs |
| API 层 | Next.js Route Handlers (REST) |
| 状态管理 | React Context + useReducer（客户端会话状态） |
| 实时更新 | Polling（30s 间隔，用于排行榜/完成度刷新） |
| 部署平台 | Vercel |

### Vercel Postgres 接入说明

- 在 Vercel Dashboard 创建 Postgres 数据库，自动注入环境变量：`POSTGRES_URL`、`POSTGRES_PRISMA_URL`、`POSTGRES_URL_NON_POOLING` 等
- Prisma 使用连接池 URL（`POSTGRES_PRISMA_URL`）进行查询，迁移时使用非连接池 URL（`POSTGRES_URL_NON_POOLING`）
- 本地开发通过 Vercel CLI（`vercel env pull .env.local`）拉取环境变量
- `prisma/schema.prisma` 中 `datasource` 配置：
  ```prisma
  datasource db {
    provider  = "postgresql"
    url       = env("POSTGRES_PRISMA_URL")
    directUrl = env("POSTGRES_URL_NON_POOLING")
  }
  ```

---

## Architecture

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Client)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Exam Pages  │  │Practice Pages│  │ Records Pages │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                 │                   │          │
│         └─────────────────┼───────────────────┘          │
│                           │ HTTP / fetch                  │
└───────────────────────────┼─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                  Next.js App (Server)                    │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              App Router (pages + layouts)           │ │
│  ├─────────────────────────────────────────────────────┤ │
│  │           Route Handlers (/api/*)                   │ │
│  │  /api/exam/*   /api/practice/*   /api/records/*     │ │
│  │  /api/questions/*   /api/leaderboard/*              │ │
│  └──────────────────────┬──────────────────────────────┘ │
│                         │ Prisma Client                   │
└─────────────────────────┼───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                    PostgreSQL Database                   │
│  questions / exam_sessions / practice_sessions /        │
│  exam_answers / practice_answers / switch_events        │
└─────────────────────────────────────────────────────────┘
```

### 页面路由结构

```
/login                     → 登录页
/                          → 首页（需登录）
/exam                      → 开始考试
/exam/[sessionId]          → 考试答题页
/exam/[sessionId]/result   → 考试结果页
/practice                  → 开始练习（自动使用登录用户名）
/practice/[sessionId]      → 练习答题页
/practice/[sessionId]/result → 练习结果页
/leaderboard               → 独立排行榜页
/completion                → 题目完成度统计页
/records                   → 个人记录入口
/records/exam              → 历史考试记录列表
/records/exam/[sessionId]  → 考试详情
/records/practice          → 历史练习记录列表
/records/practice/[sessionId] → 练习详情
/admin                     → 管理员后台首页（仅 Admin 可访问）
/admin/users               → 用户管理（列表、批量导入、批量修改、删除）
/admin/questions           → 题库管理（列表、导入、编辑、删除）
/admin/records             → 所有用户记录查看
/admin/stats               → 平台统计数据
```

---

## Components and Interfaces

### 核心 UI 组件

#### `<Timer />`
- Props: `durationSeconds: number`, `onExpire: () => void`
- 内部使用 `useEffect` + `setInterval` 倒计时
- 每秒更新显示，归零时调用 `onExpire`
- 显示格式：`mm:ss`

#### `<QuestionCard />`
- Props: `question: Question`, `answer: string | null`, `onAnswer: (value: string) => void`
- 根据 `question.type` 渲染 MCQ / TFQ / Coding 三种形态
- MCQ：四个单选按钮；TFQ：两个单选按钮；Coding：`<textarea>`

#### `<ProgressBar />`
- Props: `current: number`, `total: number`, `skipped: number`
- 展示当前题号、总题数、已跳过数

#### `<Leaderboard />`
- Props: `entries: LeaderboardEntry[]`, `highlightSessionId?: string`
- 按完成时间升序渲染排行榜表格
- 高亮当前用户行

#### `<ScreenSwitchWarning />`
- Props: `count: number`, `threshold: number`
- 当检测到切换时显示 Toast 警告
- 超过阈值时显示额外警告文本

#### `<ScoreSummary />`
- Props: `session: ExamSessionResult`
- 展示客观题总分、答对/答错数，逐题对比答案

### API Route Handlers

| 路径 | 方法 | 功能 |
|------|------|------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth.js 登录/登出/Session |
| `/api/exam/start` | POST | 创建 ExamSession，抽取题目 |
| `/api/exam/[sessionId]/answer` | PUT | 保存单题作答 |
| `/api/exam/[sessionId]/autosave` | PUT | 每 30s 批量保存进度 |
| `/api/exam/[sessionId]/submit` | POST | 提交 ExamSession，计算得分 |
| `/api/exam/[sessionId]/switch` | POST | 记录屏幕切换事件 |
| `/api/practice/start` | POST | 创建 PracticeSession（自动使用登录用户名） |
| `/api/practice/[sessionId]/answer` | PUT | 保存单题作答（含跳过） |
| `/api/practice/[sessionId]/submit` | POST | 提交 PracticeSession |
| `/api/leaderboard` | GET | 获取排行榜数据 |
| `/api/completion` | GET | 获取题目完成度数据 |
| `/api/records/exam` | GET | 获取当前用户历史考试记录列表 |
| `/api/records/exam/[sessionId]` | GET | 获取考试详情 |
| `/api/records/practice` | GET | 获取当前用户历史练习记录列表 |
| `/api/records/practice/[sessionId]` | GET | 获取练习详情 |
| `/api/admin/users` | GET | 获取所有用户列表（Admin） |
| `/api/admin/users/import` | POST | 批量导入用户（JSON，Admin） |
| `/api/admin/users/bulk-update` | PUT | 批量修改用户信息（JSON，Admin） |
| `/api/admin/users/[userId]` | DELETE | 删除单个用户（Admin） |
| `/api/admin/questions/import` | POST | 批量导入题目（JSON，Admin） |
| `/api/admin/questions/[questionId]` | PUT/DELETE | 编辑/删除单道题目（Admin） |
| `/api/admin/records` | GET | 获取所有用户记录（Admin） |
| `/api/admin/stats` | GET | 获取平台统计数据（Admin） |

---

## Data Models

### Prisma Schema

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}

generator client {
  provider = "prisma-client-js"
}

enum QuestionType {
  MCQ
  TFQ
  CODING
}

enum UserRole {
  USER
  ADMIN
}

model User {
  id            String    @id @default(cuid())
  username      String    @unique  // 登录账号
  displayName   String             // 显示用户名（用于排行榜）
  passwordHash  String             // bcrypt 哈希
  role          UserRole  @default(USER)
  createdAt     DateTime  @default(now())
  lastLoginAt   DateTime?
  deletedAt     DateTime?          // 软删除

  examSessions     ExamSession[]
  practiceSessions PracticeSession[]
}

model Question {
  id              String       @id @default(cuid())
  type            QuestionType
  content         String
  category        String
  optionA         String?
  optionB         String?
  optionC         String?
  optionD         String?
  correctAnswer   String
  description     String?
  scoringCriteria String?
  createdAt       DateTime     @default(now())

  examAnswers     ExamAnswer[]
  practiceAnswers PracticeAnswer[]
}

model ExamSession {
  id             String    @id @default(cuid())
  userId         String
  startedAt      DateTime  @default(now())
  submittedAt    DateTime?
  durationSecs   Int       @default(5400)
  objectiveScore Int?
  switchCount    Int       @default(0)

  user         User          @relation(fields: [userId], references: [id])
  answers      ExamAnswer[]
  switchEvents SwitchEvent[]
}

model ExamAnswer {
  id         String      @id @default(cuid())
  sessionId  String
  questionId String
  userAnswer String?
  isCorrect  Boolean?
  savedAt    DateTime    @default(now())

  session  ExamSession @relation(fields: [sessionId], references: [id])
  question Question    @relation(fields: [questionId], references: [id])

  @@unique([sessionId, questionId])
}

model SwitchEvent {
  id         String      @id @default(cuid())
  sessionId  String
  occurredAt DateTime    @default(now())

  session ExamSession @relation(fields: [sessionId], references: [id])
}

model PracticeSession {
  id              String    @id @default(cuid())
  userId          String
  participantName String             // 来自 User.displayName
  startedAt       DateTime  @default(now())
  completedAt     DateTime?
  durationSecs    Int?
  correctCount    Int?

  user    User             @relation(fields: [userId], references: [id])
  answers PracticeAnswer[]
}

model PracticeAnswer {
  id         String          @id @default(cuid())
  sessionId  String
  questionId String
  userAnswer String?
  isCorrect  Boolean?
  isSkipped  Boolean         @default(false)
  answeredAt DateTime        @default(now())

  session  PracticeSession @relation(fields: [sessionId], references: [id])
  question Question        @relation(fields: [questionId], references: [id])

  @@unique([sessionId, questionId])
}
```

### 用户 JSON 导入格式

```json
[
  { "displayName": "张三", "username": "zhangsan", "password": "初始密码123" },
  { "displayName": "李四", "username": "lisi",     "password": "初始密码456" }
]
```

### 题目 JSON 导入格式

```json
[
  {
    "type": "MCQ",
    "category": "基础语法",
    "content": "Python 中用于定义函数的关键字是？",
    "optionA": "func", "optionB": "def", "optionC": "function", "optionD": "define",
    "correctAnswer": "B"
  },
  {
    "type": "TFQ",
    "category": "数据类型",
    "content": "Python 中列表是不可变类型。",
    "correctAnswer": "false"
  },
  {
    "type": "CODING",
    "category": "算法",
    "content": "编写一个函数计算斐波那契数列第 n 项",
    "description": "输入整数 n（n>=0），返回第 n 项斐波那契数",
    "correctAnswer": "def fib(n): return n if n<=1 else fib(n-1)+fib(n-2)",
    "scoringCriteria": "函数定义正确 2 分，递归或迭代实现正确 3 分"
  }
]
```

### 关键业务逻辑

**题目抽取（考试模式）**
```
SELECT * FROM questions WHERE type = 'MCQ' ORDER BY RANDOM() LIMIT 25
SELECT * FROM questions WHERE type = 'TFQ' ORDER BY RANDOM() LIMIT 10
SELECT * FROM questions WHERE type = 'CODING' ORDER BY RANDOM() LIMIT 3
```
结果按 MCQ → TFQ → CODING 顺序拼接，存入 ExamSession。

**CompletionRate 计算**
```
completionRate(questionId) =
  COUNT(PracticeAnswer WHERE questionId = ? AND isSkipped = false)
  / COUNT(DISTINCT PracticeSession WHERE completedAt IS NOT NULL)
  * 100
```

**排行榜排序**
```
SELECT * FROM practice_sessions
WHERE completedAt IS NOT NULL
ORDER BY durationSecs ASC
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: 题目数据往返一致性（Question Round-Trip）

*For any* question of any type (MCQ, TFQ, or CodingQuestion) with valid field values (content, options, correct answer, category, and type-specific fields), serializing the question to the database and retrieving it should produce an object with identical field values.

**Validates: Requirements 1.2, 1.3, 1.4, 1.5**

---

### Property 2: 考试题目组成结构

*For any* question bank containing at least 25 MCQ, 10 TFQ, and 3 CodingQuestion entries, the exam question selection function SHALL return exactly 25 MCQ questions, 10 TFQ questions, and 3 CodingQuestion questions — no more, no less.

**Validates: Requirements 2.1**

---

### Property 3: 考试题目顺序不变量

*For any* exam session, all MCQ questions appear before all TFQ questions, and all TFQ questions appear before all CodingQuestion questions in the question list.

**Validates: Requirements 2.2**

---

### Property 4: ExamSession ID 唯一性

*For any* two independently created ExamSessions, their generated identifiers are distinct.

**Validates: Requirements 2.3**

---

### Property 5: 自动交卷覆盖所有题目

*For any* ExamSession with any combination of answered and unanswered questions, when the timer expires and auto-submit is triggered, the submitted session contains a record for every question in the session (answered questions with their answers, unanswered questions with null answers).

**Validates: Requirements 3.2**

---

### Property 6: 屏幕切换事件记录

*For any* screen switch event occurring during an active ExamSession, a SwitchEvent record with a valid timestamp is appended to that session, and the session's switchCount increments by exactly 1.

**Validates: Requirements 4.2, 4.4**

---

### Property 7: 切换次数超阈值警告

*For any* ExamSession where the screen switch count exceeds 3, the warning message displayed to the user SHALL include a notification that the switch count has exceeded the warning threshold.

**Validates: Requirements 4.5**

---

### Property 8: 客观题评分正确性

*For any* MCQ or TFQ question and any user-submitted answer, the computed score is exactly 1 if the user's answer matches the question's correctAnswer, and exactly 0 otherwise.

**Validates: Requirements 5.1**

---

### Property 9: 编程题答案原文存储

*For any* coding answer text (including arbitrary Unicode characters, whitespace, and code syntax), storing it as a CodingQuestion answer and retrieving it produces the byte-for-byte identical text.

**Validates: Requirements 5.2**

---

### Property 10: 得分汇总一致性

*For any* submitted ExamSession, the displayed total objective score equals the count of correct answers, and the sum of correct count plus incorrect count equals the total number of objective questions (MCQ + TFQ) in the session.

**Validates: Requirements 5.3**

---

### Property 11: 答案记录完整性

*For any* submitted ExamSession or completed PracticeSession, every objective question answer record contains both the user's submitted answer and the question's correct answer.

**Validates: Requirements 5.4, 7.5, 10.3**

---

### Property 12: 参与者姓名验证

*For any* string input as a participant name, the validation function accepts it if and only if its length is between 1 and 50 characters (inclusive). Any string with length 0 or length > 50 is rejected.

**Validates: Requirements 6.2, 6.3**

---

### Property 13: 参与者姓名与会话关联

*For any* valid participant name, after creating a PracticeSession with that name, retrieving the session from the database returns the same name without modification.

**Validates: Requirements 6.4**

---

### Property 14: 跳过操作标记正确性

*For any* practice session and any question within it, after the user performs a skip action on that question, the corresponding PracticeAnswer record has isSkipped set to true.

**Validates: Requirements 7.2**

---

### Property 15: 跳过计数显示一致性

*For any* practice session state, the displayed skipped question count equals the number of PracticeAnswer records with isSkipped = true in that session.

**Validates: Requirements 7.3**

---

### Property 16: 排行榜升序排列

*For any* collection of completed PracticeSessions, the leaderboard entries are sorted by durationSecs in strictly ascending order (shortest completion time first).

**Validates: Requirements 8.2**

---

### Property 17: 排行榜条目字段完整性

*For any* leaderboard entry, the rendered row contains all four required fields: rank (position number), participant name, completion time formatted as mm:ss, and correct answer count.

**Validates: Requirements 8.3**

---

### Property 18: 排行榜高亮唯一性

*For any* leaderboard rendered with a known current session ID, exactly one row is highlighted, and that row corresponds to the session with the matching ID.

**Validates: Requirements 8.4**

---

### Property 19: CompletionRate 计算正确性

*For any* question and any set of completed PracticeSessions, the computed CompletionRate equals (number of sessions that answered the question without skipping ÷ total number of completed sessions) × 100, rounded consistently.

**Validates: Requirements 9.1**

---

### Property 20: 完成度列表升序排列

*For any* collection of questions with computed CompletionRates, the displayed completion statistics list is sorted by CompletionRate in ascending order (lowest completion rate first).

**Validates: Requirements 9.2**

---

### Property 21: 完成度条目字段完整性

*For any* question completion entry, the rendered output includes the question number, the question content truncated to at most 50 characters, the CompletionRate as a percentage, and the total answer count.

**Validates: Requirements 9.3**

---

### Property 22: 记录列表降序排列

*For any* collection of ExamSessions or PracticeSessions belonging to a user/participant, the records list is sorted by startedAt in descending order (most recent first).

**Validates: Requirements 10.4, 11.4**

---

### Property 23: 考试记录条目字段完整性

*For any* ExamSession record, the rendered list row contains all five required fields: exam date, objective score, total question count, screen switch count, and exam duration.

**Validates: Requirements 10.2**

---

### Property 24: 练习记录条目字段完整性

*For any* PracticeSession record, the rendered list row contains all five required fields: practice date, correct answer count, total question count, skipped question count, and completion duration.

**Validates: Requirements 11.2**

---

### Property 25: 练习详情答案记录完整性

*For any* PracticeSession detail view, every answer record contains the user's answer (or null if skipped), the question's correct answer, and the isSkipped boolean flag.

**Validates: Requirements 11.3**

---

## Error Handling

### 客户端错误处理

| 场景 | 处理方式 |
|------|----------|
| 网络请求失败（自动保存） | 静默重试，最多 3 次；失败后在 UI 显示"保存失败"提示 |
| 网络请求失败（提交考试） | 显示错误 Toast，保留当前答题状态，允许用户重试 |
| 题库题目不足（无法组卷） | 返回 HTTP 422，前端显示"题库题目不足，无法开始考试"错误页 |
| 参与者姓名验证失败 | 内联表单错误提示，阻止提交 |
| ExamSession 已提交后重复提交 | 返回 HTTP 409，前端重定向至结果页 |
| PracticeSession 不存在 | 返回 HTTP 404，前端显示"记录不存在"页面 |

### 服务端错误处理

- 所有 Route Handler 使用 try/catch 包裹，未预期错误返回 HTTP 500 + 通用错误消息
- Prisma 查询错误记录至服务端日志，不暴露数据库细节给客户端
- 考试自动保存失败不中断考试流程，仅记录日志

### 防作弊边界情况

- 若用户直接访问 `/exam/[sessionId]` 但 session 已提交，重定向至结果页
- 若 sessionId 不存在，返回 404 页面
- 屏幕切换检测仅在客户端运行，服务端仅存储事件记录

---

## Testing Strategy

### 测试分层

**单元测试（Unit Tests）**
- 测试工具：Jest + Testing Library
- 覆盖范围：
  - 纯函数逻辑（评分计算、CompletionRate 计算、排行榜排序、姓名验证）
  - 数据转换函数（时间格式化 mm:ss、题干截断 50 字符）
  - 组件渲染（QuestionCard、Leaderboard、ScoreSummary、Timer）
- 具体示例测试：
  - 姓名验证：空字符串、51 字符字符串、1 字符、50 字符
  - 评分：答对/答错各一个 MCQ 和 TFQ 示例
  - 时间格式化：0 秒、59 秒、60 秒、3599 秒

**属性测试（Property-Based Tests）**
- 测试工具：**fast-check**（TypeScript 属性测试库）
- 每个属性测试运行最少 **100 次迭代**
- 每个属性测试用注释标注对应设计属性：
  ```
  // Feature: python-quiz-platform, Property N: <property_text>
  ```
- 覆盖上述 Property 1–25 中所有 PROPERTY 分类的验收标准
- 关键生成器：
  - `fc.record({ content: fc.string(), optionA: fc.string(), ... })` → 随机 MCQ
  - `fc.array(fc.record({ durationSecs: fc.nat() }))` → 随机练习会话集合
  - `fc.string({ minLength: 0, maxLength: 100 })` → 随机姓名输入

**集成测试（Integration Tests）**
- 测试工具：Jest + Prisma Test Environment（使用测试数据库）
- 覆盖范围：
  - 排行榜数据在新 PracticeSession 提交后 30 秒内更新（轮询验证）
  - CompletionRate 数据在新 PracticeSession 提交后 30 秒内更新
  - ExamSession 自动保存端到端流程
  - 完整考试提交流程（创建 → 作答 → 提交 → 查询结果）

**端到端测试（E2E Tests）**
- 测试工具：Playwright
- 覆盖核心用户流程：
  - 完整考试流程（开始 → 答题 → 手动交卷 → 查看结果）
  - 完整练习流程（输入姓名 → 答题 → 跳题 → 完成 → 查看排行榜）
  - 个人记录查询流程

### 属性测试不适用的场景

以下需求不使用属性测试，改用示例测试或集成测试：
- 导航栏渲染和响应式布局（Requirements 12）→ 快照测试
- 倒计时 UI 显示（Requirements 3.1）→ 示例测试
- 屏幕切换事件监听器注册（Requirements 4.1）→ 示例测试
- 排行榜/完成度轮询更新时效（Requirements 8.5, 9.4）→ 集成测试
