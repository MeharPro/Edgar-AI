import "next-auth";

declare module "next-auth" {
  interface Session {
    provider?: string;
    idToken?: string;
    user: {
      email: string;
      name?: string;
    };
  }
}

