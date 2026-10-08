import { ReactNode } from "react";

export function PrimaryButton({ children, ...props }: {
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className="btn-primary" {...props}>{children}</button>;
}

export function OutlineButton({ children, ...props }: {
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className="btn-outline" {...props}>{children}</button>;
}

export function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full
                     border-2 border-white/40 border-t-white" />
  );
}
