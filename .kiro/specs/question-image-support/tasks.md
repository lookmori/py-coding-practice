# Implementation Plan: Question Image Support

## Overview

按照设计文档，分步实现题目图片支持功能：先建立纯函数工具层和图片组件，再修改现有渲染组件，最后实现 MinIO 上传后端和管理员 UI。每个阶段均包含属性测试和单元测试子任务。

## Tasks

- [x] 1. 安装依赖并更新环境变量配置
  - 安装 `minio` npm 包（固定版本）
  - 更新 `.env.example`，添加 MinIO 相关环境变量说明（`MINIO_ENDPOINT`、`MINIO_PORT`、`MINIO_ACCESS_KEY`、`MINIO_SECRET_KEY`、`MINIO_BUCKET`、`MINIO_USE_SSL`）
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 2. 创建 `lib/imageUtils.ts` — 纯函数工具层
  - [x] 2.1 实现 `isImageUrl(value: string): boolean`
    - 使用正则 `/^https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp)$/i` 匹配整个字符串（trim 后）
    - 导出函数
    - _Requirements: 2.1, 2.2_

  - [x] 2.2 实现 `preprocessBareImageUrls(text: string): string`
    - 使用正则 `/https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp)/gi` 替换裸 URL 为 `![image](url)` 语法
    - 导出函数
    - _Requirements: 1.1, 1.2_

  - [ ]* 2.3 为 `isImageUrl` 编写属性测试
    - **Property 2: 图片 URL 识别的完备性与精确性**
    - **Validates: Requirements 2.1, 2.2**
    - 创建 `lib/imageUtils.property.test.ts`，使用 `fast-check` 生成有效图片 URL（http/https + 五种扩展名）验证返回 `true`，生成非图片 URL 和纯文本验证返回 `false`，运行 100 次迭代

  - [ ]* 2.4 为 `preprocessBareImageUrls` 编写属性测试
    - **Property 1: 裸 URL 预处理转换**
    - **Validates: Requirements 1.1, 1.2**
    - 在 `lib/imageUtils.property.test.ts` 中追加：生成包含零个或多个裸图片 URL 的混合文本，验证每个裸 URL 都被替换为 `![image](url)` 格式，非 URL 文字保持不变，运行 100 次迭代

  - [ ]* 2.5 为 `isImageUrl` 和 `preprocessBareImageUrls` 编写单元测试
    - 创建 `lib/imageUtils.test.ts`
    - 测试 `isImageUrl`：有效 URL（各扩展名、大小写）、无效 URL（非图片扩展名、纯文本、空字符串、带空格）
    - 测试 `preprocessBareImageUrls`：纯文本不变、纯 URL 转换、混合内容、多个 URL、空字符串
    - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 3. 创建 `components/QuestionImage.tsx` — 图片渲染组件
  - [x] 3.1 实现 `QuestionImage` 组件
    - 定义 `QuestionImageProps`：`src: string`、`alt?: string`、`className?: string`
    - 使用 `useState` 管理三态：`loading | loaded | error`
    - `loading` 状态：渲染 `animate-pulse` 骨架屏，`min-h-20` 灰色矩形
    - `loaded` 状态：渲染 `<img>`，样式 `max-w-full h-auto`
    - `error` 状态：渲染 Fallback_Placeholder（图片图标 + "图片加载失败"文字，`min-h-20`）
    - 绑定 `onLoad` 切换到 `loaded`，`onError` 切换到 `error`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 1.3, 1.4_

  - [ ]* 3.2 为 `QuestionImage` 编写单元测试
    - 创建 `components/QuestionImage.test.tsx`，使用 React Testing Library
    - 测试初始渲染显示骨架屏
    - 触发 `onLoad` 后显示图片、隐藏骨架屏
    - 触发 `onError` 后显示 Fallback_Placeholder，包含"图片加载失败"文字
    - 验证 Fallback_Placeholder 有 `min-h-20` 样式类
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. 修改 `components/MarkdownContent.tsx` — 题干图片渲染
  - [x] 4.1 集成 `preprocessBareImageUrls` 预处理
    - 导入 `preprocessBareImageUrls` 和 `QuestionImage`
    - 将 `{content}` 替换为 `{preprocessBareImageUrls(content)}`，传给 `ReactMarkdown`
    - _Requirements: 1.1, 1.2_

  - [x] 4.2 添加自定义 `img` 渲染器
    - 在 `components` 对象中新增 `img` 渲染器
    - `src` 为空时返回 `null`，否则渲染 `<QuestionImage src={src} alt={alt ?? "image"} className="my-2 rounded" />`
    - _Requirements: 1.1, 1.3, 1.4_

- [x] 5. 修改 `components/QuestionCard.tsx` — 选项图片渲染
  - [x] 5.1 更新 MCQ 选项渲染逻辑
    - 导入 `isImageUrl` 和 `QuestionImage`
    - 将选项文本渲染 `<span className="flex-1">{text}</span>` 改为：`isImageUrl(text)` 时渲染 `<QuestionImage src={text} alt={...} className="max-h-40 rounded" />`，否则保持原文本
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 6. Checkpoint — 前端渲染层验证
  - 确保所有前端测试通过，ask the user if questions arise.

- [x] 7. 创建 `lib/minio.ts` — MinIO 客户端
  - [x] 7.1 实现 `getMinioClient(): Client`
    - 导入 `minio` 包的 `Client`
    - 从环境变量读取 `MINIO_ENDPOINT`、`MINIO_PORT`（默认 9000）、`MINIO_ACCESS_KEY`、`MINIO_SECRET_KEY`、`MINIO_USE_SSL`（默认 `true`）
    - 返回配置好的 `Client` 实例（可使用模块级单例）
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

  - [x] 7.2 实现 `buildImageUrl(endpoint, port, useSSL, bucket, folder, filename): string`
    - 输出格式：`{protocol}://{endpoint}:{port}/{bucket}/{folder}/{filename}`
    - `protocol` 由 `useSSL` 决定（`https` 或 `http`）
    - 导出函数
    - _Requirements: 6.1, 6.2_

  - [ ]* 7.3 为 `buildImageUrl` 编写属性测试
    - **Property 3: 图片 URL 构建格式一致性**
    - **Validates: Requirements 6.1, 6.2**
    - 创建 `lib/minio.property.test.ts`，使用 `fast-check` 生成合法的 endpoint、port（1-65535）、useSSL、bucket、folder、filename 组合，验证输出格式完全符合 `{protocol}://{endpoint}:{port}/{bucket}/{folder}/{filename}`，且 filename 原样保留，运行 100 次迭代

  - [ ]* 7.4 为 `buildImageUrl` 编写单元测试
    - 创建 `lib/minio.test.ts`
    - 测试 SSL/非 SSL 协议切换、不同端口、特殊文件名（含下划线、连字符）
    - _Requirements: 6.1, 6.2_

- [x] 8. 创建 `app/api/admin/images/upload/route.ts` — 图片上传 API
  - [x] 8.1 实现 POST 处理函数
    - 复用现有 `requireAdmin` 鉴权，未登录返回 401，非 ADMIN 返回 403
    - 检查必需环境变量（`MINIO_ENDPOINT`、`MINIO_ACCESS_KEY`、`MINIO_SECRET_KEY`、`MINIO_BUCKET`），缺失返回 500 及描述性错误信息
    - 解析 `FormData`，获取 `files`（多文件）和 `folder`（可选，默认当天日期 `YYYY-MM-DD`）
    - 对每个文件：检查大小 ≤ 10MB（超出记录错误跳过）；调用 `getMinioClient().putObject` 上传；成功调用 `buildImageUrl` 构建 URL；失败记录错误原因
    - 返回 `{ results: Array<{ filename, url?, error? }> }`
    - _Requirements: 5.2, 5.3, 5.4, 5.6, 5.7, 5.8, 4.7, 6.1, 6.2, 6.3_

  - [ ]* 8.2 为上传 API 编写集成测试（mock MinIO）
    - 创建 `app/api/admin/images/upload/route.test.ts`
    - 测试：未登录返回 401、非 ADMIN 返回 403、环境变量缺失返回 500、文件超 10MB 在 results 中标记错误、上传成功返回正确格式 URL、部分失败时其他文件不受影响
    - _Requirements: 5.4, 5.6, 5.7, 5.8, 4.7_

- [x] 9. 创建 `app/admin/questions/ImageUploadPanel.tsx` — 管理员上传 UI
  - [x] 9.1 实现 `ImageUploadPanel` 客户端组件
    - 定义 `FileItem` 类型：`{ file: File; status: "pending" | "uploading" | "success" | "error"; url?: string; error?: string }`
    - 提供文件夹名称输入框（默认当天日期）
    - 提供多文件选择控件（accept: `image/jpeg,image/png,image/gif,image/webp`，`multiple`）
    - 上传按钮：点击后逐文件更新状态为 `uploading`，发送 `multipart/form-data` POST 到 `/api/admin/images/upload`
    - 上传结果列表：每行显示文件名、状态图标、URL（成功时）或错误信息（失败时）、一键复制按钮
    - _Requirements: 5.1, 5.2, 5.5, 5.9_

  - [x] 9.2 将 `ImageUploadPanel` 集成到管理员题目页面
    - 在 `app/admin/questions/page.tsx` 或 `QuestionsClient.tsx` 中引入并渲染 `ImageUploadPanel`
    - _Requirements: 5.1_

- [x] 10. Final Checkpoint — 确保所有测试通过
  - 确保所有测试通过，ask the user if questions arise.

## Notes

- 标有 `*` 的子任务为可选测试任务，可跳过以加快 MVP 交付
- 每个任务均引用具体需求条款，便于追溯
- 属性测试覆盖三个核心纯函数（Property 1、2、3），单元测试覆盖边界情况
- 前端组件（任务 2-5）不依赖后端，可并行开发
- MinIO 客户端（任务 7）需先完成才能实现上传 API（任务 8）
