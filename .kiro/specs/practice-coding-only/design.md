# Design Document

## Feature: practice-coding-only

---

## Overview

本设计将练习模式（Practice）从支持三种题型（MCQ、TFQ、CODING）改为**仅支持编程题（CODING）**。

核心变更思路：
- **后端**：在题库加载、答案保存、批量保存、提交等环节移除题型分支判断，统一将 `isCorrect` 设为 `null`，`correctCount` 初始为 `0`。
- **前端**：答题页直接使用已有的 `QuestionCard` 组件（已支持 CODING 类型渲染 Monaco 编辑器），只读回顾页和结果页移除"正确答案"展示，改为"待批改"状态。
- **列表页**：题数统计只计 CODING 题，标签更新为编程题相关。

由于 `QuestionCard` 组件已经完整支持 CODING 类型（Monaco 编辑器、Python 语法高亮），且 `@monaco-editor/react` 已在 `package.json` 中，**无需引入新依赖**，改动以最小化为原则。

---

## Architecture

```mermaid
graph TD
    A[Student Browser] -->|POST /api/practice/start| B[start/route.ts]
    A -->|GET /api/practice/:id| C[sessionId/route.ts]
    A -->|POST /api/practice/:id/answers-batch| D[answers-batch/route.ts]
    A -->|POST /api/practice/:id/submit| E[submit/route.ts]
    A -->|PUT /api/practice/:id/answer| F[answer/route.ts]

    B -->|filter type=CODING| G[(Prisma / DB)]
    C --> G
    D -->|isCorrect=null always| G
    E -->|correctCount=0| G
    F -->|isCorrect=null always| G

    subgraph Frontend Pages
        H[/practice - PracticeListClient]
        I[/practice/:id - PracticeSessionPage]
        J[/practice/:id/result - PracticeResultPage]
    end

    H -->|questionCount = CODING only| B
    I -->|QuestionCard CODING mode| C
    J -->|待批改 status, no correctAnswer| E
```

数据流说明：
1. 开始练习时，`start` 接口过滤只返回 `CODING` 题目。
2. 答题页使用 `QuestionCard`（已有 CODING 分支），答案保存到内存，提交时批量发送。
3. 批量保存和单题保存接口均不计算 `isCorrect`，统一为 `null`。
4. 提交接口不再统计 `isCorrect=true` 的数量，直接将 `correctCount` 设为 `0`。
5. 结果页和只读回顾页展示"待批改"状态，不显示"正确答案"。

---

## Components and Interfaces

### 后端接口变更

#### `POST /api/practice/start`

**变更**：在查询题库题目时，增加 `type: "CODING"` 过滤条件。

```typescript
// 变更前
const questions = bank.questions.map(item => item.question);

// 变更后：只取 CODING 题
const questions = bank.questions
  .map(item => item.question)
  .filter(q => q.type === "CODING");
```

#### `PUT /api/practice/[sessionId]/answer`

**变更**：移除题型判断，`isCorrect` 统一为 `null`。

```typescript
// 变更前：有 isCoding 判断
const isCoding = question?.type === QuestionType.CODING;
const isCorrect = isCoding ? null : userAnswer === question?.correctAnswer ? true : false;

// 变更后：始终 null
const isCorrect = null;
// 不再需要查询 question 的 correctAnswer
```

#### `POST /api/practice/[sessionId]/answers-batch`

**变更**：移除 `QuestionType` 分支，`isCorrect` 统一为 `null`，不再需要查询题目信息。

```typescript
// 变更前：查询题目类型并计算 isCorrect
const questions = await prisma.question.findMany(...);
const questionMap = new Map(...);
let isCorrect = null;
if (!a.isSkipped && q && q.type !== QuestionType.CODING) {
  isCorrect = a.userAnswer === q.correctAnswer;
}

// 变更后：直接 null，无需查询题目
// isCorrect 始终为 null
```

#### `POST /api/practice/[sessionId]/submit`

**变更**：移除 `prisma.practiceAnswer.count({ where: { isCorrect: true } })` 查询，直接将 `correctCount` 设为 `0`。

```typescript
// 变更前
const correctCount = await prisma.practiceAnswer.count({
  where: { sessionId, isCorrect: true },
});

// 变更后
const correctCount = 0;
```

### 前端组件变更

#### `app/practice/page.tsx`（Server Component）

**变更**：查询题库时，`questionCount` 只统计 CODING 题数量。

```typescript
// 变更前：统计所有题目
include: { _count: { select: { questions: true } } }

// 变更后：只统计 CODING 题
include: {
  questions: {
    where: { question: { type: "CODING" } },
    select: { id: true },
  }
}
// questionCount = b.questions.length
```

#### `app/practice/PracticeListClient.tsx`

**变更**：标签从通用标签改为编程题相关标签。

```typescript
// 变更前
{ label: "可跳过", ... },
{ label: "实时排行榜", ... },
{ label: "完成度统计", ... },

// 变更后
{ label: "编程题", ... },
{ label: "可跳过", ... },
{ label: "实时排行榜", ... },
```

题数显示文案从"X 道题"改为"X 道编程题"。

#### `app/practice/[sessionId]/page.tsx`（答题页）

**变更**：`QuestionCard` 已支持 CODING 类型，无需修改组件调用。只需确认：
- 答题模式下，`QuestionCard` 接收 CODING 题目时自动渲染 Monaco 编辑器。
- 只读模式下，`QuestionCard` 的 `onAnswer` 传入空函数，外层 `pointer-events-none` 已禁用交互。
- 状态徽章：`isCorrect === null` 时显示"— 待批改"（替换原来的"— 未评分"）。

```typescript
// 变更：只读模式状态徽章文案
// 变更前
: "— 未评分"
// 变更后
: "— 待批改"
```

#### `app/practice/[sessionId]/result/page.tsx`（结果页）

**变更**：
1. 移除"正确答案"展示字段。
2. `isCorrect === null` 时显示"待批改"徽章（橙色/灰色），不显示"正确/错误"。
3. 成绩概览移除"答对题数"卡片，改为"待批改"提示。
4. 逐题详情中，每题显示提交的代码（`userAnswer`），不显示 `correctAnswer`。

---

## Data Models

本功能不涉及数据库 Schema 变更，所有字段已存在：

| 字段 | 类型 | 说明 |
|------|------|------|
| `PracticeAnswer.isCorrect` | `Boolean?` | 编程题始终为 `null`，待教师批改后更新 |
| `PracticeAnswer.userAnswer` | `String?` | 存储学生提交的代码字符串 |
| `PracticeAnswer.isSkipped` | `Boolean` | 跳过时为 `true`，`userAnswer` 和 `isCorrect` 均为 `null` |
| `PracticeAnswer.comment` | `String?` | 教师评语，Markdown 格式 |
| `PracticeSession.correctCount` | `Int?` | 提交时初始为 `0`，待教师批改后由管理员更新 |
| `PracticeSession.completedAt` | `DateTime?` | 非 null 时进入只读回顾模式 |
| `Question.type` | `QuestionType` | 过滤条件：只取 `CODING` |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

本功能涉及纯函数逻辑（题目过滤、isCorrect 计算、correctCount 计算、题数统计），适合使用属性测试验证。使用 `fast-check`（已在 `package.json` 中）进行属性测试。

### Property 1: 开始练习只返回 CODING 题

*For any* 包含任意混合题型（MCQ、TFQ、CODING）的题库，调用开始练习逻辑后，返回的题目列表中所有题目的 `type` 均为 `CODING`。

**Validates: Requirements 1.1, 1.2**

---

### Property 2: 题数统计只计 CODING 题

*For any* 包含任意混合题型的题库，列表页展示的题数等于该题库中 `type === "CODING"` 的题目数量。

**Validates: Requirements 1.3**

---

### Property 3: 答案保存 isCorrect 始终为 null

*For any* 编程题答案（任意代码字符串、任意 questionId），无论 `userAnswer` 是否与 `correctAnswer` 相同，保存后 `isCorrect` 均为 `null`。跳过时 `userAnswer` 为 `null`，`isCorrect` 为 `null`。

**Validates: Requirements 3.1, 3.2, 4.3, 5.1, 5.3**

---

### Property 4: 提交后 correctCount 始终为 0

*For any* 包含任意数量答案的练习会话，提交后 `correctCount` 始终为 `0`，不依赖于答案内容。

**Validates: Requirements 3.3**

---

### Property 5: 答案状态在题目导航中保持不变

*For any* 练习会话中的任意题目导航序列，导航到其他题目再返回后，之前输入的代码答案保持不变。

**Validates: Requirements 2.3, 2.4**

---

### Property 6: null isCorrect 显示"待批改"

*For any* `isCorrect === null` 的答案记录，在结果页和只读回顾页中，状态徽章显示"待批改"（结果页）或"— 待批改"（回顾页）。

**Validates: Requirements 6.3, 7.3**

---

### Property 7: 教师评语在所有视图中完整显示

*For any* 非空的教师评语字符串，在结果页和只读回顾页中，评语内容完整显示在高亮块中。

**Validates: Requirements 6.4, 7.4**

---

## Error Handling

| 场景 | 处理方式 |
|------|----------|
| 题库中无 CODING 题 | `start` 接口返回空 `questions` 数组；前端显示"该练习暂无编程题"提示 |
| 会话不存在 | `GET /api/practice/[sessionId]` 返回 404，前端显示"练习记录不存在" |
| 无权访问他人会话 | 返回 403，前端显示"无权访问此练习" |
| 重复提交 | `submit` 接口返回 409，前端跳转结果页（已有逻辑，保持不变） |
| Monaco 编辑器加载失败 | `QuestionCard` 已有 loading fallback，显示"编辑器加载中..." |
| 批量保存失败 | 前端 `handleSubmit` 检查 `batchRes.ok`，失败时重置 `submitting` 状态，用户可重试 |

---

## Testing Strategy

### 单元测试（Example-based）

针对具体场景验证：

- 渲染含 CODING 题的练习页，验证 Monaco 编辑器存在，MCQ/TFQ 按钮不存在（Requirements 2.1, 2.2）
- 渲染结果页，验证"正确答案"字段不存在（Requirements 6.2）
- 加载已完成会话，验证进入只读模式（Requirements 7.1）

### 属性测试（Property-based，使用 fast-check）

使用 `fast-check` 库，每个属性测试运行最少 100 次迭代。

测试文件位置：`__tests__/practice-coding-only/`

各属性测试配置：

```
Feature: practice-coding-only, Property 1: 开始练习只返回 CODING 题
Feature: practice-coding-only, Property 2: 题数统计只计 CODING 题
Feature: practice-coding-only, Property 3: 答案保存 isCorrect 始终为 null
Feature: practice-coding-only, Property 4: 提交后 correctCount 始终为 0
Feature: practice-coding-only, Property 5: 答案状态在题目导航中保持不变
Feature: practice-coding-only, Property 6: null isCorrect 显示"待批改"
Feature: practice-coding-only, Property 7: 教师评语在所有视图中完整显示
```

**属性测试重点**：
- Property 1 & 2：生成器产生包含随机比例 MCQ/TFQ/CODING 题的题库，验证过滤逻辑
- Property 3：生成器产生随机代码字符串（包括空字符串、特殊字符、多行代码），验证 `isCorrect` 始终为 `null`
- Property 4：生成器产生随机答案集合，验证 `correctCount` 始终为 `0`
- Property 5：生成器产生随机导航序列（前进、后退、跳转），验证答案状态不变性
- Property 6 & 7：生成器产生随机答案记录和评语字符串，验证 UI 渲染输出

**单元测试重点**：
- 具体的 UI 渲染快照（Monaco 编辑器存在、MCQ 按钮不存在）
- 边界情况：空题库、全部跳过、单题练习
- 集成点：`QuestionCard` 在 CODING 模式下的 `readOnly` 选项传递
