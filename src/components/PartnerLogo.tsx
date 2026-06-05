import { useState } from "react";
import { slugify, colorFromString, initials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  size?: number;
  className?: string;
}

// Try Clearbit logo by guessing a domain from the fornecedor name. Fall back
// to colored initials when the network fetch fails.
export function PartnerLogo({ name, size = 36, className }: Props) {
  const [failed, setFailed] = useState(false);
  const slug = slugify(name);
  const domain = slug ? `${slug}.com.br` : "";
  const src = domain ? `https://logo.clearbit.com/${domain}` : "";

  if (!src || failed) {
    return (
      <div
        className={cn("flex items-center justify-center rounded-md text-[0.7rem] font-semibold text-white shrink-0", className)}
        style={{ width: size, height: size, background: colorFromString(name) }}
        aria-label={name}
      >
        {initials(name)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={cn("rounded-md bg-white object-contain p-1 border shrink-0", className)}
      style={{ width: size, height: size }}
    />
  );
}