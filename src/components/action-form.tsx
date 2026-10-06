"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";

export type ActionResult = { error?: string; ok?: string } | null;
export type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

/**
 * A form that shows the action's success or error message underneath, and
 * optionally clears itself or asks for confirmation first.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  confirmMessage,
}: {
  action: FormAction;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirmMessage?: string;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && result?.ok) formRef.current?.reset();
  }, [result, resetOnSuccess]);

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={(event) => {
        // Submitting by hand (instead of <form action>) keeps what was typed
        // when the action returns an error, rather than clearing the form.
        event.preventDefault();
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {result?.error && <p className="mt-2 text-sm text-red-600">{result.error}</p>}
      {result?.ok && <p className="mt-2 text-sm text-green-700">{result.ok}</p>}
    </form>
  );
}
