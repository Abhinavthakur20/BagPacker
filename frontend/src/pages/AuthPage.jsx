import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import campfireImage from "../assets/images/landing/story/HomeDesign.webp";
import { api } from "../lib/api";
import { showErrorAlert, showSuccessAlert } from "../lib/alerts";
import { getDashboardPath, loadGoogleScript } from "../lib/auth";
import { setAuth } from "../store/authSlice";

export default function AuthPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = useMemo(
    () => (searchParams.get("mode") === "signup" ? "signup" : "login"),
    [searchParams],
  );

  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState("traveler");
  const [signupStep, setSignupStep] = useState(1);

  useEffect(() => {
    setShowPassword(false);
    setSignupStep(1);
  }, [mode]);
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
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [googleButtonWidth, setGoogleButtonWidth] = useState(320);
  const googleButtonRef = useRef(null);
  const googleRoleRef = useRef(role);

  const roleLabel = role === "organizer" ? "organizer" : "traveler";

  useEffect(() => {
    googleRoleRef.current = role;
  }, [role]);

  useEffect(() => {
    const updateWidth = () => {
      if (googleButtonRef.current) {
        const containerWidth = googleButtonRef.current.parentElement.offsetWidth;
        setGoogleButtonWidth(Math.max(220, Math.min(360, containerWidth)));
      } else {
        const viewportWidth = window.innerWidth || 320;
        setGoogleButtonWidth(Math.max(220, Math.min(360, viewportWidth - 104)));
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

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

      dispatch(setAuth({ token: response.token, user: response.user }));
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
        businessName: role === "organizer" ? organizerForm.businessName : undefined,
        businessDesc: role === "organizer" ? organizerForm.businessDesc : undefined,
      });

      dispatch(setAuth({ token: response.token, user: response.user }));

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

  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleButtonRef.current || !googleClientId) {
      return undefined;
    }

    let isActive = true;

    const initializeGoogle = async () => {
      try {
        const google = await loadGoogleScript(googleClientId);
        if (!isActive || !googleButtonRef.current) return;

        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (!response?.credential) return;

            try {
              setIsSubmitting(true);
              setFormError("");

              const authResponse = await api.post("/auth/google", {
                credential: response.credential,
                role: googleRoleRef.current,
                businessName: googleRoleRef.current === "organizer" ? organizerForm.businessName : undefined,
                businessDesc: googleRoleRef.current === "organizer" ? organizerForm.businessDesc : undefined,
              });

              dispatch(setAuth({ token: authResponse.token, user: authResponse.user }));
              await showSuccessAlert("Welcome", "Signed in with Google.");
              navigate(getDashboardPath(authResponse.user?.role));
            } catch (error) {
              setFormError(error.message);
              await showErrorAlert("Google sign-in failed", error.message);
            } finally {
              setIsSubmitting(false);
            }
          },
        });

        google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          text: mode === "signup" ? "signup_with" : "signin_with",
          shape: "pill",
          width: googleButtonWidth,
        });
      } catch (error) {
        if (isActive) {
          setFormError(error.message);
        }
      }
    };

    initializeGoogle();

    const googleButtonEl = googleButtonRef.current;

    return () => {
      isActive = false;
      if (googleButtonEl) {
        googleButtonEl.innerHTML = "";
      }
    };
  }, [dispatch, googleButtonWidth, mode, navigate, organizerForm.businessDesc, organizerForm.businessName]);

  return (
    <MainLayout>
      <section className="relative isolate flex min-h-[calc(100dvh-4rem)] items-start justify-center overflow-x-hidden px-4 py-6 md:items-center md:py-10">
        <img
          src={campfireImage}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 blur-sm"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.92),rgba(248,250,252,0.96))]" />
        <div className="relative mx-auto w-full max-w-5xl rounded-3xl border border-outline-variant/20 bg-surface-container-lowest/95 p-3 shadow-[0_30px_70px_rgba(15,23,42,0.25)] backdrop-blur-sm md:p-5">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <aside className="hidden overflow-hidden rounded-2xl bg-primary shadow-[0_20px_50px_rgba(1,45,29,0.25)] lg:block">
              <img
                src={campfireImage}
                alt="Campfire travelers"
                className="h-64 w-full object-cover"
              />
              <div className="space-y-3 p-8 text-surface">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary-container">
                  Verified Community
                </p>
                <h2 className="font-headline text-2xl font-extrabold leading-tight">
                  Meet trusted travelers before you book.
                </h2>
                <p className="text-surface/85">
                  Secure onboarding with identity checks, role-based profiles, and
                  transparent trust metrics.
                </p>
              </div>
            </aside>

            <section className="rounded-2xl bg-surface p-6 shadow-[0_18px_45px_rgba(28,28,24,0.12)] md:p-8">
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
                  <h1 className="font-headline text-xl font-extrabold text-primary">
                    Welcome Back
                  </h1>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Continue your journey with BagPacker.
                  </p>
                  <form className="mt-6 space-y-4">
                    <input
                      className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-high px-4 py-3 outline-none transition focus:border-primary"
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
                    <div className="relative">
                      <input
                        className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-high px-4 py-3 pr-12 outline-none transition focus:border-primary"
                        placeholder="Password"
                        type={showPassword ? "text" : "password"}
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
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-on-surface-variant/70 transition hover:text-primary"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={onLogin}
                      disabled={isSubmitting}
                      className="w-full rounded-xl bg-primary py-3 font-bold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSubmitting ? "Logging in..." : "Login"}
                    </button>
                  </form>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-headline text-xl font-extrabold text-primary">
                        Join the Expedition
                      </h2>
                      <p className="mt-0.5 text-sm text-on-surface-variant">
                        Step {signupStep} of 2 — {signupStep === 1 ? "Basic Info" : "Profile Setup"}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-black text-primary">
                      {signupStep}/2
                    </span>
                  </div>

                  {/* Step progress bar */}
                  <div className="mt-4 flex gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-outline-variant/15">
                      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: "100%" }} />
                    </div>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-outline-variant/15">
                      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: signupStep >= 2 ? "100%" : "0%" }} />
                    </div>
                  </div>

                  <form className="mt-5 space-y-3">
                    {signupStep === 1 ? (
                      /* ── Step 1: Basic Info ── */
                      <>
                        <input
                          className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-high px-4 py-3 outline-none transition focus:border-primary"
                          placeholder="Full Name"
                          value={userForm.name}
                          onChange={(e) => updateUserField("name", e.target.value)}
                        />
                        <input
                          className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-high px-4 py-3 outline-none transition focus:border-primary"
                          placeholder="Phone Number"
                          value={userForm.phone}
                          onChange={(e) => updateUserField("phone", e.target.value)}
                        />
                        <input
                          className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-high px-4 py-3 outline-none transition focus:border-primary"
                          placeholder="Email Address"
                          type="email"
                          value={userForm.email}
                          onChange={(e) => updateUserField("email", e.target.value)}
                        />
                        <div className="relative">
                          <input
                            className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-high px-4 py-3 pr-12 outline-none transition focus:border-primary"
                            placeholder="Create Password"
                            type={showPassword ? "text" : "password"}
                            value={userForm.password}
                            onChange={(e) => updateUserField("password", e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-on-surface-variant/70 transition hover:text-primary"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              {showPassword ? "visibility_off" : "visibility"}
                            </span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!userForm.name || !userForm.phone || !userForm.email || !userForm.password) {
                              setFormError("Please fill all fields before continuing.");
                              return;
                            }
                            setFormError("");
                            setSignupStep(2);
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-extrabold text-white transition hover:brightness-105"
                        >
                          Next
                          <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        </button>
                      </>
                    ) : (
                      /* ── Step 2: Profile Setup ── */
                      <>
                        <div className="flex rounded-xl bg-surface-container-low p-1">
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

                        <div className="grid gap-3 md:grid-cols-2">
                          <select
                            className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-high px-4 py-3 outline-none transition focus:border-primary"
                            value={roleLabel}
                            onChange={(e) => {
                              setRole(e.target.value);
                              updateUserField("role", e.target.value);
                            }}
                          >
                            <option value="traveler">Traveler</option>
                            <option value="organizer">Organizer</option>
                          </select>
                          <label className="flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-high px-4 py-3 text-sm">
                            <input
                              type="checkbox"
                              checked={userForm.isVerified}
                              onChange={(e) => updateUserField("isVerified", e.target.checked)}
                            />
                            Verified Account
                          </label>
                        </div>

                        {role === "organizer" ? (
                          <div className="space-y-3 rounded-xl bg-surface-container-low p-3">
                            <input
                              className="w-full rounded-xl border border-outline-variant/30 bg-surface px-4 py-3 outline-none transition focus:border-primary"
                              placeholder="Business Name"
                              value={organizerForm.businessName}
                              onChange={(e) =>
                                setOrganizerForm((prev) => ({ ...prev, businessName: e.target.value }))
                              }
                            />
                            <textarea
                              className="w-full rounded-xl border border-outline-variant/30 bg-surface px-4 py-3 outline-none transition focus:border-primary"
                              rows={3}
                              placeholder="Business Description"
                              value={organizerForm.businessDesc}
                              onChange={(e) =>
                                setOrganizerForm((prev) => ({ ...prev, businessDesc: e.target.value }))
                              }
                            />
                          </div>
                        ) : (
                          <div className="space-y-3 rounded-xl bg-surface-container-low p-3">
                            <label className="flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface px-4 py-3 text-sm">
                              <input
                                type="checkbox"
                                checked={travelerForm.govIDVerified}
                                onChange={(e) =>
                                  setTravelerForm((prev) => ({ ...prev, govIDVerified: e.target.checked }))
                                }
                              />
                              Government ID Verified
                            </label>
                            <input
                              className="w-full rounded-xl border border-outline-variant/30 bg-surface px-4 py-3 outline-none transition focus:border-primary"
                              placeholder="Travel Preferences"
                              value={travelerForm.preferences}
                              onChange={(e) =>
                                setTravelerForm((prev) => ({ ...prev, preferences: e.target.value }))
                              }
                            />
                          </div>
                        )}

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => { setSignupStep(1); setFormError(""); }}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-outline-variant/30 py-3 font-bold text-primary transition hover:bg-surface-container-highest"
                          >
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                            Back
                          </button>
                          <button
                            type="button"
                            onClick={onSignUp}
                            disabled={isSubmitting}
                            className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-primary py-3 font-extrabold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {isSubmitting ? "Creating account..." : "Create Account"}
                            {!isSubmitting && <span className="material-symbols-outlined text-lg">check</span>}
                          </button>
                        </div>
                      </>
                    )}
                  </form>
                </div>
              )}

              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-outline-variant/40" />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
                    or continue with
                  </span>
                  <div className="h-px flex-1 bg-outline-variant/40" />
                </div>
                <div
                  ref={googleButtonRef}
                  className="flex min-h-11 w-full items-center justify-center overflow-hidden"
                />
              </div>
            </section>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
