/**
 * 加密服务
 * 使用 crypto-js 实现 AES 加密
 * 密钥通过固定口令 + salt 派生（稳定，不随浏览器版本变化）
 * @module services/crypto
 */

import CryptoJS from 'crypto-js';
import type { EncryptedData } from '../../types';

// PBKDF2 迭代次数
const PBKDF2_ITERATIONS = 100000;
// 密钥大小 (256 bits = 8 words for crypto-js)
const KEY_SIZE = 256 / 32;
// Salt 长度 (bytes)
const SALT_LENGTH = 16;

// 固定口令，替代旧版 device fingerprint。
// 不提供真正的安全性（localStorage 本身对同源代码可见），仅防止 Key 以明文裸露。
const FIXED_PASSPHRASE = 'neon-motion-platform-v1';

// 缓存派生的密钥，避免重复计算
let cachedKey: string | null = null;
let cachedSalt: string | null = null;

/**
 * 获取或生成加密盐值
 */
export function getOrCreateSalt(existingSalt?: string | null): Uint8Array {
  if (existingSalt) {
    return base64ToUint8Array(existingSalt);
  }
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * 将盐值转换为 Base64 字符串用于存储
 */
export function saltToBase64(salt: Uint8Array): string {
  return uint8ArrayToBase64(salt);
}

/**
 * 派生 AES 加密密钥
 */
function deriveKey(passphrase: string, salt: Uint8Array): CryptoJS.lib.WordArray {
  const saltWordArray = CryptoJS.lib.WordArray.create(salt);

  const cacheId = passphrase + ':' + uint8ArrayToBase64(salt);
  if (cachedKey && cachedSalt === cacheId) {
    return CryptoJS.enc.Hex.parse(cachedKey);
  }

  const key = CryptoJS.PBKDF2(passphrase, saltWordArray, {
    keySize: KEY_SIZE,
    iterations: PBKDF2_ITERATIONS,
  });

  cachedKey = key.toString();
  cachedSalt = cacheId;

  return key;
}

/**
 * 加密字符串
 */
export async function encrypt(plaintext: string, salt: Uint8Array): Promise<EncryptedData> {
  const key = deriveKey(FIXED_PASSPHRASE, salt);
  const iv = CryptoJS.lib.WordArray.random(128 / 8);

  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return {
    ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
    iv: iv.toString(CryptoJS.enc.Base64),
  };
}

/**
 * 解密数据
 */
export async function decrypt(encrypted: EncryptedData, salt: Uint8Array): Promise<string> {
  const key = deriveKey(FIXED_PASSPHRASE, salt);
  const iv = CryptoJS.enc.Base64.parse(encrypted.iv);
  const ciphertext = CryptoJS.enc.Base64.parse(encrypted.ciphertext);

  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext } as CryptoJS.lib.CipherParams,
    key,
    {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  );

  const plaintext = decrypted.toString(CryptoJS.enc.Utf8);

  if (!plaintext) {
    throw new Error('解密失败');
  }

  return plaintext;
}

/**
 * 尝试用旧版 device fingerprint 解密（用于迁移）
 * 如果当前浏览器指纹已经变化，会返回 null
 */
export async function decryptLegacy(encrypted: EncryptedData, salt: Uint8Array): Promise<string | null> {
  try {
    const fingerprint = getLegacyDeviceFingerprint();
    const key = deriveKey(fingerprint, salt);
    const iv = CryptoJS.enc.Base64.parse(encrypted.iv);
    const ciphertext = CryptoJS.enc.Base64.parse(encrypted.ciphertext);

    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext } as CryptoJS.lib.CipherParams,
      key,
      {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );

    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
    return plaintext || null;
  } catch {
    return null;
  }
}

/**
 * 旧版设备指纹（仅用于迁移旧数据）
 */
function getLegacyDeviceFingerprint(): string {
  const components: string[] = [
    navigator.userAgent || '',
    navigator.language || '',
    navigator.platform || '',
    String(navigator.hardwareConcurrency || 0),
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
  ];
  return components.join('|');
}

/**
 * 清除缓存的密钥
 */
export function clearKeyCache(): void {
  cachedKey = null;
  cachedSalt = null;
}

// ============== 工具函数 ==============

function uint8ArrayToBase64(array: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < array.length; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return array;
}
