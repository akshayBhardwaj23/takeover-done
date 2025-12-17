"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { Chrome, ArrowRight, Mail, Lock } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import Link from "next/link";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [isLoading, setIsLoading] = useState(false);
  
  // Placeholder state for inputs to make them interactive
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    await signIn("google", { callbackUrl: "/integrations" });
    // Note: redirect happens automatically, but we keep loading state just in case
  };

  const handlePlaceholderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder behavior: just log to console
    console.log(`${mode === "signin" ? "Sign In" : "Sign Up"} attempted with:`, { email, password });
    alert("This feature is coming soon! Please use Google Sign In for now.");
  };

  const toggleMode = () => {
    setMode(prev => prev === "signin" ? "signup" : "signin");
    setEmail("");
    setPassword("");
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-white">
      {/* Left Panel - Form */}
      <div className="flex w-full flex-col justify-center px-8 py-12 md:w-[40%] md:px-16 lg:px-24">
        <div className="mx-auto w-full max-w-md space-y-8">
          {/* Logo & Header */}
          <div className="space-y-2">
            <div className="mb-8 flex items-center gap-2">
              <div className="h-8 w-8 bg-black rounded-lg"></div> {/* Minimalist Logo Placeholder */}
              <span className="font-bold text-xl">AI Ecom</span>
            </div>
            <h1 className="text-3xl font-normal tracking-tight text-gray-900">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-gray-500">
              {mode === "signin" 
                ? "Enter your details to access your account" 
                : "Start your journey with us today"}
            </p>
          </div>

          {/* Google Sign In */}
          <Button 
            variant="outline" 
            className="w-full h-12 gap-3 text-base font-normal border-gray-200 hover:bg-gray-50 hover:text-black transition-all"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
           <Chrome className="h-5 w-5" />
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="mx-4 flex-shrink-0 text-gray-400 text-sm">Or</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          {/* Email/Password Form - PLACEHOLDER UI */}
          <form onSubmit={handlePlaceholderSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900" htmlFor="email">Email</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input 
                        id="email" 
                        type="email" 
                        placeholder="name@example.com" 
                        className="pl-10 h-12 border-gray-200"
                        value={email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-900" htmlFor="password">Password</label>
                    {mode === "signin" && (
                        <Link href="#" className="text-xs text-gray-500 hover:text-black underline-offset-4 hover:underline">
                            Forgot password?
                        </Link>
                    )}
                </div>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input 
                        id="password" 
                        type="password" 
                        placeholder="••••••••" 
                        className="pl-10 h-12 border-gray-200"
                        value={password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 bg-[#2D2D2D] hover:bg-black text-white text-base font-medium transition-all">
              {mode === "signin" ? "Sign In" : "Create Account"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          {/* Toggle Mode */}
          <div className="text-center text-sm text-gray-500">
            {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
            <button 
                onClick={toggleMode}
                className="font-medium text-black underline underline-offset-4 hover:text-gray-700"
            >
                {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </div>
          
          {/* Footer Link */}
          <div className="mt-8 text-center">
            <Link href="/" className="text-xs text-gray-400 hover:text-black transition-colors">
                Back to website
            </Link>
          </div>
        </div>
      </div>

      {/* Right Panel - Image Showcase */}
      <div className="hidden md:block md:w-[60%] relative bg-[#F5F5F7]">
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-white/20 to-transparent pointer-events-none"></div>
        <Image
          src="/login-bg.png"
          alt="Dreamlike surreal landscape"
          fill
          className="object-cover"
          priority
          sizes="60vw"
        />
        
        {/* Optional Overlay Text or Branding could go here */}
        <div className="absolute bottom-12 left-12 right-12 z-20">
            <blockquote className="max-w-lg text-white font-medium text-lg md:text-xl drop-shadow-md">
                "Simplicity is the ultimate sophistication."
            </blockquote>
        </div>
      </div>
    </div>
  );
}
