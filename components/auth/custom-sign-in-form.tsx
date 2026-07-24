"use client";

import { useClerk } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function CustomSignInForm() {
  const clerk = useClerk();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clerk.loaded) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await clerk.client.signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await clerk.setActive({ session: result.createdSessionId });
        router.push("/");
      } else {
        setError("Sign in incomplete. Please verify your credentials.");
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
      <div className="mb-6 text-center">
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
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-10 text-sm"
          />
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
