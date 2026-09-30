"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { employees, employee } from "@/lib/employees";
import { allocationLabel, financials } from "@/lib/domain";
import { homeworkSeed } from "@/lib/seed-data";
import type { Allocation, EmployeeId, Split, Transaction } from "@/lib/types";

type Page =
  "overview" | "transactions" | "new" | "approvals" | "test" | "setup" | "how";
const money = (c: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    c / 100,
  );
const title = (s: string) =>
  s.replaceAll("_", " ").replace(/^./, (m) => m.toUpperCase());

export function FinanceApp({
  config,
}: {
  config: {
    studentName: string;
    githubUrl: string;
    telegramUrl: string;
    sheetUrl: string;
  };
}) {
  const [actor, setActor] = useState<EmployeeId>("svetlana"),
    [page, setPage] = useState<Page>("overview"),
    [records, setRecords] = useState<Transaction[]>(homeworkSeed),
    [notice, setNotice] = useState(
      "Showing the exact homework seed preview until Supabase is configured.",
    ),
    [loading, setLoading] = useState(false);
  const manager = actor === "svetlana";
  const visible = manager
    ? records
    : records.filter((t) => t.submittedByEmployeeId === actor && !t.testRecord);
  const pending = records.filter(
    (t) =>
      !t.testRecord &&
      (t.status === "pending_approval" || t.status === "awaiting_allocation"),
  );
  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/transactions?actor=${actor}`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error();
      setRecords(await r.json());
      setNotice("");
    } catch {
      setNotice(
        "Supabase is not configured yet; showing the exact assessed seed preview.",
      );
    } finally {
      setLoading(false);
    }
  };
  // Refresh when the selected demonstration role changes.
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor]);
  const choose = (id: EmployeeId) => {
    setActor(id);
    setPage("overview");
  };
  return (
    <div className="shell">
      <header>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("overview");
          }}
        >
          <b>fi.</b>
          <span>
            Friends Included<small>FINANCE DESK</small>
          </span>
        </a>
        <div className="status">
          <i /> Live system <span>Fictional company · EUR</span>
        </div>
        <strong>{config.studentName}</strong>
      </header>
      <aside>
        <label>
          Demonstration role
          <select
            value={actor}
            onChange={(e) => choose(e.target.value as EmployeeId)}
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <p className="role-note">
          {manager
            ? "Review decisions and the company’s financial results."
            : "Submit transactions and follow your own records."}
        </p>
        <nav>
          {(
            [
              ["overview", "Overview"],
              ["transactions", `Transactions ${visible.length}`],
              ["new", "New transaction"],
              ...(manager
                ? [
                    ["approvals", `Approvals ${pending.length}`],
                    ["setup", "Manager setup"],
                  ]
                : []),
              ["test", "Test this system"],
              ["how", "How it works"],
            ] as [Page, string][]
          ).map(([id, label]) => (
            <button
              className={page === id ? "active" : ""}
              key={id}
              onClick={() => setPage(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="tagline">
          All friendships expire
          <br />
          at checkout.
        </div>
        <div className="links">
          <a href={config.telegramUrl}>Telegram bot ↗</a>
          <a href={config.sheetUrl}>Google Sheet ↗</a>
          <a href={config.githubUrl}>GitHub repository ↗</a>
        </div>
      </aside>
      <main>
        <div className="eyebrow">FRIENDS INCLUDED LTD</div>
        <div className="page-head">
          <h1>
            {page === "overview"
              ? manager
                ? "Financial overview"
                : "My submissions"
              : page === "new"
                ? "New transaction"
                : page === "approvals"
                  ? "Manager approvals"
                  : page === "setup"
                    ? "Manager setup"
                    : page === "test"
                      ? "Test this system"
                      : page === "how"
                        ? "How it works"
                        : "Transactions"}
          </h1>
          <button className="secondary" onClick={refresh}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
        {notice && <div className="notice">{notice}</div>}
        {page === "overview" ? (
          <Overview
            manager={manager}
            records={records}
            visible={visible}
            go={() => setPage("approvals")}
          />
        ) : page === "transactions" ? (
          <Ledger
            records={visible}
            manager={manager}
            retry={async () => {
              await fetch("/api/retry", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ actorId: actor }),
              });
              await refresh();
            }}
          />
        ) : page === "new" ? (
          <NewTransaction actor={actor} done={refresh} />
        ) : page === "approvals" && manager ? (
          <Approvals records={pending} done={refresh} />
        ) : page === "setup" && manager ? (
          <Setup />
        ) : page === "test" ? (
          <TestPage config={config} />
        ) : (
          <How />
        )}
        <footer>
          <span>Day 4 · Wedding Guests for Hire</span>
          <span>Amounts in EUR · No VAT · Fictional data only</span>
        </footer>
      </main>
    </div>
  );
}

function Overview({
  manager,
  records,
  visible,
  go,
}: {
  manager: boolean;
  records: Transaction[];
  visible: Transaction[];
  go: () => void;
}) {
  if (!manager)
    return (
      <section className="card">
        <div className="section-head">
          <h2>Your submissions</h2>
        </div>
        <p>
          You can view your own submissions and their status. Svetlana makes
          approval decisions.
        </p>
        <MiniRows rows={visible} />
      </section>
    );
  const f = financials(records),
    combined = f.projects.reduce((s, p) => s + p.result, 0);
  return (
    <>
      <div className="metrics">
        <Metric
          label="Company result"
          value={money(f.result)}
          gold
          note="After commissions and every reported expense"
        />
        <Metric
          label="Approved income"
          value={money(f.income)}
          note={`${money(f.pendingSales)} in sales awaiting approval`}
        />
        <Metric
          label="Commission earned"
          value={money(f.commissions)}
          note="10% of approved sales, shared by the team"
        />
        <Metric
          label="Pending sales amount"
          value={money(f.pendingSales)}
          note="Excluded from income and commission"
        />
      </div>
      <section className="card">
        <div className="section-head">
          <h2>Project performance</h2>
          <span>Approved sales only</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Project</th>
              <th>Income</th>
              <th>Commission</th>
              <th>Allocated expenses</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {f.projects.map((p) => (
              <tr key={p.project}>
                <td>
                  <b>
                    {p.project === "A"
                      ? "Respectable Relatives"
                      : "Drunk University Friends"}
                  </b>
                  <small>Project {p.project}</small>
                </td>
                <td>{money(p.income)}</td>
                <td>{money(p.commissions)}</td>
                <td>{money(p.allocated)}</td>
                <td>
                  <b>{money(p.result)}</b>
                </td>
              </tr>
            ))}
            <tr className="total">
              <td>Combined projects</td>
              <td>{money(f.income)}</td>
              <td>{money(f.commissions)}</td>
              <td>{money(f.projects.reduce((s, p) => s + p.allocated, 0))}</td>
              <td>{money(combined)}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <div className="grid2">
        <section className="card">
          <h2>Company reconciliation</h2>
          <Dl
            rows={[
              ["Combined project results", money(combined)],
              ["Less company overhead", money(f.overhead)],
              ["Less expenses awaiting allocation", money(f.awaiting)],
              ["Company result", money(f.result)],
            ]}
          />
          <p>
            Every expense is counted once, even before its project is confirmed.
          </p>
        </section>
        <section className="card">
          <h2>Team commissions</h2>
          <Dl
            rows={[
              ["Richard", money(f.team.richard)],
              ["Anastasia", money(f.team.anastasia)],
              ["Jean-Claude", money(f.team.jeanClaude)],
            ]}
          />
          <p>
            {
              records.filter(
                (t) =>
                  t.status === "pending_approval" ||
                  t.status === "awaiting_allocation",
              ).length
            }{" "}
            transactions awaiting a manager decision.
          </p>
          <button onClick={go}>Review approvals</button>
        </section>
      </div>
    </>
  );
}
function Metric({
  label,
  value,
  note,
  gold,
}: {
  label: string;
  value: string;
  note: string;
  gold?: boolean;
}) {
  return (
    <div className={`metric ${gold ? "gold" : ""}`}>
      <span>{label}</span>
      <b>{value}</b>
      <small>{note}</small>
    </div>
  );
}
function Dl({ rows }: { rows: string[][] }) {
  return (
    <dl>
      {rows.map(([a, b], i) => (
        <div key={a} className={i === rows.length - 1 ? "final" : ""}>
          <dt>{a}</dt>
          <dd>{b}</dd>
        </div>
      ))}
    </dl>
  );
}
function MiniRows({ rows }: { rows: Transaction[] }) {
  return rows.length ? (
    <div className="minirows">
      {rows.map((t) => (
        <div key={t.reference}>
          <b>{t.reference}</b>
          <span>{t.description}</span>
          <strong>{money(t.amountCents)}</strong>
          <em>{title(t.status)}</em>
        </div>
      ))}
    </div>
  ) : (
    <div className="empty">No submissions yet.</div>
  );
}

function Ledger({
  records,
  manager,
  retry,
}: {
  records: Transaction[];
  manager: boolean;
  retry: () => void;
}) {
  const [filter, setFilter] = useState("all");
  const shown = records.filter(
    (t) =>
      filter === "all" ||
      (filter === "sale" && t.type === "sale") ||
      (filter === "expense" && t.type === "expense") ||
      (filter === "pending" &&
        (t.status === "pending_approval" ||
          t.status === "awaiting_allocation")),
  );
  return (
    <section className="card">
      <div className="section-head">
        <h2>Transaction ledger</h2>
        <div className="controls">
          <label>
            Show
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All transactions</option>
              <option value="sale">Sales</option>
              <option value="expense">Expenses</option>
              <option value="pending">Awaiting decisions</option>
            </select>
          </label>
          {manager && (
            <button className="secondary" onClick={retry}>
              Retry pending deliveries
            </button>
          )}
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Reference / submitter</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Delivery</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((t) => (
              <tr key={t.reference}>
                <td>
                  <b>{t.reference}</b>
                  <small>{employee(t.submittedByEmployeeId)?.name}</small>
                  <small>
                    {new Date(t.submittedAt).toLocaleString()} · {t.source}
                  </small>
                </td>
                <td>
                  {t.description}
                  <small>
                    {t.type === "sale"
                      ? `${t.customer} · Project ${t.project}`
                      : `${t.category} · ${allocationLabel(t.finalAllocation)}`}
                  </small>
                  <small>
                    Original:{" "}
                    {t.type === "sale"
                      ? `${t.proposedSplit?.richard}/${t.proposedSplit?.anastasia}/${t.proposedSplit?.jeanClaude}%`
                      : allocationLabel(t.proposedAllocation)}{" "}
                    · Final:{" "}
                    {t.type === "sale"
                      ? t.approvedSplit
                        ? `${t.approvedSplit.richard}/${t.approvedSplit.anastasia}/${t.approvedSplit.jeanClaude}%`
                        : "—"
                      : allocationLabel(t.finalAllocation)}
                  </small>
                </td>
                <td>
                  <b>{money(t.amountCents)}</b>
                </td>
                <td>
                  <span className={`pill ${t.status}`}>{title(t.status)}</span>
                </td>
                <td>
                  <span className={`pill ${t.sheetStatus}`}>
                    Sheet:{" "}
                    {t.sheetStatus === "sent"
                      ? "Synchronized"
                      : title(t.sheetStatus)}
                  </span>
                  <small>Submission: {title(t.telegramSubmissionStatus)}</small>
                  <small>Decision: {title(t.telegramDecisionStatus)}</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function NewTransaction({
  actor,
  done,
}: {
  actor: EmployeeId;
  done: () => void;
}) {
  const role = employee(actor)?.role;
  const [message, setMessage] = useState("");
  if (role === "manager")
    return (
      <div className="notice">
        Select a salesperson to submit a sale, or Kevin to submit an expense.
      </div>
    );
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      actorId: actor,
      type: role === "salesperson" ? "sale" : "expense",
      reference: form.get("reference"),
      amountCents: Math.round(Number(form.get("amount")) * 100),
      description: form.get("description"),
    };
    if (body.type === "sale")
      Object.assign(body, {
        customer: form.get("customer"),
        project: form.get("project"),
        proposedSplit: {
          richard: Number(form.get("richard")),
          anastasia: Number(form.get("anastasia")),
          jeanClaude: Number(form.get("jeanClaude")),
        },
      });
    else
      Object.assign(body, {
        category: form.get("category"),
        proposedAllocation: form.get("allocation"),
      });
    const r = await fetch("/api/transactions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    setMessage(r.ok ? `${data.reference} saved successfully.` : data.error);
    if (r.ok) {
      e.currentTarget.reset();
      await done();
    }
  };
  return (
    <form className="card form" onSubmit={submit}>
      <h2>{role === "salesperson" ? "Record a sale" : "Report an expense"}</h2>
      <p>
        Submitting as {employee(actor)?.name}.{" "}
        {role === "salesperson"
          ? "The sale and commission count only after approval."
          : "The expense reduces company result immediately."}
      </p>
      <div className="form-grid">
        <Field
          label="Unique reference"
          name="reference"
          placeholder={role === "salesperson" ? "S01" : "E01"}
        />
        <Field
          label="Amount · EUR"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
        />
        {role === "salesperson" ? (
          <>
            <Field label="Customer" name="customer" />
            <Select
              label="Project"
              name="project"
              options={[
                ["A", "A · Respectable Relatives"],
                ["B", "B · Drunk University Friends"],
              ]}
            />
          </>
        ) : (
          <>
            <Select
              label="Category"
              name="category"
              options={[
                ["Materials", "Materials"],
                ["Travel", "Travel"],
                ["Other", "Other"],
              ]}
            />
            <Select
              label="Proposed allocation"
              name="allocation"
              options={[
                ["A", "A · Respectable Relatives"],
                ["B", "B · Drunk University Friends"],
                ["OVERHEAD", "Company overhead"],
              ]}
            />
          </>
        )}
        <label className="wide">
          Description
          <textarea name="description" required />
        </label>
        {role === "salesperson" && (
          <>
            <h3 className="wide">Proposed commission split</h3>
            <Field
              label="Richard %"
              name="richard"
              type="number"
              min="0"
              max="100"
              defaultValue="100"
            />
            <Field
              label="Anastasia %"
              name="anastasia"
              type="number"
              min="0"
              max="100"
              defaultValue="0"
            />
            <Field
              label="Jean-Claude %"
              name="jeanClaude"
              type="number"
              min="0"
              max="100"
              defaultValue="0"
            />
            <p className="wide">
              Shares must total exactly 100%. These percentages divide the 10%
              commission pool.
            </p>
          </>
        )}
      </div>
      {message && (
        <div role="status" className="notice">
          {message}
        </div>
      )}
      <button type="submit">
        Submit {role === "salesperson" ? "sale" : "expense"}
      </button>
    </form>
  );
}
function Field(props: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  step?: string;
  min?: string;
  max?: string;
  defaultValue?: string;
}) {
  return (
    <label>
      {props.label}
      <input required {...props} />
    </label>
  );
}
function Select({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: string[][];
}) {
  return (
    <label>
      {label}
      <select name={name}>
        {options.map(([v, l]) => (
          <option value={v} key={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function Approvals({
  records,
  done,
}: {
  records: Transaction[];
  done: () => void;
}) {
  return (
    <section>
      <div className="card">
        <h2>Awaiting your decision</h2>
        <p>
          Correct the proposal before approving. Original values remain in the
          ledger; decisions are final and idempotent.
        </p>
      </div>
      {records.map((t) => (
        <Approval key={t.reference} transaction={t} done={done} />
      ))}
    </section>
  );
}
function Approval({
  transaction: t,
  done,
}: {
  transaction: Transaction;
  done: () => void;
}) {
  const [split, setSplit] = useState<Split>(
    t.proposedSplit ?? { richard: 0, anastasia: 0, jeanClaude: 0 },
  );
  const [allocation, setAllocation] = useState<Allocation>(
    t.proposedAllocation ?? "A",
  );
  const [message, setMessage] = useState("");
  const decide = async () => {
    const body =
      t.type === "sale"
        ? { actorId: "svetlana", type: "sale", reference: t.reference, split }
        : {
            actorId: "svetlana",
            type: "expense",
            reference: t.reference,
            allocation,
          };
    const r = await fetch("/api/decisions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    setMessage(r.ok ? "Decision saved." : data.error);
    if (r.ok) await done();
  };
  return (
    <article className="card approval">
      <div>
        <h3>
          {t.reference} · {t.type === "sale" ? "Sale" : "Expense"}
        </h3>
        <p>
          {employee(t.submittedByEmployeeId)?.name} ·{" "}
          {t.type === "sale"
            ? `Project ${t.project}`
            : allocationLabel(t.proposedAllocation)}
        </p>
      </div>
      <strong className="amount">{money(t.amountCents)}</strong>
      <p className="wide">{t.description}</p>
      {t.type === "sale" ? (
        <>
          <p className="wide">
            Customer: {t.customer} · Pool:{" "}
            {money(Math.round(t.amountCents * 0.1))}
            <br />
            Original: Richard {t.proposedSplit?.richard}% / Anastasia{" "}
            {t.proposedSplit?.anastasia}% / Jean-Claude{" "}
            {t.proposedSplit?.jeanClaude}%
          </p>
          <div className="form-grid wide">
            {(["richard", "anastasia", "jeanClaude"] as const).map((k) => (
              <label key={k}>
                {k === "jeanClaude" ? "Jean-Claude" : title(k)} %
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={split[k]}
                  onChange={(e) =>
                    setSplit({ ...split, [k]: Number(e.target.value) })
                  }
                />
              </label>
            ))}
          </div>
        </>
      ) : (
        <label>
          Final allocation
          <select
            value={allocation}
            onChange={(e) => setAllocation(e.target.value as Allocation)}
            aria-label="Final allocation"
          >
            <option value="A">A · Respectable Relatives</option>
            <option value="B">B · Drunk University Friends</option>
            <option value="OVERHEAD">Company overhead</option>
          </select>
        </label>
      )}
      <button onClick={decide}>
        {t.type === "sale" ? "Approve sale & commission" : "Confirm allocation"}
      </button>
      {message && <span className="notice">{message}</span>}
    </article>
  );
}

function Setup() {
  const [message, setMessage] = useState("");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await fetch("/api/setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        actorId: "svetlana",
        setupKey: f.get("key"),
        telegramUserId: f.get("user"),
        employeeId: f.get("employee"),
      }),
    });
    const d = await r.json();
    setMessage(r.ok ? "Telegram account link saved." : d.error);
  };
  return (
    <>
      <form className="card form" onSubmit={submit}>
        <h2>Link a Telegram account</h2>
        <p>
          Changing a link affects future submissions only. Existing bot records
          retain their original employee and chat destination.
        </p>
        <div className="form-grid">
          <Field label="Manager setup key" name="key" type="password" />
          <Field label="Telegram user ID" name="user" />
          <label>
            Employee
            <select name="employee">
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button>Save account link</button>
        {message && <div className="notice">{message}</div>}
      </form>
      <section className="card">
        <h2>Delivery recovery</h2>
        <p>
          Submissions and decisions are saved before delivery. Use Transactions
          to retry failed Google Sheets updates or Telegram notifications
          without creating another record.
        </p>
      </section>
    </>
  );
}

function TestPage({
  config,
}: {
  config: { telegramUrl: string; sheetUrl: string };
}) {
  const stamp = useMemo(
    () => Math.random().toString(36).slice(2, 9).toUpperCase(),
    [],
  );
  const [message, setMessage] = useState("");
  const link = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await fetch("/api/test-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        telegramUserId: f.get("user"),
        role: f.get("role"),
      }),
    });
    const d = await r.json();
    setMessage(r.ok ? "Test role linked. Continue in Telegram." : d.error);
  };
  return (
    <>
      <section className="card hero">
        <span className="pill sent">PUBLIC HOMEWORK TEST</span>
        <h2>Test Telegram → Supabase → manager decision → Telegram</h2>
        <p>
          Test records use isolated fictional roles, begin with TST-, never
          alter assessed totals, and may synchronize to the optional Public
          Tests sheet tab.
        </p>
      </section>
      <section className="steps">
        <div className="card">
          <h2>1 · Start the bot</h2>
          <p>
            Open the bot, send <code>/start</code>, and copy the numeric
            Telegram user ID.
          </p>
          <a className="button" href={config.telegramUrl}>
            Open Telegram bot ↗
          </a>
        </div>
        <form className="card form" onSubmit={link}>
          <h2>2 · Link a test role</h2>
          <p>
            Public linking is restricted to isolated test roles. The manager key
            is never exposed.
          </p>
          <Field label="Telegram user ID" name="user" />
          <Select
            label="Test role"
            name="role"
            options={[
              ["salesperson", "Test salesperson · submit a sale"],
              ["expense_reporter", "Test expense reporter · submit an expense"],
            ]}
          />
          <button>Link test account</button>
          {message && <div className="notice">{message}</div>}
        </form>
        <div className="card wide">
          <h2>3 · Send a command</h2>
          <code>
            /sale TST-S-{stamp} | Test Customer | A | 12.34 | Public Telegram
            sale test | 50 | 30 | 20
          </code>
          <code>
            /expense TST-E-{stamp} | 4.56 | Travel | B | Public Telegram expense
            test
          </code>
          <a href={config.sheetUrl}>Open Public Tests Sheet ↗</a>
        </div>
        <div className="card wide">
          <h2>4 · Manager test view</h2>
          <p>
            Test approvals use the same decision code and notification path
            while remaining excluded from assessed calculations.
          </p>
          <div className="empty">
            Submit a test transaction, then select Svetlana and review its
            isolated test status.
          </div>
        </div>
      </section>
    </>
  );
}

function How() {
  return (
    <div className="grid2">
      <section className="card">
        <h2>One ledger, two ways to submit</h2>
        <ol>
          <li>
            Select a salesperson and open <b>New transaction</b> to enter a
            sale; select Kevin for an expense.
          </li>
          <li>
            Select Svetlana and open <b>Approvals</b> to confirm or correct
            proposals.
          </li>
          <li>
            Use <b>Transactions</b> to inspect original proposals, final
            decisions, Sheet sync, and Telegram delivery.
          </li>
        </ol>
        <p>
          Pending sales are excluded from income and commission. Every recorded
          expense reduces company result immediately.
        </p>
      </section>
      <section className="card">
        <h2>Telegram commands</h2>
        <code>
          /sale REFERENCE | CUSTOMER | PROJECT | AMOUNT | DESCRIPTION | RICHARD%
          | ANASTASIA% | JEAN-CLAUDE%
        </code>
        <code>
          /expense REFERENCE | AMOUNT | CATEGORY | ALLOCATION | DESCRIPTION
        </code>
        <code>/status</code>
        <p>
          Google Sheets is a synchronized viewing copy. Spreadsheet edits do not
          update Supabase.
        </p>
      </section>
      <section className="card wide">
        <h2>Demonstration access</h2>
        <p>
          The role selector exists for fictional coursework testing. It is not
          authentication for real financial data. Manager endpoints still
          enforce Svetlana’s role on the server, while Telegram users must be
          explicitly mapped by the protected setup process.
        </p>
      </section>
    </div>
  );
}
