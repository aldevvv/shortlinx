export class SecurityChallengeError extends Error {
  readonly code = "SECURITY_CHALLENGE";

  constructor(
    message: string,
    readonly url: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SecurityChallengeError";
  }
}
