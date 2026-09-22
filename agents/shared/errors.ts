export class AgentError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = 'AgentError';
    this.code = code;
    this.retryable = retryable;
  }
}

export function isAgentError(error: unknown): error is AgentError {
  return error instanceof AgentError;
}
