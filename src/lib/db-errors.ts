/** Turns a database error into a sentence an admin can act on. */
export function friendlyDbError(error: { code?: string; message: string }, what: string) {
  if (error.code === "23505") return `A ${what} with that name already exists.`;
  if (error.code === "23503") return `This ${what} is still used by QR codes, so it cannot be deleted.`;
  if (error.code === "23514") return `Some of the details are not valid. Please check and try again.`;
  console.error(`Database error (${what})`, error);
  return "Something went wrong while saving. Please try again.";
}
