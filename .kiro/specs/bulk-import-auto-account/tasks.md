# 实现计划：批量导入自动账号生成

## 概述

本计划将现有批量导入功能改造为自动账号生成模式，涉及三个文件的修改：`lib/account.ts`（账号工具函数）、`app/api/admin/users/bulk-import/route.ts`（API 逻辑重写）、`app/admin/users/BulkImportPanel.tsx`（前端格式说明与结果渲染）。

## 任务

- [x] 1. 更新 `lib/account.ts`：新增账号格式正则与纯函数
  - 将现有 `ACCOUNT_FORMAT_REGEX` 替换为 `TEACHER_ACCOUNT_REGEX` 和 `STUDENT_ACCOUNT_REGEX`
  - 实现 `extractSchoolCodeFromAccount(username)`：提取前 4 位学校编码，格式不合法时返回 `null`
  - 实现 `extractTeacherSequence(username)`：提取老师账号后 2 位序号数字，格式不合法时返回 `null`
  - 实现 `extractStudentSequence(username)`：提取学生账号后 4 位序号数字，格式不合法时返回 `null`
  - 实现 `generateTeacherAccount(schoolCode, sequence)`：生成 `{4位编码}LS{2位序号}` 格式账号，序号左补零
  - 实现 `generateStudentAccount(schoolCode, sequence)`：生成 `{4位编码}{4位序号}` 格式账号，序号左补零
  - 保留 `validateSchoolCode` 函数，更新 `validateAccountFormat` 以兼容新格式（同时接受老师和学生账号格式）
  - _需求：3.1、3.4_

  - [ ]* 1.1 为 `generateTeacherAccount` 编写单元测试
    - `generateTeacherAccount("XS01", 1)` → `"XS01LS01"`
    - `generateTeacherAccount("XS01", 12)` → `"XS01LS12"`
    - `extractTeacherSequence("XS01LS07")` → `7`
    - 边界：序号 0 或超出范围（>99）时 `extractTeacherSequence` 返回 `null`
    - _需求：3.1、3.2_

  - [ ]* 1.2 为 `generateStudentAccount` 编写单元测试
    - `generateStudentAccount("XS01", 1)` → `"XS010001"`
    - `generateStudentAccount("XS01", 9999)` → `"XS019999"`
    - `extractStudentSequence("XS010042")` → `42`
    - 边界：序号 0 或超出范围（>9999）时 `extractStudentSequence` 返回 `null`
    - _需求：3.4、3.5_

  - [ ]* 1.3 为账号格式正确性编写属性测试（fast-check，放在 `__tests__/account.property.test.ts`）
    - **属性 1：老师账号格式正确性**
    - 对任意合法学校编码（4 位字母数字）和合法序号（1～99），`generateTeacherAccount` 生成的账号应匹配 `TEACHER_ACCOUNT_REGEX` 且长度为 8
    - **属性 2：学生账号格式正确性**
    - 对任意合法学校编码（4 位字母数字）和合法序号（1～9999），`generateStudentAccount` 生成的账号应匹配 `STUDENT_ACCOUNT_REGEX` 且长度为 8
    - **属性 3：账号生成序号递增且无重复**
    - 对任意起始序号和生成数量，连续调用 `generateTeacherAccount` 生成的账号序号应严格单调递增且两两不重复
    - 每个属性最少运行 100 次
    - _需求：3.1、3.4、3.7_

- [x] 2. 检查点 — 确认 `lib/account.ts` 所有测试通过，向用户确认函数签名无误后继续。

- [x] 3. 重写 `app/api/admin/users/bulk-import/route.ts`：CSV 解析层
  - 实现老师 CSV 解析函数 `parseTeacherCsv(csv: string): TeacherParseResult`
    - 按行扫描，识别块头行（格式 `学校名称,学校编码`）和数据行（格式 `显示名称[,初始密码]`）
    - 跳过以 `#` 开头的注释行
    - 学校编码不符合 `SCHOOL_CODE_REGEX` 时，跳过该块所有数据行并记录错误
    - 显示名称为空时跳过该行并记录错误
    - 返回 `{ rows: TeacherRow[], errors: ParseError[] }`，每行携带 `sourceLineNumber`
    - _需求：1.1、1.2、1.4、1.5、6.1_
  - 实现学生 CSV 解析函数 `parseStudentCsv(csv: string): StudentParseResult`
    - 每行格式 `显示名称,老师账号[,初始密码]`，跳过注释行
    - 显示名称为空时跳过该行并记录错误
    - 返回 `{ rows: StudentRow[], errors: ParseError[] }`
    - _需求：2.1、2.4、6.1_

  - [ ]* 3.1 为 `parseTeacherCsv` 编写单元测试
    - 单学校块、多学校块、含注释行、学校编码非法、显示名称为空等场景
    - _需求：1.1、1.2、1.4、1.5、6.1_

  - [ ]* 3.2 为 `parseStudentCsv` 编写单元测试
    - 正常行、注释行、显示名称为空等场景
    - _需求：2.1、2.4、6.1_

  - [ ]* 3.3 为注释行不影响解析结果编写属性测试（fast-check）
    - **属性 6：注释行不影响解析结果**
    - 对任意合法 CSV 内容，在任意位置插入任意数量以 `#` 开头的行，解析结果的数据行数量应与不含注释行时完全相同
    - 最少运行 100 次
    - _需求：6.1_

  - [ ]* 3.4 为空显示名称被拒绝编写属性测试（fast-check）
    - **属性 5：空显示名称行被拒绝**
    - 对任意仅由空白字符组成的显示名称字符串，解析结果中 `rows.length === 0` 且 `errors.length >= 1`
    - 最少运行 100 次
    - _需求：1.4、2.4_

- [x] 4. 重写 `app/api/admin/users/bulk-import/route.ts`：账号生成与用户创建层
  - 在请求开始时，按学校查询已有老师/学生账号的最大序号，存入 `Map<schoolId, currentSequence>`
  - 老师导入：遍历 `TeacherRow[]`，为每行分配序号（内存递增），调用 `generateTeacherAccount` 生成账号，`prisma.school.upsert` 确保学校存在，`prisma.user.create` 写入用户
  - 学生导入：遍历 `StudentRow[]`，查询老师账号（带缓存），推断 `schoolId`，分配序号，调用 `generateStudentAccount` 生成账号，写入用户
  - 捕获 Prisma `P2002` 唯一键冲突错误，跳过该行并记录错误
  - 序号超出上限（老师 >99，学生 >9999）时跳过该行并记录错误
  - 使用 bcrypt 对密码（或默认 `123456`）进行哈希处理
  - _需求：1.3、2.2、2.3、3.2、3.3、3.5、3.6、3.7、3.8、3.9、5.1、5.2、5.3_

  - [ ]* 4.1 为序号从已有最大值加 1 开始编写属性测试（fast-check）
    - **属性 4：序号从已有最大值加 1 开始**
    - 对任意已有最大序号 K，下一个生成的账号序号应为 K+1；若无已有账号则从 1 开始
    - 最少运行 100 次
    - _需求：3.2、3.5_

- [x] 5. 重写 `app/api/admin/users/bulk-import/route.ts`：结果聚合与响应
  - 实现结果聚合函数 `buildSchoolGroups`：将 `created` 列表按 `schoolCode` 分组，构造 `SchoolGroup[]`
  - API 响应新增 `schoolGroups` 字段，同时保留顶层 `success` 和 `created` 字段（向后兼容）
  - CSV 完全为空或无有效行时返回 400 错误
  - _需求：4.1、4.2_

  - [ ]* 5.1 为 `schoolGroups` 计数一致性编写属性测试（fast-check）
    - **属性 7：schoolGroups 计数一致性**
    - 对任意导入结果，`schoolGroups` 中各组 `created` 长度之和应等于顶层 `success` 计数，且等于顶层 `created` 列表长度
    - 最少运行 100 次
    - _需求：4.1、4.2_

- [x] 6. 检查点 — 确认 API 路由所有单元测试通过，向用户确认响应结构无误后继续。

- [x] 7. 更新 `app/admin/users/BulkImportPanel.tsx`：格式说明与示例 CSV
  - 更新 `TEACHER_SAMPLE` 常量：移除账号后缀字段，格式改为 `显示名称[,初始密码]`，包含多学校块示例
  - 更新 `STUDENT_SAMPLE` 常量：移除账号后缀字段，格式改为 `显示名称,老师账号[,初始密码]`
  - 更新老师导入格式说明文字：移除账号后缀描述，说明账号自动生成为 `{学校编码}LS{序号}` 格式
  - 更新学生导入格式说明文字：移除账号后缀描述，说明账号自动生成为 `{学校编码}{序号}` 格式
  - 保留注释行说明（以 `#` 开头的行会被忽略）
  - _需求：1.6、2.5、6.2_

- [x] 8. 更新 `app/admin/users/BulkImportPanel.tsx`：结果分组渲染
  - 更新 `ImportResult` 类型，新增 `schoolGroups?: SchoolGroup[]` 字段
  - 当 `result.schoolGroups` 存在且长度 > 0 时，按分组渲染结果表格：每组显示学校名称、学校编码及该组用户数量，下方展示该组用户列表
  - 当 `result.schoolGroups` 不存在时，回退到原有的平铺渲染（向后兼容）
  - _需求：4.3、4.4、4.5_

  - [ ]* 8.1 为密码哈希正确性编写属性测试（fast-check，放在 `__tests__/bulk-import.property.test.ts`）
    - **属性 8：密码哈希正确性**
    - 对任意导入行（无论是否提供密码字段），创建的用户 `passwordHash` 应满足 `bcrypt.compare(提供的密码或"123456", passwordHash) === true`，且 `passwordHash` 不等于明文密码
    - 最少运行 100 次
    - _需求：5.1、5.2、5.3_

  - [ ]* 8.2 为学生学校由老师账号推断编写属性测试（fast-check）
    - **属性 9：学生学校由老师账号推断**
    - 对任意存在于数据库中且角色为 TEACHER 的老师账号，以该账号导入的学生的 `schoolId` 应等于该老师的 `schoolId`
    - 最少运行 100 次
    - _需求：2.2_

- [x] 9. 最终检查点 — 确认所有测试通过，向用户确认三个文件改动均已完成。

## 备注

- 标有 `*` 的子任务为可选测试任务，可跳过以加快 MVP 交付
- 每个任务均引用具体需求条款以保证可追溯性
- 属性测试文件放在 `__tests__/` 目录下，使用 fast-check 库
- 序号分配采用"查询最大值 + 内存递增 + 唯一键兜底"策略，无需分布式锁
- 改造不修改 Prisma schema，现有 `User` 和 `School` 模型已满足需求
