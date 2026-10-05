function safeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown error";
  return message.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]");
}

export const logger = {
  info(message: string) {
    console.log(message);
  },
  error(message: string, error?: unknown) {
    if (error === undefined) {
      console.error(message);
      return;
    }
    console.error(`${message}: ${safeMessage(error)}`);
  },
};
