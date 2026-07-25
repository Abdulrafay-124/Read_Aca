import type { ReactNode } from "react";

interface StampProps {
  children: ReactNode;
  color?: "green" | "oxblood" | "brass";
}

const colorClasses = {
  green: "text-[#2F4538] border-[#2F4538]",
  oxblood: "text-[#8B3A2B] border-[#8B3A2B]",
  brass: "text-[#A67C3D] border-[#A67C3D]",
};

export default function Stamp({ children, color = "green" }: StampProps) {
  return (
    <span
      className={`inline-flex items-center border-2 bg-transparent px-2 py-0.5 rounded-sm text-xs font-mono uppercase tracking-[0.18em] -rotate-2 ${colorClasses[color]}`}
    >
      {children}
    </span>
  );
}
