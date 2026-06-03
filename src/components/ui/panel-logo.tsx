import Image from "next/image";
import { cn } from "@/lib/utils";

type PanelLogoProps = {
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
  className?: string;
};

const sizeMap = {
  sm: { box: "h-9 w-9", img: 36, radius: "rounded-lg" },
  md: { box: "h-11 w-11", img: 44, radius: "rounded-xl" },
  lg: { box: "h-14 w-14", img: 56, radius: "rounded-2xl" },
} as const;

export function PanelLogo({ size = "md", showStatus = true, className }: PanelLogoProps) {
  const s = sizeMap[size];

  return (
    <div className={cn("relative shrink-0 shadow-lg shadow-brand-600/30", s.box, s.radius, className)}>
      <Image
        src="/panel-icon.png"
        alt="Çağrı Merkezi Paneli"
        width={s.img}
        height={s.img}
        className={cn("h-full w-full object-cover", s.radius)}
        priority
      />
      {showStatus ? (
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-sidebar" />
      ) : null}
    </div>
  );
}
