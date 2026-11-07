
export {};

declare global {
  interface Window {
    sidekick: {
      platform: string;

      versions: {
        electron: string;
        chrome: string;
        node: string;
      };
    };
  }
}
