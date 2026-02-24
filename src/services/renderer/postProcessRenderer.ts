/**
 * WebGL 后处理渲染器
 * 将 Canvas 2D 输出通过 WebGL shader 管线进行后处理
 * @module services/renderer/postProcessRenderer
 */

import type { PostProcessPass, PostProcessFunction, RenderError } from '../../types';
import { generateErrorId, getFriendlyMessage } from '../../types';
import {
  DEFAULT_VERTEX_SHADER,
  PASSTHROUGH_FRAGMENT_SHADER,
  hashString,
  ensureShaderDeclarations,
  injectCustomUniforms,
} from './postProcessShaders';

/**
 * 编译后的 Shader 程序
 */
interface CompiledProgram {
  program: WebGLProgram;
  uniforms: Map<string, WebGLUniformLocation | null>;
}

/**
 * PostProcessRenderer 配置选项
 */
export interface PostProcessRendererOptions {
  /** 是否为导出模式 */
  exportMode?: boolean;
  /** 错误回调 */
  onError?: (error: RenderError) => void;
}

/**
 * WebGL 后处理渲染器
 */
export class PostProcessRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private disabled = false;

  // 纹理和帧缓冲
  private sourceTexture: WebGLTexture | null = null;
  private pingPongTextures: [WebGLTexture | null, WebGLTexture | null] = [null, null];
  private pingPongFramebuffers: [WebGLFramebuffer | null, WebGLFramebuffer | null] = [null, null];

  // Shader 程序缓存 (包含编译失败的负缓存)
  private programCache: Map<string, CompiledProgram | null> = new Map();
  private passthroughProgram: CompiledProgram | null = null;

  // 顶点数据
  private vertexBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;

  // 后处理函数
  private postProcessFn: PostProcessFunction | null = null;

  // 错误报告
  private onError?: (error: RenderError) => void;
  private postProcessCode = '';
  private hasReportedError = false;

  // 尺寸
  private width = 0;
  private height = 0;

  constructor(private options?: PostProcessRendererOptions) {
    this.onError = options?.onError;
    // canvas 延迟到 initialize 中创建，避免被提前污染
    this.canvas = null!;
  }

  /**
   * 初始化 WebGL 上下文和资源
   */
  initialize(container: HTMLElement, width: number, height: number): boolean {
    this.width = width;
    this.height = height;

    // 每次初始化都创建新的 canvas，确保干净的 WebGL 上下文
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.display = 'block';

    // 仅在非导出模式下添加到 DOM
    if (!this.options?.exportMode) {
      container.appendChild(this.canvas);
    }

    // 获取 WebGL 上下文
    const gl = this.canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    }) || this.canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;

    if (!gl) {
      console.warn('[PostProcess] WebGL 不可用，后处理已禁用');
      this.disabled = true;
      return false;
    }

    this.gl = gl;

    // 初始化资源
    this.initBuffers();
    this.initTextures();
    this.initPassthroughProgram();

    return true;
  }

  /**
   * 加载后处理函数代码
   */
  loadPostProcessFunction(code: string): void {
    if (!code || !code.trim()) {
      this.postProcessFn = null;
      this.postProcessCode = '';
      return;
    }

    this.postProcessCode = code;
    this.hasReportedError = false;
    // 清空 shader 缓存，新代码可能修复了之前的错误
    this.programCache.clear();

    try {
      // 创建独立的实例 key 避免冲突
      const instanceKey = `postProcess_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      // 初始化全局存储
      if (!window.__motionPostProcesses) {
        (window as unknown as { __motionPostProcesses: Record<string, PostProcessFunction> }).__motionPostProcesses = {};
      }

      const wrappedCode = `
        (function() {
          ${code}
          if (typeof window.__motionPostProcess === 'function') {
            window.__motionPostProcesses['${instanceKey}'] = window.__motionPostProcess;
            window.__motionPostProcess = undefined;
          }
        })();
      `;

      // 执行代码
      const executeCode = new Function(wrappedCode);
      executeCode();

      // 获取函数
      const processes = (window as unknown as { __motionPostProcesses: Record<string, PostProcessFunction> }).__motionPostProcesses;
      this.postProcessFn = processes[instanceKey] || null;

      // 清理
      delete processes[instanceKey];

      if (!this.postProcessFn) {
        console.warn('[PostProcess] 代码未定义 window.__motionPostProcess 函数');
      }
    } catch (error) {
      console.error('[PostProcess] 加载后处理函数失败:', error);
      this.postProcessFn = null;
      this.reportError(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 执行后处理渲染
   */
  render(sourceCanvas: HTMLCanvasElement, time: number, params: Record<string, unknown>): void {
    // 未初始化时直接返回
    if (!this.canvas) return;

    if (this.disabled || !this.gl) {
      // 回退：直接复制源 canvas
      this.fallbackRender(sourceCanvas);
      return;
    }

    const gl = this.gl;

    // 上传源纹理
    this.uploadSourceTexture(sourceCanvas);

    // 获取 pass 配置
    let passes: PostProcessPass[] = [];
    if (this.postProcessFn) {
      try {
        passes = this.postProcessFn(params, time);
      } catch (error) {
        console.error('[PostProcess] 执行 postProcess 函数失败:', error);
        passes = [];
      }
    }

    // 无 pass 时直接输出源纹理
    if (passes.length === 0) {
      this.renderPassthrough();
      return;
    }

    // 多 pass 渲染
    let inputTexture = this.sourceTexture;
    let pingPongIndex = 0;
    let renderedToScreen = false;

    for (let i = 0; i < passes.length; i++) {
      const pass = passes[i];
      const isLastPass = i === passes.length - 1;

      // 自动注入自定义 uniform 声明
      let processedShader = pass.shader;
      if (pass.uniforms) {
        processedShader = injectCustomUniforms(processedShader, pass.uniforms);
      }

      // 编译或获取缓存的程序
      const program = this.getOrCompileProgram(pass.name, processedShader);
      if (!program) {
        continue;
      }

      // 设置输出目标
      if (isLastPass) {
        // 最后一个 pass 输出到屏幕
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.width, this.height);
        renderedToScreen = true;
      } else {
        // 中间 pass 输出到 ping-pong 帧缓冲
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.pingPongFramebuffers[pingPongIndex]);
        gl.viewport(0, 0, this.width, this.height);
      }

      // 清除
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // 使用程序
      gl.useProgram(program.program);

      // 绑定输入纹理 (前一个 pass 的输出)
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, inputTexture);

      // 绑定原始纹理 (Canvas 2D 输出，始终可用)
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);

      // 设置 uniform
      const uTexture = program.uniforms.get('uTexture');
      if (uTexture) gl.uniform1i(uTexture, 0);

      // uOriginal: 原图纹理，用于最终合成（如 Bloom = 原图 + 模糊辉光）
      const uOriginal = program.uniforms.get('uOriginal');
      if (uOriginal) gl.uniform1i(uOriginal, 1);

      const uResolution = program.uniforms.get('uResolution');
      if (uResolution) gl.uniform2f(uResolution, this.width, this.height);

      const uTime = program.uniforms.get('uTime');
      if (uTime) gl.uniform1f(uTime, time);

      // 设置自定义 uniform
      if (pass.uniforms) {
        for (const [name, value] of Object.entries(pass.uniforms)) {
          const loc = program.uniforms.get(name);
          if (!loc) continue;

          if (Array.isArray(value)) {
            switch (value.length) {
              case 2: gl.uniform2fv(loc, value); break;
              case 3: gl.uniform3fv(loc, value); break;
              case 4: gl.uniform4fv(loc, value); break;
            }
          } else {
            gl.uniform1f(loc, value);
          }
        }
      }

      // 绑定顶点属性
      this.bindVertexAttributes(program.program);

      // 绘制
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // 更新输入纹理为当前输出
      if (!isLastPass) {
        inputTexture = this.pingPongTextures[pingPongIndex];
        pingPongIndex = 1 - pingPongIndex; // 切换 ping-pong
      }
    }

    // 回退：如果没有 pass 成功输出到屏幕，渲染当前最佳结果
    if (!renderedToScreen) {
      this.renderPassthrough(inputTexture);
    }
  }

  /**
   * 调整尺寸
   */
  resize(width: number, height: number): void {
    if (width === this.width && height === this.height) return;

    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;

    if (this.gl) {
      this.initTextures();
    }
  }

  /**
   * 获取输出 canvas
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * 销毁资源
   */
  dispose(): void {
    if (this.gl) {
      const gl = this.gl;

      // 删除纹理
      if (this.sourceTexture) gl.deleteTexture(this.sourceTexture);
      this.pingPongTextures.forEach(t => t && gl.deleteTexture(t));

      // 删除帧缓冲
      this.pingPongFramebuffers.forEach(fb => fb && gl.deleteFramebuffer(fb));

      // 删除缓冲
      if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
      if (this.texCoordBuffer) gl.deleteBuffer(this.texCoordBuffer);

      // 删除程序
      this.programCache.forEach(p => { if (p) gl.deleteProgram(p.program); });
      if (this.passthroughProgram) gl.deleteProgram(this.passthroughProgram.program);
    }

    // 移除 canvas
    this.canvas?.parentElement?.removeChild(this.canvas);

    this.gl = null;
    this.programCache.clear();
  }

  // ============================================
  // 私有方法
  // ============================================

  private reportError(message: string): void {
    if (this.hasReportedError || !this.onError) return;
    this.hasReportedError = true;

    const error: RenderError = {
      id: generateErrorId(),
      type: 'syntax',
      message,
      friendlyMessage: getFriendlyMessage('SyntaxError'),
      code: this.postProcessCode,
      source: 'postProcess',
      timestamp: Date.now(),
    };
    this.onError(error);
  }

  private initBuffers(): void {
    const gl = this.gl!;

    // 全屏四边形顶点
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // UV 坐标
    const texCoords = new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      1, 1,
    ]);

    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
  }

  private initTextures(): void {
    const gl = this.gl!;

    // 删除旧纹理
    if (this.sourceTexture) gl.deleteTexture(this.sourceTexture);
    this.pingPongTextures.forEach(t => t && gl.deleteTexture(t));
    this.pingPongFramebuffers.forEach(fb => fb && gl.deleteFramebuffer(fb));

    // 创建源纹理
    this.sourceTexture = this.createTexture();

    // 创建 ping-pong 纹理和帧缓冲
    for (let i = 0; i < 2; i++) {
      const texture = this.createTexture();
      const framebuffer = gl.createFramebuffer();

      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

      // 检查 framebuffer 完整性
      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.warn('[PostProcess] Framebuffer not complete, disabling post-process');
        this.disabled = true;
        return;
      }

      this.pingPongTextures[i] = texture;
      this.pingPongFramebuffers[i] = framebuffer;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private createTexture(): WebGLTexture {
    const gl = this.gl!;
    const texture = gl.createTexture()!;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return texture;
  }

  private initPassthroughProgram(): void {
    this.passthroughProgram = this.compileProgram('__passthrough__', PASSTHROUGH_FRAGMENT_SHADER);
  }

  private uploadSourceTexture(sourceCanvas: HTMLCanvasElement): void {
    const gl = this.gl!;

    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    // 翻转 Y 轴：Canvas 2D 的 Y 向下，WebGL 的 Y 向上
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
  }

  private getOrCompileProgram(name: string, fragmentShader: string): CompiledProgram | null {
    const cacheKey = `${name}_${hashString(fragmentShader)}`;

    if (this.programCache.has(cacheKey)) {
      return this.programCache.get(cacheKey) ?? null;
    }

    const program = this.compileProgram(cacheKey, fragmentShader);
    // 缓存成功和失败的结果（负缓存避免每帧重复编译）
    this.programCache.set(cacheKey, program);

    if (!program) {
      this.reportError(`Shader "${name}" compilation failed`);
    }

    return program;
  }

  private compileProgram(name: string, fragmentShaderSource: string): CompiledProgram | null {
    const gl = this.gl!;

    // 确保 shader 包含必要声明
    const processedFragment = ensureShaderDeclarations(fragmentShaderSource);

    // 编译 vertex shader
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertexShader, DEFAULT_VERTEX_SHADER);
    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error(`[PostProcess] Vertex shader 编译失败:`, gl.getShaderInfoLog(vertexShader));
      gl.deleteShader(vertexShader);
      return null;
    }

    // 编译 fragment shader
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, processedFragment);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      const errorLog = gl.getShaderInfoLog(fragmentShader) || 'Unknown shader error';
      console.error(`[PostProcess] Fragment shader "${name}" 编译失败:`, errorLog);
      this.reportError(`Fragment shader "${name}" 编译失败: ${errorLog}`);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return null;
    }

    // 创建程序
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const errorLog = gl.getProgramInfoLog(program) || 'Unknown link error';
      console.error(`[PostProcess] 程序链接失败:`, errorLog);
      this.reportError(`Program link failed: ${errorLog}`);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return null;
    }

    // 清理 shader（已链接到程序）
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    // 获取 uniform 位置
    const uniforms = new Map<string, WebGLUniformLocation | null>();
    const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < numUniforms; i++) {
      const info = gl.getActiveUniform(program, i);
      if (info) {
        uniforms.set(info.name, gl.getUniformLocation(program, info.name));
      }
    }

    return { program, uniforms };
  }

  private bindVertexAttributes(program: WebGLProgram): void {
    const gl = this.gl!;

    const aPosition = gl.getAttribLocation(program, 'aPosition');
    if (aPosition >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
    }

    const aTexCoord = gl.getAttribLocation(program, 'aTexCoord');
    if (aTexCoord >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
      gl.enableVertexAttribArray(aTexCoord);
      gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
    }
  }

  private renderPassthrough(texture?: WebGLTexture | null): void {
    if (!this.passthroughProgram || !this.gl) return;

    const gl = this.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.passthroughProgram.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture || this.sourceTexture);

    const uTexture = this.passthroughProgram.uniforms.get('uTexture');
    if (uTexture) gl.uniform1i(uTexture, 0);

    this.bindVertexAttributes(this.passthroughProgram.program);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private fallbackRender(sourceCanvas: HTMLCanvasElement): void {
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(sourceCanvas, 0, 0);
    }
  }
}

// 扩展 Window 类型
declare global {
  interface Window {
    __motionPostProcess?: PostProcessFunction;
    __motionPostProcesses?: Record<string, PostProcessFunction>;
  }
}
