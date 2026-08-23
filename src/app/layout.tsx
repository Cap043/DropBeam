export const metadata = {
  title: "DropBeam",
  description: "Ultra-fast P2P file sharing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-black antialiased">
        {children}
      </body>
    </html>
  );
}