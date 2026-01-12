/**
 * 版本历史管理工具
 *
 * 用于管理章节编辑的版本历史，支持自动保存和版本回溯
 */

export interface Version<T> {
  id: string;
  timestamp: number;
  data: T;
  description?: string;
  tags?: string[];
}

export interface VersionHistoryOptions<T> {
  maxVersions?: number; // 最大保留版本数
  autoSaveInterval?: number; // 自动保存间隔（毫秒）
  compressThreshold?: number; // 数据大小超过此值时启用压缩
  onVersionSaved?: (version: Version<T>) => void;
}

/**
 * 版本历史管理器
 */
export class VersionHistory<T extends object> {
  private versions: Version<T>[] = [];
  private currentData: T | null = null;
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private lastAutoSave: number = 0;
  private storageKey: string;

  constructor(
    storageKey: string,
    private options: VersionHistoryOptions<T> = {}
  ) {
    this.storageKey = `version_history_${storageKey}`;
    this.options = {
      maxVersions: 20,
      autoSaveInterval: 30000, // 30秒
      compressThreshold: 10240, // 10KB
      ...options,
    };

    // 从 localStorage 加载历史
    this.loadFromStorage();
  }

  /**
   * 开始跟踪数据变化
   */
  startTracking(initialData: T): void {
    this.currentData = initialData;
    this.startAutoSave();
  }

  /**
   * 停止跟踪
   */
  stopTracking(): void {
    this.stopAutoSave();
    this.saveToStorage();
  }

  /**
   * 更新当前数据（触发自动保存检查）
   */
  update(data: T): void {
    this.currentData = data;
    this.debouncedAutoSave();
  }

  /**
   * 创建手动版本
   */
  saveVersion(description: string, tags?: string[]): string {
    if (!this.currentData) {
      throw new Error('No data to save. Call startTracking() first.');
    }

    const version: Version<T> = {
      id: this.generateId(),
      timestamp: Date.now(),
      data: JSON.parse(JSON.stringify(this.currentData)), // Deep clone
      description,
      tags,
    };

    this.addVersion(version);
    return version.id;
  }

  /**
   * 添加版本到历史
   */
  private addVersion(version: Version<T>): void {
    this.versions.unshift(version);

    // 限制版本数量
    if (this.versions.length > (this.options.maxVersions || 20)) {
      this.versions = this.versions.slice(0, this.options.maxVersions);
    }

    this.saveToStorage();
    this.options.onVersionSaved?.(version);
  }

  /**
   * 获取所有版本
   */
  getVersions(): Version<T>[] {
    return [...this.versions];
  }

  /**
   * 获取特定版本
   */
  getVersion(id: string): Version<T> | undefined {
    return this.versions.find(v => v.id === id);
  }

  /**
   * 恢复到特定版本
   */
  restoreVersion(id: string): T {
    const version = this.getVersion(id);
    if (!version) {
      throw new Error(`Version ${id} not found`);
    }

    // 创建当前状态的快照作为新版本
    if (this.currentData) {
      this.saveVersion('恢复前自动保存');
    }

    this.currentData = JSON.parse(JSON.stringify(version.data));
    return this.currentData;
  }

  /**
   * 比较两个版本的差异
   */
  compareVersions(versionId1: string, versionId2: string): VersionDiff {
    const v1 = this.getVersion(versionId1);
    const v2 = this.getVersion(versionId2);

    if (!v1 || !v2) {
      throw new Error('One or both versions not found');
    }

    return this.diff(v1.data, v2.data);
  }

  /**
   * 比较两个数据的差异
   */
  private diff(data1: T, data2: T): VersionDiff {
    const changes: Change[] = [];
    const obj1 = data1 || {};
    const obj2 = data2 || {};
    const allKeys = new Set([
      ...Object.keys(obj1),
      ...Object.keys(obj2),
    ]);

    for (const key of allKeys) {
      const val1 = (obj1 as Record<string, unknown>)[key];
      const val2 = (obj2 as Record<string, unknown>)[key];

      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        changes.push({
          field: key as string,
          oldValue: val1,
          newValue: val2,
          type: val1 === undefined ? 'added' :
                 val2 === undefined ? 'removed' : 'modified',
        });
      }
    }

    return {
      changes,
      changeCount: changes.length,
    };
  }

  /**
   * 清除所有历史
   */
  clear(): void {
    this.versions = [];
    this.saveToStorage();
  }

  /**
   * 开始自动保存
   */
  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      this.autoSave();
    }, this.options.autoSaveInterval || 30000);
  }

  /**
   * 停止自动保存
   */
  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * 防抖自动保存
   */
  private debouncedAutoSave(): void {
    const now = Date.now();
    const interval = this.options.autoSaveInterval || 30000;

    if (now - this.lastAutoSave >= interval) {
      this.autoSave();
    }
  }

  /**
   * 自动保存当前状态
   */
  private autoSave(): void {
    if (!this.currentData) return;

    // 检查是否有变化
    const lastVersion = this.versions[0];
    if (lastVersion) {
      const isSame = JSON.stringify(lastVersion.data) === JSON.stringify(this.currentData);
      if (isSame) return;
    }

    const version: Version<T> = {
      id: this.generateId(),
      timestamp: Date.now(),
      data: JSON.parse(JSON.stringify(this.currentData)),
      description: this.getAutoSaveDescription(),
      tags: ['auto-save'],
    };

    this.addVersion(version);
    this.lastAutoSave = Date.now();
  }

  /**
   * 生成自动保存描述
   */
  private getAutoSaveDescription(): string {
    const now = new Date();
    const time = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    return `自动保存 (${time})`;
  }

  /**
   * 保存到 localStorage
   */
  private saveToStorage(): void {
    try {
      const data = {
        versions: this.versions,
        lastUpdate: Date.now(),
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('[VersionHistory] Failed to save to storage:', error);

      // 存储满时，清除最老的版本
      if (this.versions.length > 5) {
        this.versions = this.versions.slice(0, 5);
        try {
          localStorage.setItem(this.storageKey, JSON.stringify({
            versions: this.versions,
            lastUpdate: Date.now(),
          }));
        } catch (e) {
          console.error('[VersionHistory] Still failed after cleanup:', e);
        }
      }
    }
  }

  /**
   * 从 localStorage 加载
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.versions = data.versions || [];
      }
    } catch (error) {
      console.error('[VersionHistory] Failed to load from storage:', error);
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 版本差异结果
 */
export interface VersionDiff {
  changes: Change[];
  changeCount: number;
}

/**
 * 单个字段变化
 */
export interface Change {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  type: 'added' | 'removed' | 'modified';
}

/**
 * 创建章节版本历史管理器
 */
export function createChapterVersionHistory(
  projectId: string,
  chapterNumber: number
): VersionHistory<ChapterData> {
  const storageKey = `chapter_${projectId}_${chapterNumber}`;
  return new VersionHistory(storageKey, {
    maxVersions: 50,
    autoSaveInterval: 30000, // 30秒
  });
}

/**
 * 章节数据类型
 */
export interface ChapterData {
  title: string;
  outline: string;
  content: string;
  wordCount: number;
  status: 'draft' | 'completed';
}
