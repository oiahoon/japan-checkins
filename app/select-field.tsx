'use client';

import {Children, isValidElement, useRef, useState, type ComponentProps, type ReactElement, type ReactNode} from 'react';
import {Select} from '@base-ui/react/select';
import {Check, ChevronDown} from 'lucide-react';

function textOf(node: ReactNode): string {
  return Children.toArray(node).map(child => isValidElement<{children?: ReactNode}>(child)
    ? textOf(child.props.children) : String(child)).join('');
}

// The hidden select preserves existing change handlers and native form values.
export default function SelectField({children, value, defaultValue, onChange, disabled, id, leadingIcon, ...props}: ComponentProps<'select'> & {leadingIcon?: ReactNode}) {
  const native = useRef<HTMLSelectElement>(null);
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState<string | undefined>(defaultValue === undefined ? undefined : String(defaultValue));
  const items = Children.toArray(children).filter(isValidElement).map(child => {
    const option = child as ReactElement<{value?: string | number; children?: ReactNode; disabled?: boolean}>;
    return {
      value: String(option.props.value ?? textOf(option.props.children)),
      label: textOf(option.props.children),
      disabled: option.props.disabled,
    };
  });
  const selected = value === undefined ? (internal ?? items[0]?.value ?? '') : String(value);

  return <span className="select-field">
    <select {...props} ref={native} value={selected} disabled={disabled} onChange={onChange} hidden aria-hidden="true" tabIndex={-1}>{children}</select>
    <Select.Root items={items} value={selected} disabled={disabled} open={open} onOpenChange={setOpen} onValueChange={next => {
      const nextValue = String(next ?? '');
      setInternal(nextValue);
      if (native.current) {
        native.current.value = nextValue;
        native.current.dispatchEvent(new Event('change', {bubbles: true}));
      }
    }}>
      <Select.Trigger id={id} aria-label={props['aria-label']} aria-describedby={props['aria-describedby']} className="select-trigger">
        {leadingIcon && <span className="select-leading" aria-hidden="true">{leadingIcon}</span>}
        <Select.Value className="select-value"/>
        <Select.Icon className="select-chevron"><ChevronDown size={16} aria-hidden="true"/></Select.Icon>
      </Select.Trigger>
      {/* Native dialog top-layer requires its popup to stay inside that dialog. */}
      <Select.Portal container={native.current?.closest('dialog') ?? undefined}>
        <Select.Positioner className="select-positioner" sideOffset={8} alignItemWithTrigger={false}>
          <Select.Popup className={'select-popup'+(leadingIcon?' select-popup--location':'')}>
            <Select.List className="select-list">
              {items.map(item => <Select.Item className="select-option" key={item.value} value={item.value} disabled={item.disabled}>
                <Select.ItemIndicator className="select-check"><Check size={15}/></Select.ItemIndicator>
                <Select.ItemText className="select-option-label">{item.label}</Select.ItemText>
              </Select.Item>)}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  </span>;
}
