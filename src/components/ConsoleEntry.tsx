import { useState } from "react";
import App from "../App";
import LoginScreen from "./LoginScreen";
import OrganisationScreen, { organisations } from "./OrganisationScreen";

// A demo navigation gate, not authentication. Never persist credentials.
const sessionKey = "glamar.demo-session.v1";
const organisationKey = "glamar.demo-organisation.v1";
type EntryStep = "login" | "organisation" | "workspace";
function initialStep(): EntryStep {
  try {
    const session = sessionStorage.getItem(sessionKey);
    return session === "active" ? "workspace" : session === "select-organisation" ? "organisation" : "login";
  } catch {
    return "login";
  }
}
export default function ConsoleEntry() {
  const [step, setStep] = useState<EntryStep>(initialStep);
  const [hasWorkspace, setHasWorkspace] = useState(() => initialStep() === "workspace");
  const [organisation, setOrganisation] = useState(() => {
    try {
      const stored = sessionStorage.getItem(organisationKey);
      return stored && organisations.includes(stored) ? stored : "GLAMAR";
    } catch { return "GLAMAR"; }
  });
  function persist(value: string | null) {
    try {
      if (value) sessionStorage.setItem(sessionKey, value);
      else sessionStorage.removeItem(sessionKey);
    } catch {
      /* The demo still works when browser storage is unavailable. */
    }
  }
  function logout() {
    persist(null);
    setHasWorkspace(false);
    setStep("login");
  }
  if (step === "login") return <LoginScreen onLogin={() => {
    persist("select-organisation");
    setStep("organisation");
  }} />;
  return <>
    {hasWorkspace && <div hidden={step === "organisation"}>
      <App key={organisation} organisation={organisation} onLogout={logout} onChangeOrganisation={() => setStep("organisation")} />
    </div>}
    {step === "organisation" && <OrganisationScreen
      onSelect={(selected) => {
        setOrganisation(selected);
        try { sessionStorage.setItem(organisationKey, selected); } catch { /* Keep selection in memory. */ }
        persist("active"); setHasWorkspace(true); setStep("workspace");
      }}
      currentOrganisation={organisation}
      onBack={hasWorkspace ? () => setStep("workspace") : logout}
      hasWorkspace={hasWorkspace}
      onLogout={logout}
    />}
  </>;
}
