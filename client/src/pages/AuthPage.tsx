import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import generatedLogo from "@assets/generated_images/danceme_logo_with_heart_sunset_scene.png";

export default function AuthPage() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[100px]" />

      <div className="relative z-10 w-full max-w-md px-8 text-center">
        
        {/* Logo/Icon Animation */}
        <div className="mx-auto mb-10 w-56 h-56 relative">
           <div className="absolute inset-0 bg-red-500/10 rounded-full animate-pulse" />
           <div className="absolute inset-0 flex items-center justify-center">
             <img 
               src={generatedLogo} 
               alt="Danceme Logo" 
               className="w-52 h-52 object-contain rounded-full drop-shadow-[0_20px_50px_rgba(255,0,0,0.4)] animate-in zoom-in duration-700 ease-out border-4 border-white/20"
             />
           </div>
           <div className="absolute top-2 right-2 bg-white rounded-full p-3 shadow-xl animate-bounce">
             <Sparkles className="w-8 h-8 text-red-500 fill-red-200" />
           </div>
        </div>

        <h1 className="text-6xl font-black italic tracking-tighter mb-6 text-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-1000">
          FallonYou
        </h1>
        
        <p className="text-lg text-muted-foreground mb-12 font-medium leading-relaxed italic">
          "Find your rhythm. Match with people who move like you do."
        </p>

        <div className="space-y-4">
          <Button 
            onClick={handleLogin}
            className="w-full h-14 text-lg rounded-2xl font-bold bg-foreground text-background hover:bg-foreground/90 shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Continue with Replit Auth
          </Button>
          
          <p className="text-xs text-muted-foreground mt-8">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
