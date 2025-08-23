import "next-auth";

declare module "next-auth" {
  interface Session {
    provider?: string;
    user: {
      email: string;
      name?: string;
    };
  }
}


