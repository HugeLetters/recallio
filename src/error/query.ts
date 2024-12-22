import type { Query } from "@tanstack/react-query";

export class QueryErrorHandler {
  error;
  constructor(error: (query: Query) => void) {
    this.error = error;
  }
}
