import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  BarChart3,
  Bell,
  Box,
  Boxes,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock,
  Command,
  Inbox,
  Cuboid,
  LayoutGrid,
  List,
  LoaderCircle,
  Plus,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ConsoleStatus, Product, Role, Status } from "./lib/types";
import { productStatusLabel, productStatusOptions } from "./lib/productStatus";
import { repository } from "./lib/repository";
import { team } from "./lib/seed";
import type { Action } from "./lib/workflow";
import {
  Avatar,
  Empty,
  Modal,
  ProductImage,
  SearchField,
  StatusBadge,
  Toast,
} from "./components/UI";
import { GlamARLogo, BrandButton } from "./components/Brand";
import ProductTable from "./components/ProductTable";
import SortMenu from "./components/SortMenu";
import ProfileMenu from "./components/ProfileMenu";
import ImportProducts from "./components/ImportProducts";
import ImportProductsMenu from "./components/ImportProductsMenu";
import AddSingleProduct from "./components/AddSingleProduct";
import TaskDetail from "./components/TaskDetail";
import BatchGeneration from "./components/BatchGeneration";
import GenerationWorkspace from "./components/GenerationWorkspace";
import GenerationSelectionModal from "./components/GenerationSelectionModal";
import GenerationStartModal from "./components/GenerationStartModal";
import GenerationSettingsModal from "./components/GenerationSettingsModal";
import { defaultModelGenerationSettings, saveBatchModelGenerationSettings } from "./lib/modelGenerationSettings";
import { prepareManualProducts } from "./lib/manualGeneration";
import GenerationBatch, {
  GenerationBatchHeader,
} from "./components/GenerationBatch";
import {
  emptyGenerationSelection,
  generationSelectionReducer,
  selectedProducts,
} from "./lib/generationSelection";
const ModelViewer = lazy(() => import("./components/ModelViewer"));
type Page =
  | "Dashboard"
  | "3D Generation"
  | "Products"
  | "Batch Render"
  | "My Tasks"
  | "Unassigned"
  | "In Review"
  | "Completed"
  | "Team"
  | "Reports"
  | "Settings"
  | "Batches";
type Filters = {
  status: string;
  category: string;
  brand: string;
  assigneeId: string;
  batchId: string;
  reviewStatus: string;
  date: string;
  priority: string;
};
const blankFilters: Filters = {
  status: "",
  category: "",
  brand: "",
  assigneeId: "",
  batchId: "",
  reviewStatus: "",
  date: "",
  priority: "",
};
const nav: { page: Page; icon: LucideIcon }[] = [
  { page: "Dashboard", icon: Cuboid },
  { page: "3D Generation", icon: Sparkles },
];
const pageText: Record<Page, [string, string]> = {
  "3D Generation": ["3D Generation", ""],
  "Batch Render": [
    "3D AI Batch Render",
    "Generate and review multiple 3D models from product references.",
  ],
  Dashboard: ["Catalog Overview", "West Elm"],
  Products: [
    "All products",
    "Browse, manage, and track your product inventory.",
  ],
  "My Tasks": [
    "My workspace",
    "Manage your assigned products and production progress.",
  ],
  Unassigned: ["Available Tasks", "Choose a product and start working."],
  "In Review": [
    "Ready for review",
    "Review submitted models and share corrections.",
  ],
  Completed: ["Completed models", "Browse approved and completed 3D models."],
  Team: ["Your production team", "Manage your production team and workload."],
  Reports: ["Production insights", "A clear picture of your team’s progress."],
  Settings: ["Workspace settings", "Manage workspace preferences and access."],
  Batches: ["Production batches", "Keep every collection moving forward."],
};
function loadRole(): Role {
  return (sessionStorage.getItem("modello.role") as Role) || "Admin / Manager";
}
export default function App({
  organisation = "GLAMAR",
  onLogout,
  onChangeOrganisation,
}: {
  organisation?: string;
  onLogout?: () => void;
  onChangeOrganisation?: () => void;
}) {
  const [db, setDb] = useState(() => repository.read());
  const [role, setRole] = useState<Role>(loadRole);
  const [userId, setUserId] = useState(
    () => sessionStorage.getItem("modello.user") || "maninder",
  );
  const [page, setPage] = useState<Page>("Dashboard");
  const [publishedProductId, setPublishedProductId] = useState<string>();
  const [generationFlow, generationDispatch] = useReducer(
    generationSelectionReducer,
    emptyGenerationSelection,
  );
  const [generationSelectionOpen, setGenerationSelectionOpen] = useState(false);
  const [generationStartOpen, setGenerationStartOpen] = useState(false);
  const [generationSettingsOpen, setGenerationSettingsOpen] = useState(false);
  const [generationBatchSettings, setGenerationBatchSettings] = useState({ ...defaultModelGenerationSettings });
  const [generationSource, setGenerationSource] = useState<
    "catalog" | "manual"
  >("catalog");
  const [generationBatchFilter, setGenerationBatchFilter] = useState("");
  const [generationSearch, setGenerationSearch] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(blankFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState("Recently added");
  const [grid, setGrid] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<Product | null>(null);
  const [importing, setImporting] = useState(false);
  const [addingSingle, setAddingSingle] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const [notifications, setNotifications] = useState(false);
  const [help, setHelp] = useState(false);
  const [batchModal, setBatchModal] = useState(false);
  const [batchName, setBatchName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const user = team.find((t) => t.id === userId) || team[0];
  const products = db.products;
  const generationSelected = useMemo(
    () => selectedProducts(generationFlow.selectedProductIds, products),
    [generationFlow.selectedProductIds, products],
  );
  const generationBatch = useMemo(
    () => selectedProducts(generationFlow.batchProductIds, products),
    [generationFlow.batchProductIds, products],
  );
  const generationActive = generationBatch.find(
    (product) => product.id === generationFlow.activeProductId,
  );
  const toggleGenerationProduct = useCallback(
    (id: string) => generationDispatch({ type: "toggle", id, products }),
    [products],
  );
  const openGenerationProduct = useCallback(
    (id: string) => generationDispatch({ type: "open", id }),
    [],
  );
  const activeProduct = products.find((p) => p.id === selected);
  const count = (s: string) =>
    products.filter(
      (p) => productStatusLabel(p.status) === productStatusLabel(s),
    ).length;
  useEffect(() => {
    const refresh = () => setDb(repository.read());
    window.addEventListener("storage", refresh);
    window.addEventListener("modello-update", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("modello-update", refresh);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(timer);
  }, [toast]);
  const notify = (message: string, error = false) =>
    setToast({ message, error });
  function navigate(next: Page, filter: Partial<Filters> = {}) {
    setPublishedProductId(undefined);
    setPage(next);
    setFilters({ ...blankFilters, ...filter });
    setSelected(null);
    setQuery("");
    setMenuOpen(false);
  }
  function changeRole(value: Role) {
    setRole(value);
    sessionStorage.setItem("modello.role", value);
    navigate(
      value === "3D Artist"
        ? "My Tasks"
        : value === "Reviewer"
          ? "In Review"
          : "Dashboard",
    );
    notify(`Demo role switched to ${value}`);
  }
  async function update(id: string, action: Action) {
    await repository.update(id, action, userId, role);
    if (action.type !== "save" || action.modelUrl !== undefined)
      notify(
        action.type === "claim"
          ? "Task claimed successfully"
          : action.type === "submit"
            ? "Model submitted for review"
            : action.type === "approve"
              ? "Model approved. Task completed!"
              : action.type === "correct"
                ? "Corrections sent to the artist"
                : action.type === "save"
                  ? "Model URL saved"
                  : "Task updated",
      );
  }
  async function claim(p: Product) {
    try {
      await update(p.id, { type: "claim" });
    } catch (e) {
      notify((e as Error).message, true);
    }
  }
  async function copy(value: string, kind: "url" | "uid" = "url") {
    try {
      await navigator.clipboard.writeText(
        kind === "uid" ? value : new URL(value, location.origin).href,
      );
      notify(kind === "uid" ? "Product UID copied" : "Model URL copied");
    } catch {
      notify(
        `Clipboard is unavailable. Copy the ${kind === "uid" ? "Product UID" : "URL"} from the task.`,
        true,
      );
    }
  }
  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (page === "My Tasks" && p.assigneeId !== userId) return false;
      if (
        page === "My Tasks" &&
        filters.priority === "High" &&
        p.status === "Completed"
      )
        return false;
      if (page === "Unassigned" && p.status !== "Available") return false;
      if (
        page === "In Review" &&
        !["In Review", "Submitted", "Approved"].includes(p.status)
      )
        return false;
      if (page === "Completed" && p.status !== "Completed") return false;
      const assignee =
        team.find((t) => t.id === p.assigneeId)?.name || "Unassigned";
      if (
        query &&
        !`${p.name} ${p.sku} ${p.brand} ${p.category} ${assignee} ${p.batchId} ${productStatusLabel(p.status)}`
          .toLowerCase()
          .includes(query.toLowerCase())
      )
        return false;
      return Object.entries(filters).every(
        ([key, value]) =>
          !value ||
          (key === "status"
            ? productStatusLabel(p.status) === productStatusLabel(value)
            : key === "date"
              ? p.createdAt.slice(0, 10) >= value
              : key === "assigneeId" && value === "unassigned"
                ? !p.assigneeId
                : p[key as keyof Product] === value),
      );
    });
    return [...list].sort((a, b) =>
      sort === "Oldest"
        ? a.createdAt.localeCompare(b.createdAt)
        : sort === "Priority"
          ? Number(b.priority === "High") - Number(a.priority === "High")
          : sort === "Status"
            ? productStatusLabel(a.status).localeCompare(
                productStatusLabel(b.status),
              )
            : sort === "Category"
              ? a.category.localeCompare(b.category)
              : sort === "Recently assigned"
                ? (b.claimedAt || "").localeCompare(a.claimedAt || "")
                : b.createdAt.localeCompare(a.createdAt),
    );
  }, [products, page, userId, query, filters, sort]);
  const filterCount = Object.values(filters).filter(Boolean).length;
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page, selected]);
  const cards: {
    label: string;
    status: string;
    icon: LucideIcon;
    className: string;
  }[] = [
    {
      label: "Total Products",
      status: "",
      icon: Boxes,
      className: "neutral",
    },
    {
      label: "To do",
      status: "Available",
      icon: Inbox,
      className: "blue",
    },
    {
      label: "In Progress",
      status: "In Progress",
      icon: LoaderCircle,
      className: "amber",
    },
    {
      label: "Review",
      status: "In Review",
      icon: Box,
      className: "purple",
    },
    {
      label: "Hold",
      status: "On Hold",
      icon: Box,
      className: "red",
    },
    {
      label: "Done",
      status: "Completed",
      icon: CheckCheck,
      className: "green",
    },
  ];
  function downloadReport() {
    const rows = [
      ["Product", "SKU", "Status", "Assignee", "Batch", "Brand"],
      ...filtered.map((p) => [
        p.name,
        p.sku,
        productStatusLabel(p.status),
        team.find((t) => t.id === p.assigneeId)?.name || "",
        p.batchId,
        p.brand,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map(
            (v) =>
              '"' +
              (/^[=+@-]/.test(v) ? "'" : "") +
              v.replaceAll('"', '""') +
              '"',
          )
          .join(","),
      )
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "glamar-production-report.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    notify("Production report exported");
  }
  const tableProps = {
    catalogEmpty: products.length === 0,
    products: filtered,
    onConsoleStatusChange: async (ids: string[], status: ConsoleStatus) => {
      await repository.setConsoleStatus(ids, status, role);
      notify(
        `${ids.length} ${ids.length === 1 ? "product" : "products"} ${status === "Published" ? "published" : "unpublished"}`,
      );
    },
    onOpen: (p: Product) => setSelected(p.id),
    onDelete: async (p: Product) => {
      await repository.remove(p.id, role);
      notify("Product deleted");
    },
    onPreview: setPreview,
    onCopy: copy,
    role,
    userId,
  };
  function filterBar() {
    return (
      <>
        <div className="filter-toolbar">
          <SearchField value={query} onChange={setQuery} />
          <div className="row toolbar-options">
            <button
              className={`button secondary small-button ${showFilters ? "selected" : ""}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal size={15} />
              Filters
              {filterCount > 0 && <span className="count">{filterCount}</span>}
            </button>
            <SortMenu value={sort} onChange={setSort} />
            {page === "Unassigned" && (
              <div className="view-toggle">
                <button
                  className={grid ? "active" : ""}
                  onClick={() => setGrid(true)}
                  aria-label="Grid view"
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  className={!grid ? "active" : ""}
                  onClick={() => setGrid(false)}
                  aria-label="List view"
                >
                  <List size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
        {showFilters && (
          <div className="filter-options">
            {(
              [
                {
                  key: "status",
                  name: "Status",
                  options: productStatusOptions,
                },
                {
                  key: "category",
                  name: "Category",
                  options: [...new Set(products.map((p) => p.category))],
                },
                {
                  key: "brand",
                  name: "Brand",
                  options: [...new Set(products.map((p) => p.brand))],
                },
                {
                  key: "assigneeId",
                  name: "Assignee",
                  options: [
                    { value: "unassigned", label: "Unassigned" },
                    ...team.map((t) => ({ value: t.id, label: t.name })),
                  ],
                },
                {
                  key: "batchId",
                  name: "Batch",
                  options: db.batches.map((b) => ({
                    value: b.id,
                    label: b.name,
                  })),
                },
                {
                  key: "reviewStatus",
                  name: "Review",
                  options: [...new Set(products.map((p) => p.reviewStatus))],
                },
              ] as const
            ).map((f) => (
              <label key={f.key}>
                {f.name}
                <select
                  aria-label={`Filter ${f.name}`}
                  value={filters[f.key]}
                  onChange={(e) =>
                    setFilters({ ...filters, [f.key]: e.target.value })
                  }
                >
                  <option value="">All</option>
                  {f.options.map((o) =>
                    typeof o === "string" ? (
                      <option key={o}>{o}</option>
                    ) : (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ),
                  )}
                </select>
              </label>
            ))}
            <label>
              Date added after
              <input
                type="date"
                aria-label="Date added after"
                value={filters.date}
                onChange={(e) =>
                  setFilters({ ...filters, date: e.target.value })
                }
              />
            </label>
          </div>
        )}
        {filterCount > 0 && (
          <div className="filter-chips">
            {Object.entries(filters)
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setFilters({ ...filters, [k]: "" })}
                >
                  {k === "assigneeId"
                    ? team.find((t) => t.id === v)?.name || v
                    : k === "batchId"
                      ? `Batch #${v}`
                      : v}
                  <X size={12} />
                </button>
              ))}
            <button
              className="clear-filters"
              onClick={() => setFilters(blankFilters)}
            >
              Clear filters
            </button>
          </div>
        )}
      </>
    );
  }
  function teamCards() {
    return (
      <div className="team-grid">
        {team.map((member) => {
          const tasks = products.filter((p) => p.assigneeId === member.id);
          const active = tasks.filter((p) =>
            ["In Progress", "Corrections Required", "Claimed"].includes(
              p.status,
            ),
          ).length;
          return (
            <button
              className="panel team-card"
              key={member.id}
              onClick={() => navigate("Products", { assigneeId: member.id })}
            >
              <div className="row between">
                <Avatar member={member} />
                <span
                  className={`presence ${member.status === "Online" ? "online" : ""}`}
                >
                  {member.status}
                </span>
              </div>
              <h3>{member.name}</h3>
              <p>{member.role}</p>
              <div className="team-stats">
                <span>
                  <b>{tasks.length}</b>Assigned
                </span>
                <span>
                  <b>{active}</b>In progress
                </span>
                <span>
                  <b>{tasks.filter((p) => p.status === "Completed").length}</b>
                  Done
                </span>
              </div>
              <div className="team-meta">
                <span>
                  {tasks.filter((p) => p.status === "In Review").length} in
                  review
                </span>
                <span>
                  {
                    tasks.filter((p) => p.status === "Corrections Required")
                      .length
                  }{" "}
                  corrections
                </span>
              </div>
              <div className="capacity">
                <div className="progress-track">
                  <span
                    style={{ width: `${Math.min((active / 8) * 100, 100)}%` }}
                  />
                </div>
                <span>
                  {active < 6 ? "Available capacity" : "Near capacity"}
                  <ArrowRight size={14} />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div
      className="app-shell fynd-console"
    >
      <aside className={`sidebar ${menuOpen ? "mobile-open" : ""}`}>
        <nav>
          {nav.map(({ page: p, icon: Icon }) => {
            const badge =
              p === "Unassigned"
                ? count("Available")
                : p === "In Review"
                  ? count("In Review")
                  : p === "My Tasks"
                    ? products.filter(
                        (t) =>
                          t.assigneeId === userId &&
                          !["Completed", "Approved"].includes(t.status),
                      ).length
                    : 0;
            const isActive =
              generationSelectionOpen || generationStartOpen || generationSettingsOpen
                ? p === "3D Generation"
                : page === p;
            return (
              <button
                key={p}
                title={p === "Dashboard" ? "3D Assets" : p}
                aria-current={isActive ? "page" : undefined}
                className={`nav-item ${isActive ? "active" : ""} ${p === "Team" ? "nav-separated" : ""}`}
                onClick={() => {
                  if (p === "3D Generation") {
                    setGenerationStartOpen(true);
                    setMenuOpen(false);
                  } else navigate(p);
                }}
              >
                <Icon size={18} strokeWidth={1.6} />
                <span>{p === "Dashboard" ? "3D Assets" : p}</span>
                {badge > 0 && (
                  <span
                    className={`nav-count ${p === "In Review" ? "review-count" : ""}`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="nav-item help-link"
            title="Help & getting started"
            onClick={() => setHelp(true)}
          >
            <CircleHelp size={20} />
            <span>Help</span>
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-brand-group">
            <a
              className="brand"
              aria-label="Fynd GlamAR · 3D Production Console"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                navigate("Dashboard");
              }}
            >
              <GlamARLogo />
            </a>
          </div>
          <button
            className="mobile-menu icon-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation"
          >
            <List size={21} />
          </button>
          <div className="topbar-actions">
            <button
              className="icon-button topbar-help"
              aria-label="Help & getting started"
              onClick={() => setHelp(true)}
            >
              <CircleHelp size={19} />
            </button>
            <button
              className="notification-button icon-button"
              aria-label="Notifications"
              onClick={() => setNotifications(!notifications)}
            >
              <Bell size={18} />
              <i />
            </button>
            <ProfileMenu
              user={user}
              onChangeOrganisation={onChangeOrganisation}
              onLogout={onLogout}
            />
          </div>
          {notifications && (
            <div className="notification-panel panel">
              <div className="section-title">
                <h3>Workspace updates</h3>
                <button
                  className="icon-button"
                  onClick={() => setNotifications(false)}
                  aria-label="Close notifications"
                >
                  <X size={16} />
                </button>
              </div>
              {products
                .filter((p) =>
                  ["In Review", "Corrections Required"].includes(p.status),
                )
                .slice(0, 4)
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelected(p.id);
                      setNotifications(false);
                    }}
                  >
                    <span className="notification-dot" />
                    <span>
                      <strong>{p.name}</strong>
                      <small>
                        {p.status === "In Review"
                          ? "A model is ready for review"
                          : "An artist has feedback to resolve"}
                      </small>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                ))}
              {!products.some((p) =>
                ["In Review", "Corrections Required"].includes(p.status),
              ) && <p>You’re all caught up.</p>}
            </div>
          )}
        </header>
        <main
          className={
            page === "3D Generation" && !activeProduct
              ? "generation-page"
              : undefined
          }
        >
          {activeProduct ? (
            <TaskDetail
              key={activeProduct.id}
              product={activeProduct}
              role={role}
              userId={userId}
              batches={db.batches}
              onBack={() => setSelected(null)}
              onUpdate={(a) => update(activeProduct.id, a)}
              onPublish={async () => {
                await tableProps.onConsoleStatusChange([activeProduct.id], "Published");
                navigate("Dashboard");
                setPublishedProductId(activeProduct.id);
              }}
              onCopy={copy}
            />
          ) : (
            <>
              {page !== "3D Generation" && (
                <div
                  className={`page-heading${page === "Dashboard" ? " catalog-heading" : ""}`}
                >
                  <div>
                    <div className="eyebrow">
                      {page === "Dashboard"
                        ? "YOUR STUDIO, AT A GLANCE"
                        : page === "Unassigned"
                          ? "PICK YOUR NEXT PROJECT"
                          : "GLAMAR WORKSPACE"}
                    </div>
                    <h1>{pageText[page][0]}</h1>
                    {page === "Dashboard" ? <p>{organisation === "GLAMAR" ? "GlamAR" : organisation}</p> : pageText[page][1] && <p>{pageText[page][1]}</p>}
                  </div>
                  <div className="row heading-actions">
                    {role === "Admin / Manager" &&
                      ![
                        "Settings",
                        "Team",
                        "Batch Render",
                        "3D Generation",
                      ].includes(page) && (
                        <ImportProductsMenu onSingle={() => setAddingSingle(true)} onBulk={() => setImporting(true)} />
                      )}
                    {page === "Team" && (
                      <button
                        className="button secondary"
                        onClick={() => navigate("Reports")}
                      >
                        <BarChart3 size={16} />
                        View workload
                      </button>
                    )}
                  </div>
                </div>
              )}
              {page === "Dashboard" && (
                <>
                  <div className="kpi-grid">
                    {cards.map(({ label, status }) => (
                      <button
                        className="kpi-card"
                        key={label}
                        onClick={() => setFilters({ ...blankFilters, status })}
                      >
                        <div className="kpi-top">
                          {status ? (
                            <StatusBadge status={status} />
                          ) : (
                            <span>{label}</span>
                          )}
                        </div>
                        <div className="kpi-value">
                          {status ? count(status) : products.length}
                        </div>
                      </button>
                    ))}
                  </div>
                  <section className="panel products-panel">
                    <div className="section-title table-title">
                      <div>
                        <h3>Product overview</h3>
                      </div>
                    </div>
                    <div className="table-tabs">
                      <button
                        className={!filters.status ? "active" : ""}
                        onClick={() => setFilters(blankFilters)}
                      >
                        All products<span>{products.length}</span>
                      </button>
                      <button
                        className={
                          filters.status === "Available" ? "active" : ""
                        }
                        onClick={() =>
                          setFilters({ ...blankFilters, status: "Available" })
                        }
                      >
                        To do<span>{count("Available")}</span>
                      </button>
                      <button
                        className={
                          filters.status === "In Progress" ? "active" : ""
                        }
                        onClick={() =>
                          setFilters({ ...blankFilters, status: "In Progress" })
                        }
                      >
                        In Progress<span>{count("In Progress")}</span>
                      </button>
                      <button
                        className={
                          filters.status === "In Review" ? "active" : ""
                        }
                        onClick={() =>
                          setFilters({ ...blankFilters, status: "In Review" })
                        }
                      >
                        Review<span>{count("In Review")}</span>
                      </button>
                      <button
                        className={filters.status === "On Hold" ? "active" : ""}
                        onClick={() =>
                          setFilters({ ...blankFilters, status: "On Hold" })
                        }
                      >
                        Hold<span>{count("On Hold")}</span>
                      </button>
                      <button
                        className={
                          filters.status === "Completed" ? "active" : ""
                        }
                        onClick={() =>
                          setFilters({ ...blankFilters, status: "Completed" })
                        }
                      >
                        Done<span>{count("Completed")}</span>
                      </button>
                      <div className="table-tab-spacer" />
                    </div>
                    <div className="filter-toolbar">
                      <SearchField value={query} onChange={setQuery} />
                    </div>
                    <ProductTable {...tableProps} compact
                      initialConsoleFilter={publishedProductId ? "Published" : "All"}
                      initialProductId={publishedProductId} />
                  </section>
                </>
              )}
              {[
                "Products",
                "My Tasks",
                "Unassigned",
                "In Review",
                "Completed",
              ].includes(page) && (
                <>
                  {page === "My Tasks" && (
                    <div className="my-summary">
                      {[
                        {
                          label: "Active",
                          check: (p: Product) =>
                            ["In Progress", "Claimed"].includes(p.status),
                          filter: "In Progress",
                        },
                        {
                          label: "High priority",
                          check: (p: Product) =>
                            p.priority === "High" && p.status !== "Completed",
                          filter: "",
                        },
                        {
                          label: "Submitted",
                          check: (p: Product) =>
                            ["In Review", "Submitted"].includes(p.status),
                          filter: "In Review",
                        },
                        {
                          label: "Corrections",
                          check: (p: Product) =>
                            p.status === "Corrections Required",
                          filter: "Corrections Required",
                        },
                        {
                          label: "Done",
                          check: (p: Product) => p.status === "Completed",
                          filter: "Completed",
                        },
                      ].map((c) => (
                        <button
                          className="panel"
                          key={c.label}
                          onClick={() => {
                            setFilters({
                              ...blankFilters,
                              status: c.filter,
                              priority:
                                c.label === "High priority" ? "High" : "",
                            });
                            if (c.label === "High priority")
                              setSort("Priority");
                          }}
                        >
                          <span>{c.label}</span>
                          <strong>
                            {
                              products.filter(
                                (p) => p.assigneeId === userId && c.check(p),
                              ).length
                            }
                          </strong>
                        </button>
                      ))}
                    </div>
                  )}
                  {page === "Products" && filters.batchId && (
                    <section className="panel batch-detail-banner">
                      <div>
                        <div className="eyebrow">BATCH PROGRESS</div>
                        <h2>
                          {db.batches.find((b) => b.id === filters.batchId)
                            ?.name || filters.batchId}
                        </h2>
                      </div>
                      <div className="batch-detail-stats">
                        {[
                          "Total",
                          "Available",
                          "In Progress",
                          "In Review",
                          "Completed",
                        ].map((s) => (
                          <span key={s}>
                            <strong>
                              {
                                products.filter(
                                  (p) =>
                                    p.batchId === filters.batchId &&
                                    (s === "Total" || p.status === s),
                                ).length
                              }
                            </strong>
                            {s}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}
                  {page === "Unassigned" && (
                    <div className="available-intro">
                      <span className="intro-icon">
                        <Sparkles size={23} />
                      </span>
                      <div>
                        <strong>Your next project is one click away.</strong>
                        <p>
                          Claim a product to add it to your workspace. Make it
                          yours, then make it exceptional.
                        </p>
                      </div>
                      <span className="available-count">
                        {count("Available")} available
                      </span>
                    </div>
                  )}
                  <section
                    className={`panel products-panel ${page === "Unassigned" && grid ? "marketplace-panel" : ""}`}
                  >
                    <div className="section-title table-title">
                      <h3>
                        {page === "Products"
                          ? "Product library"
                          : page === "My Tasks"
                            ? "Your tasks"
                            : page === "Unassigned"
                              ? "Find your next creation"
                              : page === "In Review"
                                ? "Review queue"
                                : "Model library"}{" "}
                        <span className="count">{filtered.length}</span>
                      </h3>
                      <div className="row">
                        {page === "Products" && (
                          <button
                            className="text-button"
                            onClick={() => navigate("Batches")}
                          >
                            Browse batches
                            <ChevronRight size={14} />
                          </button>
                        )}
                        <button
                          className="icon-button"
                          title="Export products"
                          onClick={downloadReport}
                        >
                          <ArrowDownToLine size={16} />
                        </button>
                      </div>
                    </div>
                    {filterBar()}
                    {page === "Unassigned" && grid ? (
                      <div className="marketplace-grid">
                        {filtered.length ? (
                          filtered.map((p) => (
                            <article className="task-card" key={p.id}>
                              <button
                                className="task-card-image"
                                onClick={() => setSelected(p.id)}
                              >
                                <ProductImage product={p} />
                                <span className="difficulty-tag">
                                  {p.difficulty}
                                </span>
                                {p.priority === "High" && (
                                  <span className="priority-tag">Priority</span>
                                )}
                              </button>
                              <div className="task-card-body">
                                <div className="row between">
                                  <span className="brand-label">{p.brand}</span>
                                  <span className="muted">#{p.batchId}</span>
                                </div>
                                <button
                                  className="task-name"
                                  onClick={() => setSelected(p.id)}
                                >
                                  {p.name}
                                </button>
                                <p>
                                  {p.category}
                                  <span>·</span>
                                  {p.sku}
                                </p>
                                <footer>
                                  <StatusBadge status="Available" />
                                  {role !== "Reviewer" && (
                                    <button
                                      className="claim-button"
                                      onClick={() => claim(p)}
                                    >
                                      Claim Task
                                      <ArrowRight size={14} />
                                    </button>
                                  )}
                                </footer>
                              </div>
                            </article>
                          ))
                        ) : (
                          <Empty
                            title={
                              query || filterCount
                                ? "No matching products"
                                : "All available products have been claimed"
                            }
                            text={
                              query || filterCount
                                ? "Try a different search or clear your filters."
                                : "Great work. Check back when the next batch arrives."
                            }
                            action={
                              <button
                                className="button secondary"
                                onClick={() => navigate("My Tasks")}
                              >
                                Go to My Tasks
                              </button>
                            }
                          />
                        )}
                      </div>
                    ) : (
                      <ProductTable
                        {...tableProps}
                        completed={page === "Completed"}
                      />
                    )}
                  </section>
                </>
              )}
              {page === "Batch Render" && (
                <BatchGeneration
                  products={products}
                  batches={db.batches}
                  onOpenProduct={setSelected}
                />
              )}
              {page === "3D Generation" && (
                <>
                  {!generationActive && (
                    <GenerationBatchHeader
                      count={generationBatch.length}
                      onBack={() => setGenerationSelectionOpen(true)}
                      onSelect={() => setGenerationStartOpen(true)}
                    />
                  )}
                  {generationActive ? (
                    <GenerationWorkspace
                      key={generationActive.id}
                      products={products}
                      activeProduct={generationActive}
                      onSync={async (url, file) => {
                        await repository.syncModel(generationActive.id, generationActive.sku, url, file, userId, role);
                      }}
                      onBack={() => generationDispatch({ type: "back" })}
                      onStatusChange={(result) =>
                        generationDispatch({
                          type: "result",
                          id: generationActive.id,
                          result,
                        })
                      }
                    />
                  ) : generationBatch.length ? (
                    <GenerationBatch
                      products={generationBatch}
                      results={generationFlow.results}
                      onOpen={openGenerationProduct}
                    />
                  ) : (
                    <Empty
                      title="Select products to begin"
                      text="Choose up to 15 SKUs for your generation batch."
                      action={
                        <button
                          className="button primary"
                          onClick={() => setGenerationStartOpen(true)}
                        >
                          Select Products
                        </button>
                      }
                    />
                  )}
                </>
              )}
              {page === "Team" && (
                <>
                  {teamCards()}
                  <section className="panel workload-panel">
                    <div className="section-title">
                      <div>
                        <h3>A balanced studio</h3>
                        <p>
                          Active work by team member · Target capacity: 8 tasks
                        </p>
                      </div>
                      <span className="legend">
                        <i />
                        Active tasks
                      </span>
                    </div>
                    {team
                      .filter((t) => t.role !== "Reviewer")
                      .map((t) => {
                        const n = products.filter(
                          (p) =>
                            p.assigneeId === t.id &&
                            !["Completed", "Approved"].includes(p.status),
                        ).length;
                        return (
                          <button
                            key={t.id}
                            className="workload-row"
                            onClick={() =>
                              navigate("Products", { assigneeId: t.id })
                            }
                          >
                            <Avatar member={t} small />
                            <span>{t.name}</span>
                            <div className="workload-track">
                              <div
                                style={{
                                  width: `${Math.min((n / 8) * 100, 100)}%`,
                                }}
                              />
                            </div>
                            <b>{n}</b>
                            <small>
                              {n < 6 ? "Open capacity" : "Near capacity"}
                            </small>
                          </button>
                        );
                      })}
                  </section>
                </>
              )}
              {page === "Batches" && (
                <>
                  <div className="section-title">
                    <span className="muted">
                      {db.batches.length} collections in your workspace
                    </span>
                    {role === "Admin / Manager" && (
                      <button
                        className="button secondary"
                        onClick={() => setBatchModal(true)}
                      >
                        <Plus size={16} />
                        Create batch
                      </button>
                    )}
                  </div>
                  <div className="batch-grid">
                    {db.batches.map((b) => {
                      const ps = products.filter((p) => p.batchId === b.id),
                        done = ps.filter(
                          (p) => p.status === "Completed",
                        ).length;
                      return (
                        <button
                          className="panel batch-card"
                          key={b.id}
                          onClick={() =>
                            navigate("Products", { batchId: b.id })
                          }
                        >
                          <div className="row between">
                            <span className="batch-icon">
                              <Boxes size={23} />
                            </span>
                            <ArrowRight size={18} />
                          </div>
                          <h2>{b.name}</h2>
                          <p>
                            {ps.length} products · Created{" "}
                            {new Date(b.createdAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                          <div className="progress-track">
                            <span
                              style={{
                                width: `${ps.length ? (done / ps.length) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <div className="row between">
                            <strong>
                              {ps.length
                                ? Math.round((done / ps.length) * 100)
                                : 0}
                              % completed
                            </strong>
                            <span>
                              {done}/{ps.length}
                            </span>
                          </div>
                          <div className="batch-stats">
                            {[
                              "In Progress",
                              "In Review",
                              "Available",
                              "Completed",
                            ].map((s) => (
                              <span key={s}>
                                <b>{ps.filter((p) => p.status === s).length}</b>
                                {s}
                              </span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {page === "Reports" && (
                <>
                  <div className="report-grid">
                    <section className="panel report-card">
                      <div className="section-title">
                        <h3>Production snapshot</h3>
                        <button
                          className="text-button"
                          onClick={downloadReport}
                        >
                          <ArrowDownToLine size={15} />
                          Export CSV
                        </button>
                      </div>
                      <div
                        className="report-donut"
                        style={{
                          background: `conic-gradient(#111111 0 ${products.length ? (count("Completed") / products.length) * 100 : 0}%, #ebebeb 0 100%)`,
                        }}
                      >
                        <div>
                          <strong>
                            {products.length
                              ? Math.round(
                                  (count("Completed") / products.length) * 100,
                                )
                              : 0}
                            %
                          </strong>
                          <span>Done</span>
                        </div>
                      </div>
                      <p>
                        {count("Completed")} of {products.length} products
                        delivered
                      </p>
                    </section>
                    <section className="panel report-card">
                      <h3>Where work is happening</h3>
                      {cards.slice(1).map((c) => (
                        <button
                          className="report-bar"
                          key={c.label}
                          onClick={() =>
                            navigate("Products", { status: c.status })
                          }
                        >
                          <span>{c.label}</span>
                          <div className="progress-track">
                            <span
                              style={{
                                width: `${products.length ? (count(c.status) / products.length) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <b>{count(c.status)}</b>
                        </button>
                      ))}
                    </section>
                  </div>
                  <section className="panel attention-panel">
                    <div className="section-title">
                      <div>
                        <h3>Needs a little attention</h3>
                        <p>
                          Corrections, paused tasks, and active work unchanged
                          for 7 days.
                        </p>
                      </div>
                      <Clock size={18} />
                    </div>
                    <ProductTable
                      {...tableProps}
                      compact
                      products={products.filter(
                        (p) =>
                          ["Corrections Required", "On Hold"].includes(
                            p.status,
                          ) ||
                          (p.status === "In Progress" &&
                            Date.now() - new Date(p.updatedAt).getTime() >
                              7 * 86400000),
                      )}
                    />
                  </section>
                </>
              )}
              {page === "Settings" && (
                <div className="settings-grid">
                  <section className="panel settings-card">
                    <div className="section-title">
                      <div>
                        <h3>Your demo workspace</h3>
                        <p>
                          Explore the entire production flow from every
                          perspective.
                        </p>
                      </div>
                      <span className="demo-badge">DEMO</span>
                    </div>
                    <label className="field">
                      Current user
                      <select
                        aria-label="Current user"
                        value={userId}
                        onChange={(e) => {
                          setUserId(e.target.value);
                          sessionStorage.setItem(
                            "modello.user",
                            e.target.value,
                          );
                        }}
                      >
                        {team.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Workspace role
                      <select
                        aria-label="Demo role"
                        value={role}
                        onChange={(e) => changeRole(e.target.value as Role)}
                      >
                        <option>Admin / Manager</option>
                        <option>3D Artist</option>
                        <option>Reviewer</option>
                      </select>
                    </label>
                    <div className="settings-note">
                      <Box size={20} />
                      <p>
                        This prototype saves data in this browser. Role
                        switching is for demonstration; authentication and
                        shared team storage are future integrations.
                      </p>
                    </div>
                    {onLogout && (
                      <button className="button secondary" onClick={onLogout}>
                        Log out
                      </button>
                    )}
                    {role === "Admin / Manager" && (
                      <div className="demo-controls">
                        <h3>Sample data</h3>
                        <p>
                          Restore the 33 reference products. Your current
                          workspace is saved as a backup so this action can be
                          undone.
                        </p>
                        <div className="row">
                          <button
                            className="button secondary"
                            onClick={async () => {
                              try {
                                await repository.resetDemo();
                                notify(
                                  "Sample workspace restored. Your previous data is backed up.",
                                );
                              } catch (e) {
                                notify((e as Error).message, true);
                              }
                            }}
                          >
                            Restore sample workspace
                          </button>
                          <button
                            className="text-button"
                            onClick={async () => {
                              try {
                                await repository.restoreBackup();
                                notify("Previous workspace restored");
                              } catch (e) {
                                notify((e as Error).message, true);
                              }
                            }}
                          >
                            Restore previous workspace
                          </button>
                        </div>
                      </div>
                    )}
                  </section>
                  <section className="panel settings-card">
                    <h3>Workspace information</h3>
                    <dl>
                      <dt>Name</dt>
                      <dd>GlamAR Production</dd>
                      <dt>Products</dt>
                      <dd>{products.length}</dd>
                      <dt>Team members</dt>
                      <dd>{team.length}</dd>
                      <dt>Storage</dt>
                      <dd>This browser</dd>
                      <dt>Version</dt>
                      <dd>1.0 · Studio preview</dd>
                    </dl>
                    <button
                      className="button secondary"
                      onClick={() => navigate("Batches")}
                    >
                      <Boxes size={16} />
                      Manage batches
                    </button>
                  </section>
                </div>
              )}
            </>
          )}
        </main>
      </div>
      {generationStartOpen && (
        <GenerationStartModal
          onClose={() => setGenerationStartOpen(false)}
          onChoose={(source) => {
            setGenerationSource(source);
            setGenerationStartOpen(false);
            setGenerationSelectionOpen(true);
          }}
        />
      )}
      {generationSelectionOpen && (
        <GenerationSelectionModal
          source={generationSource}
          onBack={() => {
            setGenerationSelectionOpen(false);
            setGenerationStartOpen(true);
          }}
          onUpload={async (files) => {
            const uploaded = await prepareManualProducts(files, repository.read().products);
            await repository.import(uploaded);
            setGenerationSearch("");
            notify(
              `${uploaded.length} products uploaded. Select them to continue.`,
            );
          }}
          products={products}
          batches={db.batches}
          selected={generationSelected}
          batch={generationBatchFilter}
          query={generationSearch}
          onBatch={setGenerationBatchFilter}
          onQuery={setGenerationSearch}
          onToggle={toggleGenerationProduct}
          onRemove={(id) => generationDispatch({ type: "remove", id })}
          onClose={() => setGenerationSelectionOpen(false)}
          onProceed={() => {
            if (!generationSelected.length) return;
            setGenerationSelectionOpen(false);
            setGenerationSettingsOpen(true);
          }}
        />
      )}
      {generationSettingsOpen && (
        <GenerationSettingsModal
          count={generationSelected.length}
          value={generationBatchSettings}
          onChange={setGenerationBatchSettings}
          onBack={() => {
            setGenerationSettingsOpen(false);
            setGenerationSelectionOpen(true);
          }}
          onClose={() => setGenerationSettingsOpen(false)}
          onProceed={() => {
            if (!generationSelected.length) return;
            saveBatchModelGenerationSettings(generationSelected.map((product) => product.id), generationBatchSettings);
            generationDispatch({ type: "proceed", products });
            setGenerationSettingsOpen(false);
            navigate("3D Generation");
          }}
        />
      )}
      {addingSingle && (
        <AddSingleProduct onClose={() => setAddingSingle(false)} onAdd={async (inputs) => {
          const uploaded = await prepareManualProducts(inputs, repository.read().products);
          await repository.import(uploaded);
          notify("Product added successfully");
          navigate("Dashboard");
        }} />
      )}
      {importing && (
        <ImportProducts
          batches={db.batches}
          onClose={() => setImporting(false)}
          onImport={async (ps) => {
            await repository.import(ps);
            notify(
              `${ps.length} product${ps.length === 1 ? "" : "s"} imported successfully`,
            );
            navigate("Dashboard");
          }}
        />
      )}
      {preview && (
        <Suspense
          fallback={
            <div className="toast" role="status">
              Loading 3D viewer…
            </div>
          }
        >
          <ModelViewer
            url={preview.modelUrl}
            name={preview.name}
            onClose={() => setPreview(null)}
          />
        </Suspense>
      )}{" "}
      {toast && <Toast {...toast} />}
      {help && (
        <Modal
          title="A new dimension of teamwork"
          subtitle="Your quick guide to GlamAR Production."
          onClose={() => setHelp(false)}
        >
          <div className="help-content">
            {[
              {
                n: "01",
                title: "Find your next creation",
                text: "Open Unassigned to browse products. Claim Task instantly adds a product to your workspace.",
              },
              {
                n: "02",
                title: "Bring it to life",
                text: "Open My Tasks, follow the checklist, and save a GLB URL. Submit the completed work for review.",
              },
              {
                n: "03",
                title: "Refine, review, deliver",
                text: "Reviewers preview models and leave feedback or approve. Approved work moves to Done.",
              },
            ].map((s) => (
              <div key={s.n}>
                <span>{s.n}</span>
                <section>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </section>
              </div>
            ))}
            <p className="settings-note">
              Use Settings to switch demo roles. Product data and images come
              from the supplied tracker; statuses and sample models are
              illustrative. Claims are protected between tabs in this browser. A
              shared backend is required for multiple devices.
            </p>
          </div>
          <div className="modal-footer">
            <span />
            <button
              className="button primary"
              onClick={() => {
                setHelp(false);
                navigate("Unassigned");
              }}
            >
              Find a task
              <ArrowRight size={15} />
            </button>
          </div>
        </Modal>
      )}
      {batchModal && (
        <Modal
          title="Create a batch"
          subtitle="Give your next collection a home."
          onClose={() => setBatchModal(false)}
        >
          <div className="modal-body field">
            <label htmlFor="batch-name">Batch name</label>
            <input
              id="batch-name"
              placeholder="e.g. Batch #025 · Autumn collection"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
            />
          </div>
          <div className="modal-footer">
            <button
              className="button secondary"
              onClick={() => setBatchModal(false)}
            >
              Cancel
            </button>
            <button
              className="button primary"
              disabled={!batchName.trim()}
              onClick={async () => {
                try {
                  await repository.createBatch(batchName.trim());
                  setBatchModal(false);
                  setBatchName("");
                  notify("Batch created");
                } catch (e) {
                  notify((e as Error).message, true);
                }
              }}
            >
              Create batch
              <Plus size={15} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
