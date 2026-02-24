/**
 * IndexedDB 附件存储服务 (031-multimodal-input)
 *
 * 提供附件数据的持久化存储，支持按消息 ID 查询和批量删除。
 * 使用独立的 IndexedDB 数据库避免 localStorage 容量限制。
 */

import type { ChatAttachment } from '../../types';

const DB_NAME = 'neon-attachments';
const DB_VERSION = 1;
const STORE_NAME = 'attachments';

let dbInstance: IDBDatabase | null = null;

/**
 * 打开或创建 IndexedDB 数据库
 */
export async function openAttachmentDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`无法打开附件数据库: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 创建 attachments 对象存储
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        // 创建按 messageId 查询的索引
        store.createIndex('messageId', 'messageId', { unique: false });
      }
    };
  });
}

/**
 * 保存单个附件到 IndexedDB
 */
export async function saveAttachment(attachment: ChatAttachment): Promise<void> {
  const db = await openAttachmentDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // 存储时移除 previewUrl（运行时生成的 Blob URL）
    const { previewUrl: _, ...attachmentToStore } = attachment;
    const request = store.put(attachmentToStore);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error(`保存附件失败: ${request.error?.message}`));
  });
}

/**
 * 批量保存附件到 IndexedDB
 */
export async function saveAttachments(attachments: ChatAttachment[]): Promise<void> {
  if (attachments.length === 0) return;

  const db = await openAttachmentDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    let completed = 0;
    let hasError = false;

    for (const attachment of attachments) {
      // 存储时移除 previewUrl
      const { previewUrl: _, ...attachmentToStore } = attachment;
      const request = store.put(attachmentToStore);

      request.onsuccess = () => {
        completed++;
        if (completed === attachments.length && !hasError) {
          resolve();
        }
      };

      request.onerror = () => {
        if (!hasError) {
          hasError = true;
          reject(new Error(`保存附件失败: ${request.error?.message}`));
        }
      };
    }
  });
}

/**
 * 根据附件 ID 获取单个附件
 */
export async function getAttachment(id: string): Promise<ChatAttachment | null> {
  const db = await openAttachmentDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(new Error(`获取附件失败: ${request.error?.message}`));
  });
}

/**
 * 根据消息 ID 获取所有关联附件
 */
export async function getAttachmentsByMessageId(messageId: string): Promise<ChatAttachment[]> {
  const db = await openAttachmentDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('messageId');
    const request = index.getAll(messageId);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(new Error(`获取消息附件失败: ${request.error?.message}`));
  });
}

/**
 * 根据多个附件 ID 批量获取附件
 */
export async function getAttachmentsByIds(ids: string[]): Promise<ChatAttachment[]> {
  if (ids.length === 0) return [];

  const db = await openAttachmentDB();

  return new Promise((resolve, _reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const results: ChatAttachment[] = [];
    let completed = 0;

    for (const id of ids) {
      const request = store.get(id);

      request.onsuccess = () => {
        if (request.result) {
          results.push(request.result);
        }
        completed++;
        if (completed === ids.length) {
          resolve(results);
        }
      };

      request.onerror = () => {
        completed++;
        if (completed === ids.length) {
          resolve(results);
        }
      };
    }
  });
}

/**
 * 删除单个附件
 */
export async function deleteAttachment(id: string): Promise<void> {
  const db = await openAttachmentDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error(`删除附件失败: ${request.error?.message}`));
  });
}

/**
 * 根据消息 ID 删除所有关联附件
 */
export async function deleteAttachmentsByMessageId(messageId: string): Promise<void> {
  const attachments = await getAttachmentsByMessageId(messageId);

  if (attachments.length === 0) return;

  const db = await openAttachmentDB();

  return new Promise((resolve, _reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    let completed = 0;

    for (const att of attachments) {
      const request = store.delete(att.id);

      request.onsuccess = () => {
        completed++;
        if (completed === attachments.length) {
          resolve();
        }
      };

      request.onerror = () => {
        completed++;
        if (completed === attachments.length) {
          resolve();
        }
      };
    }
  });
}

/**
 * 清空所有附件数据
 */
export async function clearAllAttachments(): Promise<void> {
  const db = await openAttachmentDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error(`清空附件失败: ${request.error?.message}`));
  });
}

/**
 * 关闭数据库连接（用于测试或清理）
 */
export function closeAttachmentDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
