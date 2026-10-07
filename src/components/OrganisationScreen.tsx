import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import "../login.css";

export const organisations = ["GLAMAR", "WestElm", "Eyewa", "Swadesh", "Vision Express"];

export default function OrganisationScreen({
  onSelect,
  onBack,
  onLogout,
  hasWorkspace = true,
  currentOrganisation = "GLAMAR",
}: {
  onSelect: (organisation: string) => void;
  onBack: () => void;
  onLogout: () => void;
  hasWorkspace?: boolean;
  currentOrganisation?: string;
}) {
  return (
    <main className="organisation-screen">
        <nav className="organisation-navigation" aria-label="Account navigation">
          <button className="organisation-back" type="button" onClick={onBack}>
            <ArrowLeft size={15} />
            {hasWorkspace ? "Back to workspace" : "Back to login"}
          </button>
          <button className="button primary" type="button" onClick={onLogout}>
            Log out
          </button>
        </nav>
      <section className="organisation-selector" aria-labelledby="organisation-title">
        <header className="organisation-selector-heading">
          <div className="organisation-brand-mark"><img src="/brand/fynd-glamar-icon.svg" alt="GlamAR" /></div>
          <h1 id="organisation-title">Choose Organization</h1>
          <p>Select an organization to continue</p>
        </header>
          <ul className="organisation-list">
            {organisations.map((organisation) => <li key={organisation}>
              <button
                type="button"
                className="organisation-card"
                onClick={() => onSelect(organisation)}
              >
                <span className="organisation-card-copy">
                  <strong>{organisation === "GLAMAR" ? "GlamAR" : organisation}</strong>
                  {hasWorkspace && currentOrganisation === organisation && <span className="organisation-current">
                    <Check size={12} />
                    Current organisation
                  </span>}
                </span>
                <ArrowRight size={18} />
              </button>
            </li>)}
          </ul>
      </section>
    </main>
  );
}
