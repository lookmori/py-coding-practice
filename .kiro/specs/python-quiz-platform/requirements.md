# Requirements Document

## Introduction

本项目是一个基于 Next.js、TailwindCSS 和 PostgreSQL 构建的在线 Python 答题网站，支持两种核心模式：**考试模式**和**练习模式**。所有用户须登录后方可使用。考试模式具备防作弊机制、固定题型结构和自动交卷功能；练习模式支持跳题、排行榜和完成度统计。系统提供个人答题记录查询功能，并设有**管理员后台**，支持题库导入、用户账号批量管理等操作。

## Glossary

- **Platform**: 在线 Python 答题平台整体系统
- **User**: 已注册并登录的系统用户，拥有用户名、账号和密码
- **Admin**: 内置管理员账号，拥有管理题库、用户和查看所有记录的权限
- **Exam**: 考试模式，包含固定题型、倒计时和防作弊机制的正式测评
- **Practice**: 练习模式，允许跳题、查看排行榜和完成度的非正式练习
- **Question**: 题目，包含选择题、判断题和编程大题三种类型
- **MCQ (Multiple Choice Question)**: 单选题，每题提供四个选项
- **TFQ (True/False Question)**: 判断题，答案为"正确"或"错误"
- **CodingQuestion**: 编程大题，需要用户编写 Python 代码作答
- **ExamSession**: 一次完整的考试会话，记录开始时间、交卷时间和所有作答
- **PracticeSession**: 一次完整的练习会话，记录参与者姓名、作答详情和完成时间
- **Leaderboard**: 排行榜，按完成时间升序展示练习参与者的成绩
- **ScreenSwitchDetection**: 屏幕切换检测，监控用户在考试期间是否切换至其他窗口或标签页
- **AutoSubmit**: 倒计时归零时系统自动提交当前作答的机制
- **CompletionRate**: 每道题的完成度，即所有参与者中作答该题的比例
- **PersonalRecord**: 个人记录，包含某用户所有历史考试和练习的汇总数据
- **Timer**: 考试倒计时组件，显示剩余时间并在归零时触发自动交卷
- **BulkImport**: 批量导入，通过 JSON 文件一次性导入多道题目或多个用户账号

---

## Requirements

### Requirement 1: 题库管理

**User Story:** As a 平台管理员, I want 在数据库中维护结构化的题库, so that 考试和练习模式均可从中抽取题目。

#### Acceptance Criteria

1. THE Platform SHALL 在 PostgreSQL 数据库中存储三种类型的题目：MCQ、TFQ 和 CodingQuestion。
2. THE Platform SHALL 为每道 MCQ 存储题干、四个选项和唯一正确答案。
3. THE Platform SHALL 为每道 TFQ 存储题干和布尔类型的正确答案。
4. THE Platform SHALL 为每道 CodingQuestion 存储题干、题目描述、参考答案和评分标准。
5. THE Platform SHALL 为每道题目存储所属分类标签（如"基础语法"、"数据结构"等）。

---

### Requirement 2: 考试模式 — 题目结构

**User Story:** As a 参加考试的用户, I want 按照固定题型结构完成考试, so that 考试内容标准统一、评分公平。

#### Acceptance Criteria

1. WHEN 用户开始一次 Exam, THE Platform SHALL 从题库中抽取恰好 25 道 MCQ、10 道 TFQ 和 3 道 CodingQuestion 组成本次考试题目集。
2. THE Platform SHALL 在同一次 ExamSession 中保持题目顺序不变，先展示全部 MCQ，再展示全部 TFQ，最后展示全部 CodingQuestion。
3. THE Platform SHALL 为每次 ExamSession 生成唯一标识符并持久化存储至 PostgreSQL。

---

### Requirement 3: 考试模式 — 倒计时与自动交卷

**User Story:** As a 参加考试的用户, I want 在规定时间内完成考试并在时间到时自动交卷, so that 考试时间受到公平约束。

#### Acceptance Criteria

1. WHEN 用户开始一次 Exam, THE Timer SHALL 从预设的考试时长开始倒计时并在页面上持续显示剩余时间。
2. WHEN Timer 归零, THE Platform SHALL 自动提交当前 ExamSession 中所有已作答和未作答的题目。
3. WHILE Timer 运行中, THE Platform SHALL 每隔 30 秒将当前作答进度自动保存至 PostgreSQL，以防止意外丢失。
4. IF 用户在 Timer 归零前手动点击"交卷"按钮, THEN THE Platform SHALL 弹出确认对话框，用户确认后立即提交 ExamSession。

---

### Requirement 4: 考试模式 — 屏幕切换检测（防作弊）

**User Story:** As a 考试组织者, I want 系统检测并记录用户在考试期间的屏幕切换行为, so that 能够识别潜在的作弊行为。

#### Acceptance Criteria

1. WHILE ExamSession 进行中, THE ScreenSwitchDetection SHALL 监听浏览器的 `visibilitychange` 和 `blur` 事件以检测用户离开当前页面的行为。
2. WHEN ScreenSwitchDetection 检测到用户切换至其他窗口或标签页, THE Platform SHALL 在当前 ExamSession 记录中追加一条切换事件，包含切换发生的时间戳。
3. WHEN ScreenSwitchDetection 检测到用户切换至其他窗口或标签页, THE Platform SHALL 在页面上显示一条警告提示，告知用户该行为已被记录。
4. THE Platform SHALL 在 ExamSession 结果中展示该次考试的屏幕切换总次数。
5. IF 用户在单次 ExamSession 中屏幕切换次数超过 3 次, THEN THE Platform SHALL 在警告提示中注明切换次数已超过警告阈值。

---

### Requirement 5: 考试模式 — 作答与提交

**User Story:** As a 参加考试的用户, I want 逐题作答并提交考试, so that 我的答案能被系统记录和评分。

#### Acceptance Criteria

1. THE Platform SHALL 为每道 MCQ 和 TFQ 在用户提交后立即计算得分（答对得 1 分，答错得 0 分）。
2. THE Platform SHALL 将 CodingQuestion 的作答内容原文存储，供后续人工或自动评阅。
3. WHEN ExamSession 提交完成, THE Platform SHALL 向用户展示客观题（MCQ + TFQ）的得分汇总页面，包含总分、答对题数和答错题数。
4. THE Platform SHALL 在得分汇总页面中标注每道客观题的用户答案与正确答案。

---

### Requirement 6: 用户账号与登录

**User Story:** As a 网站用户, I want 使用账号和密码登录系统, so that 我的考试和练习记录能与我的身份绑定。

#### Acceptance Criteria

1. THE Platform SHALL 提供登录页面，要求用户输入账号和密码后方可访问考试、练习和个人记录功能。
2. WHEN 用户提交正确的账号和密码, THE Platform SHALL 创建登录会话（Session Cookie）并跳转至首页。
3. WHEN 用户提交错误的账号或密码, THE Platform SHALL 显示"账号或密码错误"提示，不透露具体错误原因。
4. THE Platform SHALL 在所有受保护页面（考试、练习、个人记录）检查登录状态，未登录用户重定向至登录页。
5. THE Platform SHALL 提供退出登录功能，清除登录会话并跳转至登录页。
6. THE Platform SHALL 使用 bcrypt 对用户密码进行哈希存储，不以明文保存密码。

---

### Requirement 7: 练习模式 — 参与者身份识别

**User Story:** As a 已登录的用户, I want 在练习时使用我的账号姓名自动标识身份, so that 我的成绩能出现在排行榜上。

#### Acceptance Criteria

1. WHEN 已登录用户进入练习模式, THE Platform SHALL 自动使用该用户的用户名作为 Participant 姓名，无需手动输入。
2. THE Platform SHALL 将 Participant 姓名（用户名）与对应的 PracticeSession 关联存储至 PostgreSQL。
3. THE Platform SHALL 将当前登录用户的 userId 与 PracticeSession 关联，以支持个人记录查询。

---

### Requirement 8: 练习模式 — 答题与跳题

**User Story:** As a 参与练习的用户, I want 依次作答题目并可以跳过不会的题目, so that 我能灵活地完成练习而不被卡住。

#### Acceptance Criteria

1. THE Platform SHALL 在练习模式中按顺序逐题展示题目，每次仅显示一道题目。
2. WHEN 用户点击"跳过"按钮, THE Platform SHALL 将当前题目标记为"已跳过"并展示下一道题目。
3. THE Platform SHALL 在练习界面中显示当前题目序号、总题目数和已跳过题目数。
4. WHEN 用户完成所有题目（包括已作答和已跳过）, THE Platform SHALL 记录 PracticeSession 的完成时间并展示练习结果页面。
5. THE Platform SHALL 在练习结果页面中展示每道题的用户答案与正确答案对比。

---

### Requirement 9: 练习模式 — 排行榜

**User Story:** As a 参与练习的用户, I want 查看排行榜, so that 我能了解自己相对于其他参与者的完成情况。

#### Acceptance Criteria

1. THE Platform SHALL 在练习结果页面和独立排行榜页面中展示 Leaderboard。
2. THE Leaderboard SHALL 按 PracticeSession 完成时间升序排列所有参与者，完成时间最短者排名第一。
3. THE Leaderboard SHALL 为每条记录展示：排名、Participant 姓名、完成时间（格式为 mm:ss）和答对题数。
4. THE Platform SHALL 在 Leaderboard 中高亮显示当前用户本次 PracticeSession 对应的记录行。
5. WHEN 新的 PracticeSession 提交完成, THE Platform SHALL 在 30 秒内更新 Leaderboard 数据。

---

### Requirement 10: 练习模式 — 题目完成度统计

**User Story:** As a 参与练习的用户, I want 查看每道题的完成度, so that 我能了解哪些题目对大多数人来说较难。

#### Acceptance Criteria

1. THE Platform SHALL 为每道题目计算 CompletionRate，公式为：作答该题的 PracticeSession 数量 ÷ 总 PracticeSession 数量 × 100%。
2. THE Platform SHALL 在题目完成度统计页面中展示所有题目的 CompletionRate，并按 CompletionRate 升序排列（完成度最低的题目排在最前）。
3. THE Platform SHALL 在每道题目的完成度展示中包含：题目序号、题干摘要（前 50 个字符）、CompletionRate 百分比和作答人数。
4. WHEN 新的 PracticeSession 提交完成, THE Platform SHALL 在 30 秒内更新所有题目的 CompletionRate 数据。

---

### Requirement 11: 个人记录 — 考试记录查询

**User Story:** As a 已参加考试的用户, I want 查看自己的历史考试记录, so that 我能追踪自己的学习进度。

#### Acceptance Criteria

1. THE Platform SHALL 提供个人考试记录页面，展示该用户所有历史 ExamSession 的列表。
2. THE Platform SHALL 为每条 ExamSession 记录展示：考试日期、客观题得分、总题数、屏幕切换次数和考试用时。
3. WHEN 用户点击某条 ExamSession 记录, THE Platform SHALL 展示该次考试的详细作答情况，包含每道题的用户答案与正确答案。
4. THE Platform SHALL 按 ExamSession 开始时间降序排列考试记录列表（最新记录排在最前）。

---

### Requirement 12: 个人记录 — 练习记录查询

**User Story:** As a 参与过练习的用户, I want 查看自己的历史练习记录, so that 我能回顾每次练习的表现。

#### Acceptance Criteria

1. THE Platform SHALL 提供个人练习记录页面，展示当前登录用户所有历史 PracticeSession 的列表。
2. THE Platform SHALL 为每条 PracticeSession 记录展示：练习日期、答对题数、总题数、跳过题数和完成时间。
3. WHEN 用户点击某条 PracticeSession 记录, THE Platform SHALL 展示该次练习的详细作答情况，包含每道题的用户答案、正确答案和是否跳过。
4. THE Platform SHALL 按 PracticeSession 开始时间降序排列练习记录列表（最新记录排在最前）。

---

### Requirement 13: 管理员 — 用户账号管理

**User Story:** As a 平台管理员, I want 管理所有用户账号, so that 我能控制谁可以访问平台并维护用户信息。

#### Acceptance Criteria

1. THE Platform SHALL 提供管理员后台页面 `/admin`，仅内置管理员账号可访问，其他用户访问时返回 403。
2. THE Platform SHALL 支持批量生成用户账号：管理员上传包含用户信息的 JSON 文件，系统批量创建账号。
3. THE JSON 文件格式 SHALL 包含每个用户的用户名（displayName）、账号（username）和初始密码（password）字段。
4. WHEN 批量导入用户时, THE Platform SHALL 对每个用户的密码进行 bcrypt 哈希处理后存储。
5. THE Platform SHALL 支持批量修改用户信息：管理员上传包含 userId 和更新字段的 JSON 文件，系统批量更新对应用户的用户名、账号或密码。
6. THE Platform SHALL 支持删除单个用户账号，删除时同步软删除该用户的所有关联记录（ExamSession、PracticeSession）。
7. THE Platform SHALL 在管理员后台展示所有用户列表，包含：用户名、账号、创建时间和最近登录时间。
8. IF 批量导入中某条用户数据格式不合法（如账号重复、字段缺失）, THEN THE Platform SHALL 跳过该条记录并在导入结果中报告错误详情，不中断其余记录的导入。

---

### Requirement 14: 管理员 — 题库导入

**User Story:** As a 平台管理员, I want 通过上传 JSON 文件批量导入题目, so that 我能快速填充和更新题库。

#### Acceptance Criteria

1. THE Platform SHALL 在管理员后台提供考试题库导入功能，接受符合规定格式的 JSON 文件。
2. THE Platform SHALL 在管理员后台提供练习题库导入功能，接受符合规定格式的 JSON 文件。
3. THE JSON 文件中每道 MCQ SHALL 包含：type、content、category、optionA、optionB、optionC、optionD、correctAnswer 字段。
4. THE JSON 文件中每道 TFQ SHALL 包含：type、content、category、correctAnswer（"true" 或 "false"）字段。
5. THE JSON 文件中每道 CodingQuestion SHALL 包含：type、content、category、description、correctAnswer、scoringCriteria 字段。
6. WHEN 导入完成, THE Platform SHALL 展示导入结果摘要：成功导入数量、跳过数量和错误详情列表。
7. IF JSON 文件中某道题目数据格式不合法, THEN THE Platform SHALL 跳过该题并记录错误，不中断其余题目的导入。

---

### Requirement 15: 管理员 — 内容与记录管理

**User Story:** As a 平台管理员, I want 查看和管理平台上所有的考试与练习记录, so that 我能监控平台使用情况。

#### Acceptance Criteria

1. THE Platform SHALL 在管理员后台展示所有用户的考试记录列表，包含：用户名、考试日期、得分和屏幕切换次数。
2. THE Platform SHALL 在管理员后台展示所有用户的练习记录列表，包含：用户名、练习日期、答对题数和完成时间。
3. THE Platform SHALL 在管理员后台提供题库管理页面，支持查看、编辑和删除单道题目。
4. THE Platform SHALL 在管理员后台展示平台统计数据：注册用户总数、考试总次数、练习总次数。

---

### Requirement 16: 系统导航与页面结构

**User Story:** As a 网站访问者, I want 通过清晰的导航访问各功能模块, so that 我能快速找到考试、练习和个人记录入口。

#### Acceptance Criteria

1. THE Platform SHALL 提供一个首页，包含进入考试模式、练习模式和个人记录的导航入口。
2. THE Platform SHALL 在所有页面顶部展示统一的导航栏，包含首页、考试、练习、排行榜和个人记录的链接，以及退出登录按钮。
3. THE Platform SHALL 使用 Next.js App Router 实现客户端路由，页面切换无需整页刷新。
4. THE Platform SHALL 在所有页面上适配移动端和桌面端屏幕尺寸（响应式布局）。
