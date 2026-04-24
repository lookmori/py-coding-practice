# 需求文档

## 简介

本功能改进管理后台的批量导入用户流程，目标是降低操作复杂度并提升导入结果的可读性。

主要变更：
1. **账号自动生成**：管理员无需在 CSV 中手动填写账号，系统自动生成账号。老师和学生使用独立的账号格式，均为 8 位字符，均以学校编码开头：
   - 老师账号：`{4位学校编码}LS{2位序号}`，如 `XS01LS01`、`XS01LS12`
   - 学生账号：`{4位学校编码}{4位序号}`，如 `XS010001`、`XS010012`
2. **多学校支持**：老师导入支持在同一次 CSV 中包含多所学校的数据；学生导入通过老师账号自动推断所属学校。
3. **导入结果按学校分组展示**：当一次导入涉及多所学校时，前端结果区域按学校分组显示，便于核对。

## 词汇表

- **BulkImportAPI**：后端批量导入接口（`POST /api/admin/users/bulk-import`）
- **BulkImportPanel**：前端批量导入面板组件（`app/admin/users/BulkImportPanel.tsx`）
- **School_Code**：4 位字母数字组成的学校唯一编码，如 `XS01`
- **Teacher_Account**：8 位老师账号，格式为 `{School_Code}LS{2位序号}`，序号左补零，如 `XS01LS01`、`XS01LS12`
- **Student_Account**：8 位学生账号，格式为 `{School_Code}{4位序号}`，序号左补零，如 `XS010001`、`XS010012`
- **Teacher_Sequence**：同一学校内老师账号序号，从 1 开始，按已有老师账号最大序号递增，2 位左补零（01～99）
- **Student_Sequence**：同一学校内学生账号序号，从 1 开始，按已有学生账号最大序号递增，4 位左补零（0001～9999）
- **School_Group**：导入结果中按学校聚合的分组，包含学校名称、学校编码及该校成功创建的用户列表

---

## 需求

### 需求 1：老师批量导入 CSV 格式简化

**用户故事：** 作为管理员，我希望在导入老师时只需提供姓名和学校信息，不再手动填写账号后缀，从而减少出错概率并加快录入速度。

#### 验收标准

1. THE BulkImportAPI SHALL 接受如下老师导入 CSV 格式：每个学校块以 `学校名称,学校编码` 作为块头行，后续数据行格式为 `显示名称[,初始密码]`。
2. WHEN 老师导入 CSV 中出现新的学校块头行，THE BulkImportAPI SHALL 将后续数据行归属到该学校，直到下一个块头行或文件结束。
3. WHEN 老师导入 CSV 中的学校编码在数据库中不存在，THE BulkImportAPI SHALL 自动创建该学校记录后继续处理。
4. IF 老师导入 CSV 中某数据行的显示名称为空，THEN THE BulkImportAPI SHALL 跳过该行并在错误列表中记录行号及原因。
5. IF 老师导入 CSV 中的学校编码不符合 School_Code 格式（4 位字母数字），THEN THE BulkImportAPI SHALL 跳过该学校块下的所有数据行并在错误列表中记录原因。
6. THE BulkImportPanel SHALL 更新老师导入的格式说明文字，移除账号后缀字段的描述，并提供符合新格式的示例 CSV。

---

### 需求 2：学生批量导入 CSV 格式简化

**用户故事：** 作为管理员，我希望在导入学生时只需提供姓名和老师账号，不再手动填写账号后缀，从而简化操作。

#### 验收标准

1. THE BulkImportAPI SHALL 接受如下学生导入 CSV 格式：每行格式为 `显示名称,老师账号[,初始密码]`，无需学校块头行（学校由老师账号推断）。
2. WHEN 学生导入 CSV 中某行的老师账号在数据库中存在且角色为 TEACHER，THE BulkImportAPI SHALL 将该学生的 schoolId 设置为该老师的 schoolId。
3. IF 学生导入 CSV 中某行的老师账号在数据库中不存在或角色不为 TEACHER，THEN THE BulkImportAPI SHALL 跳过该行并在错误列表中记录行号及原因。
4. IF 学生导入 CSV 中某行的显示名称为空，THEN THE BulkImportAPI SHALL 跳过该行并在错误列表中记录行号及原因。
5. THE BulkImportPanel SHALL 更新学生导入的格式说明文字，移除账号后缀字段的描述，并提供符合新格式的示例 CSV。

---

### 需求 3：账号自动生成（8 位，学校编码前缀 + 角色标识 + 序号）

**用户故事：** 作为管理员，我希望系统自动为每位导入的用户生成账号，老师和学生使用独立的格式，均为 8 位字符，无需手动指定，从而避免账号冲突和手工错误。

#### 验收标准

**老师账号（`{School_Code}LS{2位序号}`）：**

1. THE BulkImportAPI SHALL 为老师生成格式为 `{School_Code}LS{2位序号}` 的账号，共 8 位，序号左补零（如 `XS01LS01`、`XS01LS12`）。
2. WHEN BulkImportAPI 为某学校创建老师，THE BulkImportAPI SHALL 查询该学校下已有老师账号中序号部分的最大值，并从最大值加 1 开始依次分配。
3. Teacher_Sequence 范围为 01～99；IF 某学校老师账号序号已达 99，THEN THE BulkImportAPI SHALL 拒绝继续为该学校创建老师账号并在错误列表中记录原因。

**学生账号（`{School_Code}{4位序号}`）：**

4. THE BulkImportAPI SHALL 为学生生成格式为 `{School_Code}{4位序号}` 的账号，共 8 位，序号左补零（如 `XS010001`、`XS010012`）。
5. WHEN BulkImportAPI 为某学校创建学生，THE BulkImportAPI SHALL 查询该学校下已有学生账号中序号部分的最大值，并从最大值加 1 开始依次分配。
6. Student_Sequence 范围为 0001～9999；IF 某学校学生账号序号已达 9999，THEN THE BulkImportAPI SHALL 拒绝继续为该学校创建学生账号并在错误列表中记录原因。

**通用：**

7. WHEN 同一次导入请求中同一学校有多条数据行，THE BulkImportAPI SHALL 在单次请求内保证序号连续递增，不重复。
8. IF 自动生成的账号与数据库中已有账号冲突（并发场景），THEN THE BulkImportAPI SHALL 跳过该行并在错误列表中记录行号及原因。
9. THE BulkImportAPI SHALL 在响应的 created 列表中返回每条记录实际生成的账号（username）。

---

### 需求 4：导入结果按学校分组展示

**用户故事：** 作为管理员，我希望导入完成后结果按学校分组显示，便于快速核对每所学校的导入情况。

#### 验收标准

1. WHEN 导入成功条数大于 0，THE BulkImportAPI SHALL 在响应中包含 `schoolGroups` 字段，类型为数组，每个元素包含 `schoolName`（学校名称）、`schoolCode`（学校编码）和 `created`（该校成功创建的用户列表）。
2. THE BulkImportAPI SHALL 保证 `schoolGroups` 中各组的 `created` 列表之和等于顶层 `success` 计数。
3. WHEN 导入结果中只涉及一所学校，THE BulkImportPanel SHALL 仍以分组形式展示（单组），保持 UI 一致性。
4. WHEN 导入结果中涉及多所学校，THE BulkImportPanel SHALL 按 School_Group 分组渲染结果表格，每组显示学校名称、学校编码及该组用户列表。
5. THE BulkImportPanel SHALL 在每个 School_Group 的表头显示该组成功创建的用户数量。

---

### 需求 5：密码默认值与可选覆盖

**用户故事：** 作为管理员，我希望导入时可以不填密码，系统使用默认密码 `123456`，也可以为每行单独指定初始密码。

#### 验收标准

1. WHEN 导入 CSV 中某数据行未提供初始密码字段，THE BulkImportAPI SHALL 使用默认密码 `123456` 为该用户设置密码哈希。
2. WHEN 导入 CSV 中某数据行提供了初始密码字段，THE BulkImportAPI SHALL 使用该字段值为该用户设置密码哈希。
3. THE BulkImportAPI SHALL 使用 bcrypt 算法对所有密码进行哈希处理后存储，不存储明文密码。

---

### 需求 6：注释行支持

**用户故事：** 作为管理员，我希望在 CSV 中可以添加注释行，方便标注说明，系统应忽略这些行。

#### 验收标准

1. WHEN CSV 中某行以 `#` 字符开头，THE BulkImportAPI SHALL 忽略该行，不将其计入数据行或错误行。
2. THE BulkImportPanel SHALL 在格式说明中注明以 `#` 开头的行为注释行会被忽略。
