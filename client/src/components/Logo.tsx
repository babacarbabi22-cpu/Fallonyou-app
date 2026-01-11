import { Heart } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showIcon?: boolean;
  className?: string;
}

export function Logo({ size = "lg", showIcon = true, className = "" }: LogoProps) {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
    xl: "text-5xl",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-8 h-8",
    xl: "w-10 h-10",
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showIcon && (
        <div className="relative">
          <Heart 
            className={`${iconSizes[size]} text-primary fill-primary drop-shadow-[0_2px_8px_rgba(225,29,98,0.5)]`} 
          />
          <Heart 
            className={`${iconSizes[size]} text-primary/50 fill-primary/30 absolute top-0 left-0 animate-ping`} 
          />
        </div>
      )}
      <span className={`font-display font-black tracking-tight ${sizeClasses[size]}`}>
        <span className="bg-gradient-to-r from-primary via-pink-500 to-secondary bg-clip-text text-transparent drop-shadow-sm">
          Fallon
        </span>
        <span className="text-foreground">You</span>
      </span>
    </div>
  );
}

export function LogoAnimated({ className = "" }: { className?: string }) {
  return (
    <div className={`text-center ${className}`}>
      <div className="inline-flex flex-col items-center">
        <div className="relative mb-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary via-pink-500 to-secondary flex items-center justify-center shadow-2xl shadow-primary/40">
            <Heart className="w-10 h-10 text-white fill-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-secondary flex items-center justify-center shadow-lg animate-bounce">
            <span className="text-white text-xs font-bold">+</span>
          </div>
        </div>
        <h1 className="text-6xl font-display font-black tracking-tight leading-none">
          <span className="bg-gradient-to-r from-primary via-pink-500 to-secondary bg-clip-text text-transparent">
            Fallon
          </span>
          <span className="text-foreground">You</span>
        </h1>
      </div>
    </div>
  );
}
