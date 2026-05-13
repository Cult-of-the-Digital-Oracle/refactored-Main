import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type OracleButtonVariant = "primary" | "danger";

type BaseProps = {
  children: ReactNode;
  variant?: OracleButtonVariant;
  className?: string;
  disabled?: boolean;
};

type LinkProps = BaseProps & {
  href: string;
  onClick?: never;
  type?: never;
};

type ButtonProps = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & {
    href?: never;
  };

function variantClass(variant: OracleButtonVariant) {
  return variant === "danger" ? "pixel-button-danger" : "pixel-button-emerald";
}

function sharedClasses(className = "", variant: OracleButtonVariant, disabled?: boolean) {
  return [
    "pixel-button inline-flex min-h-14 items-center justify-center px-8 py-3 text-2xl uppercase tracking-[0.12em]",
    variantClass(variant),
    disabled ? "pointer-events-none opacity-55" : "",
    className,
  ].join(" ");
}

export function OracleButton(props: LinkProps | ButtonProps) {
  const variant = props.variant ?? "primary";

  if ("href" in props && props.href) {
    const { href, children, className, disabled } = props;
    return (
      <Link
        href={href}
        aria-disabled={disabled}
        className={sharedClasses(className, variant, disabled)}
      >
        <span className="relative z-10 text-center leading-none">{children}</span>
      </Link>
    );
  }

  const {
    children,
    className,
    disabled,
    type = "button",
    ...buttonProps
  } = props;

  return (
    <button
      type={type}
      disabled={disabled}
      className={sharedClasses(className, variant, disabled)}
      {...buttonProps}
    >
      <span className="relative z-10 text-center leading-none">{children}</span>
    </button>
  );
}
