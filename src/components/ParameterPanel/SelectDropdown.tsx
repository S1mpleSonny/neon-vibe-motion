import { Select } from '../common';
import type { AdjustableParameter } from '../../types';

interface SelectDropdownProps {
  parameter: AdjustableParameter;
  onChange: (value: string) => void;
}

export function SelectDropdown({ parameter, onChange }: SelectDropdownProps) {
  const value = parameter.selectedValue ?? parameter.options?.[0]?.value ?? '';
  const options = parameter.options ?? [];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="py-2">
      <Select
        label={parameter.name}
        options={options}
        value={value}
        onChange={handleChange}
      />
    </div>
  );
}

export default SelectDropdown;
