export class SDKError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'SDKError';
  }
}

export class AuthenticationError extends SDKError {
  constructor(message: string, details?: unknown) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

export class PaymentRequiredError extends SDKError {
  public readonly paymentDetails: {
    amount: string;
    token: string;
    recipient: string;
    chainId: number;
  };

  constructor(
    message: string,
    paymentDetails: { amount: string; token: string; recipient: string; chainId: number }
  ) {
    super(message, 'PAYMENT_REQUIRED', 402, paymentDetails);
    this.name = 'PaymentRequiredError';
    this.paymentDetails = paymentDetails;
  }
}

export class NotFoundError extends SDKError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends SDKError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends SDKError {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class NetworkError extends SDKError {
  constructor(message: string, details?: unknown) {
    super(message, 'NETWORK_ERROR', undefined, details);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends SDKError {
  constructor(message: string = 'Request timed out') {
    super(message, 'TIMEOUT');
    this.name = 'TimeoutError';
  }
}

export function isSDKError(error: unknown): error is SDKError {
  return error instanceof SDKError;
}

export function isPaymentRequired(error: unknown): error is PaymentRequiredError {
  return error instanceof PaymentRequiredError;
}
