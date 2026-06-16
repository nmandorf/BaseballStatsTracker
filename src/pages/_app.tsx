import type { AppProps } from "next/app";
import { AuthProvider } from "@/components/AuthProvider";

export default function PagesApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
