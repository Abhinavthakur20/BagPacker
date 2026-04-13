import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import campfireImage from "../assets/images/landing/story/HomeDesign.webp";
import { api } from "../lib/api";
import { showErrorAlert, showSuccessAlert } from "../lib/alerts";
import { getDashboardPath, persistAuth } from "../lib/auth";

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = useMemo(
    () => (searchParams.get("mode") === "signup" ? "signup" : "login"),
    [searchParams],
  );

  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState("traveler");
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "traveler",
    isVerified: false,
  });
  const [organizerForm, setOrganizerForm] = useState({
    businessName: "",
    businessDesc: "",
  });
  const [travelerForm, setTravelerForm] = useState({
    govIDVerified: false,
    preferences: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const roleLabel = role === "organizer" ? "organizer" : "traveler";

  const updateUserField = (field, value) => {
    setUserForm((prev) => ({ ...prev, [field]: value }));
  };

  const onLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      setFormError("Please enter email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError("");
      const response = await api.post("/auth/login", {
        email: loginForm.email,
        password: loginForm.password,
      });

      persistAuth(response.token, response.user);
      await showSuccessAlert("Welcome back", "Login successful.");
      navigate(getDashboardPath(response.user?.role));
    } catch (error) {
      setFormError(error.message);
      await showErrorAlert("Login failed", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSignUp = async () => {
    if (
      !userForm.name ||
      !userForm.email ||
      !userForm.phone ||
      !userForm.password
    ) {
      setFormError("Please complete all required fields.");
      return;
    }

    if (role === "organizer" && !organizerForm.businessName.trim()) {
      setFormError("Business name is required for organizer signup.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError("");
      const response = await api.post("/auth/register", {
        name: userForm.name,
        email: userForm.email,
        phone: userForm.phone,
        password: userForm.password,
        role,
      });

      persistAuth(response.token, response.user);

      if (role === "organizer") {
        await api.post(
          "/organizers",
          {
            businessName: organizerForm.businessName,
          },
          {
            token: response.token,
          },
        );
      }

      await showSuccessAlert(
        "Account created",
        role === "organizer"
          ? "Your organizer account was created. Approval may still be pending."
          : "Your traveler account is ready.",
      );
      navigate(getDashboardPath(response.user?.role));
    } catch (error) {
      setFormError(error.message);
      await showErrorAlert("Signup failed", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <section className="relative overflow-hidden px-4 pb-16 pt-10">
        <div className="absolute inset-0 bg-linear-to-b from-primary/5 to-transparent" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1.1fr_1fr]">
          <aside className="overflow-hidden rounded-3xl bg-primary shadow-[0_20px_50px_rgba(1,45,29,0.25)]">
            <img
              src={campfireImage}
              alt="Campfire travelers"
              className="h-72 w-full object-cover md:h-80"
            />
            <div className="space-y-3 p-8 text-surface">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary-container">
                Verified Community
              </p>
              <h2 className="font-headline text-4xl font-extrabold leading-tight">
                Meet trusted travelers before you book.
              </h2>
              <p className="text-surface/85">
                Secure onboarding with identity checks, role-based profiles, and
                transparent trust metrics.
              </p>
            </div>
          </aside>

          <section className="rounded-3xl bg-surface-container-lowest p-8 shadow-[0_18px_45px_rgba(28,28,24,0.12)]">
            <div className="mb-6 flex gap-2 rounded-xl bg-surface-container-low p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 rounded-lg py-2 text-sm font-bold ${mode === "login" ? "bg-primary text-white" : "text-primary"}`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 rounded-lg py-2 text-sm font-bold ${mode === "signup" ? "bg-primary text-white" : "text-primary"}`}
              >
                Sign Up
              </button>
            </div>

            {formError ? (
              <div className="mb-4 rounded-xl bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container">
                {formError}
              </div>
            ) : null}

            {mode === "login" ? (
              <div>
                <h1 className="font-headline text-3xl font-extrabold text-primary">
                  Welcome Back
                </h1>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Continue your journey with BagPacker.
                </p>
                <form className="mt-6 space-y-4">
                  <input
                    className="w-full rounded-xl bg-surface-container-high px-4 py-3"
                    placeholder="Email"
                    type="email"
                    value={loginForm.email}
                    onChange={(e) =>
                      setLoginForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                  <input
                    className="w-full rounded-xl bg-surface-container-high px-4 py-3"
                    placeholder="Password"
                    type="password"
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    onClick={onLogin}
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-primary py-3 font-bold text-white"
                  >
                    {isSubmitting ? "Logging in..." : "Login"}
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <h2 className="font-headline text-3xl font-extrabold text-primary">
                  Join the Expedition
                </h2>
                <div className="mt-5 flex rounded-xl bg-surface-container-low p-1">
                  <button
                    type="button"
                    onClick={() => setRole("traveler")}
                    aria-pressed={role === "traveler"}
                    className={`flex-1 rounded-lg py-2 text-xs font-bold ${role === "traveler" ? "bg-secondary-container text-on-secondary-container" : "text-primary"}`}
                  >
                    TRAVELER
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("organizer")}
                    aria-pressed={role === "organizer"}
                    className={`flex-1 rounded-lg py-2 text-xs font-bold ${role === "organizer" ? "bg-secondary-container text-on-secondary-container" : "text-primary"}`}
                  >
                    ORGANIZER
                  </button>
                </div>

                <form className="mt-5 space-y-3">
                  <input
                    className="w-full rounded-xl bg-surface-container-high px-4 py-3"
                    placeholder="Full Name"
                    value={userForm.name}
                    onChange={(e) => updateUserField("name", e.target.value)}
                  />
                  <input
                    className="w-full rounded-xl bg-surface-container-high px-4 py-3"
                    placeholder="Phone Number"
                    value={userForm.phone}
                    onChange={(e) => updateUserField("phone", e.target.value)}
                  />
                  <input
                    className="w-full rounded-xl bg-surface-container-high px-4 py-3"
                    placeholder="Email Address"
                    type="email"
                    value={userForm.email}
                    onChange={(e) => updateUserField("email", e.target.value)}
                  />
                  <input
                    className="w-full rounded-xl bg-surface-container-high px-4 py-3"
                    placeholder="Create Password"
                    type="password"
                    value={userForm.password}
                    onChange={(e) =>
                      updateUserField("password", e.target.value)
                    }
                  />

                  <div className="grid gap-3 md:grid-cols-2">
                    <select
                      className="w-full rounded-xl bg-surface-container-high px-4 py-3"
                      value={roleLabel}
                      onChange={(e) => {
                        setRole(e.target.value);
                        updateUserField("role", e.target.value);
                      }}
                    >
                      <option value="traveler">Traveler</option>
                      <option value="organizer">Organizer</option>
                    </select>
                    <label className="flex items-center gap-2 rounded-xl bg-surface-container-high px-4 py-3 text-sm">
                      <input
                        type="checkbox"
                        checked={userForm.isVerified}
                        onChange={(e) =>
                          updateUserField("isVerified", e.target.checked)
                        }
                      />
                      Verified Account
                    </label>
                  </div>

                  {role === "organizer" ? (
                    <div className="space-y-3 rounded-xl bg-surface-container-low p-3">
                      <input
                        className="w-full rounded-xl bg-surface px-4 py-3"
                        placeholder="Business Name"
                        value={organizerForm.businessName}
                        onChange={(e) =>
                          setOrganizerForm((prev) => ({
                            ...prev,
                            businessName: e.target.value,
                          }))
                        }
                      />
                      <textarea
                        className="w-full rounded-xl bg-surface px-4 py-3"
                        rows={3}
                        placeholder="Business Description"
                        value={organizerForm.businessDesc}
                        onChange={(e) =>
                          setOrganizerForm((prev) => ({
                            ...prev,
                            businessDesc: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-xl bg-surface-container-low p-3">
                      <label className="flex items-center gap-2 rounded-xl bg-surface px-4 py-3 text-sm">
                        <input
                          type="checkbox"
                          checked={travelerForm.govIDVerified}
                          onChange={(e) =>
                            setTravelerForm((prev) => ({
                              ...prev,
                              govIDVerified: e.target.checked,
                            }))
                          }
                        />
                        Government ID Verified
                      </label>
                      <input
                        className="w-full rounded-xl bg-surface px-4 py-3"
                        placeholder="Travel Preferences"
                        value={travelerForm.preferences}
                        onChange={(e) =>
                          setTravelerForm((prev) => ({
                            ...prev,
                            preferences: e.target.value,
                          }))
                        }
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={onSignUp}
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-primary py-3 font-extrabold text-white"
                  >
                    {isSubmitting ? "Creating account..." : "Sign Up"}
                  </button>
                </form>
              </div>
            )}
          </section>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14">
        <h3 className="mb-5 text-center font-headline text-2xl font-bold text-primary">
          Verification Requirements
        </h3>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-surface-container-low p-6">
            <p className="font-headline text-xl font-bold text-primary">
              Phone Verification
            </p>
            <div className="mt-4 grid grid-cols-6 gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <input
                  key={index}
                  maxLength={1}
                  className="h-12 rounded-lg bg-surface text-center text-xl font-bold"
                />
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-surface-container-low p-6">
            <p className="font-headline text-xl font-bold text-primary">
              Government ID Upload
            </p>
            <div className="mt-4 rounded-xl border-2 border-dashed border-outline-variant p-10 text-center text-on-surface-variant">
              Upload Aadhaar, Passport, or Voter ID
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
