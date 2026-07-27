"use client";

import { useClerk } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

export function CustomSignInForm() {
  const clerk = useClerk();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Automatically redirect signed in users away from sign in page
  useEffect(() => {
    if (clerk.loaded && clerk.user) {
      router.replace("/");
    }
  }, [clerk.loaded, clerk.user, router]);

  // If user is already authenticated, redirect directly without intermediate screen
  if (clerk.loaded && clerk.user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clerk.loaded) return;
    setIsLoading(true);
    setError(null);

    try {
      let result = await clerk.client.signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "needs_first_factor") {
        result = await result.attemptFirstFactor({
          strategy: "password",
          password,
        });
      }

      if (result.status === "complete") {
        await clerk.setActive({ session: result.createdSessionId });
        router.push("/");
      } else if (result.status === "needs_second_factor") {
        setError("Two-factor authentication is required. Please check your device.");
      } else {
        setError("Sign in incomplete. Please check your credentials.");
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "Invalid email or password.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl shadow-sm">
      {/* Company Logo & Header */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex items-center justify-center p-2 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-default)] shadow-xs">
          <img
            src="/favicon.svg"
            alt="Cheesecake Masters Logo"
            width={48}
            height={48}
            className="w-12 h-12 object-contain shrink-0"
          />
        </div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Sign in</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">Enter your credentials to access your account</p>
      </div>

      {error && (
        <div className="mb-4 p-3 text-xs bg-[var(--state-error-bg)] text-[var(--state-error-text)] border border-[var(--state-error-border)] rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium text-[var(--text-primary)]">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-10 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium text-[var(--text-primary)]">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-10 text-sm pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:outline-none transition-colors p-1 rounded-md cursor-pointer select-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" strokeWidth={1.75} />
              ) : (
                <Eye className="h-4 w-4" strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={!clerk.loaded || isLoading}
          className="w-full h-10 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-sm font-medium rounded-md transition-colors"
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </Button>
      </form>
    </div>
  );
}
