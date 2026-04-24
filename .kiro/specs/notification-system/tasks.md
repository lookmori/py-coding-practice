# Implementation Plan: Notification System

## Overview

基于 Next.js 14 App Router + Prisma + SSE 实现站内消息通知系统。按以下顺序递进实现：数据层 → 服务层 → API 层 → 前端组件 → 集成评分 API → 通知列表页。

## Tasks

- [x] 1. 数据层：Prisma Schema 新增 Notification 模型
  - 在 `prisma/schema.prisma` 中新增 `Notification` 模型，包含字段：`id`（cuid 主键）、`recipientId`（外键 → User）、`sessionType`（String）、`sessionId`（String）、`answerId`（String）、`questionContent`（String）、`isRead`（Boolean，默认 false）、`createdAt`（DateTime，默认 now）
  - 添加 `@@index([recipientId, isRead])` 和 `@@index([recipientId, createdAt])` 索引
  - 在 `recipient` 关系上设置 `onDelete: Cascade`
  - 在 `User` 模型中新增反向关系字段 `notifications Notification[]`
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 2. 数据层：执行 Prisma 迁移
  - 运行 `npx prisma migrate dev --name add-notification` 生成并应用迁移文件
  - 运行 `npx prisma generate` 更新 Prisma Client 类型
  - _Requirements: 7.1_

- [x] 3. 服务层：实现 SSE 连接注册表 `lib/sseStore.ts`
  - 创建 `lib/sseStore.ts`，使用进程内 `Map<string, ReadableStreamDefaultController<Uint8Array>>` 存储每个 userId 的活跃 SSE 控制器
  - 实现 `registerSSE(userId, controller)`：若已存在旧连接则先调用旧 controller 的 `close()`，再注册新连接（需求 9.10）
  - 实现 `unregisterSSE(userId)`：从 Map 中移除对应条目
  - 实现 `pushSSE(userId, event, data)`：若连接存在则 enqueue SSE 格式字节，返回 boolean 表示是否推送成功
  - SSE 帧格式：`event: <event>\ndata: <JSON>\n\n`
  - _Requirements: 9.5, 9.7, 9.9, 9.10_

- [x] 4. 服务层：实现通知创建与推送 `lib/notificationService.ts`
  - 创建 `lib/notificationService.ts`，导出 `CreateNotificationInput` 接口和 `createAndPushNotification` 函数
  - `createAndPushNotification` 内部：将 `questionContent` 截取前 100 字符，调用 `prisma.notification.create` 写入记录，然后调用 `pushSSE` 推送 `new-notification` 事件（含 `id`、`sessionType`、`sessionId`、`answerId`、`questionContent`、`createdAt` 字段）
  - 整个函数用 try/catch 包裹，失败时仅 `console.error`，不抛出异常（需求 1.10）
  - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 9.5, 9.6_

- [x] 5. API：SSE 长连接端点 `app/api/notifications/stream/route.ts`
  - 创建 `app/api/notifications/stream/route.ts`，实现 `GET` handler
  - 验证 session：未认证返回 401，非 STUDENT 角色返回 403（需求 9.3, 9.4）
  - 创建 `ReadableStream`，在 `start(controller)` 中调用 `registerSSE(userId, controller)`，立即推送 `connected` 事件（需求 9.2）
  - 启动心跳定时器，每 25 秒向 controller enqueue `: ping\n\n` 注释帧（需求 9.8）
  - 监听 `req.signal` 的 `abort` 事件，触发时调用 `unregisterSSE(userId)` 并 `clearInterval`（需求 9.9）
  - 返回 `Response` 设置 headers：`Content-Type: text/event-stream`、`Cache-Control: no-cache`、`Connection: keep-alive`
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.8, 9.9, 9.10_

- [x] 6. API：未读数查询 `app/api/notifications/unread-count/route.ts`
  - 创建 `app/api/notifications/unread-count/route.ts`，实现 `GET` handler
  - 验证 session：未认证返回 401，非 STUDENT 返回 403（需求 2.3, 2.4）
  - 调用 `prisma.notification.count({ where: { recipientId: userId, isRead: false } })`
  - 返回 `{ count: <integer> }` HTTP 200（需求 2.2, 2.5）
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 7. API：分页通知列表 `app/api/notifications/route.ts`
  - 创建 `app/api/notifications/route.ts`，实现 `GET` handler
  - 验证 session：未认证返回 401，非 STUDENT 返回 403（需求 3.7, 3.8）
  - 解析 `page`（默认 1）和 `pageSize`（默认 20，最大强制截断为 50）查询参数
  - 调用 `prisma.notification.findMany`，`where: { recipientId: userId }`，`orderBy: { createdAt: "desc" }`，`skip`/`take` 分页
  - 同时查询 `prisma.notification.count` 获取 total
  - 返回 `{ items, total, page, pageSize, totalPages }`，items 仅包含 DTO 字段（需求 3.6）
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 8. API：标记单条已读 `app/api/notifications/[id]/read/route.ts`
  - 创建 `app/api/notifications/[id]/read/route.ts`，实现 `PATCH` handler
  - 验证 session：未认证返回 401，非 STUDENT 返回 403（需求 4.7, 4.8）
  - 查询通知记录，不存在返回 404，`recipientId` 不匹配返回 403（需求 4.3, 4.4）
  - 若 `isRead` 已为 true，直接返回 200（幂等，需求 4.5）
  - 否则调用 `prisma.notification.update` 设置 `isRead: true`，返回 200
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 4.8_

- [x] 9. API：全部标记已读 `app/api/notifications/read-all/route.ts`
  - 创建 `app/api/notifications/read-all/route.ts`，实现 `PATCH` handler
  - 验证 session：未认证返回 401，非 STUDENT 返回 403（需求 4.7, 4.8）
  - 调用 `prisma.notification.updateMany({ where: { recipientId: userId, isRead: false }, data: { isRead: true } })`
  - 返回 HTTP 200
  - _Requirements: 4.6, 4.7, 4.8_

- [x] 10. API：删除单条通知 `app/api/notifications/[id]/route.ts`
  - 在 `app/api/notifications/[id]/route.ts` 中实现 `DELETE` handler（与 read 路由同目录，分别建文件）
  - 验证 session：未认证返回 401，非 STUDENT 返回 403（需求 10.8, 10.9）
  - 查询通知，不存在返回 404，`recipientId` 不匹配返回 403（需求 10.3, 10.4）
  - 删除记录；若被删通知 `isRead = false`，调用 `pushSSE(userId, "notification-deleted", { id })` 推送事件（需求 10.7）
  - 返回 HTTP 200
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.7, 10.8, 10.9_

- [x] 11. API：批量删除已读通知 `app/api/notifications/read/route.ts`
  - 创建 `app/api/notifications/read/route.ts`，实现 `DELETE` handler
  - 验证 session：未认证返回 401，非 STUDENT 返回 403（需求 10.8, 10.9）
  - 调用 `prisma.notification.deleteMany({ where: { recipientId: userId, isRead: true } })`
  - 返回 `{ deletedCount: <integer> }` HTTP 200（需求 10.6）
  - _Requirements: 10.5, 10.6, 10.8, 10.9_

- [x] 12. Checkpoint — 确认 API 层完整
  - 确保所有 API 路由文件已创建，TypeScript 无编译错误，ask the user if questions arise.

- [x] 13. 集成评分 API：teacher grading 调用 notificationService
  - 修改 `app/api/teacher/grading/[answerId]/route.ts`
  - 在 `PUT` handler 中，评分更新成功后，查询答题记录关联的 `question.content` 和 session 的 `userId`
  - 调用 `createAndPushNotification({ recipientId, sessionType, sessionId, answerId, questionContent })`
  - 通知调用放在评分 DB 操作之后，失败不影响评分响应（需求 1.10）
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 14. 集成评分 API：admin grade 调用 notificationService
  - 修改 `app/api/admin/grade/route.ts`
  - 在 `POST` handler 中，评分更新成功后，查询答题记录关联的 `question.content` 和 session 的 `userId`
  - 调用 `createAndPushNotification({ recipientId, sessionType, sessionId, answerId, questionContent })`
  - 通知调用放在评分 DB 操作之后，失败不影响评分响应（需求 1.10）
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 15. 前端：NotificationBadge 组件 `components/NotificationBadge.tsx`
  - 创建 `components/NotificationBadge.tsx`，仅在 session 用户角色为 STUDENT 时渲染
  - `useEffect` 中初始化时 fetch `GET /api/notifications/unread-count` 设置初始 `unreadCount` state
  - `useEffect` 中建立 SSE 连接（`new EventSource("/api/notifications/stream")`），监听 `new-notification` 事件（unreadCount + 1）和 `notification-deleted` 事件（重新 fetch unread-count）（需求 6.7, 6.8）
  - 组件卸载时关闭 SSE 连接
  - 实现 `formatBadgeCount(n)` 纯函数：n=0 返回 null（隐藏角标），1≤n≤99 返回数字字符串，n>99 返回 `"99+"`（需求 6.2, 6.3, 6.4）
  - 渲染一个带角标的通知图标按钮，点击跳转 `/notifications`
  - 导出 `unreadCount` 供外部使用（或通过 Context），支持外部调用 `refresh()` 重新拉取未读数（需求 6.5）
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [x] 16. 前端：Navbar 集成 NotificationBadge
  - 修改 `components/Navbar.tsx`，在 Desktop nav 的 User area 区域引入 `<NotificationBadge />`
  - 仅当 `session?.user?.role === "STUDENT"` 时渲染（需求 6.6）
  - 在移动端菜单中同样集成（可选，保持一致性）
  - _Requirements: 6.1, 6.6_

- [x] 17. 前端：通知列表页 `app/notifications/page.tsx`
  - 创建 `app/notifications/page.tsx`（Client Component）
  - 初始化时 fetch `GET /api/notifications?page=1&pageSize=20` 加载第一页
  - 渲染通知列表，每条通知显示：`questionContent`（截断展示）、`sessionType` 标签、`createdAt` 格式化时间、已读/未读状态
  - 点击通知：调用 `PATCH /api/notifications/[id]/read`，然后跳转至对应记录页（`/records/exam/[sessionId]` 或 `/records/practice/[sessionId]`）（需求 5.1, 5.2, 5.3, 5.4）
  - 实现"全部标记已读"按钮，调用 `PATCH /api/notifications/read-all`
  - 实现单条删除按钮，调用 `DELETE /api/notifications/[id]`
  - 实现"删除已读"按钮，调用 `DELETE /api/notifications/read`
  - 实现分页控件，支持翻页（需求 3.4）
  - 操作后刷新列表和未读数（需求 6.5）
  - _Requirements: 3.1, 3.3, 3.4, 3.5, 4.1, 4.6, 5.1, 5.2, 5.3, 5.4, 10.1, 10.5_

- [ ] 18. 测试：纯函数单元测试
  - [ ]* 18.1 为 `formatBadgeCount` 编写单元测试
    - 测试边界值：0、1、99、100
    - _Requirements: 6.2, 6.3, 6.4_
  - [ ]* 18.2 为 `buildNotificationUrl` 编写单元测试
    - 测试 sessionType="exam" 和 "practice" 两种情况
    - _Requirements: 5.1, 5.2_

- [ ] 19. 测试：属性测试
  - [ ]* 19.1 Property 7 — 角标显示逻辑属性测试
    - **Property 7: 角标显示逻辑**
    - **Validates: Requirements 6.2, 6.3, 6.4**
    - 使用 fast-check 生成随机非负整数，断言 `formatBadgeCount` 满足三段规则
  - [ ]* 19.2 Property 6 — 通知跳转 URL 映射正确性属性测试
    - **Property 6: 通知跳转 URL 映射正确性**
    - **Validates: Requirements 5.1, 5.2**
    - 使用 fast-check 生成随机 sessionType 和 sessionId，断言 `buildNotificationUrl` 输出
  - [ ]* 19.3 Property 5 — 标记已读幂等性属性测试
    - **Property 5: 标记已读幂等性**
    - **Validates: Requirements 4.5**
    - Mock prisma，生成随机通知（isRead 随机），调用 read handler 1~5 次，断言每次均返回 200 且最终 isRead=true
  - [ ]* 19.4 Property 3 — 未读数准确性属性测试
    - **Property 3: 未读数准确性**
    - **Validates: Requirements 2.2**
    - Mock prisma.notification.count，生成随机未读数，断言 unread-count handler 返回值与 mock 一致
  - [ ]* 19.5 Property 1 — 评分后通知字段完整性属性测试
    - **Property 1: 评分后通知字段完整性**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8**
    - Mock prisma，生成随机 userId/sessionId/answerId/questionContent，调用 `createAndPushNotification`，断言 prisma.notification.create 被以正确字段调用（questionContent 截取前 100 字符，isRead=false）
  - [ ]* 19.6 Property 2 — 通知创建失败不中断评分属性测试
    - **Property 2: 通知创建失败不中断评分**
    - **Validates: Requirements 1.10**
    - Mock `prisma.notification.create` 抛出随机错误，调用 `createAndPushNotification`，断言函数不抛出异常

- [x] 20. Final Checkpoint — 确保所有测试通过
  - 确保所有测试通过，ask the user if questions arise.

## Notes

- 标有 `*` 的子任务为可选测试任务，可跳过以加快 MVP 交付
- 每个任务均引用具体需求条款以保证可追溯性
- 任务 2（Prisma 迁移）需在本地数据库环境中手动执行：`npx prisma migrate dev --name add-notification`
- SSE 连接注册表使用进程内 Map，适合单实例部署；多实例场景需替换为 Redis Pub/Sub
- 属性测试使用 fast-check，运行命令：`npx jest --testPathPattern=property` 或项目对应测试命令加 `--run` 标志
