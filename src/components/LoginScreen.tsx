import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import "../login.css";
import LoginStory from "./LoginStory";

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onLogin();
  }
  return (
    <main className="login-screen">
      <LoginStory />
      <section className="login-content" aria-labelledby="login-title">
        <div className="login-signup">
          <span>Don’t have an account?</span>
          <button
            type="button"
            onClick={() =>
              setNotice(
                "Account registration is not connected in this demo. Use Explore demo to try the workspace.",
              )
            }
          >
            Sign up
          </button>
        </div>
        <div className="login-form-wrap">
          <h1 id="login-title">Log in</h1>
          <p className="login-welcome">
            Welcome back to your creative workspace.
          </p>
          <div className="login-socials">
            <button
              type="button"
              onClick={() =>
                setNotice(
                  "Apple sign-in is not connected yet. You can explore the demo below.",
                )
              }
            >
              <svg
                width="22"
                height="24"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M17.1 12.6c0-2 1.6-3 1.7-3.1-1-1.5-2.6-1.7-3.2-1.7-1.4-.2-2.7.8-3.4.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.7 1.1 8.9.8 1.1 1.6 2.2 2.8 2.1 1.1 0 1.6-.7 3-.7 1.4 0 1.8.7 3 .7 1.3 0 2-1.1 2.7-2.1.9-1.2 1.2-2.4 1.2-2.5-.1 0-2.3-.9-2.3-3.8ZM14.8 6.3c.6-.8 1.1-1.9 1-3-.9 0-2 .6-2.7 1.4-.6.7-1.2 1.8-1 2.9 1 .1 2-.5 2.7-1.3Z"
                />
              </svg>
              Continue with Apple
            </button>
            <button
              type="button"
              onClick={() =>
                setNotice(
                  "Google sign-in is not connected yet. You can explore the demo below.",
                )
              }
            >
              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z"
                />
                <path
                  fill="#34A853"
                  d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.6c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.7A10 10 0 0 0 12 22Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.4 13.9a6 6 0 0 1 0-3.8V7.4H3a10 10 0 0 0 0 9.2l3.4-2.7Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.4l3.4 2.7C7.2 7.8 9.4 6 12 6Z"
                />
              </svg>
              Continue with Google
            </button>
          </div>
          <div className="login-divider">
            <span>or</span>
          </div>
          <form onSubmit={submit}>
            <label className="login-field" htmlFor="login-email">
              Email
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="Enter email"
                required
              />
            </label>
            <label className="login-field" htmlFor="login-password">
              Password
              <div className="login-password">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </label>
            <div className="login-help">
              <button
                type="button"
                onClick={() =>
                  setNotice(
                    "Password recovery is not connected in this demo. No real account or password is needed to explore.",
                  )
                }
              >
                Forgot password?
              </button>
            </div>
            {notice && (
              <p className="login-notice" role="status">
                {notice}
              </p>
            )}
            <button className="login-submit" type="submit">
              Log in <ArrowRight size={17} />
            </button>
          </form>
          <p className="login-demo-note">
            Demo workspace · Use sample credentials.
            <br />
            Passwords are never stored or sent.
          </p>
          <button className="login-explore" type="button" onClick={onLogin}>
            Explore demo without logging in <ArrowRight size={15} />
          </button>
        </div>
        <footer className="login-footer">
          Fynd GlamAR · 3D Production Console
        </footer>
      </section>
    </main>
  );
}
