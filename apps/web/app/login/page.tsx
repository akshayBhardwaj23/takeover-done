"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { Chrome, ArrowRight, Mail } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import Link from "next/link";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  
  const [email, setEmail] = useState("");

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    await signIn("google", { callbackUrl: "/integrations" });
  };

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      // If the page is being loaded from the bfcache (back/forward cache),
      // we need to reset the loading state.
      if (event.persisted) {
        setIsLoading(false);
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    
    // Also reset on simple mount in case of normal back navigation that re-runs effects
    setIsLoading(false);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await signIn("email", { 
        email, 
        redirect: false,
        callbackUrl: "/integrations"
      });
      
      if (result?.error) {
        alert("Something went wrong. Please try again.");
      } else {
        setIsEmailSent(true);
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Failed to send magic link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-white">
      {/* Left Panel - Form */}
      <div className="flex w-full flex-col justify-center px-8 py-12 md:w-[40%] md:px-16 lg:px-24">
        <div className="mx-auto w-full max-w-md space-y-8">
          {/* Logo & Header */}
          <div className="space-y-2">
            <div className="mb-8 flex items-center gap-2">
              <div className="h-8 w-8 bg-black rounded-lg"><Image src="/zyyp rounded.png" alt="Logo" width={32} height={32} /></div> {/* Minimalist Logo Placeholder */}
              <span className="font-bold text-xl">Zyyp AI</span>
            </div>
            <h1 className="text-3xl font-normal tracking-tight text-gray-900">
              {isEmailSent ? "Check your inbox" : "Welcome back"}
            </h1>
            <p className="text-gray-500">
              {isEmailSent 
                ? "We've sent you a magic link to sign in." 
                : "Enter your email to sign in or create an account"}
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

          {/* Magic Link Form */}
          {isEmailSent ? (
            <div className="text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-gray-900">Check your email</h3>
                <p className="text-gray-500">
                  We've sent a magic link to <span className="font-medium text-gray-900">{email}</span>. Click the link to sign in.
                </p>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setIsEmailSent(false)}
              >
                Back to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleMagicLinkLogin} className="space-y-6">
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
                          required
                      />
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-[#2D2D2D] hover:bg-black text-white text-base font-medium transition-all"
                disabled={isLoading}
              >
                {isLoading ? "Sending Link..." : "Send Magic Link"}
                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>
          )}


          
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
