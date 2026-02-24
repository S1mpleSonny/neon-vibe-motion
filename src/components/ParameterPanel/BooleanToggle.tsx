import { Toggle } from '../common';
import type { AdjustableParameter } from '../../types';

interface BooleanToggleProps {
  parameter: AdjustableParameter;
  onChange: (value: boolean) => void;
}

export function BooleanToggle({ parameter, onChange }: BooleanToggleProps) {
  const value = parameter.boolValue ?? false;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <div className="py-2">
      <Toggle
        label={parameter.name}
        checked={value}
        onChange={handleChange}
      />
    </div>
  );
}

export default BooleanToggle;
