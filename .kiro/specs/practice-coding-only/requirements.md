# Requirements Document

## Introduction

本功能将练习模式（Practice）从支持三种题型（MCQ 单选题、TFQ 判断题、CODING 编程题）改为仅支持编程题（CODING）。

变更范围涵盖后端接口（题库筛选、答案保存、提交逻辑）和前端页面（题目展示、答题交互、结果展示）。编程题不自动判分，`isCorrect` 始终为 `null`，需要教师人工批改。跳过功能保留。

## Glossary

- **Practice_System**：练习模式系统，负责管理练习会话的创建、答题和提交。
- **Practice_Session**：一次练习会话，记录用户在某个题库中的答题过程。
- **Question_Bank**：题库，类型为 `PRACTICE`，包含若干题目。
- **Coding_Question**：编程题，类型为 `CODING`，需要用户编写代码作为答案。
- **Practice_Answer**：练习答案记录，存储用户对某道题的作答内容及状态。
- **Teacher**：教师角色，负责对编程题答案进行人工批改并填写评语。
- **Student**：学生角色，参与练习并提交答案。

---

## Requirements

### Requirement 1：题库仅包含编程题

**User Story:** As a Student, I want the practice question bank to only contain coding questions, so that I can focus on programming exercises.

#### Acceptance Criteria

1. WHEN the Practice_System starts a new Practice_Session, THE Practice_System SHALL only load questions of type `CODING` from the Question_Bank.
2. IF a Question_Bank contains questions of type `MCQ` or `TFQ`, THEN THE Practice_System SHALL exclude those questions when building the Practice_Session.
3. THE Practice_System SHALL display the question count on the practice list page based only on `CODING` questions in each Question_Bank.

---

### Requirement 2：答题界面仅展示代码编辑器

**User Story:** As a Student, I want the answer interface to show a code editor for every question, so that I can write code as my answer.

#### Acceptance Criteria

1. WHEN a Student opens a Practice_Session, THE Practice_System SHALL render a Monaco code editor for each Coding_Question.
2. THE Practice_System SHALL NOT render MCQ option buttons or TFQ true/false buttons in the practice answer page.
3. WHEN a Student types code in the editor, THE Practice_System SHALL update the in-memory answer state for that Coding_Question.
4. WHILE a Practice_Session is active, THE Practice_System SHALL preserve the Student's code across question navigation without submitting to the server on each keystroke.

---

### Requirement 3：答案保存不自动判分

**User Story:** As a Teacher, I want coding answers to remain ungraded until I manually review them, so that I can provide accurate feedback.

#### Acceptance Criteria

1. WHEN a Practice_Answer is saved for a Coding_Question, THE Practice_System SHALL set `isCorrect` to `null`.
2. THE Practice_System SHALL NOT compute `isCorrect` based on `correctAnswer` for any answer saved during a Practice_Session.
3. WHEN the Practice_System submits a Practice_Session, THE Practice_System SHALL set `correctCount` to `0` as the initial value pending teacher review.

---

### Requirement 4：跳过功能保留

**User Story:** As a Student, I want to skip a coding question, so that I can move on and come back later or submit without answering it.

#### Acceptance Criteria

1. WHEN a Student clicks "跳过此题", THE Practice_System SHALL mark the current Coding_Question as skipped (`isSkipped = true`) and advance to the next question.
2. IF the skipped question is the last question in the Practice_Session, THEN THE Practice_System SHALL trigger the submit flow.
3. WHEN a Practice_Answer is saved with `isSkipped = true`, THE Practice_System SHALL set `userAnswer` to `null` and `isCorrect` to `null`.

---

### Requirement 5：批量保存答案接口仅处理编程题

**User Story:** As a Student, I want my answers to be saved correctly when I submit, so that the teacher can review my code.

#### Acceptance Criteria

1. WHEN the answers-batch endpoint receives a list of answers, THE Practice_System SHALL set `isCorrect` to `null` for all answers regardless of question type.
2. THE Practice_System SHALL NOT branch on `QuestionType` to compute `isCorrect` in the batch save logic.
3. WHEN the single-answer endpoint receives an answer for a Coding_Question, THE Practice_System SHALL set `isCorrect` to `null`.

---

### Requirement 6：结果页面适配编程题

**User Story:** As a Student, I want to see my submitted code and grading status on the result page, so that I know what I submitted and whether it has been reviewed.

#### Acceptance Criteria

1. WHEN a Student views the result page after submitting a Practice_Session, THE Practice_System SHALL display the submitted code for each Coding_Question.
2. THE Practice_System SHALL NOT display a "正确答案" field on the result page for Coding_Questions.
3. WHEN `isCorrect` is `null` for a Coding_Question answer, THE Practice_System SHALL display "待批改" as the grading status.
4. WHEN a Teacher has added a comment to a Practice_Answer, THE Practice_System SHALL display the comment on the result page.
5. THE Practice_System SHALL display the total number of skipped questions and total question count in the result summary.

---

### Requirement 7：只读回顾模式适配编程题

**User Story:** As a Student, I want to review my submitted code in read-only mode, so that I can see what I wrote and any teacher feedback.

#### Acceptance Criteria

1. WHEN a Student opens a completed Practice_Session, THE Practice_System SHALL render the session in read-only mode.
2. WHILE in read-only mode, THE Practice_System SHALL display the submitted code in a non-editable code viewer for each Coding_Question.
3. WHEN `isCorrect` is `null` in read-only mode, THE Practice_System SHALL display "— 待批改" as the status badge.
4. WHERE a Teacher comment exists for a Coding_Question answer, THE Practice_System SHALL display the comment in a highlighted block below the code viewer.
