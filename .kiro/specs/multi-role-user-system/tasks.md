# Implementation Plan: Multi-Role User System

## Overview

将现有双角色（USER / ADMIN）体系扩展为三角色（ADMIN / TEACHER / STUDENT），引入 `School` 实体作为数据隔离边界，实现老师只能管理本校数据的权限隔离目标。

## Tasks

- [x] 1. Prisma Schema 变更与数据库迁移
  - [x] 1.1 扩展 `UserRole` 枚举，新增 `TEACHER` 和 `STUDENT` 值，保留 `USER` 值（迁移前不删除）
    - 修改 `prisma/schema.prisma` 中的 `UserRole` 枚举
    - _Requirements: 1.1_
  - [x] 1.2 新增 `BankVisibility` 枚举（`PUBLIC` / `PRIVATE`）
    - 修改 `prisma/schema.prisma`
    - _Requirements: 12.2_
  - [x] 1.3 新增 `School` 模型（`id`、`name`、`code` unique、`createdAt`）
    - 修改 `prisma/schema.prisma`
    - _Requirements: 9.1, 2.1_
  - [x] 1.4 扩展 `User` 模型，新增 `schoolId`（可空）、`teacherId`（可空）字段及关联关系，将默认角色改为 `STUDENT`
    - 修改 `prisma/schema.prisma`
    - _Requirements: 9.2_
  - [x] 1.5 扩展 `QuestionBank` 模型，新增 `visibility`（默认 `PRIVATE`）、`createdById`、`schoolId` 字段及关联关系
    - 修改 `prisma/schema.prisma`
    - _Requirements: 12.2_
  - [x] 1.6 生成并执行 Prisma 迁移（`prisma migrate dev`），确认 DDL 变更正确
    - _Requirements: 1.1, 9.1, 9.2_
  - [x] 1.7 编写数据迁移脚本 `scripts/migrate-roles.ts`，将所有 `role = USER` 记录更新为 `role = STUDENT`，并验证无残留
    - 脚本需打印迁移数量，若有残留则以非零退出码退出
    - _Requirements: 1.2_
  - [ ]* 1.8 为迁移脚本编写属性测试
    - **Property 1: USER 角色迁移完整性** — 迁移后不存在 `role = USER` 的记录
    - **Property 2: ADMIN 角色迁移不变性** — 迁移后所有 ADMIN 记录不受影响
    - **Validates: Requirements 1.2, 1.3**

- [x] 2. 账号格式校验工具（`lib/account.ts`）
  - [x] 2.1 新建 `lib/account.ts`，实现 `SCHOOL_CODE_REGEX`、`ACCOUNT_FORMAT_REGEX`、`validateSchoolCode()`、`validateAccountFormat()`、`extractSchoolCode()`
    - _Requirements: 2.2, 3.4, 4.5_
  - [ ]* 2.2 为 `validateSchoolCode()` 编写属性测试
    - **Property 3: School_Code 格式校验** — 当且仅当字符串匹配 `/^[A-Za-z0-9]{4}$/` 时返回 true
    - **Validates: Requirements 2.2, 2.6**
  - [ ]* 2.3 为 `validateAccountFormat()` 和 `extractSchoolCode()` 编写属性测试
    - **Property 6: 账号格式校验** — 当且仅当字符串匹配 `/^[A-Za-z0-9]{4}_.+$/` 时返回 true
    - **Validates: Requirements 3.4, 4.5**

- [x] 3. NextAuth Session 类型扩展与认证回调更新
  - [x] 3.1 新建 `types/next-auth.d.ts`，扩展 `Session.user` 和 `JWT` 类型，新增 `schoolId?`、`teacherId?` 字段
    - _Requirements: 8.1_
  - [x] 3.2 修改 `lib/auth.ts` 的 `authorize` 回调，查询用户时同时获取 `schoolId` 和 `teacherId`，并写入返回对象
    - _Requirements: 8.1, 8.4, 8.5_
  - [x] 3.3 修改 `lib/auth.ts` 的 `jwt` 和 `session` 回调，将 `schoolId`、`teacherId` 从 token 传递到 session
    - _Requirements: 8.1, 8.4, 8.5_
  - [ ]* 3.4 为 Session 字段完整性编写属性测试
    - **Property 15: Session 角色字段完整性** — 老师 session 含 `schoolId`，学生 session 含 `schoolId` 和 `teacherId`
    - **Validates: Requirements 8.1, 8.4, 8.5**

- [x] 4. `lib/auth.ts` 权限工具函数扩展
  - [x] 4.1 新增 `requireTeacher()`、`requireStudent()` 函数，角色不匹配时抛出 HTTP 403
    - _Requirements: 5.6, 7.5_
  - [x] 4.2 新增 `requireSameSchool(session, targetSchoolId)` 函数，ADMIN 跳过校验，其他角色 schoolId 不匹配时抛出 HTTP 403
    - _Requirements: 5.1, 5.4_
  - [x] 4.3 新增 `requireTeacherOwnsStudent(session, studentId)` 函数，查询学生 schoolId 并与 session.schoolId 比对
    - _Requirements: 4.7, 6.2_
  - [ ]* 4.4 为权限函数编写属性测试
    - **Property 11: 跨校操作权限拒绝** — 老师 T 操作 `schoolId ≠ T.schoolId` 的学生时返回 403
    - **Property 12: 老师路由角色校验** — ADMIN 或 STUDENT 访问 teacher 路由返回 403
    - **Property 13: 管理员路由角色校验** — TEACHER 或 STUDENT 访问 admin 路由返回 403
    - **Validates: Requirements 4.7, 5.4, 5.6, 7.5**

- [x] 5. Middleware 路由守卫扩展
  - [x] 5.1 修改 `middleware.ts`，新增 `/teacher/*` 路由守卫：非 TEACHER 角色重定向至 `/403`
    - _Requirements: 10.4, 10.5_
  - [x] 5.2 确认 `/admin/*` 守卫逻辑保持不变（非 ADMIN 重定向 `/403`）
    - _Requirements: 7.5_

- [x] 6. Checkpoint — 确认基础层通过
  - 确保 Prisma schema 编译无误，`lib/account.ts`、`lib/auth.ts`、`types/next-auth.d.ts`、`middleware.ts` 无 TypeScript 错误，所有已编写的测试通过。

- [x] 7. `/api/admin/schools` 路由（学校 CRUD）
  - [x] 7.1 新建 `app/api/admin/schools/route.ts`，实现 `GET`（列表含 teacherCount / studentCount）和 `POST`（创建学校，校验 School_Code 格式和唯一性）
    - 使用 `requireAdmin()` 鉴权
    - 使用 `validateSchoolCode()` 校验格式
    - _Requirements: 2.1, 2.2, 2.3, 2.5_
  - [ ]* 7.2 为学校数据往返一致性编写属性测试
    - **Property 4: 学校数据往返一致性** — 创建后查询，`name` 和 `code` 与创建时一致
    - **Property 5: 学校列表字段完整性** — 列表条目包含 `teacherCount` 和 `studentCount`
    - **Validates: Requirements 2.1, 2.5**
  - [x] 7.3 新建 `app/api/admin/schools/[schoolId]/route.ts`，实现 `PUT`（修改学校名称，禁止修改 code）
    - _Requirements: 2.4_

- [x] 8. `/api/admin/users` 路由调整（支持三角色创建）
  - [x] 8.1 修改 `app/api/admin/users/route.ts` 的 `POST` 处理器，支持创建 ADMIN / TEACHER / STUDENT 三种角色
    - 创建 TEACHER / STUDENT 时校验账号格式（`validateAccountFormat()`）
    - 创建 TEACHER 时通过 School_Code 前缀自动关联 schoolId
    - 创建 STUDENT 时要求传入 schoolId 和 teacherId，并校验 teacher.schoolId === student.schoolId
    - _Requirements: 7.3, 3.1, 3.2, 4.1, 4.3, 9.4, 9.5_
  - [ ]* 8.2 为用户名唯一性和跨校一致性编写属性测试
    - **Property 16: 用户名全局唯一性** — 相同 username 第二次创建应失败
    - **Property 17: 学生-老师跨校一致性校验** — teacherId 指向的老师 schoolId 与学生 schoolId 不一致时返回错误
    - **Validates: Requirements 9.4, 9.5**
  - [ ]* 8.3 为禁止自行注册和学生无法创建用户编写属性测试
    - **Property 18: 禁止自行注册** — 未认证请求返回 401
    - **Property 20: 学生无法创建用户** — STUDENT 角色调用创建接口返回 403
    - **Validates: Requirements 11.1, 11.5, 11.6**
  - [x] 8.4 修改 `app/api/admin/users/route.ts` 的 `GET` 处理器，支持按角色过滤（`?role=TEACHER` 等）
    - _Requirements: 7.1, 3.5_

- [x] 9. `/api/teacher/*` 路由集
  - [x] 9.1 新建 `app/api/teacher/students/route.ts`，实现 `GET`（本校学生列表）和 `POST`（创建本校学生）
    - 使用 `requireTeacher()` 鉴权
    - POST 时强制 `schoolId = session.user.schoolId`，`teacherId = session.user.id`
    - 校验账号格式
    - _Requirements: 4.1, 4.2, 4.4, 11.3_
  - [ ]* 9.2 为老师学生列表数据隔离编写属性测试
    - **Property 9: 学生自动关联老师和学校** — 老师创建的学生 schoolId 和 teacherId 自动填充
    - **Property 10: 老师学生列表数据隔离** — 返回的所有学生 schoolId 均等于老师的 schoolId
    - **Validates: Requirements 4.2, 4.4, 5.1**
  - [ ]* 9.3 为老师只能创建本校学生编写属性测试
    - **Property 19: 老师只能创建本校学生** — 老师尝试创建 `schoolId ≠ T.schoolId` 的学生时返回 403
    - **Validates: Requirements 11.3, 11.4**
  - [x] 9.4 新建 `app/api/teacher/students/[userId]/route.ts`，实现 `PUT`（修改）和 `DELETE`（软删除）
    - 使用 `requireTeacherOwnsStudent()` 校验归属
    - _Requirements: 4.7, 4.8_
  - [x] 9.5 新建 `app/api/teacher/students/reset-password/route.ts`，实现 `POST`（重置本校学生密码）
    - _Requirements: 4.6_
  - [x] 9.6 新建 `app/api/teacher/records/exam/route.ts`，实现 `GET`（本校考试记录，按 schoolId 过滤）
    - _Requirements: 5.2_
  - [x] 9.7 新建 `app/api/teacher/records/practice/route.ts`，实现 `GET`（本校练习记录，按 schoolId 过滤）
    - _Requirements: 5.3_
  - [x] 9.8 新建 `app/api/teacher/grading/[answerId]/route.ts`，实现 `PUT`（提交编程题评分和评语）
    - 校验分数为非负整数且不超过题目最高分值
    - 使用 `requireTeacherOwnsStudent()` 校验答案归属
    - _Requirements: 6.1, 6.2, 6.4, 6.5_
  - [ ]* 9.9 为评分范围校验编写属性测试
    - **Property 24: 老师评分范围校验** — `0 ≤ S ≤ M` 时成功，`S < 0` 或 `S > M` 时返回校验错误
    - **Property 25: 编程题答案原文完整性** — 任意长度和内容的答案文本查询时与存储时完全一致
    - **Validates: Requirements 6.4, 6.5, 6.3**
  - [x] 9.10 新建 `app/api/teacher/banks/route.ts`，实现 `GET`（本校可访问题库列表）和 `POST`（创建题库，自动填充 createdById 和 schoolId）
    - _Requirements: 12.1, 12.6_
  - [x] 9.11 新建 `app/api/teacher/stats/route.ts`，实现 `GET`（本校统计数据：考试人数、练习人数、平均分）
    - _Requirements: 5.5_

- [x] 10. 题库 visibility 功能（后端过滤）
  - [x] 10.1 修改 `app/api/exam/start/route.ts` 和 `app/api/practice/start/route.ts`，在查询可用题库时加入 visibility 过滤逻辑
    - PUBLIC 题库：所有学生可访问
    - PRIVATE 题库：仅 `bank.schoolId = student.schoolId` 的学生可访问
    - _Requirements: 12.3, 12.4, 12.5_
  - [ ]* 10.2 为题库可见性编写属性测试
    - **Property 21: 题库可见性往返一致性** — 创建后查询 `visibility` 与创建时一致
    - **Property 22: 公开题库全校可访问** — PUBLIC 题库任意学生可访问（HTTP 200）
    - **Property 23: 私有题库跨校访问拒绝** — PRIVATE 题库跨校学生访问返回 403
    - **Validates: Requirements 12.2, 12.3, 12.4, 12.5**
  - [x] 10.3 修改 `app/api/admin/banks/route.ts`，支持在创建/更新题库时设置 `visibility` 字段
    - _Requirements: 12.2_

- [x] 11. Checkpoint — 确认 API 层通过
  - 确保所有 `/api/admin/*` 和 `/api/teacher/*` 路由 TypeScript 无错误，所有已编写的测试通过，权限拒绝场景返回正确状态码。

- [x] 12. 管理员后台 UI — 学校管理页面
  - [x] 12.1 新建 `app/admin/schools/page.tsx` 和 `app/admin/schools/SchoolsClient.tsx`，实现学校列表展示（含 teacherCount / studentCount）
    - _Requirements: 2.5, 10.1_
  - [x] 12.2 在 `SchoolsClient.tsx` 中实现创建学校表单（name、code 输入，前端格式校验）
    - _Requirements: 2.1, 2.2, 2.6_
  - [x] 12.3 在 `SchoolsClient.tsx` 中实现修改学校名称功能（code 字段只读）
    - _Requirements: 2.4_
  - [x] 12.4 在 `app/admin/AdminSidebar.tsx` 中新增"学校管理"导航入口
    - _Requirements: 10.1_

- [x] 13. 管理员后台 UI — 用户管理扩展
  - [x] 13.1 修改 `app/admin/users/UsersClient.tsx`，新增角色过滤 Tab（全部 / ADMIN / TEACHER / STUDENT）
    - _Requirements: 7.1_
  - [x] 13.2 修改用户创建表单，支持选择角色，并根据角色动态显示 schoolId / teacherId 选择器
    - _Requirements: 7.3, 3.1, 4.1_
  - [x] 13.3 修改 `app/admin/users/UserActions.tsx`，确保软删除和重置密码功能对三种角色均可用
    - _Requirements: 7.3, 7.4_

- [x] 14. 老师后台 UI — 页面集
  - [x] 14.1 新建 `app/teacher/layout.tsx` 和 `app/teacher/TeacherSidebar.tsx`，包含"学生管理"、"题库管理"、"考试管理"、"考试记录"、"练习记录"、"评分"导航
    - _Requirements: 10.2_
  - [x] 14.2 新建 `app/teacher/students/page.tsx` 和 `app/teacher/students/StudentsClient.tsx`，实现本校学生列表、创建、修改、软删除、重置密码功能
    - _Requirements: 4.1, 4.4, 4.6, 4.8_
  - [x] 14.3 新建 `app/teacher/records/exam/page.tsx`，展示本校考试记录列表
    - _Requirements: 5.2_
  - [x] 14.4 新建 `app/teacher/records/practice/page.tsx`，展示本校练习记录列表
    - _Requirements: 5.3_
  - [x] 14.5 新建 `app/teacher/grading/page.tsx` 和 `app/teacher/grading/GradingClient.tsx`，展示待评分编程题列表，支持提交分数和评语
    - _Requirements: 6.1, 6.3, 6.4_
  - [x] 14.6 新建 `app/teacher/questions/page.tsx`，复用或适配现有题库管理 UI，限定为本校题库，支持设置 visibility
    - _Requirements: 12.1, 12.2, 12.6_

- [ ] 15. 老师账号自动关联学校属性测试
  - [ ]* 15.1 为老师账号自动关联学校编写属性测试
    - **Property 7: 老师账号自动关联学校** — 创建后 `user.schoolId` 等于 `code = SC` 的学校 id
    - **Validates: Requirements 3.2**
  - [ ]* 15.2 为老师列表字段完整性编写属性测试
    - **Property 8: 老师列表字段完整性** — 列表条目包含 `username`、`displayName`、学校信息、`createdAt`
    - **Validates: Requirements 3.5**
  - [ ]* 15.3 为管理员全局数据访问编写属性测试
    - **Property 14: 管理员全局数据访问** — 管理员查询记录时返回所有学校数据，不受 schoolId 过滤
    - **Validates: Requirements 7.1, 7.2**

- [x] 16. Final Checkpoint — 确保所有测试通过
  - 确保所有测试通过，TypeScript 编译无错误，所有 Property 1–25 对应的属性测试均已实现并通过，询问用户是否有遗留问题。

## Notes

- 标有 `*` 的子任务为可选测试任务，可跳过以加快 MVP 进度
- 每个任务均引用具体需求条款以保证可追溯性
- 属性测试使用 **fast-check** 库，每个属性至少运行 100 次迭代
- 属性测试注释格式：`// Feature: multi-role-user-system, Property N: <property_text>`
- 迁移脚本（Task 1.7）需在测试环境验证后再在生产环境执行
- Task 1.6 的 Prisma 迁移需手动执行：`npx prisma migrate dev`
