export type RequestLike = {
  url: string;
  headers?: {
    get(name: string): string | null;
  };
};
