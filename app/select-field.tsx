import type {ComponentProps} from 'react';
import {ChevronDown} from 'lucide-react';

// Keep native selection and keyboard behavior; only the closed-field arrow is styled.
export default function SelectField({children,...props}:ComponentProps<'select'>){
  return <span className="select-field">
    <select {...props}>{children}</select>
    <ChevronDown className="select-chevron" size={16} aria-hidden="true"/>
  </span>;
}
