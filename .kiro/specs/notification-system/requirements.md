# Requirements Document

## Introduction

本功能为 Python 答题平台新增站内消息通知系统。当老师或管理员完成对学生编程题的评分后，系统自动向对应学生发送站内通知，告知其哪道题已被评分并可查看评语。学生可在平台内查看未读消息数量、浏览消息列表、点击消息跳转至对应答题记录详情，并将消息标记为已读。

## Glossary

- **Notification_System**：站内消息通知系统，负责创建、存储、查询和更新通知记录
- **Notification**：一条站内消息记录，包含接收者、内容、关联答题记录、已读状态等字段
- **Grader**：执行评分操作的用户，角色为 TEACHER 或 ADMIN
- **Student**：接收通知的用户，角色为 STUDENT
- **Answer_Record**：学生的答题记录，分为考试答题（ExamAnswer + ExamSession）和练习答题（PracticeAnswer + PracticeSession）
- **Unread_Count**：当前学生未读通知的数量，用于在导航栏显示角标
- **Session_Type**：答题会话类型，取值为 `exam`（考试）或 `practice`（练习）
- **SSE_Connection**：学生端与服务端之间建立的 Server-Sent Events 长连接，用于服务端主动向学生推送实时事件
- **SSE_Event**：通过 SSE_Connection 推送的事件，包含事件类型（如 `new-notification`、`notification-deleted`）和事件数据

---

## Requirements

### Requirement 1：评分后自动创建通知

**User Story:** As a Student, I want to receive an in-app notification when my coding answer is graded, so that I know when to check the feedback.

#### Acceptance Criteria

1. WHEN a Grader submits a grade for a CODING type answer via `/api/teacher/grading/[answerId]`, THE Notification_System SHALL create a Notification record for the answer's owner Student.
2. WHEN a Grader submits a grade for a CODING type answer via `/api/admin/grade`, THE Notification_System SHALL create a Notification record for the answer's owner Student.
3. THE Notification_System SHALL set the Notification's `recipientId` to the Student's user ID derived from the graded Answer_Record's session.
4. THE Notification_System SHALL set the Notification's `sessionType` to `exam` when the graded answer belongs to an ExamSession, and to `practice` when it belongs to a PracticeSession.
5. THE Notification_System SHALL set the Notification's `sessionId` to the session ID of the graded Answer_Record.
6. THE Notification_System SHALL set the Notification's `answerId` to the ID of the graded Answer_Record.
7. THE Notification_System SHALL set the Notification's `questionContent` to the first 100 characters of the graded question's content field.
8. THE Notification_System SHALL set the Notification's `isRead` field to `false` upon creation.
9. THE Notification_System SHALL set the Notification's `createdAt` field to the server timestamp at the time of creation.
10. IF the Notification creation fails due to a database error, THEN THE Notification_System SHALL log the error and return the grading success response to the Grader without interrupting the grading operation.

---

### Requirement 2：未读消息数量查询

**User Story:** As a Student, I want to see the count of my unread notifications in the navigation bar, so that I can quickly know if there are new messages.

#### Acceptance Criteria

1. THE Notification_System SHALL expose a `GET /api/notifications/unread-count` endpoint accessible only to authenticated users with role STUDENT.
2. WHEN a Student calls `GET /api/notifications/unread-count`, THE Notification_System SHALL return a JSON object containing the integer count of Notification records where `recipientId` equals the Student's user ID and `isRead` equals `false`.
3. IF the requesting user's role is not STUDENT, THEN THE Notification_System SHALL return HTTP 403.
4. IF the requesting user is not authenticated, THEN THE Notification_System SHALL return HTTP 401.
5. THE Notification_System SHALL return the unread count as `{ "count": <integer> }` with HTTP 200.

---

### Requirement 3：消息列表查询

**User Story:** As a Student, I want to view a paginated list of my notifications, so that I can browse all grading feedback I have received.

#### Acceptance Criteria

1. THE Notification_System SHALL expose a `GET /api/notifications` endpoint accessible only to authenticated users with role STUDENT.
2. WHEN a Student calls `GET /api/notifications`, THE Notification_System SHALL return only Notification records where `recipientId` equals the Student's user ID.
3. THE Notification_System SHALL return notifications sorted by `createdAt` in descending order (newest first).
4. THE Notification_System SHALL support pagination via `page` (default: 1) and `pageSize` (default: 20, maximum: 50) query parameters.
5. THE Notification_System SHALL return a response containing `{ items, total, page, pageSize, totalPages }`.
6. WHILE returning notification items, THE Notification_System SHALL include the fields: `id`, `sessionType`, `sessionId`, `answerId`, `questionContent`, `isRead`, `createdAt`.
7. IF the requesting user's role is not STUDENT, THEN THE Notification_System SHALL return HTTP 403.
8. IF the requesting user is not authenticated, THEN THE Notification_System SHALL return HTTP 401.

---

### Requirement 4：标记消息已读

**User Story:** As a Student, I want to mark notifications as read, so that the unread badge count decreases and I can track which messages I have seen.

#### Acceptance Criteria

1. THE Notification_System SHALL expose a `PATCH /api/notifications/[notificationId]/read` endpoint accessible only to authenticated users with role STUDENT.
2. WHEN a Student calls `PATCH /api/notifications/[notificationId]/read`, THE Notification_System SHALL set the `isRead` field of the specified Notification to `true`.
3. IF the specified Notification does not exist, THEN THE Notification_System SHALL return HTTP 404.
4. IF the specified Notification's `recipientId` does not match the requesting Student's user ID, THEN THE Notification_System SHALL return HTTP 403.
5. WHEN the `isRead` field is already `true`, THE Notification_System SHALL return HTTP 200 without modifying the record (idempotent operation).
6. THE Notification_System SHALL expose a `PATCH /api/notifications/read-all` endpoint that sets `isRead` to `true` for all Notification records where `recipientId` equals the requesting Student's user ID and `isRead` equals `false`.
7. IF the requesting user's role is not STUDENT, THEN THE Notification_System SHALL return HTTP 403.
8. IF the requesting user is not authenticated, THEN THE Notification_System SHALL return HTTP 401.

---

### Requirement 5：消息跳转至答题记录详情

**User Story:** As a Student, I want to click a notification and be taken to the corresponding answer record detail page, so that I can read the teacher's comment directly.

#### Acceptance Criteria

1. WHEN a Student clicks a Notification in the notification list, THE Notification_System SHALL navigate the Student to `/records/exam/[sessionId]` if the Notification's `sessionType` is `exam`.
2. WHEN a Student clicks a Notification in the notification list, THE Notification_System SHALL navigate the Student to `/records/practice/[sessionId]` if the Notification's `sessionType` is `practice`.
3. WHEN a Student navigates to a notification's target page, THE Notification_System SHALL mark the corresponding Notification as read by calling `PATCH /api/notifications/[notificationId]/read`.
4. THE Notification_System SHALL perform the read marking before or concurrently with the navigation, without blocking the navigation.

---

### Requirement 6：导航栏未读角标展示

**User Story:** As a Student, I want to see a badge with the unread notification count on the navigation bar, so that I am aware of new grading feedback at a glance.

#### Acceptance Criteria

1. WHILE a Student is logged in, THE Notification_System SHALL display the unread notification count as a badge on the notification entry point in the navigation bar.
2. WHEN the unread count is 0, THE Notification_System SHALL hide the badge.
3. WHEN the unread count is greater than 0 and less than or equal to 99, THE Notification_System SHALL display the exact count in the badge.
4. WHEN the unread count exceeds 99, THE Notification_System SHALL display "99+" in the badge.
5. WHEN a Student marks a notification as read, THE Notification_System SHALL update the badge count in the current page without requiring a full page reload.
6. WHERE the platform is accessed by a user with role ADMIN or TEACHER, THE Notification_System SHALL not display the notification badge.
7. WHEN the SSE_Connection receives a `new-notification` event, THE Notification_System SHALL increment the badge count by 1 without requiring a full page reload or polling.
8. WHEN the SSE_Connection receives a `notification-deleted` event, THE Notification_System SHALL recalculate and update the badge count to reflect the current unread count.

---

### Requirement 7：数据模型

**User Story:** As a developer, I want a well-defined Notification data model, so that the system can reliably store and query notification records.

#### Acceptance Criteria

1. THE Notification_System SHALL store Notification records in a dedicated `Notification` table in the PostgreSQL database.
2. THE Notification_System SHALL define the `Notification` model with the following fields: `id` (String, CUID primary key), `recipientId` (String, foreign key to User), `sessionType` (String, `exam` or `practice`), `sessionId` (String), `answerId` (String), `questionContent` (String, max 100 characters), `isRead` (Boolean, default false), `createdAt` (DateTime, default now).
3. THE Notification_System SHALL create a database index on `(recipientId, isRead)` to optimize unread count queries.
4. THE Notification_System SHALL create a database index on `(recipientId, createdAt)` to optimize paginated list queries.
5. IF a User record is deleted, THEN THE Notification_System SHALL cascade-delete all Notification records where `recipientId` equals the deleted User's ID.

---

### Requirement 8：权限与安全

**User Story:** As a platform administrator, I want notification data to be strictly isolated per student, so that students cannot access each other's notifications.

#### Acceptance Criteria

1. THE Notification_System SHALL verify that the authenticated user's ID matches the `recipientId` of any Notification before returning or modifying it.
2. IF a Student attempts to read or modify a Notification belonging to another Student, THEN THE Notification_System SHALL return HTTP 403.
3. THE Notification_System SHALL not expose any endpoint that allows bulk retrieval of notifications across multiple students.
4. THE Notification_System SHALL create Notification records only from server-side grading API handlers, not from any client-accessible endpoint.

---

### Requirement 9：实时推送（SSE）

**User Story:** As a Student, I want to receive new notification alerts in real time without refreshing the page, so that I am immediately aware of grading feedback as soon as it is available.

#### Acceptance Criteria

1. THE Notification_System SHALL expose a `GET /api/notifications/stream` endpoint that establishes a Server-Sent Events connection for the authenticated Student.
2. WHEN a Student connects to `GET /api/notifications/stream`, THE Notification_System SHALL keep the SSE_Connection open and send a `connected` event to confirm the connection is established.
3. IF the requesting user is not authenticated, THEN THE Notification_System SHALL return HTTP 401 and not establish the SSE_Connection.
4. IF the requesting user's role is not STUDENT, THEN THE Notification_System SHALL return HTTP 403 and not establish the SSE_Connection.
5. WHEN a new Notification is created for a Student, THE Notification_System SHALL push a `new-notification` SSE_Event to that Student's active SSE_Connection within 2 seconds of the Notification record being persisted to the database.
6. THE Notification_System SHALL include the following fields in the `new-notification` SSE_Event data: `id`, `sessionType`, `sessionId`, `answerId`, `questionContent`, `createdAt`.
7. WHEN a Student's SSE_Connection is inactive or not established, THE Notification_System SHALL not push the SSE_Event and SHALL rely on the Student reconnecting and polling `GET /api/notifications/unread-count` to retrieve the current count.
8. THE Notification_System SHALL send a heartbeat comment (`: ping`) to each active SSE_Connection at an interval of no more than 30 seconds to prevent the connection from being closed by proxies or browsers.
9. WHEN a Student's SSE_Connection is closed by the client, THE Notification_System SHALL release all server-side resources associated with that connection.
10. THE Notification_System SHALL support at most one active SSE_Connection per Student at any given time; WHEN a new connection is established for a Student who already has an active SSE_Connection, THE Notification_System SHALL close the previous connection.

---

### Requirement 10：通知删除

**User Story:** As a Student, I want to delete individual notifications or bulk-delete all read notifications, so that I can keep my notification list clean and manageable.

#### Acceptance Criteria

1. THE Notification_System SHALL expose a `DELETE /api/notifications/[notificationId]` endpoint accessible only to authenticated users with role STUDENT.
2. WHEN a Student calls `DELETE /api/notifications/[notificationId]`, THE Notification_System SHALL permanently delete the specified Notification record from the database and return HTTP 200.
3. IF the specified Notification does not exist, THEN THE Notification_System SHALL return HTTP 404.
4. IF the specified Notification's `recipientId` does not match the requesting Student's user ID, THEN THE Notification_System SHALL return HTTP 403.
5. THE Notification_System SHALL expose a `DELETE /api/notifications/read` endpoint accessible only to authenticated users with role STUDENT.
6. WHEN a Student calls `DELETE /api/notifications/read`, THE Notification_System SHALL permanently delete all Notification records where `recipientId` equals the requesting Student's user ID and `isRead` equals `true`, and return HTTP 200 with `{ "deletedCount": <integer> }`.
7. WHEN a Notification is deleted and the deleted Notification had `isRead` equal to `false`, THE Notification_System SHALL push a `notification-deleted` SSE_Event to the Student's active SSE_Connection containing the deleted Notification's `id`.
8. IF the requesting user's role is not STUDENT, THEN THE Notification_System SHALL return HTTP 403.
9. IF the requesting user is not authenticated, THEN THE Notification_System SHALL return HTTP 401.
