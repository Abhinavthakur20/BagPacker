import Footer from "./Footer";
import TopNav from "./TopNav";

export default function MainLayout({
  children,
  withFooter = true,
  className = "",
}) {
  return (
    <div className={`min-h-screen bg-surface text-on-surface ${className}`}>
      <TopNav />
      <main className="pt-16">{children}</main>
      {withFooter ? <Footer /> : null}
    </div>
  );
}
