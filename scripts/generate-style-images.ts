import "dotenv/config";
import sharp from "sharp";
import { minioClient, MINIO_BUCKET, ensureBucketExists, getPublicUrl } from "../src/lib/minio";

interface StyleConfig {
  style_key: string;
  name_zh: string;
  color: string; // Hex color
}

const styles: StyleConfig[] = [
  { style_key: "manga", name_zh: "日式漫画", color: "#FF6B00" },
  { style_key: "american", name_zh: "美式漫画", color: "#3B82F6" },
  { style_key: "webtoon", name_zh: "条漫", color: "#22C55E" },
  { style_key: "monochrome", name_zh: "黑白条漫", color: "#6B7280" },
  { style_key: "watercolor", name_zh: "水彩风格", color: "#06B6D4" },
  { style_key: "cyberpunk", name_zh: "赛博朋克", color: "#9333EA" },
  { style_key: "steampunk", name_zh: "蒸汽朋克", color: "#B45309" },
  { style_key: "chinese-ink", name_zh: "中国水墨", color: "#475569" },
  { style_key: "pixel-art", name_zh: "像素风格", color: "#EC4899" },
  { style_key: "realistic", name_zh: "写实风格", color: "#57534E" },
  { style_key: "minimalist", name_zh: "极简风格", color: "#9CA3AF" },
  { style_key: "gothic", name_zh: "哥特风格", color: "#312E81" },
  { style_key: "vintage", name_zh: "复古风格", color: "#EA580C" },
  { style_key: "chibi", name_zh: "Q版萌系", color: "#FB7185" },
];

// Generate a simple gradient placeholder image
async function generateStyleImage(
  styleKey: string,
  color: string,
  styleName: string
): Promise<Buffer> {
  const width = 800;
  const height = 600;

  // Convert hex color to RGB
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Create a solid color background
  const background = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r, g, b },
    },
  })
    .jpeg()
    .toBuffer();

  return background;
}

async function uploadStyleImages(): Promise<void> {
  console.log("Generating and uploading style images to MinIO...\n");

  // Ensure bucket exists
  await ensureBucketExists();

  const urlMap: Record<string, string> = {};

  for (const style of styles) {
    try {
      console.log(`Processing ${style.name_zh} (${style.style_key})...`);

      // Generate image
      const imageBuffer = await generateStyleImage(
        style.style_key,
        style.color,
        style.name_zh
      );

      // Upload to MinIO
      const objectName = `styles/${style.style_key}.jpg`;
      await minioClient.putObject(
        MINIO_BUCKET,
        objectName,
        imageBuffer,
        imageBuffer.length,
        {
          "Content-Type": "image/jpeg",
        }
      );

      const publicUrl = getPublicUrl(objectName);
      urlMap[style.style_key] = publicUrl;

      console.log(`  ✓ Uploaded: ${publicUrl}`);
    } catch (error) {
      console.error(`  ✗ Failed to process ${style.style_key}:`, error);
    }
  }

  console.log("\n=== URLs for seed script ===\n");
  for (const [key, url] of Object.entries(urlMap)) {
    console.log(`${key}: "${url}",`);
  }

  console.log("\nDone!");
}

async function main(): Promise<void> {
  try {
    await uploadStyleImages();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
