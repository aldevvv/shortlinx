export type ResolutionMethod = "http" | "browser" | "hybrid";

export interface ResolutionHop {
  url: string;
  method: "GET" | "POST";
  status: number;
  location?: string;
  contentType?: string;
}

export interface ResolveResult {
  originalUrl: string;
  finalUrl: string;
  provider: "move2link";
  hops: ResolutionHop[];
  method: ResolutionMethod;
  elapsedMs: number;
}

export interface ResolveOptions {
  fetchImpl?: typeof fetch;
  maxHops?: number;
  logger?: (message: string) => void;
}
