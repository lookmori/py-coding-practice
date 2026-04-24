# 技术设计文档：批量导入自动账号生成

## 概述

本设计文档描述对现有批量导入用户功能的改造方案。核心目标是：

1. **简化 CSV 格式**：移除手动账号后缀字段，系统自动生成符合规范的 8 位账号
2. **支持多学校批量导入**：老师导入支持单次 CSV 包含多个学校块；学生导入通过老师账号自动推断学校
3. **改进结果展示**：API 响应新增 `schoolGroups` 字段，前端按学校分组渲染导入结果

### 账号格式规范

| 角色 | 格式 | 示例 | 序号范围 |
|------|------|------|----------|
| 老师 | `{4位学校编码}LS{2位序号}` | `XS01LS01` | 01～99 |
| 学生 | `{4位学校编码}{4位序号}` | `XS010001` | 0001～9999 |

两套序号池按学校维度完全独立，互不影响。

---

## 架构

本次改造涉及三个层次的变更，均在现有代码结构内进行，无需新增路由或服务：

```
┌─────────────────────────────────────────────────────────┐
│  前端：BulkImportPanel.tsx                               │
│  - 更新 CSV 格式说明文字和示例                            │
│  - 新增 schoolGroups 渲染逻辑（按学校分组展示结果）        │
└────────────────────┬────────────────────────────────────┘
                     │ POST /api/admin/users/bulk-import
┌────────────────────▼────────────────────────────────────┐
│  后端：bulk-import/route.ts                              │
│  - 老师：多学校块解析 → 账号生成 → 创建用户               │
│  - 学生：单行解析（老师账号推断学校）→ 账号生成 → 创建用户 │
│  - 响应新增 schoolGroups 字段                            │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  工具库：lib/account.ts                                  │
│  - 更新账号格式正则（新 8 位格式）                        │
│  - 新增序号提取函数                                       │
│  - 新增账号生成函数                                       │
└─────────────────────────────────────────────────────────┘
```

### 数据流

```
CSV 文本输入
    │
    ▼
CSV 解析层（纯函数）
    │  老师：解析多学校块，每行提取 {schoolName, schoolCode, displayName, password?}
    │  学生：每行提取 {displayName, teacherUsername, password?}
    ▼
验证层
    │  学校编码格式验证 / 显示名称非空验证 / 老师账号存在性验证
    ▼
账号生成层（纯函数 + DB 查询）
    │  查询该学校已有最大序号 → 计算下一序号 → 生成账号字符串
    ▼
用户创建层（DB 写入）
    │  bcrypt 哈希密码 → prisma.user.create
    ▼
结果聚合层（纯函数）
    │  按 schoolCode 分组 created 列表 → 构造 schoolGroups
    ▼
API 响应
```

---

## 组件与接口

### 1. `lib/account.ts`（更新）

```typescript
// 新账号格式正则
export const TEACHER_ACCOUNT_REGEX = /^[A-Za-z0-9]{4}LS\d{2}$/;
export const STUDENT_ACCOUNT_REGEX = /^[A-Za-z0-9]{4}\d{4}$/;

// 从老师账号中提取学校编码（前4位）
export function extractSchoolCodeFromAccount(username: string): string | null

// 从老师账号中提取序号（后2位数字）
export function extractTeacherSequence(username: string): number | null

// 从学生账号中提取序号（后4位数字）
export function extractStudentSequence(username: string): number | null

// 生成老师账号
export function generateTeacherAccount(schoolCode: string, sequence: number): string
// 例：generateTeacherAccount("XS01", 3) => "XS01LS03"

// 生成学生账号
export function generateStudentAccount(schoolCode: string, sequence: number): string
// 例：generateStudentAccount("XS01", 12) => "XS010012"
```

### 2. CSV 解析（在 route.ts 内实现）

**老师 CSV 解析结果类型：**

```typescript
interface TeacherRow {
  schoolName: string;
  schoolCode: string;
  displayName: string;
  password?: string;
  sourceLineNumber: number; // 原始行号，用于错误报告
}

interface ParseError {
  row: number;
  reason: string;
}

interface TeacherParseResult {
  rows: TeacherRow[];
  errors: ParseError[];
}
```

**学生 CSV 解析结果类型：**

```typescript
interface StudentRow {
  displayName: string;
  teacherUsername: string;
  password?: string;
  sourceLineNumber: number;
}

interface StudentParseResult {
  rows: StudentRow[];
  errors: ParseError[];
}
```

### 3. API 响应类型（更新）

```typescript
interface SchoolGroup {
  schoolName: string;
  schoolCode: string;
  created: { displayName: string; username: string }[];
}

interface BulkImportResponse {
  success: number;
  created: { displayName: string; username: string }[]; // 保留向后兼容
  errors: { row: number; reason: string }[];
  schoolGroups: SchoolGroup[]; // 新增
}
```

---

## 数据模型

本次改造**不修改** Prisma schema，现有 `User` 和 `School` 模型已满足需求：

- `User.username`：存储自动生成的 8 位账号（`XS01LS01` / `XS010001`）
- `User.schoolId`：关联学校（老师导入时从块头行获取，学生导入时从老师账号推断）
- `User.teacherId`：学生关联老师（从老师账号查询 `User.id`）
- `School.code`：4 位学校编码，`UNIQUE` 约束保证唯一性

### 序号查询逻辑

账号生成时需要查询该学校已有账号的最大序号：

**老师序号查询：**
```sql
-- 查询某学校所有老师账号，提取序号部分的最大值
SELECT username FROM User
WHERE schoolId = ? AND role = 'TEACHER' AND deletedAt IS NULL
-- 在应用层提取后6位中的后2位数字（位置6-7），取最大值
```

**学生序号查询：**
```sql
-- 查询某学校所有学生账号，提取序号部分的最大值
SELECT username FROM User
WHERE schoolId = ? AND role = 'STUDENT' AND deletedAt IS NULL
-- 在应用层提取后4位数字，取最大值
```

> **设计决策**：序号提取在应用层完成（而非 SQL 函数），原因是账号格式固定，字符串切片简单可靠，且避免数据库方言差异。

### 单次请求内序号分配

同一次请求中同一学校可能有多行数据，需要在内存中维护当前序号计数器，避免每行都重新查询数据库：

```
1. 请求开始时，按学校查询已有最大序号，存入 Map<schoolId, currentSequence>
2. 每成功分配一个序号后，Map 中对应值 +1
3. 写入数据库时，若发生唯一键冲突（并发场景），跳过该行并记录错误
```

---

## 正确性属性

*属性（Property）是在系统所有合法执行中都应成立的特征或行为——本质上是对系统应做什么的形式化陈述。属性是人类可读规范与机器可验证正确性保证之间的桥梁。*

### 属性 1：老师账号格式正确性

*对任意* 合法学校编码（4 位字母数字）和合法序号（1～99），`generateTeacherAccount` 生成的账号应严格匹配格式 `{4位学校编码}LS{2位序号}`，总长度为 8 位，序号左补零。

**验证：需求 3.1**

---

### 属性 2：学生账号格式正确性

*对任意* 合法学校编码（4 位字母数字）和合法序号（1～9999），`generateStudentAccount` 生成的账号应严格匹配格式 `{4位学校编码}{4位序号}`，总长度为 8 位，序号左补零。

**验证：需求 3.4**

---

### 属性 3：账号生成序号递增且无重复

*对任意* 包含 N 条有效数据行（同一学校）的导入请求，生成的 N 个账号序号应严格单调递增，且两两不重复。

**验证：需求 3.7**

---

### 属性 4：序号从已有最大值加 1 开始

*对任意* 学校，若该学校已有老师账号的最大序号为 K，则本次导入第一个老师账号的序号应为 K+1；若该学校尚无老师账号，则序号从 1 开始。学生账号同理。

**验证：需求 3.2、3.5**

---

### 属性 5：空显示名称行被拒绝

*对任意* 仅由空白字符（空格、制表符等）组成的显示名称字符串，导入时该行应被跳过，错误列表中应包含对应行号的错误记录，且成功计数不增加。

**验证：需求 1.4、2.4**

---

### 属性 6：注释行不影响解析结果

*对任意* 合法 CSV 内容，在任意位置插入任意数量以 `#` 开头的行，解析结果（数据行数量、各行内容）应与不含注释行时完全相同。

**验证：需求 6.1**

---

### 属性 7：schoolGroups 计数一致性

*对任意* 导入请求，若响应中 `success > 0`，则 `schoolGroups` 中所有组的 `created` 列表长度之和应等于顶层 `success` 计数，且等于顶层 `created` 列表长度。

**验证：需求 4.1、4.2**

---

### 属性 8：密码哈希正确性

*对任意* 导入行（无论是否提供密码字段），创建的用户 `passwordHash` 应满足：`bcrypt.compare(提供的密码或"123456", passwordHash) === true`，且 `passwordHash` 不等于明文密码。

**验证：需求 5.1、5.2、5.3**

---

### 属性 9：学生学校由老师账号推断

*对任意* 存在于数据库中且角色为 TEACHER 的老师账号，以该账号导入的学生的 `schoolId` 应等于该老师的 `schoolId`。

**验证：需求 2.2**

---

## 错误处理

### 错误分类与处理策略

| 错误类型 | 处理方式 | 是否中止整个导入 |
|----------|----------|-----------------|
| 学校编码格式非法 | 跳过该学校块所有行，记录错误 | 否（继续处理其他块） |
| 显示名称为空 | 跳过该行，记录错误 | 否 |
| 老师账号不存在或角色非 TEACHER | 跳过该行，记录错误 | 否 |
| 序号已达上限（99 或 9999） | 跳过该行，记录错误 | 否 |
| 账号唯一键冲突（并发） | 跳过该行，记录错误 | 否 |
| CSV 完全为空或无有效行 | 返回 400 错误 | 是 |
| 数据库连接失败等系统错误 | 返回 500 错误 | 是 |

### 错误记录格式

所有行级错误统一记录到 `errors` 数组：

```typescript
{ row: number, reason: string }
// row: 原始 CSV 行号（从 1 开始），0 表示全局错误
// reason: 中文错误描述
```

### 并发安全

序号分配采用"查询最大值 + 内存递增 + 唯一键兜底"策略：

1. 请求开始时查询当前最大序号（快照）
2. 内存中递增分配序号
3. `prisma.user.create` 若因 `username` 唯一键冲突抛出 `P2002` 错误，捕获后跳过该行并记录错误

这种方式在低并发场景（管理员手动操作）下足够可靠，无需引入分布式锁。

---

## 测试策略

### 单元测试（`lib/account.ts`）

针对纯函数进行 example-based 测试：

- `generateTeacherAccount("XS01", 1)` → `"XS01LS01"`
- `generateTeacherAccount("XS01", 12)` → `"XS01LS12"`
- `generateStudentAccount("XS01", 1)` → `"XS010001"`
- `generateStudentAccount("XS01", 9999)` → `"XS019999"`
- `extractTeacherSequence("XS01LS07")` → `7`
- `extractStudentSequence("XS010042")` → `42`
- 边界：序号 0 或超出范围时返回 `null`

### 属性测试（Property-Based Testing）

使用 **fast-check**（TypeScript 生态标准 PBT 库）实现以下属性，每个属性最少运行 **100 次**：

**属性 1 & 2：账号格式正确性**
```typescript
// Feature: bulk-import-auto-account, Property 1: 老师账号格式正确性
fc.assert(fc.property(
  fc.stringMatching(/^[A-Za-z0-9]{4}$/),  // 合法学校编码
  fc.integer({ min: 1, max: 99 }),          // 合法序号
  (schoolCode, seq) => {
    const account = generateTeacherAccount(schoolCode, seq);
    return /^[A-Za-z0-9]{4}LS\d{2}$/.test(account) && account.length === 8;
  }
), { numRuns: 100 });
```

**属性 3：序号递增无重复**
```typescript
// Feature: bulk-import-auto-account, Property 3: 账号生成序号递增且无重复
fc.assert(fc.property(
  fc.integer({ min: 1, max: 90 }),  // 起始序号
  fc.integer({ min: 1, max: 9 }),   // 生成数量
  (startSeq, count) => {
    const accounts = Array.from({ length: count }, (_, i) =>
      generateTeacherAccount("XS01", startSeq + i)
    );
    const sequences = accounts.map(a => extractTeacherSequence(a)!);
    // 严格递增
    const isIncreasing = sequences.every((s, i) => i === 0 || s === sequences[i-1] + 1);
    // 无重复
    const isUnique = new Set(accounts).size === accounts.length;
    return isIncreasing && isUnique;
  }
), { numRuns: 100 });
```

**属性 5：空显示名称被拒绝**
```typescript
// Feature: bulk-import-auto-account, Property 5: 空显示名称行被拒绝
fc.assert(fc.property(
  fc.stringMatching(/^\s*$/),  // 纯空白字符串
  (emptyName) => {
    const result = parseTeacherCsv(`学校A,XS01\n${emptyName}`);
    return result.rows.length === 0 && result.errors.length === 1;
  }
), { numRuns: 100 });
```

**属性 6：注释行不影响解析**
```typescript
// Feature: bulk-import-auto-account, Property 6: 注释行不影响解析结果
fc.assert(fc.property(
  fc.array(fc.string().filter(s => !s.startsWith('#') && s.trim())),  // 合法数据行
  fc.array(fc.string()),  // 注释内容
  (dataLines, commentContents) => {
    const comments = commentContents.map(c => `# ${c}`);
    const csvWithComments = interleave(dataLines, comments).join('\n');
    const csvWithout = dataLines.join('\n');
    return parseResult(csvWithComments).rows.length === parseResult(csvWithout).rows.length;
  }
), { numRuns: 100 });
```

**属性 7：schoolGroups 计数一致性**
```typescript
// Feature: bulk-import-auto-account, Property 7: schoolGroups 计数一致性
fc.assert(fc.property(
  fc.array(fc.record({ schoolCode: fc.string(), displayName: fc.string() })),
  (importedUsers) => {
    const response = buildResponse(importedUsers);
    const groupTotal = response.schoolGroups.reduce((sum, g) => sum + g.created.length, 0);
    return groupTotal === response.success && groupTotal === response.created.length;
  }
), { numRuns: 100 });
```

### 集成测试

针对 API 端点的 example-based 集成测试（使用测试数据库）：

- 老师导入：单学校块、多学校块、含注释行
- 学生导入：有效老师账号、无效老师账号
- 序号边界：从已有最大序号继续分配
- 序号上限：老师 99 条、学生 9999 条时拒绝新增
- 并发冲突：模拟唯一键冲突时的错误处理
- 响应结构：验证 `schoolGroups` 字段存在且结构正确

### 前端测试

- 快照测试：验证格式说明文字已更新（移除账号后缀描述）
- 渲染测试：单学校 / 多学校 `schoolGroups` 的分组渲染
- 交互测试：文件上传、CSV 粘贴、导入按钮状态
