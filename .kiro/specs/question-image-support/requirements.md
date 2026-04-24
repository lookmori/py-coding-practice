# Requirements Document

## Introduction

本功能为考试与练习系统添加图片支持能力。题目内容（content）和选项（optionA/B/C/D）中可包含裸图片 URL，系统需要自动识别并渲染为图片。图片托管于 MinIO 对象存储服务器。系统需要在题目渲染时正确显示图片、优雅处理加载失败，并为管理员提供批量上传图片到 MinIO 的后台功能。

**图片嵌入格式约定：**
- **选项字段**（optionA/B/C/D）：整个字段值为一个裸 URL（如 `https://117.72.47.130:9000/exam-images/q1_optB.png`），则渲染为图片；否则渲染为纯文本
- **题干字段**（content）：文本中出现的裸 URL 自动识别并渲染为内联图片，其余文字正常 Markdown 渲染

## Glossary

- **Question_Renderer**：负责渲染题目内容和选项的前端组件（即 `QuestionCard` 及其子组件）
- **MarkdownContent**：现有的 Markdown 渲染组件，用于渲染题干和编程题描述
- **Option_Renderer**：负责渲染单选题选项的前端逻辑（当前为 `<span className="flex-1">{text}</span>`）
- **Bare_URL**：字段值整体或文本中出现的裸图片链接，以 `http://` 或 `https://` 开头，以常见图片扩展名（`.png`、`.jpg`、`.jpeg`、`.gif`、`.webp`）结尾
- **Image_Component**：处理图片渲染与加载失败降级的前端组件
- **MinIO_Client**：服务端与 MinIO 对象存储交互的 SDK 客户端（S3 兼容 API）
- **Upload_API**：管理员后台调用的图片上传接口（`/api/admin/images/upload`）
- **Admin_Image_Panel**：管理员后台中用于批量上传图片的 UI 面板
- **Image_URL**：MinIO 图片的完整访问地址，格式为 `https://{host}:{port}/{bucket}/{folder}/{filename}`
- **Fallback_Placeholder**：图片加载失败时显示的友好占位符 UI

## Requirements

### Requirement 1：题干裸 URL 自动识别与图片渲染

**User Story:** As a 学生, I want 题目题干中出现的图片链接自动渲染为图片, so that 我能看到题目中包含的图表、示意图等视觉内容，从而正确理解题意。

#### Acceptance Criteria

1. WHEN 题干（content）字段的文本中出现 Bare_URL 时，THE MarkdownContent SHALL 自动将该 URL 渲染为内联 `<img>` 元素，而非显示为文字链接
2. WHEN 题干文本中同时包含普通文字和 Bare_URL 时，THE MarkdownContent SHALL 将文字部分正常 Markdown 渲染，将 Bare_URL 部分渲染为图片，两者在同一内容区域内正确排版
3. THE Image_Component SHALL 为渲染的图片设置 `max-width: 100%` 样式，确保图片不超出题目卡片宽度
4. THE Image_Component SHALL 为渲染的图片设置 `height: auto` 样式，保持图片原始宽高比

---

### Requirement 2：选项裸 URL 自动识别与图片渲染

**User Story:** As a 学生, I want 单选题选项中的图片链接自动渲染为图片, so that 我能看到选项中包含的图表或公式图片，从而做出正确选择。

#### Acceptance Criteria

1. WHEN 单选题选项（optionA/B/C/D）字段的整个值为一个 Bare_URL 时，THE Option_Renderer SHALL 将该选项渲染为 Image_Component 显示的图片，而非纯文本
2. WHEN 单选题选项字段的值不是 Bare_URL（即为普通文字）时，THE Option_Renderer SHALL 保持与当前一致的纯文本渲染外观
3. THE Option_Renderer SHALL 在选项按钮内正确布局图片，图片不超出选项按钮边界

---

### Requirement 3：图片加载失败降级处理

**User Story:** As a 学生, I want 图片加载失败时看到友好的占位符而非破损图标, so that 我能了解此处应有图片但暂时无法加载，不影响答题体验。

#### Acceptance Criteria

1. WHEN 图片 URL 请求返回网络错误或 HTTP 错误状态码时，THE Image_Component SHALL 隐藏破损的 `<img>` 元素
2. WHEN 图片加载失败时，THE Image_Component SHALL 显示包含图片图标和文字"图片加载失败"的 Fallback_Placeholder
3. THE Fallback_Placeholder SHALL 具有与图片占位区域相近的视觉尺寸（最小高度 80px），避免页面布局跳动
4. WHEN 图片正在加载时，THE Image_Component SHALL 显示加载中的骨架屏动画，直到图片加载完成或失败

---

### Requirement 4：MinIO 环境变量配置

**User Story:** As a 系统管理员, I want 通过环境变量配置 MinIO 连接信息, so that 不同部署环境（开发、生产）可以连接不同的 MinIO 实例，无需修改代码。

#### Acceptance Criteria

1. THE System SHALL 从环境变量 `MINIO_ENDPOINT` 读取 MinIO 服务器地址（示例：`117.72.47.130`）
2. THE System SHALL 从环境变量 `MINIO_PORT` 读取 MinIO 服务器端口（示例：`9000`）
3. THE System SHALL 从环境变量 `MINIO_ACCESS_KEY` 读取 MinIO 访问密钥
4. THE System SHALL 从环境变量 `MINIO_SECRET_KEY` 读取 MinIO 私有密钥
5. THE System SHALL 从环境变量 `MINIO_BUCKET` 读取默认存储桶名称（示例：`exam-images`）
6. THE System SHALL 从环境变量 `MINIO_USE_SSL` 读取是否启用 SSL（值为 `true` 或 `false`，默认 `true`）
7. IF 任意必需环境变量（`MINIO_ENDPOINT`、`MINIO_ACCESS_KEY`、`MINIO_SECRET_KEY`、`MINIO_BUCKET`）未配置，THEN THE Upload_API SHALL 返回 HTTP 500 状态码及描述性错误信息

---

### Requirement 5：管理员批量上传图片

**User Story:** As a 管理员, I want 在后台批量上传图片到 MinIO 服务器, so that 我能快速为题目准备图片资源，并获得可直接嵌入题目的图片 URL。

#### Acceptance Criteria

1. THE Admin_Image_Panel SHALL 提供文件选择控件，支持同时选择多个图片文件（JPEG、PNG、GIF、WebP 格式）
2. WHEN 管理员选择图片文件并点击上传时，THE Admin_Image_Panel SHALL 向 Upload_API 发送包含文件和目标文件夹名称的 multipart/form-data 请求
3. WHEN Upload_API 收到上传请求时，THE MinIO_Client SHALL 将每个文件上传至 MinIO 存储桶的指定文件夹路径下
4. WHEN 文件上传成功时，THE Upload_API SHALL 返回包含每个文件完整 Image_URL 的 JSON 响应
5. THE Admin_Image_Panel SHALL 在上传完成后展示每个文件对应的 Image_URL，并提供一键复制功能
6. WHEN 单个文件上传失败时，THE Upload_API SHALL 在响应中标记该文件的失败原因，其余文件的上传结果不受影响
7. THE Upload_API SHALL 仅允许经过身份验证且角色为 ADMIN 的用户调用，其他请求返回 HTTP 403 状态码
8. THE Upload_API SHALL 拒绝单个文件大小超过 10MB 的上传请求，返回 HTTP 400 状态码及错误信息
9. THE Admin_Image_Panel SHALL 在上传过程中显示每个文件的上传进度状态（等待中、上传中、成功、失败）

---

### Requirement 6：图片 URL 格式一致性

**User Story:** As a 管理员, I want 上传后获得格式统一的图片 URL, so that 我能直接将 URL 粘贴到题目内容中使用，无需手动拼接路径。

#### Acceptance Criteria

1. WHEN 文件上传成功时，THE Upload_API SHALL 返回格式为 `https://{MINIO_ENDPOINT}:{MINIO_PORT}/{MINIO_BUCKET}/{folder}/{filename}` 的完整 Image_URL
2. THE Upload_API SHALL 保留上传文件的原始文件名（不含路径），作为 MinIO 对象名称的文件名部分
3. WHEN 上传文件夹名称（folder）未指定时，THE Upload_API SHALL 使用当前日期（格式 `YYYY-MM-DD`）作为默认文件夹名称
