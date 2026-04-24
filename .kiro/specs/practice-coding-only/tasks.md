# Implementation Plan: practice-coding-only

## Overview

将练习模式从支持三种题型（MCQ、TFQ、CODING）改为仅支持编程题（CODING）。变更以最小化为原则：后端移除题型分支判断，统一将 `isCorrect` 设为 `null`、`correctCount` 设为 `0`；前端更新列表页题数统计、标签文案、答题页状态徽章、结果页展示逻辑。

## Tasks

- [x] 1. 修改后端接口：移除题型分支，统一 isCorrect 为 null
  - [x] 1.1 修改 `app/api/practice/start/route.ts`：过滤只返回 CODING 题
    - 在 `bank.questions.map(item => item.question)` 后增加 `.filter(q => q.type === "CODING")`
    - _Requirements: 1.1, 1.2_

  - [ ]* 1.2 为 start 接口过滤逻辑编写属性测试
    - **Property 1: 开始练习只返回 CODING 题**
    - 生成包含随机比例 MCQ/TFQ/CODING 题的题库，验证过滤后所有题目 `type === "CODING"`
    - 测试文件：`__tests__/practice-coding-only/property-1-start-filter.test.ts`
    - **Validates: Requirements 1.1, 1.2**

  - [x] 1.3 修改 `app/api/practice/[sessionId]/answer/route.ts`：移除 isCoding 判断
    - 删除 `const isCoding = question?.type === QuestionType.CODING;` 及相关 `isCorrect` 计算逻辑
    - 将 `isCorrect` 直接设为 `null`，不再查询 `question.correctAnswer`
    - 移除不再需要的 `prisma.question.findUnique` 调用（非跳过路径）
    - _Requirements: 3.1, 3.2, 5.3_

  - [ ]* 1.4 为单题答案保存编写属性测试
    - **Property 3: 答案保存 isCorrect 始终为 null**
    - 生成随机代码字符串（含空字符串、特殊字符、多行代码），验证 `isCorrect` 始终为 `null`
    - 同时验证跳过时 `userAnswer` 为 `null`、`isCorrect` 为 `null`
    - 测试文件：`__tests__/practice-coding-only/property-3-answer-null.test.ts`
    - **Validates: Requirements 3.1, 3.2, 4.3, 5.3**

  - [x] 1.5 修改 `app/api/practice/[sessionId]/answers-batch/route.ts`：移除 QuestionType 分支
    - 删除 `prisma.question.findMany` 查询及 `questionMap` 构建逻辑
    - 删除 `if (!a.isSkipped && q && q.type !== QuestionType.CODING)` 分支
    - 将 `isCorrect` 统一设为 `null`，移除 `QuestionType` import
    - _Requirements: 5.1, 5.2_

  - [ ]* 1.6 为批量保存接口编写属性测试
    - **Property 3: 答案保存 isCorrect 始终为 null（批量路径）**
    - 生成随机答案集合（含跳过、未跳过、空答案），验证所有 `isCorrect` 均为 `null`
    - 测试文件：`__tests__/practice-coding-only/property-3-batch-null.test.ts`
    - **Validates: Requirements 5.1, 5.2**

  - [x] 1.7 修改 `app/api/practice/[sessionId]/submit/route.ts`：直接将 correctCount 设为 0
    - 删除 `prisma.practiceAnswer.count({ where: { sessionId, isCorrect: true } })` 查询
    - 将 `correctCount` 直接赋值为 `0`
    - _Requirements: 3.3_

  - [ ]* 1.8 为提交接口编写属性测试
    - **Property 4: 提交后 correctCount 始终为 0**
    - 生成包含任意数量答案的练习会话，验证提交后 `correctCount === 0`
    - 测试文件：`__tests__/practice-coding-only/property-4-correct-count.test.ts`
    - **Validates: Requirements 3.3**

- [x] 2. 检查点 - 后端接口变更完成
  - 确认所有后端接口修改正确，运行 TypeScript 类型检查确保无编译错误。

- [-] 3. 修改前端列表页：题数统计只计 CODING 题
  - [x] 3.1 修改 `app/practice/page.tsx`：查询时只统计 CODING 题数量
    - 将 `include: { _count: { select: { questions: true } } }` 改为使用 `questions` 关联并加 `where: { question: { type: "CODING" } }` 过滤
    - 更新 `banksData` 中 `questionCount` 的计算方式为 `b.questions.length`
    - _Requirements: 1.3_

  - [ ]* 3.2 为题数统计逻辑编写属性测试
    - **Property 2: 题数统计只计 CODING 题**
    - 生成包含随机比例 MCQ/TFQ/CODING 题的题库，验证 `questionCount` 等于 CODING 题数量
    - 测试文件：`__tests__/practice-coding-only/property-2-count.test.ts`
    - **Validates: Requirements 1.3**

  - [x] 3.3 修改 `app/practice/PracticeListClient.tsx`：更新标签和题数文案
    - 在标签列表中添加 `{ label: "编程题", color: "bg-[#f78166]/10 text-[#f78166] border-[#f78166]/20" }` 作为第一个标签
    - 将题数显示从 `{bank.questionCount} 道题` 改为 `{bank.questionCount} 道编程题`
    - _Requirements: 1.3_

- [x] 4. 修改前端答题页：状态徽章文案更新
  - [x] 4.1 修改 `app/practice/[sessionId]/page.tsx`：只读模式状态徽章文案
    - 将只读模式状态徽章中的 `"— 未评分"` 改为 `"— 待批改"`
    - 确认 `QuestionCard` 在 CODING 模式下正确渲染 Monaco 编辑器（无需修改，仅验证）
    - _Requirements: 7.3_

  - [ ]* 4.2 为只读模式状态徽章编写属性测试
    - **Property 6: null isCorrect 显示"待批改"**
    - 生成 `isCorrect === null` 的答案记录，验证只读模式状态徽章显示"— 待批改"
    - 测试文件：`__tests__/practice-coding-only/property-6-badge-readonly.test.ts`
    - **Validates: Requirements 7.3**

  - [ ]* 4.3 为答案状态导航不变性编写属性测试
    - **Property 5: 答案状态在题目导航中保持不变**
    - 生成随机导航序列（前进、后退、跳转），验证导航后之前输入的代码答案保持不变
    - 测试文件：`__tests__/practice-coding-only/property-5-nav-state.test.ts`
    - **Validates: Requirements 2.3, 2.4**

- [x] 5. 修改前端结果页：适配编程题展示
  - [x] 5.1 修改 `app/practice/[sessionId]/result/page.tsx`：移除"正确答案"字段
    - 删除逐题详情中 `正确答案：{answer.question.correctAnswer}` 的展示 span
    - 从 Prisma 查询的 `select` 中移除 `correctAnswer` 字段
    - _Requirements: 6.2_

  - [x] 5.2 修改结果页：更新成绩概览，移除"答对题数"卡片
    - 将绿色"答对题数"卡片替换为橙色"待批改"提示卡片，显示"待批改"文案
    - 保留"总题数"、"跳过题数"、"完成时间"三个卡片
    - _Requirements: 6.5_

  - [x] 5.3 修改结果页：更新逐题详情的状态徽章和答案展示
    - 将 `isCorrect === true` 的绿色"正确"徽章和 `isCorrect === false` 的红色"错误"徽章逻辑移除
    - 当 `isCorrect === null` 且未跳过时，显示橙色"待批改"徽章
    - 将"你的答案"展示改为代码块样式（`<pre>` 或 `font-mono` 文本），适合展示多行代码
    - 更新行背景色逻辑：跳过为黄色，其余统一为默认背景（移除绿色/红色背景）
    - _Requirements: 6.1, 6.3_

  - [x] 5.4 修改结果页：添加教师评语展示
    - 在 Prisma 查询中为 `answers` 添加 `comment` 字段的 select
    - 在每题详情下方，当 `answer.comment` 存在时，渲染高亮评语块（参考答题页只读模式的评语样式）
    - _Requirements: 6.4_

  - [ ]* 5.5 为结果页编写属性测试
    - **Property 6: null isCorrect 显示"待批改"（结果页）**
    - 生成 `isCorrect === null` 的答案记录，验证结果页状态徽章显示"待批改"
    - 测试文件：`__tests__/practice-coding-only/property-6-badge-result.test.ts`
    - **Validates: Requirements 6.3**

  - [ ]* 5.6 为教师评语展示编写属性测试
    - **Property 7: 教师评语在所有视图中完整显示**
    - 生成随机非空评语字符串，验证结果页和只读回顾页中评语内容完整显示
    - 测试文件：`__tests__/practice-coding-only/property-7-comment.test.ts`
    - **Validates: Requirements 6.4, 7.4**

- [ ] 6. 为答题页编写单元测试
  - [ ]* 6.1 编写单元测试：验证 Monaco 编辑器存在，MCQ/TFQ 按钮不存在
    - 渲染含 CODING 题的练习页，验证 Monaco 编辑器存在
    - 验证 MCQ 选项按钮和 TFQ 判断按钮不存在
    - 测试文件：`__tests__/practice-coding-only/unit-coding-ui.test.tsx`
    - _Requirements: 2.1, 2.2_

  - [ ]* 6.2 编写单元测试：验证结果页不显示"正确答案"字段
    - 渲染结果页，验证"正确答案"文本不存在于 DOM 中
    - 测试文件：`__tests__/practice-coding-only/unit-result-no-correct-answer.test.tsx`
    - _Requirements: 6.2_

  - [ ]* 6.3 编写单元测试：验证已完成会话进入只读模式
    - 加载 `completedAt` 非 null 的会话，验证进入只读模式（无"跳过此题"按钮，有"练习回顾"标题）
    - 测试文件：`__tests__/practice-coding-only/unit-readonly-mode.test.tsx`
    - _Requirements: 7.1_

- [x] 7. 最终检查点 - 确保所有测试通过
  - 确保所有测试通过，运行 `npx tsc --noEmit` 验证无 TypeScript 编译错误，向用户汇报完成情况。

## Notes

- 标有 `*` 的子任务为可选测试任务，可跳过以加快 MVP 交付
- 每个任务引用了具体的需求条款以保证可追溯性
- 检查点确保增量验证，避免积累错误
- 属性测试使用项目已有的 `fast-check` 库，测试文件放在 `__tests__/practice-coding-only/` 目录
- 所有后端变更不涉及数据库 Schema 修改，仅为逻辑层变更
