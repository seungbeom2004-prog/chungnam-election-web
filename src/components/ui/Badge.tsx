interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "muted";
  className?: string;
}

const variantStyles = {
  primary: "bg-primary-light text-primary",
  secondary: "bg-secondary/10 text-secondary",
  muted: "bg-border text-muted",
};

export default function Badge({
  children,
  variant = "primary",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center rounded-full px-2.5 py-0.5
        text-xs font-medium
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
