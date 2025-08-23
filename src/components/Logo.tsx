import Image from "next/image";
import Link from "next/link";

type Props = {
  withText?: boolean;
  src?: string;
  size?: number; // square size in px
  className?: string;
};

export default function Logo({ withText = true, src = "/edgar-logo-svg.svg", size = 32, className }: Props) {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Image
        src={src}
        alt="Edgar logo"
        width={size}
        height={size}
        className={className ? className : "invert"}
        priority
      />
      {withText && (
        <span className="text-white font-semibold tracking-tight">Edgar</span>
      )}
    </Link>
  );
}


