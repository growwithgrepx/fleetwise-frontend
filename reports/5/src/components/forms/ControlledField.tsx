import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { Input, InputProps } from '@/components/atoms/Input';
import { Select, SelectProps } from '@/components/atoms/Select';
import { Textarea, TextareaProps } from '@/components/atoms/Textarea';

type FieldComponent = typeof Input | typeof Select | typeof Textarea;
type FieldProps = InputProps | SelectProps | TextareaProps;

interface ControlledFieldProps<
  TFieldValues extends FieldValues,
  TComponent extends FieldComponent,
  TProps extends FieldProps
> {
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  component: TComponent;
  props: Omit<TProps, 'value' | 'onChange' | 'onBlur'>;
  transform?: {
    input?: (value: any) => any;
    output?: (value: any) => any;
  };
}

export function ControlledField<
  TFieldValues extends FieldValues,
  TComponent extends FieldComponent,
  TProps extends FieldProps
>({
  name,
  control,
  component: Component,
  props,
  transform,
}: ControlledFieldProps<TFieldValues, TComponent, TProps>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { value, onChange, ...field } }) => (
        <Component
          {...(props as any)}
          value={transform?.input ? transform.input(value) : value}
          onChange={(e: any) => {
            const newValue = transform?.output 
              ? transform.output(e.target.value)
              : e.target.value;
            onChange(newValue);
          }}
          {...field}
        />
      )}
    />
  );
}
