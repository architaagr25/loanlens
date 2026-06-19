import "./globals.css";

export const metadata = {
  title: "LoanLens — EMI Workspace",
  description:
    "Loan EMI calculator with a real-time shared workspace synced across browser tabs.",
};

// Applied before paint to avoid a flash of the wrong theme and any hydration
// mismatch: read the persisted theme synchronously and set the <html> class.
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
      <body>{children}</body>
    </html>
  );
}
