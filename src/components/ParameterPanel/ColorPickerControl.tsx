import { ColorPicker } from '../common';
import type { AdjustableParameter } from '../../types';

interface ColorPickerControlProps {
  parameter: AdjustableParameter;
  onChange: (value: string) => void;
}

export function ColorPickerControl({ parameter, onChange }: ColorPickerControlProps) {
  const value = parameter.colorValue ?? '#000000';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="py-2">
      <ColorPicker
        label={parameter.name}
        value={value}
        onChange={handleChange}
      />
    </div>
  );
}

export default ColorPickerControl;
