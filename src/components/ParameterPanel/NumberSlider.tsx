import { Slider } from '../common';
import type { AdjustableParameter } from '../../types';

interface NumberSliderProps {
  parameter: AdjustableParameter;
  onChange: (value: number) => void;
}

export function NumberSlider({ parameter, onChange }: NumberSliderProps) {
  const value = parameter.value ?? parameter.min ?? 0;
  const min = parameter.min ?? 0;
  const max = parameter.max ?? 100;
  const step = parameter.step ?? 1;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange(newValue);
  };

  return (
    <div className="py-2">
      <Slider
        label={parameter.name}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        showValue
      />
    </div>
  );
}

export default NumberSlider;
