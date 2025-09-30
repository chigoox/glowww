import { Geist, Geist_Mono, Oswald } from "next/font/google";
import "./globals.css";
import { PagesProvider } from "./Components/utils/context/PagesContext";
import { AuthProvider } from "../contexts/AuthContext";
import { CartProvider } from "../contexts/CartContext";
import { EditorSettingsProvider } from "./Components/utils/context/EditorSettingsContext";
import ThemeInitializer from "./Components/utils/ThemeInitializer";
import PageTransition from "../components/ui/PageTransition";
import TouchPolyfillInitializer from "./Components/utils/TouchPolyfillInitializer";

const geistSans = Oswald({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Glowww",
  description: "Powered byGlowww",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID}`}></script>
            <script dangerouslySetInnerHTML={{ __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);} gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID}', { anonymize_ip: true });
            ` }} />
          </>
        )}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <CartProvider>
            <EditorSettingsProvider>
              <PagesProvider>
                <ThemeInitializer />
                <TouchPolyfillInitializer />
                <PageTransition>{children}</PageTransition>
              </PagesProvider>
            </EditorSettingsProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
