import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import LoadingPanel from "../components/ui/LoadingPanel";
import { api } from "../lib/api";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      const token = String(searchParams.get("token") || "").trim();
      if (!token) {
        setStatus("error");
        setMessage("Verification token is missing.");
        return;
      }

      try {
        const response = await api.post("/auth/verify-email", { token });
        setStatus("success");
        setMessage(response?.message || "Email verified successfully.");
      } catch (error) {
        setStatus("error");
        setMessage(error.message);
      }
    };

    verifyEmail();
  }, [searchParams]);

  return (
    <MainLayout>
      <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        {status === "loading" ? <LoadingPanel label="Verifying email..." variant="page" /> : null}
        {status !== "loading" ? (
          <>
            <span className={`material-symbols-outlined text-6xl ${status === "success" ? "text-primary" : "text-error"}`}>
              {status === "success" ? "mark_email_read" : "error"}
            </span>
            <h1 className="mt-4 font-headline text-3xl font-black text-primary">
              {status === "success" ? "Email verified" : "Verification failed"}
            </h1>
            <p className="mt-3 text-sm text-on-surface-variant">{message}</p>
            <Link to="/" className="mt-6 rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white">
              Go Home
            </Link>
          </>
        ) : null}
      </section>
    </MainLayout>
  );
}
