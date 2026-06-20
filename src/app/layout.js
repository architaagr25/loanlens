import "./globals.css";
import { Inter } from "next/font/google";
import { SharedStateProvider } from "@/hooks/useSharedState";

// Inter, same clean sans-serif as the reference. exposed as --font-sans so
// tailwind's font-sans picks it up.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = {
  title: "LoanLens — EMI Workspace",
  description:
    "Loan EMI calculator with a real-time shared workspace synced across browser tabs.",
};

// runs before the page paints - reads the saved theme and sets the dark class
// right away so there's no flash of the wrong theme (and no hydration warning)
const themeBootstrap = `
(function () {
  try {
    var raw = localStorage.getItem('loanlens:state');
    var theme = raw ? (JSON.parse(raw).theme || 'light') : 'light';
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <SharedStateProvider>{children}</SharedStateProvider>
      </body>
    </html>
  );
}
