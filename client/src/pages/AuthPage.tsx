import { Button } from "@/components/ui/button";
import { Loader2, Heart, Sparkles } from "lucide-react";

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
        <div className="mx-auto mb-8 w-32 h-32 relative">
           <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
           <div className="absolute inset-4 bg-gradient-to-tr from-primary to-secondary rounded-full flex items-center justify-center shadow-2xl">
             <Heart className="w-12 h-12 text-white fill-current" />
           </div>
           <div className="absolute top-0 right-0 bg-white rounded-full p-2 shadow-lg animate-bounce delay-100">
             <Sparkles className="w-6 h-6 text-yellow-500" />
           </div>
        </div>

        <h1 className="text-5xl font-display font-black tracking-tighter mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          danceme
        </h1>
        
        <p className="text-lg text-muted-foreground mb-12 font-medium leading-relaxed">
          Find your rhythm. Match with people who move like you do.
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
