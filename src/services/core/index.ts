/**
 * Core Services - 统一渲染器核心模块
 *
 * 导出入口文件
 */

// 核心接口
export type {
  CoreRenderer,
  RenderOptions,
  RenderFrameOptions,
} from './CoreRenderer.interface';

// 服务类
export {
  VideoSyncService,
  createVideoSyncService,
  videoSyncService,
} from './VideoSyncService';

export {
  ParameterLoaderService,
  createParameterLoaderService,
  parameterLoaderService,
  type ParameterLoadResult,
} from './ParameterLoaderService';

// 类型重导出 (从 types/index.ts)
export type {
  ExportContext,
  ExportPrepareOptions,
  FrameData,
  H264Options,
  VideoSyncOptions,
} from '../../types';
