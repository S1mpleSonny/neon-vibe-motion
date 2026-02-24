/**
 * 参数控件事件绑定代码生成器
 * 生成导出 HTML 中控件与渲染器的交互代码
 * @module services/assetPackExporter/controlBindings
 */

import type { ParameterControlConfig } from '../../types';

/**
 * 生成所有参数控件的事件绑定代码
 * @param paramConfigs 参数控件配置列表
 * @returns JavaScript 代码字符串
 */
export function generateControlBindings(paramConfigs: ParameterControlConfig[]): string {
  if (paramConfigs.length === 0) {
    return '// 无参数控件需要绑定';
  }

  const bindings = paramConfigs.map((config) => generateSingleControlBinding(config)).join('\n\n');

  return `
// ============================================
// 参数控件事件绑定
// ============================================

(function() {
  'use strict';

${bindings}

})();
`.trim();
}

/**
 * 生成单个控件的事件绑定代码
 */
function generateSingleControlBinding(config: ParameterControlConfig): string {
  switch (config.controlType) {
    case 'slider':
      return generateSliderBinding(config);
    case 'color':
      return generateColorBinding(config);
    case 'toggle':
      return generateToggleBinding(config);
    case 'select':
      return generateSelectBinding(config);
    case 'image':
      return generateImageBinding(config);
    case 'video':
      return generateVideoBinding(config);
    case 'text':
      return generateTextBinding(config);
    default:
      return '';
  }
}

/**
 * 生成滑块控件绑定代码
 */
function generateSliderBinding(config: ParameterControlConfig): string {
  const unit = config.numberConfig?.unit || '';

  return `
  // ${config.label} - 滑块控件
  (function() {
    var slider = document.getElementById('param-${config.id}');
    var valueDisplay = document.getElementById('value-${config.id}');

    if (slider) {
      slider.addEventListener('input', function(e) {
        var value = parseFloat(e.target.value);
        if (valueDisplay) {
          valueDisplay.textContent = value + '${unit}';
        }
        if (window.updateParam) {
          window.updateParam('${config.id}', value);
        }
      });
    }
  })();
`;
}

/**
 * 生成颜色控件绑定代码
 */
function generateColorBinding(config: ParameterControlConfig): string {
  return `
  // ${config.label} - 颜色控件
  (function() {
    var colorInput = document.getElementById('param-${config.id}');
    var valueDisplay = document.getElementById('value-${config.id}');

    if (colorInput) {
      colorInput.addEventListener('input', function(e) {
        var value = e.target.value;
        if (valueDisplay) {
          valueDisplay.textContent = value;
        }
        if (window.updateParam) {
          window.updateParam('${config.id}', value);
        }
      });
    }
  })();
`;
}

/**
 * 生成开关控件绑定代码
 */
function generateToggleBinding(config: ParameterControlConfig): string {
  return `
  // ${config.label} - 开关控件
  (function() {
    var toggle = document.getElementById('param-${config.id}');

    if (toggle) {
      toggle.addEventListener('change', function(e) {
        var value = e.target.checked;
        if (window.updateParam) {
          window.updateParam('${config.id}', value);
        }
      });
    }
  })();
`;
}

/**
 * 生成下拉选择控件绑定代码
 */
function generateSelectBinding(config: ParameterControlConfig): string {
  return `
  // ${config.label} - 下拉选择控件
  (function() {
    var select = document.getElementById('param-${config.id}');

    if (select) {
      select.addEventListener('change', function(e) {
        var value = e.target.value;
        if (window.updateParam) {
          window.updateParam('${config.id}', value);
        }
      });
    }
  })();
`;
}

/**
 * 生成数值输入同步代码（可选，用于滑块旁的数值输入框）
 */
export function generateNumberInputSync(config: ParameterControlConfig): string {
  if (config.controlType !== 'slider') {
    return '';
  }

  const { min = 0, max = 100 } = config.numberConfig || {};

  return `
  // ${config.label} - 数值输入同步
  (function() {
    var slider = document.getElementById('param-${config.id}');
    var numberInput = document.getElementById('number-${config.id}');

    if (slider && numberInput) {
      // 数值输入变化时同步滑块
      numberInput.addEventListener('input', function(e) {
        var value = parseFloat(e.target.value);
        if (!isNaN(value)) {
          value = Math.max(${min}, Math.min(${max}, value));
          slider.value = value;
          if (window.updateParam) {
            window.updateParam('${config.id}', value);
          }
        }
      });

      // 滑块变化时同步数值输入
      slider.addEventListener('input', function(e) {
        var value = parseFloat(e.target.value);
        numberInput.value = value;
      });
    }
  })();
`;
}

/**
 * 生成图片控件绑定代码
 */
function generateImageBinding(config: ParameterControlConfig): string {
  return `
  // ${config.label} - 图片控件
  (function() {
    var fileInput = document.getElementById('param-${config.id}');
    var preview = document.getElementById('preview-${config.id}');
    var placeholder = document.getElementById('placeholder-${config.id}');
    var fileName = document.getElementById('filename-${config.id}');

    if (fileInput) {
      fileInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;

        // 验证文件类型
        if (!file.type.match(/^image\\/(png|jpeg|jpg)$/)) {
          alert('仅支持 PNG 和 JPEG 格式的图片');
          return;
        }

        // 验证文件大小（最大 10MB）
        if (file.size > 10 * 1024 * 1024) {
          alert('图片文件过大，请选择小于 10MB 的图片');
          return;
        }

        // 显示文件名
        if (fileName) {
          fileName.textContent = file.name;
        }

        // 读取并加载图片
        var reader = new FileReader();
        reader.onload = function(event) {
          var img = new Image();
          img.onload = function() {
            // 更新预览，隐藏占位符
            if (preview) {
              preview.src = event.target.result;
              preview.style.display = 'block';
            }
            if (placeholder) {
              placeholder.style.display = 'none';
            }
            // 更新参数
            if (window.updateParam) {
              window.updateParam('${config.id}', img);
            }
          };
          img.onerror = function() {
            alert('图片加载失败，请选择其他图片');
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      });
    }
  })();
`;
}

/**
 * 生成视频控件绑定代码 (019-video-input-support)
 */
function generateVideoBinding(config: ParameterControlConfig): string {
  return `
  // ${config.label} - 视频控件
  (function() {
    var fileInput = document.getElementById('param-${config.id}');
    var preview = document.getElementById('preview-${config.id}');
    var placeholder = document.getElementById('placeholder-${config.id}');
    var fileName = document.getElementById('filename-${config.id}');
    var durationDisplay = document.getElementById('duration-${config.id}');

    if (fileInput) {
      fileInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;

        // 验证文件类型
        if (!file.type.match(/^video\\/(mp4|webm)$/)) {
          alert('仅支持 MP4 和 WebM 格式的视频');
          return;
        }

        // 验证文件大小（最大 50MB）
        if (file.size > 50 * 1024 * 1024) {
          alert('视频文件过大，请选择小于 50MB 的视频');
          return;
        }

        // 显示文件名
        if (fileName) {
          fileName.textContent = file.name;
        }

        // 读取并加载视频
        var url = URL.createObjectURL(file);
        var video = document.createElement('video');
        video.muted = true;
        video.loop = true;
        video.playsInline = true;

        video.onloadedmetadata = function() {
          var duration = video.duration * 1000; // 转毫秒

          // 验证时长（最大 60 秒）
          if (duration > 60000) {
            URL.revokeObjectURL(url);
            alert('视频时长超过限制（最长 60 秒），请裁剪后重试');
            return;
          }

          // 开始播放视频（Canvas 渲染需要视频处于播放状态才能获取更新的帧）
          video.play().catch(function() {});

          // 更新预览，隐藏占位符
          if (preview) {
            preview.src = url;
            preview.style.display = 'block';
            preview.play().catch(function() {});
          }
          if (placeholder) {
            placeholder.style.display = 'none';
          }

          // 显示时长
          if (durationDisplay) {
            var secs = Math.round(duration / 1000);
            var mins = Math.floor(secs / 60);
            var secsRem = secs % 60;
            durationDisplay.textContent = mins > 0 ? (mins + ':' + (secsRem < 10 ? '0' : '') + secsRem) : (secsRem + '秒');
          }

          // 更新参数（传递正在播放的视频元素）
          // 注意：动态时长由 durationCode 控制，不再自动更新固定时长 (025-dynamic-duration)
          if (window.updateParam) {
            window.updateParam('${config.id}', video);
          }
        };

        video.onerror = function() {
          URL.revokeObjectURL(url);
          alert('视频加载失败，请检查文件是否损坏');
        };

        video.src = url;
        video.load();
      });
    }
  })();
`;
}

/**
 * 生成文本输入控件绑定代码 (028-string-param)
 */
function generateTextBinding(config: ParameterControlConfig): string {
  return `
  // ${config.label} - 文本输入控件
  (function() {
    var textInput = document.getElementById('param-${config.id}');

    if (textInput) {
      textInput.addEventListener('input', function(e) {
        var value = e.target.value;
        if (window.updateParam) {
          window.updateParam('${config.id}', value);
        }
      });
    }
  })();
`;
}
