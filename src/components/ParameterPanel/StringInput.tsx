import { useState, useCallback, useRef, useEffect } from 'react';
import type { AdjustableParameter } from '../../types';

interface StringInputProps {
  parameter: AdjustableParameter;
  onChange: (value: string) => void;
}

const DEBOUNCE_DELAY = 300;

export function StringInput({ parameter, onChange }: StringInputProps) {
  const [localValue, setLocalValue] = useState(parameter.stringValue ?? '');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 当 parameter.stringValue 或 parameter.id 变化时，同步到 localValue
  // 这处理了切换 session 或外部更新参数值的情况
  useEffect(() => {
    setLocalValue(parameter.stringValue ?? '');
  }, [parameter.stringValue, parameter.id]);

  // 直接在 handleChange 里处理防抖，避免 useEffect + React StrictMode 的 cleanup 问题
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    // 清除之前的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // 设置新的定时器
    timerRef.current = setTimeout(() => {
      onChange(newValue);
    }, DEBOUNCE_DELAY);
  }, [onChange]);

  return (
    <div className="py-2">
      <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
        {parameter.name}
      </label>
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={parameter.placeholder ?? ''}
        maxLength={parameter.maxLength}
        className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)] overflow-x-auto"
      />
    </div>
  );
}

export default StringInput;
