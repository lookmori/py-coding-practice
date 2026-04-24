# Requirements Document

## Introduction

本功能对现有 Python 答题平台的用户体系进行重构，将原有的双角色模型（USER / ADMIN）扩展为三角色模型（ADMIN / TEACHER / STUDENT），并引入"学校"实体作为数据隔离边界。

重构后：
- **管理员（ADMIN）** 负责创建学校、管理全局数据，可添加所有角色的用户；
- **老师（TEACHER）** 以学校编号为账号前缀，只能管理和查看本校学生的数据，可管理题库和考试，只能添加本校学生；
- **学生（STUDENT）** 由管理员或老师创建，账号以完整 4 位学校编号为前缀，关联所属老师和学校，不能添加任何用户。

权限隔离是本次重构的核心目标：老师无法访问其他学校的任何数据。

---

## Glossary

- **System**：整个 Python 答题平台（Next.js + Prisma + PostgreSQL）
- **ADMIN**：管理员角色，拥有全局管理权限
- **TEACHER**：老师角色，只能管理本校学生及查看本校考试/练习数据
- **STUDENT**：学生角色，只能参与考试和练习，查看自己的记录
- **School**：学校实体，由管理员创建，包含唯一的学校编号（School_Code）
- **School_Code**：学校编号，由管理员设置，格式为固定 4 位字母数字组合（如 `SC01`）
- **Teacher_Account**：老师账号，格式为 `{School_Code}_{username}`（如 `SC01_zhangsan`）
- **Student_Account**：学生账号，格式为 `{School_Code}_{username}`（如 `SC01_lisi`）
- **Question_Bank**：题库，包含若干题目，可设置为公开（全平台学生可见）或不公开（仅本校学生可见）
- **Auth_System**：NextAuth.js 认证模块
- **Permission_Guard**：服务端权限校验中间件/工具函数
- **User_Manager**：用户管理模块（管理员和老师侧）
- **School_Manager**：学校管理模块（管理员侧）
- **Data_Scope**：数据可见范围，由角色和所属学校共同决定

---

## Requirements

### Requirement 1：角色枚举扩展

**User Story：** 作为系统架构师，我希望将用户角色从双角色扩展为三角色，以便支持更细粒度的权限控制。

#### Acceptance Criteria

1. THE System SHALL 支持三种用户角色：`ADMIN`、`TEACHER`、`STUDENT`，并在数据库枚举中定义。
2. WHEN 现有 `USER` 角色数据迁移时，THE System SHALL 将所有 `role = USER` 的记录转换为 `role = STUDENT`。
3. THE System SHALL 保留 `ADMIN` 角色不变，现有管理员账号权限不受影响。
4. IF 数据库中存在未知角色值，THEN THE System SHALL 拒绝该记录并记录迁移错误日志。

---

### Requirement 2：学校实体管理

**User Story：** 作为管理员，我希望能够创建学校并设置学校编号，以便将老师和学生按学校隔离管理。

#### Acceptance Criteria

1. THE School_Manager SHALL 支持创建学校，每所学校包含：名称（name）、学校编号（School_Code）、创建时间（createdAt）。
2. WHEN 管理员创建学校时，THE School_Manager SHALL 验证 School_Code 为固定 4 位字母数字组合，且在全局唯一。
3. IF 提交的 School_Code 已存在，THEN THE School_Manager SHALL 返回错误提示"学校编号已存在"，并拒绝创建。
4. THE School_Manager SHALL 支持管理员修改学校名称，但不允许修改已使用的 School_Code。
5. WHEN 管理员查询学校列表时，THE School_Manager SHALL 返回所有学校的名称、School_Code 及关联的老师数量和学生数量。
6. IF School_Code 包含非字母数字字符或长度不等于 4 位，THEN THE School_Manager SHALL 返回格式校验错误，并拒绝保存。

---

### Requirement 3：老师账号管理

**User Story：** 作为管理员，我希望能够创建老师账号并关联到指定学校，以便老师能够管理本校学生。

#### Acceptance Criteria

1. THE User_Manager SHALL 支持管理员创建老师账号，账号格式为 `{School_Code}_{username}`（如 `SC01_zhangsan`）。
2. WHEN 老师账号创建时，THE User_Manager SHALL 自动将该账号关联到对应的 School（通过 School_Code 前缀匹配）。
3. THE Auth_System SHALL 支持老师通过完整账号（`{School_Code}_{username}`）和密码登录。
4. IF 老师账号格式不符合 `{School_Code}_{username}` 规范，THEN THE User_Manager SHALL 返回格式校验错误。
5. THE User_Manager SHALL 支持管理员查看所有老师列表，包含账号、显示名称、所属学校、创建时间。

---

### Requirement 4：学生账号管理

**User Story：** 作为管理员或老师，我希望能够为学生创建账号，以便学生能够参与考试和练习。

#### Acceptance Criteria

1. THE User_Manager SHALL 支持管理员和老师创建学生账号，账号格式为 `{School_Code}_{username}`（如 `SC01_lisi`）。
2. WHEN 老师创建学生时，THE User_Manager SHALL 自动将学生关联到该老师所属的学校（schoolId）和该老师（teacherId）。
3. WHEN 管理员创建学生时，THE User_Manager SHALL 要求指定所属学校和关联老师。
4. THE User_Manager SHALL 支持老师查看本校所有学生列表，包含账号、显示名称、关联老师、创建时间。
5. IF 老师尝试创建账号格式不符合 `{School_Code}_{username}` 规范的学生，THEN THE User_Manager SHALL 返回格式校验错误，并拒绝创建。
6. THE User_Manager SHALL 支持老师重置本校学生的密码。
7. IF 老师尝试修改或删除不属于本校的学生，THEN THE Permission_Guard SHALL 返回 HTTP 403，并拒绝操作。
8. THE User_Manager SHALL 支持老师软删除（设置 deletedAt）本校学生账号。

---

### Requirement 5：权限隔离——老师数据可见范围

**User Story：** 作为平台运营方，我希望老师只能看到本校学生的数据，以便保护各学校的数据隐私。

#### Acceptance Criteria

1. WHILE 老师已登录，THE Permission_Guard SHALL 在所有数据查询中自动附加 `schoolId = 当前老师所属学校` 的过滤条件。
2. WHEN 老师查询学生考试记录列表时，THE System SHALL 只返回本校学生的 ExamSession 记录。
3. WHEN 老师查询学生练习记录列表时，THE System SHALL 只返回本校学生的 PracticeSession 记录。
4. IF 老师通过 API 请求访问其他学校学生的 ExamSession 或 PracticeSession，THEN THE Permission_Guard SHALL 返回 HTTP 403。
5. WHEN 老师访问管理后台时，THE System SHALL 只展示本校学生的统计数据（考试人数、练习人数、平均分等）。
6. THE Permission_Guard SHALL 对所有 `/api/teacher/*` 路由强制校验当前用户角色为 `TEACHER`，否则返回 HTTP 403。

---

### Requirement 6：老师评分权限

**User Story：** 作为老师，我希望能够对本校学生的编程题答案进行评分和评语，以便给出教学反馈。

#### Acceptance Criteria

1. WHEN 老师对本校学生的编程题答案提交评分时，THE System SHALL 将分数和评语保存到对应的 ExamAnswer 或 PracticeAnswer 记录。
2. IF 老师尝试对不属于本校学生的答案评分，THEN THE Permission_Guard SHALL 返回 HTTP 403，并拒绝保存。
3. THE System SHALL 支持老师查看本校学生编程题的原始答案文本（不截断）。
4. WHEN 老师提交评分时，THE System SHALL 验证分数为非负整数，且不超过该题目定义的最高分值。
5. IF 评分超出题目最高分值，THEN THE System SHALL 返回校验错误"分数超出允许范围"，并拒绝保存。

---

### Requirement 7：管理员全局权限

**User Story：** 作为管理员，我希望保留对所有数据的全局访问权限，以便进行平台级别的管理和监控。

#### Acceptance Criteria

1. WHILE 管理员已登录，THE System SHALL 允许管理员访问所有学校、所有老师、所有学生的数据，不受学校隔离限制。
2. THE System SHALL 支持管理员查看全平台的考试记录和练习记录。
3. THE System SHALL 支持管理员创建、修改、软删除任意角色的用户账号（ADMIN、TEACHER、STUDENT）。
4. THE System SHALL 支持管理员重置任意用户的密码。
5. IF 非管理员用户访问 `/api/admin/*` 路由，THEN THE Permission_Guard SHALL 返回 HTTP 403。

---

### Requirement 11：用户添加权限控制

**User Story：** 作为平台运营方，我希望严格控制用户注册和添加权限，以便防止未授权用户进入系统。

#### Acceptance Criteria

1. THE System SHALL 禁止任何角色的用户自行注册账号，所有账号必须由上一级用户创建。
2. THE User_Manager SHALL 支持管理员创建 ADMIN、TEACHER、STUDENT 三种角色的用户账号。
3. THE User_Manager SHALL 支持老师创建本校学生账号，且只能创建本校（同一 schoolId）的学生。
4. IF 老师尝试创建非本校学生账号，THEN THE Permission_Guard SHALL 返回 HTTP 403，并拒绝创建。
5. THE System SHALL 禁止学生创建任何用户账号；IF 学生调用用户创建接口，THEN THE Permission_Guard SHALL 返回 HTTP 403。
6. IF 未登录用户访问注册页面或注册接口，THEN THE System SHALL 返回 HTTP 403 或重定向至登录页面。

---

### Requirement 12：题库与考试管理权限

**User Story：** 作为老师，我希望能够管理题库和创建考试，以便为本校学生提供练习和测评内容。

#### Acceptance Criteria

1. THE System SHALL 支持老师创建、编辑、删除题目，以及创建考试。
2. WHEN 老师创建题库时，THE System SHALL 允许老师设置题库的可见性：公开（public）或不公开（private）。
3. WHILE 题库设置为公开，THE System SHALL 允许所有学校的学生查看和使用该题库。
4. WHILE 题库设置为不公开，THE System SHALL 只允许本校学生查看和使用该题库。
5. IF 非本校学生尝试访问不公开题库，THEN THE Permission_Guard SHALL 返回 HTTP 403，并拒绝访问。
6. THE System SHALL 支持老师查看和管理自己创建的题库及题目。
7. IF 老师尝试编辑或删除不属于自己的题目，THEN THE Permission_Guard SHALL 返回 HTTP 403，并拒绝操作。
8. WHEN 老师创建考试时，THE System SHALL 允许老师从自己有权访问的题库中选题组卷。

---

### Requirement 8：认证与会话角色信息

**User Story：** 作为开发者，我希望 NextAuth.js 会话中包含用户角色和所属学校信息，以便前端和后端能够基于角色渲染 UI 和执行权限校验。

#### Acceptance Criteria

1. WHEN 用户登录成功后，THE Auth_System SHALL 在 JWT/Session 中包含 `role`、`schoolId`（老师和学生）、`teacherId`（学生）字段。
2. THE Auth_System SHALL 在每次请求时验证 Session 中的角色信息与数据库中的当前角色一致。
3. IF Session 中的角色与数据库不一致（如账号被降权），THEN THE Auth_System SHALL 使该 Session 失效并要求重新登录。
4. WHEN 老师登录时，THE Auth_System SHALL 在 Session 中包含 `schoolId` 以供权限校验使用。
5. WHEN 学生登录时，THE Auth_System SHALL 在 Session 中包含 `schoolId` 和 `teacherId` 以供数据关联使用。

---

### Requirement 9：数据模型扩展

**User Story：** 作为开发者，我希望数据库模型能够支持学校、老师、学生之间的关联关系，以便实现权限隔离和数据查询。

#### Acceptance Criteria

1. THE System SHALL 新增 `School` 模型，包含字段：`id`、`name`、`code`（唯一）、`createdAt`。
2. THE System SHALL 在 `User` 模型中新增 `schoolId`（可空，老师和学生必填）、`teacherId`（可空，学生必填）字段。
3. WHEN 查询老师的学生列表时，THE System SHALL 通过 `User.teacherId` 关联查询，只返回 `teacherId = 当前老师 id` 的学生。
4. THE System SHALL 保证 `User.username` 的全局唯一性约束不变。
5. IF 学生的 `teacherId` 指向的老师不属于同一所学校，THEN THE System SHALL 在数据写入时返回校验错误，并拒绝保存。

---

### Requirement 10：前端路由与 UI 适配

**User Story：** 作为用户，我希望根据自己的角色看到不同的导航菜单和页面，以便快速访问与自己角色相关的功能。

#### Acceptance Criteria

1. WHEN 管理员登录后，THE System SHALL 展示包含"学校管理"、"用户管理"、"题库管理"、"全局记录"、"统计数据"的管理后台导航。
2. WHEN 老师登录后，THE System SHALL 展示包含"学生管理"、"题库管理"、"考试管理"、"考试记录"、"练习记录"、"评分"的老师后台导航，不展示其他学校数据入口。
3. WHEN 学生登录后，THE System SHALL 展示与现有 USER 角色相同的答题界面（考试、练习、个人记录）。
4. IF 老师访问管理员专属页面（如 `/admin/questions`），THEN THE System SHALL 重定向至 `/403` 页面。
5. IF 学生访问老师或管理员专属页面，THEN THE System SHALL 重定向至 `/403` 页面。

