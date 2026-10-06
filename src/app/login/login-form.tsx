"use client";

import { startTransition, useActionState } from "react";
import { signIn } from "./actions";

export function LoginForm() {
  const [error, formAction, pending] = useActionState(signIn, null);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        // Keeps the typed email when the password is wrong.
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Email</span>
        <input name="email" type="email" required autoComplete="email" className="input mt-1" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="input mt-1"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
