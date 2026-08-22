import Image from "next/image";
import { cn } from "@/lib/utils";

type PanelLogoProps = {
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
  className?: string;
};

const sizeMap = {
  sm: { box: "h-8 w-8", img: 32, radius: "rounded-lg" },
  md: { box: "h-10 w-10", img: 40, radius: "rounded-xl" },
  lg: { box: "h-12 w-12", img: 48, radius: "rounded-xl" },
} as const;

export function PanelLogo({ size = "md", showStatus = true, className }: PanelLogoProps) {
  const s = sizeMap[size];

  return (
    <div className={cn("relative shrink-0 overflow-hidden ring-1 ring-black/10", s.box, s.radius, className)}>
      <Image
        src="/panel-icon.png"
        alt="Çağrı Merkezi Paneli"
        width={s.img}
        height={s.img}
        className={cn("h-full w-full object-cover", s.radius)}
        priority
      />
      {showStatus ? (
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-brand-400 ring-2 ring-sidebar" />
      ) : null}
    </div>
  );
}
