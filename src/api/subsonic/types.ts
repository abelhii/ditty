/** Credentials needed to sign a Subsonic REST request. Never includes the plaintext password. */
export type SubsonicAuth = {
  username: string;
  token: string;
  salt: string;
};

export type SubsonicResponseStatus = 'ok' | 'failed';

export type SubsonicEnvelope<T = Record<string, never>> = {
  'subsonic-response': {
    status: SubsonicResponseStatus;
    version: string;
    type?: string;
    serverVersion?: string;
    error?: {
      code: number;
      message: string;
    };
  } & T;
};
