import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono, Newsreader } from "next/font/google";
import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import "./globals.css";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Codelens",
    template: "%s | Codelens",
  },
  applicationName: "Codelens",
  description: "Dependency maps of public GitHub repositories",
  openGraph: {
    title: "Codelens",
    description: "Dependency maps of public GitHub repositories",
  },
  twitter: {
    card: "summary",
    title: "Codelens",
    description: "Dependency maps of public GitHub repositories",
  },
};

// Clerk's components read the same tokens as the app, so they follow the
// theme control instead of the OS.
const clerkAppearance = {
  variables: {
    colorBackground: "var(--surface)",
    colorForeground: "var(--fg)",
    colorMutedForeground: "var(--fg-muted)",
    colorPrimary: "var(--accent)",
    colorPrimaryForeground: "var(--accent-fg)",
    colorInput: "var(--canvas)",
    colorInputForeground: "var(--fg)",
    colorNeutral: "var(--fg)",
    colorBorder: "var(--line)",
    fontFamily: "var(--font-sans)",
    fontSize: "0.8125rem",
    borderRadius: "0.5rem",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${hankenGrotesk.variable} ${jetBrainsMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="flex h-full flex-col">
        <ClerkProvider appearance={clerkAppearance}>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          <footer className="shrink-0 border-t border-line bg-surface px-5 py-2 text-center text-[11px] text-fg-muted">
            Built by Singh Rajdiwakar
          </footer>
        </ClerkProvider>
      </body>
    </html>
  );
}
