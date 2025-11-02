interface ApiResponseOptions<T> {
  statusCode?: number;
  data?: T;
}

export class ApiResponse<T = null> {
  public readonly success: boolean;
  public readonly statusCode: number;
  public readonly message: string;
  public readonly data: T | null;

  constructor(message: string, options: ApiResponseOptions<T> = {}) {
    this.statusCode = options.statusCode || 200;
    this.message = message;
    this.data = options.data || null;
    this.success = this.statusCode < 400;
  }
}
