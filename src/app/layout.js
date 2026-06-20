import "./globals.css";
import { SharedStateProvider } from "@/hooks/useSharedState";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <SharedStateProvider>{children}</SharedStateProvider>
      </body>
    </html>
  );
}
