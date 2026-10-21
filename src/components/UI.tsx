import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function IconButton({ icon: Icon, label, active, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string; active?: boolean }) {
  return <button {...props} className={`icon-button ${active ? 'active' : ''} ${className}`} aria-label={label} title={label}><Icon size={16} strokeWidth={1.6} /></button>;
}
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <button className={`toggle ${checked ? 'on' : ''}`} role="switch" aria-checked={checked} aria-label={label} onClick={onChange}><span /></button>;
}
export function PanelTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return <div className="panel-title"><h2>{children}</h2>{aside}</div>;
}
