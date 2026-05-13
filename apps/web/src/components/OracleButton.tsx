import Link from "next/link";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { ORACLE_ASSETS } from "@/lib/oracleAssets";

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

function spriteFor(variant: OracleButtonVariant) {
  return variant === "danger"
    ? ORACLE_ASSETS.ui.pixelButtonDanger
    : ORACLE_ASSETS.ui.pixelButtonPrimary;
}

function frameStyle(variant: OracleButtonVariant, disabled?: boolean): CSSProperties {
  return {
    backgroundImage: `url("${spriteFor(variant)}")`,
    backgroundSize: "300% 100%",
    backgroundPosition: disabled ? "100% 0%" : "0% 0%",
  };
}

function sharedClasses(className = "", disabled?: boolean) {
  return [
    "group relative inline-flex min-h-14 items-center justify-center overflow-hidden px-8 py-3 uppercase tracking-[0.12em]",
    "text-2xl text-[#201409] transition-transform duration-100",
    disabled ? "cursor-not-allowed opacity-55" : "hover:-translate-y-0.5 active:translate-y-0.5",
    className,
  ].join(" ");
}

function Label({ children, variant }: { children: ReactNode; variant: OracleButtonVariant }) {
  const color = variant === "danger" ? "text-[#fff0ea]" : "text-[#201409]";
  return (
    <span className={`relative z-10 px-6 text-center leading-none ${color}`}>
      {children}
    </span>
  );
}

function Frame({
  variant,
  disabled,
}: {
  variant: OracleButtonVariant;
  disabled?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 bg-no-repeat"
      style={frameStyle(variant, disabled)}
    />
  );
}

export function OracleButton(props: LinkProps | ButtonProps) {
  const variant = props.variant ?? "primary";

  if ("href" in props && props.href) {
    const { href, children, className, disabled } = props;
    return (
      <Link
        href={href}
        aria-disabled={disabled}
        className={sharedClasses(className, disabled)}
      >
        <Frame variant={variant} disabled={disabled} />
        <Label variant={variant}>{children}</Label>
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
      className={sharedClasses(className, disabled)}
      {...buttonProps}
    >
      <Frame variant={variant} disabled={disabled} />
      <Label variant={variant}>{children}</Label>
    </button>
  );
}
