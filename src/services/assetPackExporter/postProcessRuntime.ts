/**
 * 后处理运行时代码生成器
 * 生成可嵌入 HTML 素材包的精简版后处理运行时
 * @module services/assetPackExporter/postProcessRuntime
 */

/**
 * 生成后处理运行时代码
 * 这是 PostProcessRenderer 的精简版,用于 HTML 素材包导出
 */
export function generatePostProcessRuntimeCode(): string {
  return `
// ============================================
// WebGL 后处理运行时
// ============================================

(function() {
  var DEFAULT_VERTEX_SHADER = \`
    attribute vec2 aPosition;
    attribute vec2 aTexCoord;
    varying vec2 vUv;
    void main() {
      vUv = aTexCoord;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  \`;

  var PASSTHROUGH_FRAGMENT_SHADER = \`
    precision highp float;
    uniform sampler2D uTexture;
    varying vec2 vUv;
    void main() {
      gl_FragColor = texture2D(uTexture, vUv);
    }
  \`;

  function ensureShaderDeclarations(shader) {
    var uniforms = [];
    var varyings = [];
    if (shader.indexOf('uniform sampler2D uTexture') === -1) uniforms.push('uniform sampler2D uTexture;');
    if (shader.indexOf('uniform sampler2D uOriginal') === -1) uniforms.push('uniform sampler2D uOriginal;');
    if (shader.indexOf('uniform vec2 uResolution') === -1) uniforms.push('uniform vec2 uResolution;');
    if (shader.indexOf('uniform float uTime') === -1) uniforms.push('uniform float uTime;');
    if (shader.indexOf('varying vec2 vUv') === -1) varyings.push('varying vec2 vUv;');
    if (uniforms.length === 0 && varyings.length === 0) {
      if (shader.indexOf('precision ') === -1) return 'precision highp float;\\n\\n' + shader;
      return shader;
    }
    var processed = shader.replace(/precision\\s+(lowp|mediump|highp)\\s+float\\s*;/g, '');
    var decls = ['precision highp float;'].concat(uniforms).concat(varyings);
    return decls.join('\\n') + '\\n\\n' + processed;
  }

  function PostProcessRuntime() {
    this.gl = null;
    this.canvas = null;
    this.sourceTexture = null;
    this.pingPongTextures = [null, null];
    this.pingPongFramebuffers = [null, null];
    this.vertexBuffer = null;
    this.texCoordBuffer = null;
    this.programCache = {};
    this.passthroughProgram = null;
    this.width = 0;
    this.height = 0;
    this.disabled = false;
  }

  PostProcessRuntime.prototype.initialize = function(container, width, height) {
    this.width = width;
    this.height = height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    container.appendChild(this.canvas);

    var gl = this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) {
      console.warn('[PostProcess] WebGL 不可用');
      this.disabled = true;
      return false;
    }
    this.gl = gl;
    this.initBuffers();
    this.initTextures();
    this.passthroughProgram = this.compileProgram('passthrough', PASSTHROUGH_FRAGMENT_SHADER);
    return true;
  };

  PostProcessRuntime.prototype.initBuffers = function() {
    var gl = this.gl;
    var vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    var texCoords = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);
    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
  };

  PostProcessRuntime.prototype.initTextures = function() {
    var gl = this.gl;
    this.sourceTexture = this.createTexture();
    for (var i = 0; i < 2; i++) {
      var texture = this.createTexture();
      var fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      this.pingPongTextures[i] = texture;
      this.pingPongFramebuffers[i] = fb;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  PostProcessRuntime.prototype.createTexture = function() {
    var gl = this.gl;
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  };

  PostProcessRuntime.prototype.compileProgram = function(name, fragmentSrc) {
    var gl = this.gl;
    fragmentSrc = ensureShaderDeclarations(fragmentSrc);

    var vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, DEFAULT_VERTEX_SHADER);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error('Vertex shader error:', gl.getShaderInfoLog(vs));
      return null;
    }

    var fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fragmentSrc);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('Fragment shader error (' + name + '):', gl.getShaderInfoLog(fs));
      return null;
    }

    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return null;
    }

    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return { program: program };
  };

  PostProcessRuntime.prototype.render = function(sourceCanvas, time, params, postProcessFn) {
    if (this.disabled || !this.gl) {
      var ctx = this.canvas.getContext('2d');
      if (ctx) ctx.drawImage(sourceCanvas, 0, 0);
      return;
    }

    var gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    // 翻转 Y 轴：Canvas 2D 的 Y 向下，WebGL 的 Y 向上
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);

    var passes = [];
    if (postProcessFn) {
      try { passes = postProcessFn(params, time); } catch (e) { console.error('postProcess error:', e); }
    }

    if (passes.length === 0) {
      this.renderPassthrough();
      return;
    }

    var inputTexture = this.sourceTexture;
    var ppIndex = 0;

    for (var i = 0; i < passes.length; i++) {
      var pass = passes[i];
      var isLast = i === passes.length - 1;
      var cacheKey = pass.name + '_' + pass.shader.length;
      var prog = this.programCache[cacheKey];
      if (!prog) {
        prog = this.compileProgram(pass.name, pass.shader);
        if (prog) this.programCache[cacheKey] = prog;
      }
      if (!prog) continue;

      if (isLast) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.pingPongFramebuffers[ppIndex]);
      }
      gl.viewport(0, 0, this.width, this.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(prog.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, inputTexture);

      // 绑定原始纹理到 TEXTURE1，用于 uOriginal
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);

      gl.uniform1i(gl.getUniformLocation(prog.program, 'uTexture'), 0);
      gl.uniform1i(gl.getUniformLocation(prog.program, 'uOriginal'), 1);
      gl.uniform2f(gl.getUniformLocation(prog.program, 'uResolution'), this.width, this.height);
      gl.uniform1f(gl.getUniformLocation(prog.program, 'uTime'), time);

      if (pass.uniforms) {
        for (var uName in pass.uniforms) {
          var uVal = pass.uniforms[uName];
          var uLoc = gl.getUniformLocation(prog.program, uName);
          if (!uLoc) continue;
          if (Array.isArray(uVal)) {
            if (uVal.length === 2) gl.uniform2fv(uLoc, uVal);
            else if (uVal.length === 3) gl.uniform3fv(uLoc, uVal);
            else if (uVal.length === 4) gl.uniform4fv(uLoc, uVal);
          } else {
            gl.uniform1f(uLoc, uVal);
          }
        }
      }

      var aPos = gl.getAttribLocation(prog.program, 'aPosition');
      if (aPos >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      }
      var aTex = gl.getAttribLocation(prog.program, 'aTexCoord');
      if (aTex >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(aTex);
        gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 0, 0);
      }

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (!isLast) {
        inputTexture = this.pingPongTextures[ppIndex];
        ppIndex = 1 - ppIndex;
      }
    }
  };

  PostProcessRuntime.prototype.renderPassthrough = function() {
    var gl = this.gl;
    if (!this.passthroughProgram) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.passthroughProgram.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    gl.uniform1i(gl.getUniformLocation(this.passthroughProgram.program, 'uTexture'), 0);
    var aPos = gl.getAttribLocation(this.passthroughProgram.program, 'aPosition');
    if (aPos >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    }
    var aTex = gl.getAttribLocation(this.passthroughProgram.program, 'aTexCoord');
    if (aTex >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
      gl.enableVertexAttribArray(aTex);
      gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 0, 0);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  PostProcessRuntime.prototype.getCanvas = function() {
    return this.canvas;
  };

  PostProcessRuntime.prototype.resize = function(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    if (this.gl) this.initTextures();
  };

  window.PostProcessRuntime = PostProcessRuntime;
})();
`.trim();
}

/**
 * 检查动效是否需要后处理运行时
 */
export function needsPostProcessRuntime(motion: { postProcessCode?: string }): boolean {
  return Boolean(motion.postProcessCode && motion.postProcessCode.trim());
}
