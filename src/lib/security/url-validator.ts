/**
 * URL Validator - SSRF Protection
 * 防止服务器端请求伪造攻击
 */

import { URL } from 'url';

/**
 * 允许的主机白名单配置
 * IMPORTANT: 仅包含受信任的域名
 */
const ALLOWED_HOSTS = [
  process.env.MINIO_ENDPOINT || 'localhost',
  'minio',
  'storage.manga-maker.ai', // 生产环境域名
  // 添加其他受信任的图像服务域名
];

/**
 * 私有 IP 地址范围 (RFC 1918, RFC 4193)
 */
const PRIVATE_IP_RANGES = [
  /^127\./,                    // 127.0.0.0/8 (localhost)
  /^10\./,                     // 10.0.0.0/8
  /^192\.168\./,               // 192.168.0.0/16
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
  /^169\.254\./,               // 169.254.0.0/16 (Link-local, AWS metadata)
  /^fc00:/,                    // IPv6 ULA
  /^fe80:/,                    // IPv6 Link-local
  /^::1$/,                     // IPv6 localhost
];

/**
 * 敏感端口黑名单
 */
const BLOCKED_PORTS = [
  22,    // SSH
  23,    // Telnet
  25,    // SMTP
  3306,  // MySQL
  5432,  // PostgreSQL
  6379,  // Redis
  27017, // MongoDB
];

export interface UrlValidationOptions {
  allowPrivateIp?: boolean;
  allowedPorts?: number[];
  maxUrlLength?: number;
}

export class UrlValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'UrlValidationError';
  }
}

/**
 * 验证图像 URL 是否安全
 *
 * @param imageUrl - 待验证的图像 URL
 * @param options - 验证选项
 * @returns true 如果 URL 安全
 * @throws UrlValidationError 如果 URL 不安全
 */
export function validateImageUrl(
  imageUrl: string,
  options: UrlValidationOptions = {}
): boolean {
  const {
    allowPrivateIp = false,
    allowedPorts = [80, 443, 9000], // HTTP, HTTPS, MinIO default
    maxUrlLength = 2048,
  } = options;

  // 1. 检查 URL 长度
  if (imageUrl.length > maxUrlLength) {
    throw new UrlValidationError(
      `URL too long: ${imageUrl.length} > ${maxUrlLength}`,
      'URL_TOO_LONG',
      { length: imageUrl.length }
    );
  }

  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch (error) {
    throw new UrlValidationError(
      'Invalid URL format',
      'INVALID_URL_FORMAT',
      { url: imageUrl, error }
    );
  }

  // 2. 仅允许 HTTP/HTTPS 协议
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new UrlValidationError(
      `Unsupported protocol: ${url.protocol}`,
      'INVALID_PROTOCOL',
      { protocol: url.protocol }
    );
  }

  const hostname = url.hostname.toLowerCase();

  // 3. 检查是否为私有 IP 地址
  if (!allowPrivateIp) {
    for (const pattern of PRIVATE_IP_RANGES) {
      if (pattern.test(hostname)) {
        throw new UrlValidationError(
          `Private IP address not allowed: ${hostname}`,
          'PRIVATE_IP_BLOCKED',
          { hostname }
        );
      }
    }
  }

  // 4. 检查端口是否在允许列表
  const port = url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80);

  if (BLOCKED_PORTS.includes(port)) {
    throw new UrlValidationError(
      `Blocked port: ${port}`,
      'BLOCKED_PORT',
      { port }
    );
  }

  if (!allowedPorts.includes(port)) {
    throw new UrlValidationError(
      `Port not in allowed list: ${port}`,
      'PORT_NOT_ALLOWED',
      { port, allowedPorts }
    );
  }

  // 5. 检查主机名是否在白名单
  const isAllowedHost = ALLOWED_HOSTS.some(allowedHost => {
    if (allowedHost === hostname) {
      return true;
    }
    // 支持子域名匹配
    if (allowedHost.startsWith('.') && hostname.endsWith(allowedHost)) {
      return true;
    }
    return false;
  });

  if (!isAllowedHost) {
    throw new UrlValidationError(
      `Host not in whitelist: ${hostname}`,
      'HOST_NOT_WHITELISTED',
      { hostname, allowedHosts: ALLOWED_HOSTS }
    );
  }

  return true;
}

/**
 * 安全包装器 - 返回布尔值而非抛出异常
 */
export function isValidImageUrl(
  imageUrl: string,
  options?: UrlValidationOptions
): boolean {
  try {
    return validateImageUrl(imageUrl, options);
  } catch {
    return false;
  }
}
