import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import { api } from "../lib/api";
import { showErrorAlert, showSuccessAlert } from "../lib/alerts";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const resetPassword = async () => {
    const token = String(searchParams.get("token") || "").trim();
    if (!token || password.length < 6) {
      setMessage("Enter a new password with at least 6 characters.");
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage("");
      const response = await api.post("/auth/reset-password", { token, password });
      await showSuccessAlert("Password reset", response?.message || "Password reset successfully.");
      navigate("/");
    } catch (error) {
      setMessage(error.message);
      await showErrorAlert("Password reset failed", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
        <h1 className="font-headline text-3xl font-black text-primary">Reset Password</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Choose a new password for your BagPacker account.
        </p>
        {message ? (
          <div className="mt-4 rounded-xl bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container">
            {message}
          </div>
        ) : null}
        <div className="mt-5 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="New password"
            className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-high px-4 py-3 outline-none transition focus:border-primary"
          />
          <button
            type="button"
            onClick={resetPassword}
            disabled={isSubmitting}
            className="w-full rounded-xl bg-primary py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </button>
          <Link to="/" className="block text-center text-xs font-bold text-primary hover:underline">
            Back to home
          </Link>
        </div>
      </section>
    </MainLayout>
  );
}
