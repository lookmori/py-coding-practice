# Implementation Plan: Python Quiz Platform

## Overview

基于 Next.js 14 (App Router)、TailwindCSS、Vercel Postgres、Prisma 和 NextAuth.js 构建在线 Python 答题平台。实现顺序：数据层 → 认证 → API 层 → 核心 UI 组件 → 考试模式 → 练习模式 → 个人记录 → 管理员后台 → 导航与布局。

## Tasks

- [x] 1. 初始化项目结构与数据库 Schema
  - 初始化 Next.js 14 项目（App Router），安装 TailwindCSS、Prisma、`@vercel/postgres`、`next-auth`、`bcryptjs`、`@types/bcryptjs`、`fast-check`、`jest`、`@testing-library/react`
  - 创建 `prisma/schema.prisma`，定义 `User`（含 `UserRole` 枚举）、`Question`（含 `QuestionType` 枚举）、`ExamSession`、`ExamAnswer`、`SwitchEvent`、`PracticeSession`、`PracticeAnswer` 模型
  - 配置 `datasource`：`url = env("POSTGRES_PRISMA_URL")`，`directUrl = env("POSTGRES_URL_NON_POOLING")`
  - 运行 `prisma migrate dev` 生成初始迁移文件
  - 创建 `lib/prisma.ts` 导出单例 Prisma Client
  - 创建 `prisma/seed.ts`，插入内置管理员账号（从环境变量 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 读取，密码 bcrypt 哈希后存储）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.3, 6.6, 13.1_

- [x] 2. 实现用户认证（NextAuth.js）
  - 配置 NextAuth.js Credentials Provider，验证 `username` + `password`（bcrypt 比对），登录成功后更新 `lastLoginAt`
  - 创建 `app/api/auth/[...nextauth]/route.ts`
  - 创建 `lib/auth.ts` 导出 `getServerSession` 辅助函数和 `requireAuth` / `requireAdmin` 守卫
  - 实现登录页 `app/login/page.tsx`（账号/密码表单，错误提示"账号或密码错误"）
  - 实现 `middleware.ts`：未登录用户访问受保护路由重定向至 `/login`；非管理员访问 `/admin/*` 返回 403
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 13.1_

- [x] 3. 实现核心工具函数
  - [x] 3.1 实现纯函数工具库 `lib/utils.ts`
    - `formatDuration(seconds: number): string` — 秒数格式化为 `mm:ss`
    - `truncateContent(text: string, maxLen: number): string` — 截断题干至指定字符数
    - `calculateObjectiveScore(answers: { userAnswer: string | null; correctAnswer: string }[]): number`
    - `calculateCompletionRate(answeredCount: number, totalSessions: number): number`
    - _Requirements: 5.1, 10.1_

  - [ ]* 3.2 为工具函数编写属性测试
    - **Property 8: 客观题评分正确性** — 任意答案对比正确答案，得分恰好为 0 或 1
    - **Property 19: CompletionRate 计算正确性** — 任意 answeredCount / totalSessions 组合
    - **Validates: Requirements 5.1, 10.1**

- [x] 4. 实现题目抽取逻辑
  - [x] 4.1 实现题目抽取函数 `lib/questions.ts`
    - `selectExamQuestions()` — 随机抽取 25 MCQ + 10 TFQ + 3 CODING，按类型顺序拼接
    - `getAllPracticeQuestions()` — 获取全部题目（供练习模式使用）
    - _Requirements: 2.1, 2.2_

  - [ ]* 4.2 为题目抽取编写属性测试
    - **Property 2: 考试题目组成结构** — 题库充足时，抽取结果恰好为 25/10/3
    - **Property 3: 考试题目顺序不变量** — 所有 MCQ 在 TFQ 之前，TFQ 在 CODING 之前
    - **Validates: Requirements 2.1, 2.2**

- [x] 5. 实现考试模式 API Route Handlers
  - [x] 5.1 实现 `POST /api/exam/start`
    - 从 Session 获取当前登录用户 userId
    - 调用 `selectExamQuestions()`，题目不足时返回 HTTP 422
    - 创建 `ExamSession`（关联 userId），批量创建 `ExamAnswer` 记录（`userAnswer: null`）
    - 返回 `sessionId` 和题目列表
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 5.2 实现 `PUT /api/exam/[sessionId]/answer` 和 `PUT /api/exam/[sessionId]/autosave`
    - 验证 session 属于当前登录用户，否则返回 HTTP 403
    - `answer`：更新单题 `ExamAnswer.userAnswer`；`autosave`：批量 upsert 进度
    - Session 已提交时返回 HTTP 409
    - _Requirements: 3.3, 5.2_

  - [x] 5.3 实现 `POST /api/exam/[sessionId]/submit`
    - 计算所有 MCQ/TFQ 的 `isCorrect`，汇总 `objectiveScore`，设置 `submittedAt`
    - 重复提交返回 HTTP 409
    - _Requirements: 3.2, 3.4, 5.1, 5.3_

  - [x] 5.4 实现 `POST /api/exam/[sessionId]/switch`
    - 创建 `SwitchEvent` 记录，递增 `ExamSession.switchCount`
    - _Requirements: 4.2, 4.4_

  - [ ]* 5.5 为考试 API 编写属性测试
    - **Property 4: ExamSession ID 唯一性**
    - **Property 5: 自动交卷覆盖所有题目**
    - **Property 6: 屏幕切换事件记录**
    - **Property 10: 得分汇总一致性**
    - **Validates: Requirements 2.3, 3.2, 4.2, 4.4, 5.3**

- [x] 6. 实现练习模式 API Route Handlers
  - [x] 6.1 实现 `POST /api/practice/start`
    - 从 Session 获取当前登录用户，自动使用 `user.displayName` 作为 `participantName`
    - 创建 `PracticeSession`（关联 userId 和 participantName），返回 sessionId 和全部题目
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 6.2 实现 `PUT /api/practice/[sessionId]/answer`
    - 支持 `isSkipped: true` 标记跳过，upsert `PracticeAnswer` 记录
    - _Requirements: 8.2_

  - [x] 6.3 实现 `POST /api/practice/[sessionId]/submit`
    - 计算 `durationSecs`（`completedAt - startedAt`）和 `correctCount`，设置 `completedAt`
    - _Requirements: 8.4, 9.2_

  - [ ]* 6.4 为练习 API 编写属性测试
    - **Property 13: 参与者姓名与会话关联**
    - **Property 14: 跳过操作标记正确性**
    - **Validates: Requirements 7.2, 7.3, 8.2**

- [x] 7. 实现排行榜与完成度 API
  - [x] 7.1 实现 `GET /api/leaderboard`
    - 查询所有已完成 PracticeSession，按 `durationSecs ASC` 排序
    - 返回 `{ rank, participantName, durationSecs, correctCount, sessionId }[]`
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 7.2 实现 `GET /api/completion`
    - 计算每道题 CompletionRate，按 `completionRate ASC` 排序返回
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ]* 7.3 为排行榜与完成度编写属性测试
    - **Property 16: 排行榜升序排列**
    - **Property 20: 完成度列表升序排列**
    - **Validates: Requirements 9.2, 10.2**

- [x] 8. 实现个人记录 API
  - [x] 8.1 实现考试记录 API
    - `GET /api/records/exam`：按当前登录用户 userId 查询，按 `startedAt DESC` 返回
    - `GET /api/records/exam/[sessionId]`：验证归属后返回详情（含每题答案对比）
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 8.2 实现练习记录 API
    - `GET /api/records/practice`：按当前登录用户 userId 查询，按 `startedAt DESC` 返回
    - `GET /api/records/practice/[sessionId]`：返回详情（含每题答案、正确答案、isSkipped）
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ]* 8.3 为记录 API 编写属性测试
    - **Property 22: 记录列表降序排列**
    - **Property 23: 考试记录条目字段完整性**
    - **Property 24: 练习记录条目字段完整性**
    - **Validates: Requirements 11.2, 11.4, 12.2, 12.4**

- [x] 9. 实现管理员 API Route Handlers
  - [x] 9.1 实现用户管理 API
    - `GET /api/admin/users`：返回所有用户列表（含 displayName、username、createdAt、lastLoginAt）
    - `POST /api/admin/users/import`：解析 JSON，批量创建用户（bcrypt 哈希密码），跳过格式错误条目并返回结果摘要
    - `PUT /api/admin/users/bulk-update`：解析 JSON，批量更新用户 displayName / username / password
    - `DELETE /api/admin/users/[userId]`：软删除用户（设置 `deletedAt`）
    - 所有接口验证 Admin 角色，否则返回 HTTP 403
    - _Requirements: 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_

  - [x] 9.2 实现题库管理 API
    - `POST /api/admin/questions/import`：解析 JSON，批量导入题目，跳过格式错误条目并返回结果摘要
    - `PUT /api/admin/questions/[questionId]`：更新单道题目
    - `DELETE /api/admin/questions/[questionId]`：删除单道题目
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

  - [x] 9.3 实现管理员记录与统计 API
    - `GET /api/admin/records`：返回所有用户的考试和练习记录
    - `GET /api/admin/stats`：返回注册用户总数、考试总次数、练习总次数
    - _Requirements: 15.1, 15.2, 15.4_

- [x] 10. Checkpoint — 确保所有 API 和工具函数测试通过
  - 运行 `jest --testPathPattern="lib|api"` 确认所有单元测试和属性测试通过
  - 确认 Prisma 迁移无误，数据库 Schema 与模型一致

- [x] 11. 实现核心 UI 组件
  - [x] 11.1 实现 `<Timer />` 组件
    - Props: `durationSeconds: number`, `onExpire: () => void`
    - `useEffect` + `setInterval` 倒计时，剩余 60 秒内变红色警示
    - _Requirements: 3.1_

  - [x] 11.2 实现 `<QuestionCard />` 组件
    - MCQ：四个单选按钮；TFQ：两个单选按钮；CODING：`<textarea>`
    - _Requirements: 5.1, 8.1_

  - [x] 11.3 实现 `<ProgressBar />` 组件
    - 展示当前题号 / 总题数 / 已跳过数
    - _Requirements: 8.3_

  - [x] 11.4 实现 `<ScreenSwitchWarning />` 组件
    - Toast 警告，超过阈值（3 次）时显示额外文本
    - _Requirements: 4.3, 4.5_

  - [x] 11.5 实现 `<Leaderboard />` 组件
    - 渲染排行榜表格，高亮当前用户行
    - _Requirements: 9.1, 9.3, 9.4_

  - [x] 11.6 实现 `<ScoreSummary />` 组件
    - 展示总分、答对/答错数，逐题对比答案
    - _Requirements: 5.3, 5.4_

  - [ ]* 11.7 为 UI 组件编写属性测试
    - **Property 7: 切换次数超阈值警告**
    - **Property 18: 排行榜高亮唯一性**
    - **Validates: Requirements 4.5, 9.4**

- [x] 12. 实现考试模式页面
  - [x] 12.1 实现考试入口页 `app/exam/page.tsx`
    - "开始考试"按钮，调用 `POST /api/exam/start`，成功后跳转至 `/exam/[sessionId]`
    - _Requirements: 2.1, 2.3_

  - [x] 12.2 实现考试答题页 `app/exam/[sessionId]/page.tsx`
    - 集成 `<Timer />`、`<QuestionCard />`、`<ProgressBar />`、`<ScreenSwitchWarning />`
    - 监听 `visibilitychange` 和 `blur` 事件，触发时调用 `/api/exam/[sessionId]/switch`
    - 每 30 秒调用 autosave；Timer 归零时自动提交；"交卷"按钮弹出确认对话框
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 12.3 实现考试结果页 `app/exam/[sessionId]/result/page.tsx`
    - 展示 `<ScoreSummary />`，展示屏幕切换总次数
    - _Requirements: 5.3, 5.4, 4.4_

- [x] 13. 实现练习模式页面
  - [x] 13.1 实现练习入口页 `app/practice/page.tsx`
    - 展示当前登录用户名，点击"开始练习"调用 `POST /api/practice/start`
    - _Requirements: 7.1_

  - [x] 13.2 实现练习答题页 `app/practice/[sessionId]/page.tsx`
    - 集成 `<QuestionCard />`、`<ProgressBar />`，"跳过"按钮标记跳过
    - 所有题目完成后提交，跳转至结果页
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 13.3 实现练习结果页 `app/practice/[sessionId]/result/page.tsx`
    - 展示每题答案对比，集成 `<Leaderboard />`（高亮当前 session），每 30 秒轮询刷新
    - _Requirements: 8.5, 9.1, 9.4, 9.5_

- [x] 14. 实现排行榜与完成度统计页面
  - [x] 14.1 实现独立排行榜页 `app/leaderboard/page.tsx`
    - 展示 `<Leaderboard />`，每 30 秒轮询刷新
    - _Requirements: 9.1, 9.5_

  - [x] 14.2 实现题目完成度统计页 `app/completion/page.tsx`
    - 展示所有题目 CompletionRate（升序），每 30 秒轮询刷新
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 15. 实现个人记录页面
  - [x] 15.1 实现历史考试记录列表页 `app/records/exam/page.tsx`
    - 展示当前用户所有 ExamSession，按 `startedAt DESC`
    - _Requirements: 11.1, 11.2, 11.4_

  - [x] 15.2 实现考试详情页 `app/records/exam/[sessionId]/page.tsx`
    - 展示每道题用户答案与正确答案
    - _Requirements: 11.3_

  - [x] 15.3 实现历史练习记录列表页 `app/records/practice/page.tsx`
    - 展示当前用户所有 PracticeSession，按 `startedAt DESC`
    - _Requirements: 12.1, 12.2, 12.4_

  - [x] 15.4 实现练习详情页 `app/records/practice/[sessionId]/page.tsx`
    - 展示每道题用户答案、正确答案和是否跳过
    - _Requirements: 12.3_

- [x] 16. 实现管理员后台页面
  - [x] 16.1 实现管理员后台布局 `app/admin/layout.tsx`
    - 侧边栏导航：用户管理、题库管理、记录查看、统计数据
    - 服务端验证 Admin 角色，非管理员返回 403 页面
    - _Requirements: 13.1_

  - [x] 16.2 实现用户管理页 `app/admin/users/page.tsx`
    - 展示用户列表（displayName、username、createdAt、lastLoginAt）
    - JSON 文件上传批量导入用户，展示导入结果摘要（成功/跳过/错误）
    - JSON 文件上传批量修改用户信息
    - 单个用户删除按钮（确认后软删除）
    - _Requirements: 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_

  - [x] 16.3 实现题库管理页 `app/admin/questions/page.tsx`
    - 展示题目列表，支持编辑和删除单道题目
    - JSON 文件上传批量导入题目（考试题库 / 练习题库），展示导入结果摘要
    - _Requirements: 14.1, 14.2, 14.6, 14.7, 15.3_

  - [x] 16.4 实现记录查看页 `app/admin/records/page.tsx`
    - 展示所有用户的考试记录和练习记录列表
    - _Requirements: 15.1, 15.2_

  - [x] 16.5 实现统计数据页 `app/admin/stats/page.tsx`
    - 展示注册用户总数、考试总次数、练习总次数
    - _Requirements: 15.4_

- [x] 17. 实现全局布局与导航
  - [x] 17.1 实现根布局 `app/layout.tsx`
    - 统一导航栏：首页、考试、练习、排行榜、个人记录、退出登录
    - 管理员额外显示"管理后台"入口
    - TailwindCSS 响应式布局
    - _Requirements: 16.2, 16.3, 16.4_

  - [x] 17.2 实现首页 `app/page.tsx`
    - 展示平台介绍，包含考试模式、练习模式、个人记录三个导航入口卡片
    - _Requirements: 16.1_

  - [x] 17.3 实现错误与 404 页面
    - `app/not-found.tsx`、`app/error.tsx`、`app/admin/403.tsx`
    - _Requirements: 16.3, 13.1_

- [x] 18. 题库数据 Seed 脚本
  - 在 `prisma/seed.ts` 中插入示例 Python 题目（至少 25 MCQ、10 TFQ、3 CODING）
  - 在 `package.json` 中配置 `prisma.seed` 命令
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 19. Final Checkpoint — 确保所有测试通过
  - 运行完整测试套件，确认所有单元测试和属性测试通过
  - 检查所有页面路由可正常访问，无 TypeScript 类型错误
  - 确认响应式布局在移动端和桌面端均正常显示

## Notes

- 标有 `*` 的子任务为可选测试任务，可跳过以加快 MVP 进度
- 管理员账号通过环境变量 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 配置，seed 脚本初始化
- 认证使用 NextAuth.js Credentials Provider + Session Cookie，无需第三方 OAuth
- 用户 JSON 导入格式：`[{ "displayName": "张三", "username": "zhangsan", "password": "xxx" }]`
- 题目 JSON 导入格式：每条包含 `type`、`category`、`content` 及对应题型字段
- 排行榜和完成度统计采用 30 秒客户端轮询实现实时更新
- 属性测试使用 `fast-check` 库，注释格式：`// Feature: python-quiz-platform, Property N: <property_text>`
