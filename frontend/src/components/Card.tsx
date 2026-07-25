import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  spineColor?: string;
  className?: string;
}

export default function Card({ children, spineColor = "#2F4538", className = "" }: CardProps) {
  return (
    <div
      className={`bg-white rounded-sm shadow-sm border-l-4 ${className}`.trim()}
      style={{ borderLeftColor: spineColor }}
    >
      {children}
    </div>
  );
}
