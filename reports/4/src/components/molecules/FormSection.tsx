import React from "react";
import clsx from "clsx"; // optional, for merging classNames

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string; // 👈 allow extra classes
}

export function FormSection({ title, children, className }: FormSectionProps) {
  return (
    <div className={clsx("bg-background-light rounded-lg p-6 shadow-md", className)}>
      <h3 className="text-xl font-semibold text-text-main mb-4 border-b border-border-color pb-2">
        {title}
      </h3>
      {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> */}
      <div>
        {children}
      </div>
    </div>
  );
}
