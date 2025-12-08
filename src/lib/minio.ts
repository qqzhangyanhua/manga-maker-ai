import { Client } from "minio";

// 从环境变量中提取 endpoint（去掉 http:// 前缀）
const getEndpoint = () => {
  const endpoint = process.env.MINIO_ENDPOINT || "";
  return endpoint.replace(/^https?:\/\//, "");
};

// 从 endpoint 中提取主机名和端口
const parseEndpoint = () => {
  const endpoint = getEndpoint();
  const [host, portStr] = endpoint.split(":");
  const port = portStr ? parseInt(portStr, 10) : 9000;
  return { host, port };
};

const { host, port } = parseEndpoint();

// MinIO 客户端配置
export const minioClient = new Client({
  endPoint: host,
  port: port,
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "",
  secretKey: process.env.MINIO_SECRET_KEY || "",
});

// Bucket 名称
export const MINIO_BUCKET = process.env.MINIO_BUCKET_NAME || "input-image";

// 初始化 bucket（如果不存在则创建，并设置为公开可读）
export async function ensureBucketExists() {
  try {
    const exists = await minioClient.bucketExists(MINIO_BUCKET);
    if (!exists) {
      await minioClient.makeBucket(MINIO_BUCKET, "us-east-1");
      console.log(`Bucket ${MINIO_BUCKET} created successfully`);
    }

    // 设置 bucket 为公开可读（允许匿名访问图片）
    const publicPolicy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { AWS: ["*"] },
          Action: ["s3:GetObject"],
          Resource: [`arn:aws:s3:::${MINIO_BUCKET}/*`],
        },
      ],
    };

    await minioClient.setBucketPolicy(
      MINIO_BUCKET,
      JSON.stringify(publicPolicy)
    );
    console.log(`Bucket ${MINIO_BUCKET} is now publicly accessible`);
  } catch (error) {
    console.error("Error ensuring bucket exists:", error);
    throw error;
  }
}

// 生成公开访问的 URL
export function getPublicUrl(objectName: string): string {
  const endpoint = getEndpoint();
  const protocol = process.env.MINIO_USE_SSL === "true" ? "https" : "http";
  return `${protocol}://${endpoint}/${MINIO_BUCKET}/${objectName}`;
}
