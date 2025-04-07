// Type declarations for UI components
import { ReactNode } from 'react';

declare module '@/components/ui/Card' {
  export interface CardProps {
    children: ReactNode;
    className?: string;
  }
  
  export interface CardHeaderProps {
    children: ReactNode;
    className?: string;
  }
  
  export interface CardBodyProps {
    children: ReactNode;
    className?: string;
  }
  
  export interface CardFooterProps {
    children: ReactNode;
    className?: string;
  }
  
  export function Card(props: CardProps): JSX.Element;
  export function CardHeader(props: CardHeaderProps): JSX.Element;
  export function CardBody(props: CardBodyProps): JSX.Element;
  export function CardFooter(props: CardFooterProps): JSX.Element;
}

declare module '@/components/ui/Button' {
  export interface ButtonProps {
    children?: ReactNode;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    fullWidth?: boolean;
    onClick?: () => void;
  }
  
  export function Button(props: ButtonProps): JSX.Element;
}

declare module '@/components/ui/Select' {
  export interface SelectOption {
    value: string;
    label: string;
  }
  
  export interface SelectProps {
    id?: string;
    name?: string;
    label?: string;
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    error?: string;
    required?: boolean;
    emptyOptionLabel?: string;
    className?: string;
  }
  
  export function Select(props: SelectProps): JSX.Element;
}

declare module '@/components/ui/Input' {
  export interface InputProps {
    id?: string;
    name?: string;
    label?: string;
    type?: string;
    placeholder?: string;
    value?: string;
    defaultValue?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
    required?: boolean;
    className?: string;
    fullWidth?: boolean;
    icon?: ReactNode;
  }
  
  export function Input(props: InputProps): JSX.Element;
} 