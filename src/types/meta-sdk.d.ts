export type FacebookLoginResponse = {
  authResponse?: {
    code?: string;
  };
  status?: string;
};

declare global {
  interface Window {
    FB?: {
      init: (options: {
        appId: string;
        autoLogAppEvents?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: FacebookLoginResponse) => void,
        options: {
          config_id: string;
          response_type: string;
          override_default_response_type: boolean;
          extras: { setup: Record<string, never> };
        },
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export {};
