import { Client } from "minio";
import https from "https";

let _client: Client | null = null;

export function getMinioClient(): Client {
  if (_client) return _client;

  const endpoint = process.env.MINIO_ENDPOINT;
  const port = parseInt(process.env.MINIO_PORT ?? "9000", 10);
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  const useSSL = process.env.MINIO_USE_SSL !== "false"; // 默认 true

  if (!endpoint || !accessKey || !secretKey) {
    throw new Error(
      "MinIO configuration missing. Required: MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY"
    );
  }

  _client = new Client({
    endPoint: endpoint,
    port,
    useSSL,
    accessKey,
    secretKey,
    // 跳过自签名证书验证（生产环境建议替换为正式证书）
    transportAgent: useSSL
      ? new https.Agent({ rejectUnauthorized: false })
      : undefined,
  });

  return _client;
}

export function buildImageUrl(
  endpoint: string,
  port: number,
  useSSL: boolean,
  bucket: string,
  folder: string,
  filename: string
): string {
  const protocol = useSSL ? "https" : "http";
  return `${protocol}://${endpoint}:${port}/${bucket}/${folder}/${filename}`;
}
