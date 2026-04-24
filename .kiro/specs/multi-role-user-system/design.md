# Design Document: Multi-Role User System

## Overview

本功能将现有 Python 答题平台的用户体系从双角色（USER / ADMIN）扩展为三角色（ADMIN / TEACHER / STUDENT），并引入 `School` 实体作为数据隔离边界。

### 核心目标

- 引入 `School` 实体，作为老师和学生的归属单位
- 老师只能管理和查看本校数据（权限隔离）
- 管理员保留全局访问权限
- 账号格式统一为 `{School_Code}_{username}`（老师和学生）
- 题库支持公开/私有可见性控制

### 技术栈

| 层次 | 技术 |
|------|------|
| 框架 | Next.js 14 App Router |
| ORM | Prisma |
| 数据库 | PostgreSQL（Vercel Postgres） |
| 认证 | NextAuth.js（JWT Strategy） |
| 样式 | TailwindCSS |

---

## Architecture

### 权限分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  /admin/*    │  │  /teacher/*  │  │  /exam /practice   │ │
│  │  (ADMIN UI)  │  │  (TEACHER UI)│  │  (STUDENT UI)      │ │
│  └──────┬───────┘  └──────┬───────┘  └─────────┬──────────┘ │
└─────────┼─────────────────┼───────────────────┼─────────────┘
          │                 │                   │
┌─────────▼─────────────────▼───────────────────▼─────────────┐
│                    Next.js Middleware                         │
│  Role-based route guard: /admin/* → ADMIN only               │
│                          /teacher/* → TEACHER only           │
│                          /api/admin/* → ADMIN only           │
│                          /api/teacher/* → TEACHER only       │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                    Route Handlers (/api/*)                    │
│  ┌──────────────────┐  ┌──────────────────┐                  │
│  │  requireAdmin()  │  │  requireTeacher() │                  │
│  │  requireAuth()   │  │  requireSchool()  │                  │
│  └──────────────────┘  └──────────────────┘                  │
│                    Permission_Guard Layer                     │
└─────────────────────────────┬───────────────────────────────┘
                              │ Prisma Client
┌─────────────────────────────▼───────────────────────────────┐
│                       PostgreSQL                              │
│  School / User(+schoolId,teacherId) / QuestionBank(+visibility) │
└─────────────────────────────────────────────────────────────┘
```

### 路由结构

```
/login                        → 登录页（所有角色）
/                             → 首页（按角色重定向）
/admin/*                      → 管理员后台（ADMIN only）
  /admin/schools              → 学校管理
  /admin/users                → 用户管理（全角色）
  /admin/questions            → 题库管理（全局）
  /admin/records              → 全平台记录
  /admin/stats                → 全平台统计
/teacher/*                    → 老师后台（TEACHER only）
  /teacher/students           → 本校学生管理
  /teacher/questions          → 题库管理（本校）
  /teacher/exams              → 考试管理
  /teacher/records/exam       → 本校考试记录
  /teacher/records/practice   → 本校练习记录
  /teacher/grading            → 编程题评分
/exam /practice /records/*    → 学生答题界面（STUDENT）
/403                          → 无权限页面
```

---

## Components and Interfaces

### Permission_Guard 工具函数（`lib/auth.ts` 扩展）

```typescript
// 现有函数保留，新增以下函数：

export async function requireTeacher(session) {
  if (!session?.user) throw new Response("Unauthorized", { status: 401 });
  if (session.user.role !== UserRole.TEACHER)
    throw new Response("Forbidden", { status: 403 });
  return session;
}

export async function requireStudent(session) {
  if (!session?.user) throw new Response("Unauthorized", { status: 401 });
  if (session.user.role !== UserRole.STUDENT)
    throw new Response("Forbidden", { status: 403 });
  return session;
}

// 校验老师只能操作本校数据
export async function requireSameSchool(session, targetSchoolId: string) {
  if (session.user.role === UserRole.ADMIN) return; // admin bypass
  if (session.user.schoolId !== targetSchoolId)
    throw new Response("Forbidden", { status: 403 });
}

// 校验老师只能操作本校学生
export async function requireTeacherOwnsStudent(session, studentId: string) {
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.schoolId !== session.user.schoolId)
    throw new Response("Forbidden", { status: 403 });
}
```

### 账号格式校验工具（`lib/account.ts`，新建）

```typescript
// School_Code: 固定 4 位字母数字
export const SCHOOL_CODE_REGEX = /^[A-Za-z0-9]{4}$/;

// 账号格式: {4位School_Code}_{username}
export const ACCOUNT_FORMAT_REGEX = /^[A-Za-z0-9]{4}_.+$/;

export function validateSchoolCode(code: string): boolean {
  return SCHOOL_CODE_REGEX.test(code);
}

export function validateAccountFormat(username: string): boolean {
  return ACCOUNT_FORMAT_REGEX.test(username);
}

export function extractSchoolCode(username: string): string | null {
  if (!validateAccountFormat(username)) return null;
  return username.substring(0, 4);
}
```

### NextAuth Session 类型扩展（`types/next-auth.d.ts`，新建）

```typescript
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      displayName: string;
      schoolId?: string;   // TEACHER 和 STUDENT 必填
      teacherId?: string;  // STUDENT 必填
    };
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    displayName: string;
    schoolId?: string;
    teacherId?: string;
  }
}
```

### API Route Handlers 新增/变更

| 路径 | 方法 | 权限 | 功能 |
|------|------|------|------|
| `/api/admin/schools` | GET | ADMIN | 获取所有学校列表（含老师/学生数量） |
| `/api/admin/schools` | POST | ADMIN | 创建学校 |
| `/api/admin/schools/[schoolId]` | PUT | ADMIN | 修改学校名称 |
| `/api/admin/users` | GET | ADMIN | 获取所有用户（含角色过滤） |
| `/api/admin/users` | POST | ADMIN | 创建任意角色用户 |
| `/api/admin/users/[userId]` | PUT/DELETE | ADMIN | 修改/软删除用户 |
| `/api/admin/users/reset-password` | POST | ADMIN | 重置任意用户密码 |
| `/api/teacher/students` | GET | TEACHER | 获取本校学生列表 |
| `/api/teacher/students` | POST | TEACHER | 创建本校学生 |
| `/api/teacher/students/[userId]` | PUT/DELETE | TEACHER | 修改/软删除本校学生 |
| `/api/teacher/students/reset-password` | POST | TEACHER | 重置本校学生密码 |
| `/api/teacher/records/exam` | GET | TEACHER | 获取本校考试记录 |
| `/api/teacher/records/practice` | GET | TEACHER | 获取本校练习记录 |
| `/api/teacher/grading/[answerId]` | PUT | TEACHER | 提交编程题评分 |
| `/api/teacher/banks` | GET/POST | TEACHER | 管理本校题库 |
| `/api/teacher/stats` | GET | TEACHER | 本校统计数据 |

---

## Data Models

### Prisma Schema 变更

#### 1. 新增 `UserRole` 枚举值

```prisma
enum UserRole {
  ADMIN
  TEACHER   // 新增
  STUDENT   // 新增（原 USER 迁移至此）
  // USER 枚举值在迁移完成后移除
}
```

#### 2. 新增 `School` 模型

```prisma
model School {
  id        String   @id @default(cuid())
  name      String
  code      String   @unique  // 4位字母数字，如 SC01
  createdAt DateTime @default(now())

  users     User[]
}
```

#### 3. `User` 模型扩展

```prisma
model User {
  id           String    @id @default(cuid())
  username     String    @unique
  displayName  String
  passwordHash String
  role         UserRole  @default(STUDENT)  // 默认改为 STUDENT
  schoolId     String?   // TEACHER 和 STUDENT 必填，ADMIN 为 null
  teacherId    String?   // STUDENT 必填，其他角色为 null
  createdAt    DateTime  @default(now())
  lastLoginAt  DateTime?
  deletedAt    DateTime?

  school           School?   @relation(fields: [schoolId], references: [id])
  teacher          User?     @relation("TeacherStudents", fields: [teacherId], references: [id])
  students         User[]    @relation("TeacherStudents")
  examSessions     ExamSession[]
  practiceSessions PracticeSession[]
}
```

#### 4. `QuestionBank` 模型扩展（visibility 字段）

```prisma
enum BankVisibility {
  PUBLIC   // 全平台学生可见
  PRIVATE  // 仅本校学生可见
}

model QuestionBank {
  id           String          @id @default(cuid())
  name         String
  type         BankType
  description  String?
  durationSecs Int             @default(5400)
  isActive     Boolean         @default(true)
  visibility   BankVisibility  @default(PRIVATE)  // 新增
  createdById  String?         // 新增：创建者 userId（老师）
  schoolId     String?         // 新增：所属学校（私有题库）
  createdAt    DateTime        @default(now())

  createdBy    User?           @relation(fields: [createdById], references: [id])
  school       School?         @relation(fields: [schoolId], references: [id])
  questions    QuestionBankItem[]
  examSessions ExamSession[]
  practiceSessions PracticeSession[]
}
```

### 数据迁移方案

#### 迁移步骤

**Step 1：添加新字段（非破坏性）**

```sql
-- 添加 School 表
CREATE TABLE "School" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

-- User 表添加新字段（可空，不破坏现有数据）
ALTER TABLE "User" ADD COLUMN "schoolId" TEXT REFERENCES "School"("id");
ALTER TABLE "User" ADD COLUMN "teacherId" TEXT REFERENCES "User"("id");

-- QuestionBank 添加 visibility 字段
ALTER TABLE "QuestionBank" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'PRIVATE';
ALTER TABLE "QuestionBank" ADD COLUMN "createdById" TEXT REFERENCES "User"("id");
ALTER TABLE "QuestionBank" ADD COLUMN "schoolId" TEXT REFERENCES "School"("id");
```

**Step 2：枚举扩展**

```sql
-- PostgreSQL 枚举扩展（不可直接 ALTER，需重建或使用 Prisma migration）
-- Prisma 会生成对应的 migration SQL
ALTER TYPE "UserRole" ADD VALUE 'TEACHER';
ALTER TYPE "UserRole" ADD VALUE 'STUDENT';
```

**Step 3：数据迁移脚本（`scripts/migrate-roles.ts`）**

```typescript
// 将所有 role = USER 的记录迁移为 role = STUDENT
const result = await prisma.user.updateMany({
  where: { role: "USER" as any },
  data: { role: UserRole.STUDENT },
});
console.log(`Migrated ${result.count} USER records to STUDENT`);

// 验证：确认没有 USER 角色残留
const remaining = await prisma.user.count({ where: { role: "USER" as any } });
if (remaining > 0) {
  console.error(`Migration incomplete: ${remaining} USER records remain`);
  process.exit(1);
}
```

**Step 4：移除旧枚举值**

在所有 USER 记录迁移完成并验证后，通过 Prisma migration 移除 `USER` 枚举值。

#### 迁移策略原则

- 所有 DDL 变更先以可空字段形式添加，不破坏现有数据
- 数据迁移脚本独立运行，可回滚
- 迁移前备份数据库
- 在测试环境验证后再在生产环境执行

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: USER 角色迁移完整性

*For any* 数据库中 `role = USER` 的用户记录集合，执行迁移脚本后，所有记录的 `role` 字段应变为 `STUDENT`，且不存在任何 `role = USER` 的残留记录。

**Validates: Requirements 1.2**

---

### Property 2: ADMIN 角色迁移不变性

*For any* 数据库中 `role = ADMIN` 的用户记录集合，执行迁移脚本后，所有记录的 `role` 字段仍为 `ADMIN`，不受迁移影响。

**Validates: Requirements 1.3**

---

### Property 3: School_Code 格式校验

*For any* 字符串输入作为 School_Code，校验函数当且仅当该字符串完全匹配 `/^[A-Za-z0-9]{4}$/` 时返回有效，否则返回格式校验错误。

**Validates: Requirements 2.2, 2.6**

---

### Property 4: 学校数据往返一致性

*For any* 合法的学校名称和 School_Code，创建学校后再查询，返回的记录应包含完全相同的 `name`、`code` 字段值。

**Validates: Requirements 2.1**

---

### Property 5: 学校列表字段完整性

*For any* 包含 N 位老师和 M 位学生的学校，查询学校列表时，该学校的条目应包含 `name`、`code`、`teacherCount = N`、`studentCount = M`。

**Validates: Requirements 2.5**

---

### Property 6: 账号格式校验

*For any* 字符串输入作为用户账号，校验函数当且仅当该字符串匹配 `/^[A-Za-z0-9]{4}_.+$/` 时返回有效，否则返回格式校验错误。

**Validates: Requirements 3.4, 4.5**

---

### Property 7: 老师账号自动关联学校

*For any* 老师账号 `{SC}_{username}`，创建后该用户的 `schoolId` 应等于 `code = SC` 的学校的 `id`。

**Validates: Requirements 3.2**

---

### Property 8: 老师列表字段完整性

*For any* 老师用户记录，管理员查询老师列表时，该条目应包含 `username`、`displayName`、所属学校信息、`createdAt`。

**Validates: Requirements 3.5**

---

### Property 9: 学生自动关联老师和学校

*For any* 老师 T（schoolId = S），当 T 创建学生 U 时，U 的 `schoolId` 应等于 S，且 U 的 `teacherId` 应等于 T 的 `id`。

**Validates: Requirements 4.2**

---

### Property 10: 老师学生列表数据隔离

*For any* 老师 T（schoolId = S），查询学生列表时，返回的所有学生记录的 `schoolId` 均等于 S，不包含其他学校的学生。

**Validates: Requirements 4.4, 5.1, 9.3**

---

### Property 11: 跨校操作权限拒绝

*For any* 老师 T 和学生 U，若 `U.schoolId ≠ T.schoolId`，则 T 对 U 的任何修改或删除请求均应返回 HTTP 403。

**Validates: Requirements 4.7, 5.4**

---

### Property 12: 老师路由角色校验

*For any* 角色为 ADMIN 或 STUDENT 的用户，访问任意 `/api/teacher/*` 路由时，应返回 HTTP 403。

**Validates: Requirements 5.6, 7.5**

---

### Property 13: 管理员路由角色校验

*For any* 角色为 TEACHER 或 STUDENT 的用户，访问任意 `/api/admin/*` 路由时，应返回 HTTP 403。

**Validates: Requirements 7.5**

---

### Property 14: 管理员全局数据访问

*For any* 管理员用户，查询考试记录或练习记录时，返回结果应包含所有学校的数据，不受 schoolId 过滤限制。

**Validates: Requirements 7.1, 7.2**

---

### Property 15: Session 角色字段完整性

*For any* 用户登录后，Session 中的 `role` 字段应与数据库中该用户的 `role` 一致；老师的 Session 应包含 `schoolId`；学生的 Session 应包含 `schoolId` 和 `teacherId`。

**Validates: Requirements 8.1, 8.4, 8.5**

---

### Property 16: 用户名全局唯一性

*For any* 两次用户创建请求使用相同的 `username`，第二次请求应失败并返回唯一性约束错误。

**Validates: Requirements 9.4**

---

### Property 17: 学生-老师跨校一致性校验

*For any* 学生创建请求，若 `teacherId` 指向的老师的 `schoolId` 与请求中的 `schoolId` 不一致，系统应返回校验错误并拒绝保存。

**Validates: Requirements 9.5**

---

### Property 18: 禁止自行注册

*For any* 未认证请求访问用户创建接口，系统应返回 HTTP 401 或重定向至登录页，拒绝创建。

**Validates: Requirements 11.1, 11.6**

---

### Property 19: 老师只能创建本校学生

*For any* 老师 T（schoolId = S），尝试创建 `schoolId ≠ S` 的学生时，系统应返回 HTTP 403。

**Validates: Requirements 11.3, 11.4**

---

### Property 20: 学生无法创建用户

*For any* 角色为 STUDENT 的用户，调用任意用户创建接口时，系统应返回 HTTP 403。

**Validates: Requirements 11.5**

---

### Property 21: 题库可见性往返一致性

*For any* 可见性设置（PUBLIC 或 PRIVATE），创建题库后查询，返回的 `visibility` 字段应与创建时设置的值一致。

**Validates: Requirements 12.2**

---

### Property 22: 公开题库全校可访问

*For any* 可见性为 PUBLIC 的题库 B，以及任意学校的任意学生 S，S 访问 B 时应获得授权（HTTP 200）。

**Validates: Requirements 12.3**

---

### Property 23: 私有题库跨校访问拒绝

*For any* 可见性为 PRIVATE 的题库 B（所属学校 S1），以及来自学校 S2（S2 ≠ S1）的学生，访问 B 时应返回 HTTP 403。

**Validates: Requirements 12.4, 12.5**

---

### Property 24: 老师评分范围校验

*For any* 整数评分 S 和题目最高分值 M，当 `0 ≤ S ≤ M` 时评分提交应成功；当 `S < 0` 或 `S > M` 时应返回校验错误。

**Validates: Requirements 6.4, 6.5**

---

### Property 25: 编程题答案原文完整性

*For any* 任意长度和内容的编程题答案文本（含 Unicode、换行、特殊字符），老师查询时返回的文本应与存储时完全一致，不截断。

**Validates: Requirements 6.3**

---

## Error Handling

### HTTP 状态码规范

| 场景 | 状态码 | 响应体 |
|------|--------|--------|
| 未登录访问受保护路由 | 401 | `{ error: "Unauthorized" }` |
| 角色权限不足 | 403 | `{ error: "Forbidden" }` |
| 跨校数据访问 | 403 | `{ error: "Forbidden" }` |
| School_Code 格式错误 | 400 | `{ error: "学校编号格式错误，必须为4位字母数字" }` |
| School_Code 已存在 | 409 | `{ error: "学校编号已存在" }` |
| 账号格式错误 | 400 | `{ error: "账号格式错误，必须为 {4位学校编号}_{用户名}" }` |
| 用户名已存在 | 409 | `{ error: "用户名已存在" }` |
| 评分超出范围 | 400 | `{ error: "分数超出允许范围" }` |
| 学生-老师跨校不一致 | 400 | `{ error: "学生所属学校与老师不一致" }` |
| 资源不存在 | 404 | `{ error: "Not Found" }` |
| 服务端未预期错误 | 500 | `{ error: "Internal Server Error" }` |

### 前端路由守卫

- Next.js `middleware.ts` 扩展：
  - `/admin/*` → 仅 ADMIN，否则重定向 `/403`
  - `/teacher/*` → 仅 TEACHER，否则重定向 `/403`
  - 未登录访问任何受保护路由 → 重定向 `/login`

### 数据一致性保护

- 学生创建时，服务端校验 `teacher.schoolId === student.schoolId`，不依赖客户端传参
- 老师操作学生数据时，服务端通过 `requireSameSchool()` 二次校验，不信任 URL 参数中的 schoolId

---

## Testing Strategy

### 测试分层

**单元测试（Unit Tests）**
- 工具：Jest
- 覆盖范围：
  - `validateSchoolCode()`：合法/非法 School_Code 示例
  - `validateAccountFormat()`：合法/非法账号格式示例
  - `extractSchoolCode()`：从账号提取 School_Code
  - `requireSameSchool()`：同校/跨校场景
  - 评分范围校验逻辑

**属性测试（Property-Based Tests）**
- 工具：**fast-check**
- 每个属性测试运行最少 **100 次迭代**
- 注释标注格式：
  ```typescript
  // Feature: multi-role-user-system, Property N: <property_text>
  ```
- 覆盖上述 Property 1–25 中所有 PROPERTY 分类的验收标准
- 关键生成器：
  - `fc.string({ minLength: 4, maxLength: 4 }).filter(s => /^[A-Za-z0-9]{4}$/.test(s))` → 合法 School_Code
  - `fc.string()` → 任意字符串（用于格式校验边界测试）
  - `fc.integer({ min: -10, max: 200 })` → 随机评分值
  - `fc.record({ role: fc.constantFrom('ADMIN','TEACHER','STUDENT'), schoolId: fc.option(fc.string()) })` → 随机用户

**集成测试（Integration Tests）**
- 工具：Jest + Prisma Test Environment（测试数据库）
- 覆盖范围：
  - 完整的学校创建 → 老师创建 → 学生创建流程
  - 跨校数据隔离端到端验证
  - Session 角色字段在登录后正确填充
  - 数据迁移脚本（USER → STUDENT）正确性

**端到端测试（E2E Tests）**
- 工具：Playwright
- 覆盖核心用户流程：
  - 管理员登录 → 创建学校 → 创建老师 → 创建学生
  - 老师登录 → 查看本校学生 → 无法访问其他学校数据
  - 学生登录 → 正常答题流程
  - 角色路由守卫：老师访问 `/admin/*` 被重定向至 `/403`

**属性测试不适用的场景**

以下需求改用示例测试或 E2E 测试：
- 前端导航菜单渲染（Requirements 10）→ E2E 快照测试
- 管理员 UI 学校管理页面（Requirements 2）→ E2E 示例测试
- Session 失效后重新登录流程（Requirements 8.2, 8.3）→ 集成示例测试
