import "@/styles/global.css";

export const metadata = {
  title: "Captable-AI",
  description: "Startup evaluator",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
