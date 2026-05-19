import { Link } from "react-router-dom";
import MainLayout from "../components/MainLayout";

export default function NotFoundPage() {
  return (
    <MainLayout>
      <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
        <span className="material-symbols-outlined text-6xl text-secondary">explore_off</span>
        <h1 className="mt-4 font-headline text-4xl font-black text-primary">
          Page not found
        </h1>
        <p className="mt-3 text-sm text-on-surface-variant">
          The page you requested does not exist or may have moved.
        </p>
        <Link
          to="/"
          className="mt-6 rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white"
        >
          Go Home
        </Link>
      </section>
    </MainLayout>
  );
}
