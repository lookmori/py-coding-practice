import { NextRequest, NextResponse } from "next/server";
import { getServerSession, requireAdmin } from "@/lib/auth";
import { getMinioClient, buildImageUrl } from "@/lib/minio";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  // 1. 鉴权
  const session = await getServerSession();
  try {
    await requireAdmin(session);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. 检查必需环境变量
  const endpoint = process.env.MINIO_ENDPOINT;
  const portStr = process.env.MINIO_PORT ?? "9000";
  const bucket = process.env.MINIO_BUCKET;
  const useSSL = process.env.MINIO_USE_SSL !== "false";

  if (!endpoint || !bucket || !process.env.MINIO_ACCESS_KEY || !process.env.MINIO_SECRET_KEY) {
    const missing = [
      !endpoint && "MINIO_ENDPOINT",
      !bucket && "MINIO_BUCKET",
      !process.env.MINIO_ACCESS_KEY && "MINIO_ACCESS_KEY",
      !process.env.MINIO_SECRET_KEY && "MINIO_SECRET_KEY",
    ].filter(Boolean).join(", ");
    return NextResponse.json(
      { error: `MinIO configuration missing: ${missing}` },
      { status: 500 }
    );
  }

  const port = parseInt(portStr, 10);

  // 3. 解析 FormData
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const folder = (formData.get("folder") as string | null)?.trim() || today;
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  // 4. 获取 MinIO 客户端
  let minioClient;
  try {
    minioClient = getMinioClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "MinIO client initialization failed" },
      { status: 500 }
    );
  }

  // 5. 逐文件上传
  const results: { filename: string; url?: string; error?: string }[] = [];

  for (const file of files) {
    const filename = file.name;

    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      results.push({ filename, error: "文件大小超过 10MB 限制" });
      continue;
    }

    try {
      const objectName = `${folder}/${filename}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      await minioClient.putObject(bucket, objectName, buffer, buffer.length, {
        "Content-Type": file.type || "application/octet-stream",
      });

      const url = buildImageUrl(endpoint, port, useSSL, bucket, folder, filename);
      results.push({ filename, url });
    } catch (err) {
      results.push({
        filename,
        error: err instanceof Error ? `上传失败: ${err.message}` : "上传失败",
      });
    }
  }

  return NextResponse.json({ results });
}
