/* @ds-bundle: {"format":3,"namespace":"NightworkDesignSystem_4d9ea5","components":[{"name":"LoginPage","sourcePath":"nextjs/app/(auth)/login/page.tsx"},{"name":"DrawDetailPage","sourcePath":"nextjs/app/draws/[id]/page.tsx"},{"name":"RootLayout","sourcePath":"nextjs/app/layout.tsx"},{"name":"PortalPage","sourcePath":"nextjs/app/portal/page.tsx"},{"name":"ActionBanner","sourcePath":"nextjs/components/action-banner.tsx"},{"name":"ApproveRail","sourcePath":"nextjs/components/approve-rail.tsx"},{"name":"Card","sourcePath":"nextjs/components/card.tsx"},{"name":"CardHeader","sourcePath":"nextjs/components/card.tsx"},{"name":"CountUp","sourcePath":"nextjs/components/count-up.tsx"},{"name":"Eyebrow","sourcePath":"nextjs/components/eyebrow.tsx"},{"name":"InvoiceRow","sourcePath":"nextjs/components/invoice-row.tsx"},{"name":"KpiStrip","sourcePath":"nextjs/components/kpi-strip.tsx"},{"name":"Nav","sourcePath":"nextjs/components/nav.tsx"},{"name":"PageShell","sourcePath":"nextjs/components/page-shell.tsx"},{"name":"Pill","sourcePath":"nextjs/components/pill.tsx"},{"name":"ScrollProgress","sourcePath":"nextjs/components/scroll-progress.tsx"}],"sourceHashes":{"nextjs/app/(auth)/login/page.tsx":"34334ba50913","nextjs/app/draws/[id]/page.tsx":"4850db35852e","nextjs/app/layout.tsx":"cb7c71a2aad5","nextjs/app/portal/page.tsx":"fc26d05a35a1","nextjs/components/action-banner.tsx":"eb08e02eeda5","nextjs/components/approve-rail.tsx":"8b37113eceb4","nextjs/components/card.tsx":"bf15070ed54d","nextjs/components/count-up.tsx":"46e1994ffc37","nextjs/components/eyebrow.tsx":"691e995cede9","nextjs/components/invoice-row.tsx":"661d51da2568","nextjs/components/kpi-strip.tsx":"427cf34cb6be","nextjs/components/nav.tsx":"9e5f36a493c9","nextjs/components/page-shell.tsx":"590bfe176d0d","nextjs/components/pill.tsx":"ae21eb48dca4","nextjs/components/scroll-progress.tsx":"95dc9537f686","nextjs/lib/cn.ts":"e46429536f43","nextjs/lib/format.ts":"5f01dab0ac42","nextjs/lib/motion.ts":"7e7ddaaf15b5","nextjs/tailwind.config.ts":"9f054ded594a"},"inlinedExternals":[],"unexposedExports":[{"name":"breathe","sourcePath":"nextjs/lib/motion.ts"},{"name":"cn","sourcePath":"nextjs/lib/cn.ts"},{"name":"dur","sourcePath":"nextjs/lib/motion.ts"},{"name":"ease","sourcePath":"nextjs/lib/motion.ts"},{"name":"easeIn","sourcePath":"nextjs/lib/motion.ts"},{"name":"easeSoft","sourcePath":"nextjs/lib/motion.ts"},{"name":"easeSpring","sourcePath":"nextjs/lib/motion.ts"},{"name":"fadeIn","sourcePath":"nextjs/lib/motion.ts"},{"name":"fadeUp","sourcePath":"nextjs/lib/motion.ts"},{"name":"formatCents","sourcePath":"nextjs/lib/format.ts"},{"name":"formatCompactMoney","sourcePath":"nextjs/lib/format.ts"},{"name":"formatDate","sourcePath":"nextjs/lib/format.ts"},{"name":"hoverLift","sourcePath":"nextjs/lib/motion.ts"},{"name":"hoverLiftLg","sourcePath":"nextjs/lib/motion.ts"},{"name":"hoverScale","sourcePath":"nextjs/lib/motion.ts"},{"name":"hoverScaleSm","sourcePath":"nextjs/lib/motion.ts"},{"name":"metadata","sourcePath":"nextjs/app/layout.tsx"},{"name":"popIn","sourcePath":"nextjs/lib/motion.ts"},{"name":"pulseLive","sourcePath":"nextjs/lib/motion.ts"},{"name":"slideDown","sourcePath":"nextjs/lib/motion.ts"},{"name":"slideInRight","sourcePath":"nextjs/lib/motion.ts"},{"name":"stagger","sourcePath":"nextjs/lib/motion.ts"},{"name":"staggerParent","sourcePath":"nextjs/lib/motion.ts"},{"name":"tEnter","sourcePath":"nextjs/lib/motion.ts"},{"name":"tEnterSlow","sourcePath":"nextjs/lib/motion.ts"},{"name":"tHover","sourcePath":"nextjs/lib/motion.ts"},{"name":"tModal","sourcePath":"nextjs/lib/motion.ts"},{"name":"tSpring","sourcePath":"nextjs/lib/motion.ts"},{"name":"tapShrink","sourcePath":"nextjs/lib/motion.ts"}]} */

(() => {

const __ds_ns = (window.NightworkDesignSystem_4d9ea5 = window.NightworkDesignSystem_4d9ea5 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// nextjs/app/(auth)/login/page.tsx
try { (() => {
'use client';

const {
  useState
} = React;
function LoginPage() {
  const router = useRouter();
  const [state, setState] = useState('idle');
  async function signIn(e) {
    e.preventDefault();
    setState('loading');
    // TODO: call supabase.auth.signInWithPassword(...)
    await new Promise(r => setTimeout(r, 700));
    setState('success');
    toast.success('Signed in.', {
      description: 'David Hanlon · Owner'
    });
    setTimeout(() => router.push('/portal'), 350);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen grid lg:grid-cols-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white-sand p-14 flex flex-col text-slate-tile"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3.5 mb-auto"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-display font-semibold text-[22px] tracking-tighter"
  }, "nightwork"), /*#__PURE__*/React.createElement("span", {
    className: "w-[70px] h-0.5 bg-gradient-to-r from-stone-blue to-transparent"
  })), /*#__PURE__*/React.createElement("div", {
    className: "max-w-[400px] w-full my-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-mono text-[10px] tracking-[0.16em] uppercase text-gulf-blue mb-3.5"
  }, "OWNER PORTAL \xB7 ROSS BUILT"), /*#__PURE__*/React.createElement("h1", {
    className: "font-display font-medium text-[40px] tracking-tight m-0 mb-2.5 leading-tight"
  }, "Welcome back."), /*#__PURE__*/React.createElement("p", {
    className: "text-[14.5px] text-slate-tile/75 mb-9 leading-relaxed"
  }, "Sign in to review your project status, approve draws, and message your build team."), /*#__PURE__*/React.createElement("form", {
    onSubmit: signIn
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-5"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block font-mono text-[10px] tracking-button uppercase text-slate-tile/70 mb-2"
  }, "Email"), /*#__PURE__*/React.createElement("input", {
    type: "email",
    defaultValue: "david.hanlon@gmail.com",
    className: "w-full p-3.5 bg-white border border-bd-str text-[14.5px] text-slate-tile outline-none transition-all focus:border-stone-blue focus:shadow-[0_0_0_3px_rgba(91,134,153,0.15)]"
  })), /*#__PURE__*/React.createElement("div", {
    className: "mb-5"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block font-mono text-[10px] tracking-button uppercase text-slate-tile/70 mb-2"
  }, "Password"), /*#__PURE__*/React.createElement("input", {
    type: "password",
    defaultValue: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    className: "w-full p-3.5 bg-white border border-bd-str text-[14.5px] text-slate-tile outline-none transition-all focus:border-stone-blue focus:shadow-[0_0_0_3px_rgba(91,134,153,0.15)]"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-6"
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 text-[13px] text-slate-tile/80 cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    defaultChecked: true,
    className: "w-[15px] h-[15px] accent-stone-blue cursor-pointer"
  }), "Stay signed in"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => toast.info('Reset link sent.', {
      description: 'Check your inbox.'
    }),
    className: "font-mono text-[11px] tracking-[0.1em] uppercase text-gulf-blue hover:underline"
  }, "Forgot? \u2192")), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: state !== 'idle',
    className: "w-full p-3.5 bg-slate-deep hover:bg-slate-deeper disabled:opacity-70 text-white-sand font-mono text-[11px] tracking-button uppercase font-medium transition-colors flex items-center justify-center gap-2"
  }, state === 'loading' && /*#__PURE__*/React.createElement(Loader2, {
    className: "w-3.5 h-3.5 animate-spin"
  }), state === 'success' && /*#__PURE__*/React.createElement(Check, {
    className: "w-3.5 h-3.5"
  }), state === 'idle' && 'Sign in →', state === 'loading' && 'Signing in…', state === 'success' && 'Welcome back'), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3.5 my-5 text-slate-tile/45 font-mono text-[10px] tracking-button"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex-1 h-px bg-bd"
  }), "OR", /*#__PURE__*/React.createElement("span", {
    className: "flex-1 h-px bg-bd"
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => toast.info('Magic link sent.', {
      description: 'Check your email.'
    }),
    className: "w-full p-3.5 bg-transparent border border-bd-str text-slate-tile hover:border-stone-blue hover:text-stone-blue font-mono text-[11px] tracking-button uppercase transition-all"
  }, "Email me a sign-in link")), /*#__PURE__*/React.createElement("div", {
    className: "mt-7 pt-5 border-t border-bd text-[13px] text-slate-tile/65 leading-relaxed"
  }, "Trouble accessing your project?", ' ', /*#__PURE__*/React.createElement("button", {
    onClick: () => toast.success('Help requested.', {
      description: 'Jake will be in touch.'
    }),
    className: "text-gulf-blue hover:underline"
  }, "Email Jake"), ' ', "or call ", /*#__PURE__*/React.createElement("b", {
    className: "text-slate-tile"
  }, "(941) 555-0172"), ".")), /*#__PURE__*/React.createElement("div", {
    className: "mt-auto font-mono text-[10px] tracking-button text-slate-tile/50 flex justify-between pt-10"
  }, /*#__PURE__*/React.createElement("span", null, "NIGHTWORK \xB7 MAKES BUILDING LIGHTWORK"), /*#__PURE__*/React.createElement("span", null, "SOC 2 \xB7 AUDIT LOGGED"))), /*#__PURE__*/React.createElement("div", {
    className: "hidden lg:flex bg-slate-deep text-white-sand p-14 flex-col relative overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 pointer-events-none",
    style: {
      background: 'radial-gradient(ellipse 80% 60% at 70% 20%,rgba(91,134,153,0.25),transparent 60%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center relative z-10 font-mono text-[10px] tracking-eyebrow text-white-sand/60"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    className: "inline-block w-1.5 h-1.5 bg-nw-success rounded-full mr-2 animate-pulse-dot",
    style: {
      boxShadow: '0 0 6px #4A8A6F'
    }
  }), "SYSTEM OPERATIONAL"), /*#__PURE__*/React.createElement("span", null, "POWERED BY NIGHTWORK")), /*#__PURE__*/React.createElement("div", {
    className: "my-auto max-w-[460px] relative z-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-display text-[96px] leading-[0.8] text-stone-blue/60 mb-3.5"
  }, "\""), /*#__PURE__*/React.createElement("p", {
    className: "font-display font-normal text-[26px] tracking-tight leading-snug m-0 mb-7"
  }, "Before Nightwork, approving a draw meant three PDFs, two emails, and a phone call. Now I open my phone at the airport, see every invoice, and release $280k in two taps."), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-11 h-11 rounded-full bg-gradient-to-br from-stone-blue to-oceanside flex items-center justify-center font-mono text-xs font-semibold text-slate-deep"
  }, "MC"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-sm font-medium"
  }, "Marcus Crane"), /*#__PURE__*/React.createElement("div", {
    className: "font-mono text-[10px] tracking-eyebrow text-white-sand/55 mt-0.5"
  }, "OWNER \xB7 LONGBOAT KEY \xB7 $6.2M BUILD")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-6 mt-12 relative z-10 pt-8 border-t border-white-sand/10"
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Active builds",
    value: "34"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Draws approved",
    value: "$48M"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Avg. approval",
    value: "18min"
  }))));
}
function Stat({
  label,
  value
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "font-mono text-[9px] tracking-eyebrow uppercase text-white-sand/50 mb-1.5"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "font-display font-medium text-[26px] tracking-tight"
  }, value));
}
Object.assign(__ds_scope, { LoginPage });
})(); } catch (e) { __ds_ns.__errors.push({ path: "nextjs/app/(auth)/login/page.tsx", error: String((e && e.message) || e) }); }

// nextjs/app/draws/[id]/page.tsx
try { (() => {
'use client';

function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function DrawDetailPage({
  params
}) {
  // TODO: fetch from Supabase by params.id; mock for now
  const draw = mockDraw;
  async function handleApprove() {
    // TODO: POST /api/draws/[id]/approve { attested:true }
    await new Promise(r => setTimeout(r, 1300));
    return {
      confirmationId: 'NW-89D4F2'
    };
  }
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Nav, {
    context: "OWNER PORTAL",
    user: {
      name: 'David Hanlon',
      initials: 'DH'
    },
    role: "Owner"
  }), /*#__PURE__*/React.createElement("main", {
    className: "max-w-[1180px] mx-auto px-10 py-9 pb-20"
  }, /*#__PURE__*/React.createElement(motion.div, _extends({}, stagger(0), {
    className: "font-mono text-[11px] tracking-[0.1em] uppercase text-slate-tile/60 mb-4"
  }), /*#__PURE__*/React.createElement(Link, {
    href: "/portal",
    className: "text-gulf-blue hover:underline"
  }, "Home"), /*#__PURE__*/React.createElement("span", {
    className: "mx-2.5 text-slate-tile/30"
  }, "/"), /*#__PURE__*/React.createElement(Link, {
    href: "/portal",
    className: "text-gulf-blue hover:underline"
  }, "Draws"), /*#__PURE__*/React.createElement("span", {
    className: "mx-2.5 text-slate-tile/30"
  }, "/"), /*#__PURE__*/React.createElement("span", {
    className: "text-slate-tile"
  }, "Draw #", draw.number)), /*#__PURE__*/React.createElement(motion.div, _extends({}, stagger(1), {
    className: "pb-6"
  }), /*#__PURE__*/React.createElement("div", {
    className: "font-mono text-[10px] tracking-eyebrow uppercase text-nw-warn mb-1.5"
  }, "\u26A0 AWAITING YOUR APPROVAL \xB7 DUE APR 25"), /*#__PURE__*/React.createElement("h1", {
    className: "font-display font-medium text-[34px] tracking-tight m-0 mb-2 text-slate-tile"
  }, "Draw #", draw.number, " \u2014 Review & approve"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-5 text-[13.5px] text-slate-tile/70 flex-wrap mt-2"
  }, /*#__PURE__*/React.createElement("span", null, "Period ", /*#__PURE__*/React.createElement("b", {
    className: "text-slate-tile font-medium"
  }, draw.period)), /*#__PURE__*/React.createElement("span", null, "Submitted ", /*#__PURE__*/React.createElement("b", {
    className: "text-slate-tile font-medium"
  }, draw.submittedAt), " by Jake Ross"), /*#__PURE__*/React.createElement("span", null, "Job ", /*#__PURE__*/React.createElement("b", {
    className: "text-slate-tile font-medium"
  }, draw.job)), /*#__PURE__*/React.createElement("span", null, draw.invoices.length, " vendor invoices"))), /*#__PURE__*/React.createElement("div", {
    className: "grid lg:grid-cols-[1fr_360px] gap-6 items-start"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(motion.div, _extends({}, stagger(2), {
    className: "mb-4"
  }), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, {
    title: "This draw, by budget line",
    subtitle: "Rolled up from vendor invoices \xB7 CSI 16-division"
  }), /*#__PURE__*/React.createElement("table", {
    className: "w-full border-collapse text-[13px]"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, ['Line', 'Budget', 'Spent prior', 'This draw', '% used'].map((h, i) => /*#__PURE__*/React.createElement("th", {
    key: h,
    className: `font-mono text-[10px] tracking-button uppercase text-slate-tile/60
                                                py-2.5 px-2 border-b border-bd font-medium bg-stone-blue/[0.04]
                                                ${i >= 1 ? 'text-right' : 'text-left'}`
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, draw.lines.map((l, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    className: "hover:bg-stone-blue/[0.04] cursor-pointer"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 border-b border-bd-soft text-slate-tile"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-[11px] text-gulf-blue mr-2"
  }, l.code), l.label), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 border-b border-bd-soft text-right font-mono tabular-nums text-slate-tile"
  }, l.budget), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 border-b border-bd-soft text-right font-mono tabular-nums text-slate-tile"
  }, l.prior), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 border-b border-bd-soft text-right font-mono tabular-nums text-slate-tile font-semibold"
  }, l.thisDraw), /*#__PURE__*/React.createElement("td", {
    className: `py-3 px-2 border-b border-bd-soft text-right font-mono ${l.over ? 'text-nw-warn' : 'text-slate-tile'}`
  }, l.pctText))), /*#__PURE__*/React.createElement("tr", {
    className: "bg-stone-blue/[0.08] font-semibold border-t-2 border-bd-str"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-slate-tile"
  }, "Total this draw (14 invoices)"), /*#__PURE__*/React.createElement("td", {
    colSpan: 2
  }), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-mono tabular-nums text-slate-tile"
  }, "$177,050"), /*#__PURE__*/React.createElement("td", null)), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-slate-tile/60 text-[12px]"
  }, "Less retainage (10%)"), /*#__PURE__*/React.createElement("td", {
    colSpan: 2
  }), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-mono tabular-nums text-slate-tile/60"
  }, "-$17,705"), /*#__PURE__*/React.createElement("td", null)), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-slate-tile/60 text-[12px]"
  }, "Plus Ross Built fee (9%)"), /*#__PURE__*/React.createElement("td", {
    colSpan: 2
  }), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-mono tabular-nums text-slate-tile/60"
  }, "+$15,692"), /*#__PURE__*/React.createElement("td", null)), /*#__PURE__*/React.createElement("tr", {
    className: "bg-stone-blue/[0.08] font-semibold border-t-2 border-bd-str"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2"
  }, /*#__PURE__*/React.createElement("b", {
    className: "text-slate-deep"
  }, "Net due to Ross Built")), /*#__PURE__*/React.createElement("td", {
    colSpan: 2
  }), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-2 text-right font-mono tabular-nums text-slate-deep text-[15px]"
  }, "$175,037.50"), /*#__PURE__*/React.createElement("td", null)))))), /*#__PURE__*/React.createElement(motion.div, stagger(3), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, {
    title: `Vendor invoices (${draw.invoices.length})`,
    subtitle: "Click any row to expand line items, photos, lien waivers"
  }), draw.invoices.map((inv, i) => /*#__PURE__*/React.createElement(InvoiceRow, {
    key: inv.id,
    invoice: inv,
    defaultOpen: i === 0
  }))))), /*#__PURE__*/React.createElement(motion.div, stagger(2), /*#__PURE__*/React.createElement(ApproveRail, {
    netDueCents: 17503750,
    breakdown: [{
      label: 'Invoices (14)',
      cents: 17705000
    }, {
      label: 'Retainage held (10%)',
      cents: -1770500,
      negative: true
    }, {
      label: 'Ross Built fee (9%)',
      cents: 1569250,
      positive: true
    }, {
      label: 'Net this draw',
      cents: 17503750
    }],
    onApprove: handleApprove
  })))));
}
const mockDraw = {
  number: 9,
  period: 'Apr 1 — Apr 18, 2026',
  submittedAt: 'Apr 18 · 10:42 AM',
  job: 'Hanlon Residence',
  lines: [{
    code: '06-100',
    label: 'Rough carpentry & framing',
    budget: '$298,000',
    prior: '$268,400',
    thisDraw: '$22,800',
    pctText: '98%',
    over: false
  }, {
    code: '09-290',
    label: 'Drywall hang & finish',
    budget: '$112,000',
    prior: '$8,200',
    thisDraw: '$46,500',
    pctText: '49%',
    over: false
  }, {
    code: '16-200',
    label: 'Electrical rough & fixtures',
    budget: '$186,000',
    prior: '$124,000',
    thisDraw: '$28,300',
    pctText: '82%',
    over: false
  }, {
    code: '15-400',
    label: 'Plumbing rough-in',
    budget: '$134,000',
    prior: '$98,700',
    thisDraw: '$18,150',
    pctText: '87%',
    over: false
  }, {
    code: '15-700',
    label: 'HVAC — rough + air handlers',
    budget: '$158,000',
    prior: '$112,400',
    thisDraw: '$24,900',
    pctText: '87%',
    over: false
  }, {
    code: '09-310',
    label: 'Tile (allowance)',
    budget: '$48,000',
    prior: '$41,200',
    thisDraw: '$14,200',
    pctText: '115%',
    over: true
  }],
  invoices: [{
    id: 'gm',
    vendor: 'Gulf Millwork & Framing',
    vendorInitials: 'GM',
    invoiceNumber: '4418',
    date: 'APR 15',
    csiCode: '06-100',
    totalCents: 2280000,
    status: 'verified',
    lines: [{
      code: '06-100.1',
      description: 'Framing crew — 142 hrs @ $95/hr',
      cents: 1349000
    }, {
      code: '06-100.2',
      description: 'Interior partitions — 2nd floor',
      cents: 622000
    }, {
      code: '06-100.3',
      description: 'Blocking for cabinetry',
      cents: 309000
    }],
    attachments: [{
      label: '📄 Invoice.pdf'
    }, {
      label: '📄 Lien waiver'
    }, {
      label: '📸 4 photos'
    }, {
      label: '📄 COI current'
    }]
  }, {
    id: 'ce',
    vendor: 'Coastal Electric LLC',
    vendorInitials: 'CE',
    invoiceNumber: '2087',
    date: 'APR 12',
    csiCode: '16-200',
    totalCents: 2830000,
    status: 'verified',
    lines: [{
      code: '16-200.1',
      description: 'Rough panels, branch circuits',
      cents: 2240000
    }, {
      code: '16-200.2',
      description: 'Recessed lighting cans',
      cents: 590000
    }]
  }, {
    id: 'bt',
    vendor: 'Bayshore Tile Co',
    vendorInitials: 'BT',
    invoiceNumber: '881',
    date: 'APR 10',
    csiCode: '09-310',
    totalCents: 1420000,
    status: 'flagged',
    lines: [{
      code: '09-310.4',
      description: 'Carrara master shower & floor',
      cents: 980000
    }, {
      code: '09-310.5',
      description: 'Powder room — upgraded per owner',
      cents: 440000
    }],
    flagNote: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("b", {
      className: "text-nw-warn"
    }, "\u26A0 Allowance exceeded by $6,200."), " Covered by ", /*#__PURE__*/React.createElement("b", null, "CO-07"), " (approved Apr 5 \xB7 $42,300).")
  }, {
    id: 'wd',
    vendor: 'Westshore Drywall',
    vendorInitials: 'WD',
    invoiceNumber: '1552',
    date: 'APR 16',
    csiCode: '09-290',
    totalCents: 4650000,
    status: 'verified',
    lines: [{
      code: '09-290.1',
      description: 'Hang & finish all interior partitions',
      cents: 4650000
    }]
  }]
};
Object.assign(__ds_scope, { DrawDetailPage });
})(); } catch (e) { __ds_ns.__errors.push({ path: "nextjs/app/draws/[id]/page.tsx", error: String((e && e.message) || e) }); }

// nextjs/app/layout.tsx
try { (() => {
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter'
});
const grotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-grotesk'
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono'
});
const metadata = {
  title: 'Nightwork',
  description: 'Nightwork makes building lightwork.'
};
function RootLayout({
  children
}) {
  return /*#__PURE__*/React.createElement("html", {
    lang: "en",
    className: `${inter.variable} ${grotesk.variable} ${mono.variable}`
  }, /*#__PURE__*/React.createElement("body", {
    className: "bg-white-sand text-slate-tile font-sans antialiased"
  }, /*#__PURE__*/React.createElement(ScrollProgress, null), children, /*#__PURE__*/React.createElement(Toaster, {
    position: "bottom-right",
    toastOptions: {
      unstyled: false,
      classNames: {
        toast: 'bg-slate-deep text-white-sand border-0 rounded-none shadow-2xl font-sans',
        title: 'text-white-sand font-medium text-sm',
        description: 'text-white-sand/60 font-mono text-[10px] tracking-eyebrow uppercase mt-0.5',
        success: '!bg-slate-deep',
        error: '!bg-slate-deep',
        info: '!bg-slate-deep',
        warning: '!bg-slate-deep'
      }
    }
  })));
}
Object.assign(__ds_scope, { metadata, RootLayout });
})(); } catch (e) { __ds_ns.__errors.push({ path: "nextjs/app/layout.tsx", error: String((e && e.message) || e) }); }

// nextjs/app/portal/page.tsx
try { (() => {
'use client';

function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function PortalPage() {
  const router = useRouter();
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Nav, {
    context: "OWNER PORTAL",
    user: {
      name: 'David Hanlon',
      initials: 'DH'
    },
    role: "Owner"
  }), /*#__PURE__*/React.createElement(PageShell, {
    eyebrow: "ANNA MARIA \u2014 HANLON RESIDENCE",
    title: "Welcome back, David.",
    subtitle: /*#__PURE__*/React.createElement(React.Fragment, null, "Your home build is ", /*#__PURE__*/React.createElement("b", null, "60% complete"), " \xB7 Phase 4 of 7 \xB7 Target move-in ", /*#__PURE__*/React.createElement("b", null, "November 2026"))
  }, /*#__PURE__*/React.createElement(KpiStrip, {
    cells: [{
      label: 'Contract',
      value: '$4.82M',
      detail: 'Base $4.78M + 3 COs',
      progress: 100
    }, {
      label: 'Billed to you',
      value: '$2.89M',
      detail: '60.0% of contract',
      progress: 60
    }, {
      label: 'Remaining',
      value: '$1.93M',
      detail: 'Projected thru close',
      progress: 40,
      progressTone: 'muted'
    }, {
      label: 'Pending your approval',
      value: '$175k',
      detail: 'Draw #9 · due Apr 25',
      tone: 'warn',
      progress: 100,
      progressTone: 'warn'
    }],
    delay: 3
  }), /*#__PURE__*/React.createElement(ActionBanner, {
    eyebrow: "ACTION REQUIRED",
    title: "Draw #9 is ready for your approval",
    note: "$175,037.50 net due \xB7 Period Apr 1\u201318 \xB7 14 vendor invoices \xB7 Submitted by Jake Ross today at 10:42 AM",
    primaryLabel: "Approve & release \u2192",
    secondaryLabel: "Review details",
    onPrimary: () => router.push('/draws/9'),
    onSecondary: () => router.push('/draws/9'),
    delay: 4
  }), /*#__PURE__*/React.createElement(motion.div, _extends({}, stagger(5), {
    className: "grid grid-cols-[1.4fr_1fr] gap-px bg-bd border border-bd"
  }), /*#__PURE__*/React.createElement(Card, {
    className: "border-0"
  }, /*#__PURE__*/React.createElement(CardHeader, {
    title: "Draw history",
    subtitle: "Every payment you've released on this project"
  }), /*#__PURE__*/React.createElement("table", {
    className: "w-full border-collapse text-[13px]"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, ['#', 'Period', 'Status', 'Net due', 'Released'].map((h, i) => /*#__PURE__*/React.createElement("th", {
    key: h,
    className: `font-mono text-[10px] tracking-button uppercase text-slate-tile/60
                                            py-2 px-1.5 border-b border-bd font-medium
                                            ${i >= 3 ? 'text-right' : 'text-left'}`
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, /*#__PURE__*/React.createElement(Row, {
    n: "#09",
    period: "Apr 1\u201318",
    status: /*#__PURE__*/React.createElement(Pill, {
      variant: "await"
    }, "Awaiting you"),
    amount: "$175,037.50",
    released: "\u2014",
    onClick: () => router.push('/draws/9')
  }), /*#__PURE__*/React.createElement(Row, {
    n: "#08",
    period: "Mar 15\u201331",
    status: /*#__PURE__*/React.createElement(Pill, {
      variant: "pending"
    }, "In review"),
    amount: "$205,105.00",
    released: "\u2014"
  }), /*#__PURE__*/React.createElement(Row, {
    n: "#07",
    period: "Mar 1\u201314",
    status: /*#__PURE__*/React.createElement(Pill, {
      variant: "approved"
    }, "Approved"),
    amount: "$291,080.00",
    released: "Mar 18"
  }), /*#__PURE__*/React.createElement(Row, {
    n: "#06",
    period: "Feb 15\u201328",
    status: /*#__PURE__*/React.createElement(Pill, {
      variant: "paid"
    }, "Paid"),
    amount: "$264,670.00",
    released: "Mar 03"
  }), /*#__PURE__*/React.createElement(Row, {
    n: "#05",
    period: "Feb 1\u201314",
    status: /*#__PURE__*/React.createElement(Pill, {
      variant: "paid"
    }, "Paid"),
    amount: "$303,810.00",
    released: "Feb 17"
  }), /*#__PURE__*/React.createElement(Row, {
    n: "#04",
    period: "Jan 15\u201331",
    status: /*#__PURE__*/React.createElement(Pill, {
      variant: "paid"
    }, "Paid"),
    amount: "$235,030.00",
    released: "Feb 02"
  })))), /*#__PURE__*/React.createElement(Card, {
    className: "border-0"
  }, /*#__PURE__*/React.createElement(CardHeader, {
    title: "Recent jobsite updates",
    subtitle: "Posted by your PM"
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative pl-5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "absolute left-1.5 top-1.5 bottom-1.5 w-px bg-bd-str"
  }), timeline.map((it, i) => /*#__PURE__*/React.createElement(motion.div, _extends({
    key: i
  }, stagger(i + 6), {
    className: "relative py-1.5 pb-3.5 last:pb-0"
  }), /*#__PURE__*/React.createElement("span", {
    className: `absolute -left-[18px] top-2.5 w-2.5 h-2.5 rounded-full border-2 border-white
                                    ${it.done ? 'bg-nw-success' : 'bg-transparent border-slate-tile/30'}`
  }), /*#__PURE__*/React.createElement("div", {
    className: "font-mono text-[10px] tracking-[0.1em] uppercase text-slate-tile/55 mb-0.5"
  }, it.date), /*#__PURE__*/React.createElement("div", {
    className: `text-[13px] ${it.done ? 'text-slate-tile' : 'text-slate-tile/50'}`
  }, it.text))))))));
}
function Row({
  n,
  period,
  status,
  amount,
  released,
  onClick
}) {
  return /*#__PURE__*/React.createElement("tr", {
    onClick: onClick,
    className: "cursor-pointer hover:bg-stone-blue/[0.05] transition-colors"
  }, /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-1.5 border-b border-bd-soft text-slate-tile"
  }, n), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-1.5 border-b border-bd-soft text-slate-tile"
  }, period), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-1.5 border-b border-bd-soft"
  }, status), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-1.5 border-b border-bd-soft text-right font-mono tabular-nums text-slate-tile"
  }, amount), /*#__PURE__*/React.createElement("td", {
    className: "py-3 px-1.5 border-b border-bd-soft text-right font-mono text-slate-tile/50"
  }, released));
}
const timeline = [{
  date: 'APR 17',
  text: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("b", {
    className: "text-stone-blue font-medium"
  }, "Framing inspection passed"), " \u2014 Manatee County. Drywall hangers scheduled Apr 22."),
  done: true
}, {
  date: 'APR 12',
  text: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("b", {
    className: "text-stone-blue font-medium"
  }, "Cabinetry ordered"), " \u2014 Gulf Millwork \xB7 8-week lead."),
  done: true
}, {
  date: 'APR 05',
  text: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("b", {
    className: "text-stone-blue font-medium"
  }, "Tile selection finalized"), " \u2014 see CO-07."),
  done: true
}, {
  date: 'MAR 28',
  text: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("b", {
    className: "text-stone-blue font-medium"
  }, "Rough plumbing & electric"), " complete in all zones."),
  done: true
}, {
  date: 'APR 22',
  text: 'Drywall hang + finish (10 days)',
  done: false
}, {
  date: 'MAY 05',
  text: 'Primer & first coat paint',
  done: false
}];
Object.assign(__ds_scope, { PortalPage });
})(); } catch (e) { __ds_ns.__errors.push({ path: "nextjs/app/portal/page.tsx", error: String((e && e.message) || e) }); }

// nextjs/components/action-banner.tsx
try { (() => {
'use client';

/**
 * Slate-deep CTA banner with:
 * - ambient sweep gradient (every 4.5s)
 * - lift + colored shadow on hover
 * - pulsing eyebrow dot
 * - fade-up on first paint
 */
function ActionBanner({
  href,
  eyebrow,
  title,
  note,
  primaryLabel = 'Take action →',
  secondaryLabel = 'Review details',
  onPrimary,
  onSecondary
}) {
  const Wrap = href ? Link : 'div';
  return /*#__PURE__*/React.createElement(motion.div, {
    variants: fadeUp,
    initial: "initial",
    animate: "animate",
    transition: {
      duration: 0.45,
      ease,
      delay: 0.18
    },
    className: "mb-8"
  }, /*#__PURE__*/React.createElement(motion.div, {
    whileHover: {
      y: -2,
      boxShadow: '0 12px 24px -12px rgba(0,0,0,0.4)'
    },
    transition: {
      duration: 0.25,
      ease
    }
  }, /*#__PURE__*/React.createElement(Wrap, {
    href: href,
    className: "block bg-slate-deep text-white-sand p-7 relative overflow-hidden cursor-pointer"
  }, /*#__PURE__*/React.createElement("span", {
    className: "absolute inset-y-0 -left-full w-full animate-sweep bg-gradient-to-r from-transparent via-stone-blue/15 to-transparent pointer-events-none"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-5 relative z-10"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "font-mono text-[10px] tracking-eyebrow uppercase text-nw-warn mb-1.5 flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement(motion.span, {
    animate: {
      opacity: [1, 0.5, 1],
      scale: [1, 1.2, 1]
    },
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut'
    },
    className: "w-1.5 h-1.5 rounded-full bg-nw-warn"
  }), eyebrow), /*#__PURE__*/React.createElement("h2", {
    className: "font-display font-medium text-[22px] tracking-tight m-0 text-white-sand"
  }, title), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-white-sand/65 m-0 mt-1"
  }, note)), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2.5 flex-shrink-0"
  }, /*#__PURE__*/React.createElement(motion.button, {
    whileHover: {
      scale: 1.03
    },
    whileTap: {
      scale: 0.97
    },
    transition: {
      duration: 0.2,
      ease: easeSpring
    },
    onClick: e => {
      e.preventDefault();
      e.stopPropagation();
      onSecondary?.();
    },
    className: "px-4 py-3 font-mono text-[11px] tracking-button uppercase font-medium border border-white-sand/30 hover:border-stone-blue hover:text-stone-blue transition-colors"
  }, secondaryLabel), /*#__PURE__*/React.createElement(motion.button, {
    whileHover: {
      scale: 1.03
    },
    whileTap: {
      scale: 0.97
    },
    transition: {
      duration: 0.2,
      ease: easeSpring
    },
    onClick: e => {
      e.preventDefault();
      e.stopPropagation();
      onPrimary?.();
    },
    className: "px-4 py-3 font-mono text-[11px] tracking-button uppercase font-medium bg-stone-blue hover:bg-gulf-blue transition-colors"
  }, primaryLabel))))));
}
Object.assign(__ds_scope, { ActionBanner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "nextjs/components/action-banner.tsx", error: String((e && e.message) || e) }); }

// nextjs/components/approve-rail.tsx
try { (() => {
'use client';

const {
  useState
} = React;
/**
 * Sticky right rail used on draw approval screens.
 * Handles attestation, loading, success, and routes to a confirmation modal.
 *
 * In production you'd wire `onApprove` to a server action that creates the
 * `draw_approval` row and triggers the wire instruction.
 */
function ApproveRail({
  netDueCents,
  breakdown,
  onApprove
}) {
  const router = useRouter();
  const [attested, setAttested] = useState(false);
  const [state, setState] = useState('idle');
  const [confirmation, setConfirmation] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [flashAttest, setFlashAttest] = useState(false);
  async function go() {
    if (!attested) {
      setFlashAttest(true);
      setTimeout(() => setFlashAttest(false), 1200);
      toast.warning('Confirm review first.', {
        description: 'Check the attestation box above the buttons.'
      });
      return;
    }
    setState('loading');
    try {
      const {
        confirmationId
      } = await onApprove();
      setConfirmation(confirmationId);
      setState('success');
      toast.success('Draw approved.', {
        description: `Wire scheduled · ${formatCents(netDueCents)}`
      });
      setTimeout(() => setShowReceipt(true), 600);
    } catch {
      setState('idle');
      toast.error('Approval failed.', {
        description: 'Try again or contact accounting.'
      });
    }
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "sticky top-[84px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-bd overflow-hidden transition-shadow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-deep text-white-sand p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-mono text-[10px] tracking-eyebrow uppercase text-white-sand/60 mb-2"
  }, "Net due to Ross Built"), /*#__PURE__*/React.createElement("div", {
    className: "font-display font-medium text-[36px] tracking-tight leading-none tabular-nums"
  }, formatCents(netDueCents)), /*#__PURE__*/React.createElement("div", {
    className: "font-mono text-[11px] text-white-sand/55 mt-2.5"
  }, "WIRE \xB7 ACH \xB7 RELEASED ON APPROVAL")), /*#__PURE__*/React.createElement("div", {
    className: "p-6 border-b border-bd-soft"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-mono text-[10px] tracking-eyebrow uppercase text-slate-tile/55 m-0 mb-3 font-medium"
  }, "Payment breakdown"), breakdown.map((b, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: `flex justify-between text-[13px] py-1
              ${b.negative ? 'text-nw-danger' : b.positive ? 'text-slate-tile' : 'text-slate-tile'}
              ${i === breakdown.length - 1 ? 'mt-2 pt-2.5 border-t border-bd font-semibold' : ''}`
  }, /*#__PURE__*/React.createElement("span", null, b.label), /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-[12.5px] tabular-nums"
  }, formatCents(b.cents))))), /*#__PURE__*/React.createElement("label", {
    className: `flex items-start gap-2.5 p-4 px-6 text-xs text-slate-tile/75 leading-snug border-t border-bd-soft
                      cursor-pointer select-none transition-colors hover:bg-stone-blue/[0.03]
                      ${flashAttest ? 'bg-nw-danger/10' : ''}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: attested,
    onChange: e => setAttested(e.target.checked),
    className: "mt-0.5 accent-stone-blue cursor-pointer"
  }), /*#__PURE__*/React.createElement("span", null, "I've reviewed the invoices and confirm the work reflected here matches what I've seen on site.")), /*#__PURE__*/React.createElement("div", {
    className: "p-6 flex flex-col gap-2.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: go,
    disabled: state !== 'idle',
    className: `px-4 py-3.5 font-mono text-[11px] tracking-button uppercase font-medium
                        transition-colors flex items-center justify-center gap-2
                        ${state === 'success' ? 'bg-nw-success text-white-sand' : 'bg-slate-deep hover:bg-slate-deeper text-white-sand disabled:opacity-70'}`
  }, state === 'loading' && /*#__PURE__*/React.createElement(Loader2, {
    className: "w-3.5 h-3.5 animate-spin"
  }), state === 'success' && /*#__PURE__*/React.createElement(Check, {
    className: "w-3.5 h-3.5"
  }), state === 'idle' && 'Approve & release payment →', state === 'loading' && 'Releasing payment…', state === 'success' && 'Approved · routing funds'), /*#__PURE__*/React.createElement("button", {
    onClick: () => toast.info('Changes requested.', {
      description: 'Jake will get back to you within 24 hours.'
    }),
    className: "px-4 py-3 font-mono text-[11px] tracking-button uppercase border border-bd-str text-slate-tile hover:border-stone-blue hover:text-stone-blue transition-colors"
  }, "Request changes"), /*#__PURE__*/React.createElement("button", {
    onClick: () => toast.warning('Dispute opened.', {
      description: 'Select line items on next screen.'
    }),
    className: "px-4 py-3 font-mono text-[11px] tracking-button uppercase border border-nw-danger/35 text-nw-danger hover:bg-nw-danger/5 transition-colors"
  }, "Dispute a line item")), /*#__PURE__*/React.createElement("div", {
    className: "bg-stone-blue/[0.06] p-4 px-6 text-xs text-slate-tile/75 leading-snug border-t border-bd-soft"
  }, /*#__PURE__*/React.createElement("b", {
    className: "text-slate-tile"
  }, "How approval works:"), " Clicking approve wires funds to Ross Built within 1 business day. You'll get an emailed receipt with all attached lien waivers.")), /*#__PURE__*/React.createElement(AnimatePresence, null, showReceipt && /*#__PURE__*/React.createElement(motion.div, {
    initial: {
      opacity: 0
    },
    animate: {
      opacity: 1
    },
    exit: {
      opacity: 0
    },
    transition: {
      duration: 0.2
    },
    className: "fixed inset-0 bg-slate-deep/85 backdrop-blur-md z-[200] flex items-center justify-center p-10",
    onClick: () => setShowReceipt(false)
  }, /*#__PURE__*/React.createElement(motion.div, {
    initial: {
      opacity: 0,
      scale: 0.6
    },
    animate: {
      opacity: 1,
      scale: 1
    },
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1]
    },
    onClick: e => e.stopPropagation(),
    className: "bg-white max-w-[540px] w-full p-12 relative overflow-hidden"
  }, /*#__PURE__*/React.createElement("span", {
    className: "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-stone-blue via-nw-success to-stone-blue"
  }), /*#__PURE__*/React.createElement(motion.div, {
    initial: {
      scale: 0.6,
      opacity: 0
    },
    animate: {
      scale: 1,
      opacity: 1
    },
    transition: {
      delay: 0.15,
      ease: [0.22, 1, 0.36, 1]
    },
    className: "w-16 h-16 bg-nw-success/15 text-nw-success rounded-full mx-auto mb-6 flex items-center justify-center"
  }, /*#__PURE__*/React.createElement(Check, {
    className: "w-7 h-7",
    strokeWidth: 2.5
  })), /*#__PURE__*/React.createElement("h2", {
    className: "font-display font-medium text-[28px] tracking-tight text-center m-0 mb-2 text-slate-tile"
  }, "Payment released."), /*#__PURE__*/React.createElement("p", {
    className: "text-center text-sm text-slate-tile/70 mb-7 leading-snug"
  }, "Funds are on their way to Ross Built \u2014 typically 1 business day. We'll email you a full receipt with all lien waivers."), /*#__PURE__*/React.createElement("div", {
    className: "bg-stone-blue/[0.06] p-5 mb-5"
  }, /*#__PURE__*/React.createElement(Row, {
    l: "Confirmation",
    v: confirmation ?? '—'
  }), /*#__PURE__*/React.createElement(Row, {
    l: "Released to",
    v: "Ross Built Inc."
  }), /*#__PURE__*/React.createElement(Row, {
    l: "Draw",
    v: "#9 \xB7 Hanlon Residence"
  }), /*#__PURE__*/React.createElement(Row, {
    l: "Net amount",
    v: formatCents(netDueCents),
    big: true
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowReceipt(false),
    className: "flex-1 px-4 py-3 font-mono text-[11px] tracking-button uppercase border border-bd-str text-slate-tile hover:border-stone-blue transition-colors"
  }, "Download receipt"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowReceipt(false);
      router.push('/portal');
    },
    className: "flex-1 px-4 py-3 font-mono text-[11px] tracking-button uppercase bg-slate-deep hover:bg-slate-deeper text-white-sand transition-colors"
  }, "Back to portal"))))));
}
function Row({
  l,
  v,
  big
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between py-1.5 text-[13px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-slate-tile/70 font-mono text-[10px] tracking-button uppercase"
  }, l), /*#__PURE__*/React.createElement("span", {
    className: `text-slate-tile font-mono tabular-nums ${big ? 'font-display !font-semibold !text-[20px] tracking-tight' : ''}`
  }, v));
}
Object.assign(__ds_scope, { ApproveRail });
})(); } catch (e) { __ds_ns.__errors.push({ path: "nextjs/components/approve-rail.tsx", error: String((e && e.message) || e) }); }

// nextjs/components/card.tsx
try { (() => {
'use client';

function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * White card. Hover gains a subtle shadow lift.
 * Wrap content in <Card>; use <CardHeader> for the title row.
 */
function Card({
  children,
  className,
  hover = true,
  ...rest
}) {
  return /*#__PURE__*/React.createElement(motion.div, _extends({
    whileHover: hover ? {
      boxShadow: '0 8px 32px -20px rgba(26,40,48,0.12)'
    } : undefined,
    transition: tHover,
    className: cn('bg-white border border-bd p-6 px-7', className)
  }, rest), children);
}
function CardHeader({
  title,
  subtitle,
  right
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start mb-5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-display font-medium text-[17px] tracking-tight text-slate-tile m-0 mb-0.5"
  }, title), subtitle && /*#__PURE__*/React.createElement("div", {
    className: "font-mono text-[10px] tracking-[0.12em] uppercase text-slate-tile/55"
  }, subtitle)), right);
}
Object.assign(__ds_scope, { Card, CardHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "nextjs/components/card.tsx", error: String((e && e.message) || e) }); }

// nextjs/components/count-up.tsx
try { (() => {
'use client';

const {
  useEffect,
  useRef,
  useState
} = React;
/**
 * Number that counts up from 0 to `value` when it scrolls into view.
 * Uses ease-out-quartic for that "racing into place" feel.
 *
 *   <CountUp value={184250} prefix="$" formatter={n => n.toLocaleString()} />
 *
 * Default `duration` 900ms matches the standard KPI reveal cadence.
 */
function CountUp({
  value,
  prefix = '',
  suffix = '',
  duration = 900,
  formatter = n => n.toLocaleString(),
  decimals = 0
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = now => {
          const t = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 4);
          const current = decimals ? +(value * eased).toFixed(decimals) : Math.round(value * eased);
          setDisplay(current);
          if (t < 1) requestAnimationFrame(tick);else setDisplay(value);
        };
        requestAnimationFrame(tick);
        io.disconnect();
      }
    }, {
      threshold: 0.3
    });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [value, duration, decimals]);
  return /*#__PURE__*/React.createElement("span", {
    ref: ref,
    className: "tabular-nums"
  }, prefix, formatter(display), suffix);
}
Object.assign(__ds_scope, { CountUp });
})(); } catch (e) { __ds_ns.__errors.push({ path: "nextjs/components/count-up.tsx", error: String((e && e.message) || e) }); }

// nextjs/components/eyebrow.tsx
try { (() => {
/**
 * The signature Nightwork motif: JetBrains Mono, 10–11px, UPPERCASE,
 * 0.14em tracking. Use above every section, banner, KPI label.
 */
function Eyebrow({
  children,
  className,
  tone = 'default'
}) {
  const tones = {
    default: 'text-slate-tile/55',
    warn: 'text-nw-warn',
    success: 'text-nw-success',
    accent: 'text-gulf-blue'
  };
  return /*#__PURE__*/React.createElement("span", {
    className: cn('font-mono text-[10px] tracking-eyebrow uppercase font-medium', tones[tone], className)
  }, children);
}
Object.assign(__ds_scope, { Eyebrow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "nextjs/components/eyebrow.tsx", error: String((e && e.message) || e) }); }

// nextjs/components/kpi-strip.tsx
try { (() => {
'use client';

const {
  useState,
  useRef
} = React;
/**
 * 4-up hairline KPI grid with:
 * - count-up numbers
 * - hover tilt (perspective rotate following cursor)
 * - growing stone-blue underline on hover
 * - progress bars that scale-in
 * - parent-staggered child reveal
 */
function KpiStrip({
  cells
}) {
  return /*#__PURE__*/React.createElement(motion.div, {
    variants: staggerParent,
    initial: "initial",
    animate: "animate",
    className: "grid grid-cols-4 gap-px bg-bd border border-bd mb-9"
  }, cells.map((k, i) => /*#__PURE__*/React.createElement(KpiCard, {
    key: i,
    kpi: k,
    index: i
  })));
}
function KpiCard({
  kpi: k,
  index: i
}) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({
    x: 0,
    y: 0
  });
  const onMove = e => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setTilt({
      x: -y * 2,
      y: x * 2
    });
  };
  const reset = () => setTilt({
    x: 0,
    y: 0
  });
  return /*#__PURE__*/React.createElement(motion.div, {
    ref: ref,
    variants: fadeUp,
    transition: {
      duration: 0.45,
      ease
    },
    onMouseMove: onMove,
    onMouseLeave: reset,
    style: {
      transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
      transition: 'transform 0.18s cubic-bezier(0.22,1,0.36,1), background 0.25s cubic-bezier(0.22,1,0.36,1)'
    },
    className: "group bg-white p-6 hover:bg-[#FCFAF2] relative overflow-hidden"
  }, /*#__PURE__*/React.createElement("span", {
    className: "absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-stone-blue to-transparent scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 ease-out"
  }), /*#__PURE__*/React.createElement("div", {
    className: "font-mono text-[10px] tracking-eyebrow uppercase text-slate-tile/60 mb-2"
  }, k.label), /*#__PURE__*/React.createElement("div", {
    className: `font-display font-semibold text-[30px] tracking-tight tabular-nums leading-none ${k.tone === 'warn' ? 'text-nw-warn' : 'text-slate-tile'}`
  }, k.displayValue ?? /*#__PURE__*/React.createElement(__ds_scope.CountUp, {
    value: k.value ?? 0,
    prefix: k.prefix ?? '',
    suffix: k.suffix ?? '',
    decimals: k.decimals ?? 0
  })), k.detail && /*#__PURE__*/React.createElement("div", {
    className: "font-mono text-[11px] mt-1.5 text-gulf-blue"
  }, k.detail), k.progress != null && /*#__PURE__*/React.createElement("div", {
    className: "h-[3px] mt-2.5 overflow-hidden bg-slate-tile/10"
  }, /*#__PURE__*/React.createElement(motion.div, {
    initial: {
      scaleX: 0
    },
    whileInView: {
      scaleX: k.progress / 100
    },
    viewport: {
      once: true,
      amount: 0.3
    },
    transition: {
      duration: 0.9,
      ease,
      delay: 0.4 + i * 0.05
    },
    style: {
      transformOrigin: 'left'
    },
    className: `h-full ${k.progressTone === 'warn' ? 'bg-nw-warn' : k.progressTone === 'success' ? 'bg-nw-success' : k.progressTone === 'muted' ? 'bg-slate-tile/30' : 'bg-stone-blue'}`
  })));
}
Object.assign(__ds_scope, { KpiStrip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "nextjs/components/kpi-strip.tsx", error: String((e && e.message) || e) }); }

// nextjs/components/nav.tsx
try { (() => {
'use client';

const {
  useEffect,
  useState
} = React;
/**
 * Top nav — frosted-glass, gains a shadow + border-darken on scroll.
 * Wordmark "beam" grows in on first paint and extends on hover.
 */
function Nav({
  context,
  user,
  role
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, {
      passive: true
    });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return /*#__PURE__*/React.createElement("nav", {
    className: cn('sticky top-0 z-50 h-[60px] px-10', 'bg-white/85 supports-[backdrop-filter]:backdrop-blur-md supports-[backdrop-filter]:saturate-150', 'border-b transition-[box-shadow,border-color] duration-300', scrolled ? 'shadow-nav-scroll border-slate-tile/25' : 'border-bd', 'flex items-center gap-6')
  }, /*#__PURE__*/React.createElement(Link, {
    href: "/portal",
    className: "group flex items-center gap-3.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-display font-semibold text-xl tracking-tighter text-slate-tile"
  }, "nightwork"), /*#__PURE__*/React.createElement(motion.span, {
    initial: {
      scaleX: 0
    },
    animate: {
      scaleX: 1
    },
    transition: {
      duration: 1,
      ease,
      delay: 0.3
    },
    style: {
      transformOrigin: 'left'
    },
    className: "h-px w-12 bg-gradient-to-r from-stone-blue to-transparent group-hover:scale-x-[1.4] transition-transform duration-300"
  })), context && /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-[10px] tracking-eyebrow uppercase text-slate-tile/70"
  }, context), /*#__PURE__*/React.createElement("span", {
    className: "flex-1"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-slate-tile"
  }, user.name), /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-[10px] tracking-button uppercase border border-bd-str px-2 py-0.5 text-slate-tile hover:border-stone-blue hover:text-stone-blue transition-colors duration-200"
  }, role), /*#__PURE__*/React.createElement(motion.button, {
    whileHover: {
      scale: 1.08,
      rotate: -3
    },
    whileTap: {
      scale: 0.95
    },
    transition: {
      duration: 0.25,
      ease: easeSpring
    },
    className: "w-8 h-8 bg-stone-blue hover:bg-gulf-blue transition-colors flex items-center justify-center font-mono text-[11px] font-semibold text-white"
  }, user.initials), /*#__PURE__*/React.createElement(Link, {
    href: "/login",
    className: "font-mono text-[10px] tracking-button uppercase text-slate-tile/55 hover:text-slate-tile transition-colors duration-200"
  }, "Sign out"));
}
Object.assign(__ds_scope, { Nav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "nextjs/components/nav.tsx", error: String((e && e.message) || e) }); }

// nextjs/components/page-shell.tsx
try { (() => {
'use client';

function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Wraps page content; first paint is a fade-up. */
function PageShell({
  eyebrow,
  title,
  subtitle,
  children
}) {
  return /*#__PURE__*/React.createElement("main", {
    className: "max-w-[1180px] mx-auto px-10 py-9 pb-20"
  }, eyebrow && /*#__PURE__*/React.createElement(motion.div, _extends({}, fadeUp, {
    className: "font-mono text-[10px] tracking-eyebrow uppercase text-gulf-blue mb-2"
  }), eyebrow), /*#__PURE__*/React.createElement(motion.h1, _extends({}, fadeUp, {
    transition: {
      ...fadeUp.transition,
      delay: 0.06
    },
    className: "font-display font-medium text-[34px] tracking-tight m-0 mb-1 text-slate-tile"
  }), title), subtitle && /*#__PURE__*/React.createElement(motion.div, _extends({}, fadeUp, {
    transition: {
      ...fadeUp.transition,
      delay: 0.12
    },
    className: "text-sm text-slate-tile/70 mb-8"
  }), subtitle), children);
}
Object.assign(__ds_scope, { PageShell });
})(); } catch (e) { __ds_ns.__errors.push({ path: "nextjs/components/page-shell.tsx", error: String((e && e.message) || e) }); }

// nextjs/components/pill.tsx
try { (() => {
const styles = {
  default: 'text-slate-tile/55 border-bd-str',
  pending: 'text-nw-warn border-nw-warn',
  approved: 'text-nw-success border-nw-success',
  verified: 'text-nw-success border-nw-success',
  paid: 'text-slate-tile/55 border-bd-str',
  await: 'text-stone-blue border-stone-blue relative',
  sent: 'text-stone-blue border-stone-blue relative',
  danger: 'text-nw-danger border-nw-danger'
};

/**
 * Bordered status chip — never filled.
 * `await` and `sent` variants get a pulsing dot to suggest "live."
 */
function Pill({
  children,
  variant = 'default',
  className
}) {
  const pulsing = variant === 'await' || variant === 'sent';
  return /*#__PURE__*/React.createElement("span", {
    className: cn('inline-block px-2 py-0.5 font-mono text-[9px] tracking-[0.12em] uppercase border', pulsing && 'pl-3', styles[variant], className)
  }, pulsing && /*#__PURE__*/React.createElement("span", {
    className: "absolute left-1 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-current animate-[pulse-dot_1.5s_ease-in-out_infinite]"
  }), children);
}
Object.assign(__ds_scope, { Pill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "nextjs/components/pill.tsx", error: String((e && e.message) || e) }); }

// nextjs/components/invoice-row.tsx
try { (() => {
'use client';

const {
  useState
} = React;
/** Collapsible vendor invoice row. Click to expand. */
function InvoiceRow({
  invoice,
  defaultOpen = false
}) {
  const [open, setOpen] = useState(defaultOpen);
  return /*#__PURE__*/React.createElement("div", {
    className: `border ${open ? 'border-bd-str' : 'border-bd'} bg-white mb-2 transition-colors group`
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(!open),
    className: "w-full p-4 px-5 grid grid-cols-[22px_1fr_auto_auto] gap-3 items-center text-left hover:bg-stone-blue/[0.04] transition-colors cursor-pointer"
  }, /*#__PURE__*/React.createElement(ChevronRight, {
    className: `w-4 h-4 text-slate-tile/40 transition-transform duration-300 ease-out
                                  ${open ? 'rotate-90 text-stone-blue' : ''}`
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-9 h-9 bg-stone-blue/10 group-hover:bg-stone-blue/[0.18] transition-colors flex items-center justify-center font-mono text-[11px] font-semibold text-gulf-blue"
  }, invoice.vendorInitials), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "font-medium text-sm text-slate-tile"
  }, invoice.vendor), /*#__PURE__*/React.createElement("div", {
    className: "font-mono text-[10.5px] tracking-[0.08em] text-slate-tile/55 mt-0.5"
  }, "INV #", invoice.invoiceNumber, " \xB7 ", invoice.date, " \xB7 CSI ", invoice.csiCode))), /*#__PURE__*/React.createElement(__ds_scope.Pill, {
    variant: invoice.status === 'verified' ? 'verified' : 'pending'
  }, invoice.status === 'verified' ? 'Verified' : 'Over allowance'), /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-sm font-medium text-slate-tile text-right tabular-nums"
  }, formatCents(invoice.totalCents))), /*#__PURE__*/React.createElement(AnimatePresence, {
    initial: false
  }, open && /*#__PURE__*/React.createElement(motion.div, {
    initial: {
      height: 0,
      opacity: 0
    },
    animate: {
      height: 'auto',
      opacity: 1
    },
    exit: {
      height: 0,
      opacity: 0
    },
    transition: {
      duration: 0.32,
      ease: [0.22, 1, 0.36, 1]
    },
    className: "overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-5 pl-[54px] pb-5 pt-3.5 border-t border-dashed border-bd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-[auto_1fr_auto] gap-x-5 gap-y-2 text-[12.5px] text-slate-tile/80"
  }, invoice.lines.map((l, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "contents"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-[11px] text-gulf-blue"
  }, l.code), /*#__PURE__*/React.createElement("span", null, l.description), /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-slate-tile text-right tabular-nums"
  }, formatCents(l.cents))))), invoice.flagNote && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 p-2.5 px-3 bg-nw-warn/10 border-l-2 border-nw-warn text-[12.5px] text-slate-tile"
  }, invoice.flagNote), invoice.attachments && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex gap-2 flex-wrap"
  }, invoice.attachments.map((a, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: a.onClick,
    className: "px-2.5 py-1.5 bg-stone-blue/10 hover:bg-stone-blue/[0.18] border border-stone-blue/20 hover:border-stone-blue font-mono text-[10px] tracking-[0.1em] uppercase text-gulf-blue transition-colors"
  }, a.label)))))));
}
Object.assign(__ds_scope, { InvoiceRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "nextjs/components/invoice-row.tsx", error: String((e && e.message) || e) }); }

// nextjs/components/scroll-progress.tsx
try { (() => {
'use client';

const {
  useEffect,
  useState
} = React;
/**
 * Thin scroll-progress bar pinned to the top of the viewport.
 * Stone-blue, 2px, no shadow. Reads `document.documentElement` scroll
 * height. Add once at app root or layout — not per page.
 */
function ScrollProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setPct(h > 0 ? window.scrollY / h * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, {
      passive: true
    });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    "aria-hidden": true,
    style: {
      width: `${pct}%`
    },
    className: "fixed top-0 left-0 h-[2px] bg-stone-blue z-[60] transition-[width] duration-100 ease-linear"
  });
}
Object.assign(__ds_scope, { ScrollProgress });
})(); } catch (e) { __ds_ns.__errors.push({ path: "nextjs/components/scroll-progress.tsx", error: String((e && e.message) || e) }); }

// nextjs/lib/cn.ts
try { (() => {
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
Object.assign(__ds_scope, { cn });
})(); } catch (e) { __ds_ns.__errors.push({ path: "nextjs/lib/cn.ts", error: String((e && e.message) || e) }); }

// nextjs/lib/format.ts
try { (() => {
/**
 * Format a number of cents as USD with comma separators and 2 decimals.
 * Money in the DB is stored in cents (no floats). UI always tabular-nums.
 */
function formatCents(cents, opts) {
  const dec = opts?.decimals ?? 2;
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  })}`;
}

/** Money rendered as `$1.4M` etc. — only for hero KPIs / marketing. */
function formatCompactMoney(cents) {
  const n = cents / 100;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
Object.assign(__ds_scope, { formatCents, formatCompactMoney, formatDate });
})(); } catch (e) { __ds_ns.__errors.push({ path: "nextjs/lib/format.ts", error: String((e && e.message) || e) }); }

// nextjs/lib/motion.ts
try { (() => {
'use client';

// Nightwork motion system.
// Every animated element in the product reaches into this file.
// If you find yourself writing duration/ease values inline — stop, add it here.
// ============= EASING =============
// Three curves. Pick one. Never use default `ease`.
const ease = [0.22, 1, 0.36, 1]; // ease-out — state changes, page reveals
const easeSoft = [0.4, 0, 0.2, 1]; // ease-in-out — ambient motion, long
const easeSpring = [0.34, 1.56, 0.64, 1]; // overshoot — hover transforms, pop-ins
const easeIn = [0.7, 0, 0.84, 0]; // ease-in — exits

// ============= DURATIONS =============
// Nothing > 600ms. Hovers < 250ms. Micro < 150ms.
const dur = {
  micro: 0.15,
  hover: 0.22,
  short: 0.30,
  medium: 0.45,
  long: 0.60
};

// ============= ENTRY VARIANTS =============
const fadeUp = {
  initial: {
    opacity: 0,
    y: 14
  },
  animate: {
    opacity: 1,
    y: 0
  },
  exit: {
    opacity: 0,
    y: 14
  }
};
const fadeIn = {
  initial: {
    opacity: 0
  },
  animate: {
    opacity: 1
  },
  exit: {
    opacity: 0
  }
};
const slideInRight = {
  initial: {
    opacity: 0,
    x: 16
  },
  animate: {
    opacity: 1,
    x: 0
  },
  exit: {
    opacity: 0,
    x: 16
  }
};
const slideDown = {
  initial: {
    opacity: 0,
    y: -8
  },
  animate: {
    opacity: 1,
    y: 0
  }
};
const popIn = {
  initial: {
    opacity: 0,
    scale: 0.94
  },
  animate: {
    opacity: 1,
    scale: 1
  },
  exit: {
    opacity: 0,
    scale: 0.94
  }
};

// ============= TRANSITION PRESETS =============
// Use these as `transition={...}` on motion components.
const tEnter = {
  duration: dur.medium,
  ease
};
const tEnterSlow = {
  duration: dur.long,
  ease
};
const tHover = {
  duration: dur.hover,
  ease
};
const tSpring = {
  duration: dur.short,
  ease: easeSpring
};
const tModal = {
  duration: 0.35,
  ease: easeSpring
};

// ============= STAGGER =============
// Use on a parent motion.div with `variants={staggerParent}` + child variants.
const staggerParent = {
  initial: {
    opacity: 1
  },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04
    }
  }
};
// Shortcut for direct use without parent: returns transition with delay = index * 0.06s
const stagger = i => ({
  ...fadeUp,
  transition: {
    duration: dur.medium,
    ease,
    delay: i * 0.06
  }
});

// ============= AMBIENT / LIVE =============
// Use these for elements that should subtly breathe to suggest "live".
const pulseLive = {
  animate: {
    opacity: [1, 0.6, 1],
    scale: [1, 1.15, 1]
  },
  transition: {
    duration: 1.6,
    repeat: Infinity,
    ease: easeSoft
  }
};
const breathe = {
  animate: {
    scale: [1, 1.04, 1],
    opacity: [1, 0.9, 1]
  },
  transition: {
    duration: 3.5,
    repeat: Infinity,
    ease: easeSoft
  }
};

// ============= HOVER PRIMITIVES =============
// Bind to whileHover on motion components.
const hoverLift = {
  y: -1,
  transition: tHover
};
const hoverLiftLg = {
  y: -2,
  transition: tHover
};
const hoverScale = {
  scale: 1.05,
  transition: {
    duration: dur.hover,
    ease: easeSpring
  }
};
const hoverScaleSm = {
  scale: 1.02,
  transition: tHover
};
const tapShrink = {
  scale: 0.97,
  transition: {
    duration: dur.micro,
    ease
  }
};
Object.assign(__ds_scope, { ease, easeSoft, easeSpring, easeIn, dur, fadeUp, fadeIn, slideInRight, slideDown, popIn, tEnter, tEnterSlow, tHover, tSpring, tModal, staggerParent, stagger, pulseLive, breathe, hoverLift, hoverLiftLg, hoverScale, hoverScaleSm, tapShrink });
})(); } catch (e) { __ds_ns.__errors.push({ path: "nextjs/lib/motion.ts", error: String((e && e.message) || e) }); }

// nextjs/tailwind.config.ts
try { (() => {
try {
  void {
    content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
    theme: {
      extend: {
        colors: {
          // Slate palette — pulled from Ross Built brand guide + Nightwork design system
          'slate-tile': '#3B5864',
          'slate-deep': '#1A2830',
          'slate-deeper': '#132028',
          'stone-blue': '#5B8699',
          'gulf-blue': '#4E7A8C',
          'oceanside': '#CBD8DB',
          'white-sand': '#F7F5EC',
          'nw-warn': '#C98A3B',
          'nw-success': '#4A8A6F',
          'nw-danger': '#B0554E'
        },
        fontFamily: {
          display: ['var(--font-grotesk)', 'system-ui', 'sans-serif'],
          sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
          mono: ['var(--font-mono)', 'ui-monospace', 'monospace']
        },
        borderRadius: {
          none: '0',
          DEFAULT: '0',
          // CRITICAL — no rounded corners on cards/buttons/inputs
          full: '9999px' // status dots + avatars only
        },
        letterSpacing: {
          tightest: '-0.04em',
          tighter: '-0.03em',
          tight: '-0.02em',
          button: '0.12em',
          eyebrow: '0.14em'
        },
        boxShadow: {
          'nav-scroll': '0 8px 24px -12px rgba(0,0,0,0.5)',
          'rail-scroll': '0 12px 32px -16px rgba(26,40,48,0.2)',
          'hover-lift': '0 4px 6px -1px rgba(26,40,48,0.08)'
        },
        animation: {
          'fade-up': 'fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both',
          'fade-in': 'fade-in 0.35s cubic-bezier(0.22,1,0.36,1) both',
          'sweep': 'sweep 4.5s ease-in-out infinite',
          'pulse-dot': 'pulse-dot 1.6s ease-in-out infinite',
          'pop': 'pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
          'ring-pulse': 'ring-pulse 2.2s ease-out infinite',
          'grow-line': 'grow-line 1s cubic-bezier(0.22,1,0.36,1) 0.4s both'
        },
        keyframes: {
          'fade-up': {
            from: {
              opacity: '0',
              transform: 'translateY(14px)'
            },
            to: {
              opacity: '1',
              transform: 'none'
            }
          },
          'fade-in': {
            from: {
              opacity: '0'
            },
            to: {
              opacity: '1'
            }
          },
          'sweep': {
            '0%,30%': {
              left: '-60%'
            },
            '70%,100%': {
              left: '120%'
            }
          },
          'pulse-dot': {
            '0%,100%': {
              opacity: '1',
              transform: 'scale(1)'
            },
            '50%': {
              opacity: '0.5',
              transform: 'scale(1.15)'
            }
          },
          'pop': {
            '0%': {
              transform: 'scale(0.94)',
              opacity: '0'
            },
            '100%': {
              transform: 'scale(1)',
              opacity: '1'
            }
          },
          'ring-pulse': {
            '0%': {
              boxShadow: '0 0 0 0 rgba(201,138,59,0.5)'
            },
            '70%': {
              boxShadow: '0 0 0 12px rgba(201,138,59,0)'
            },
            '100%': {
              boxShadow: '0 0 0 0 rgba(201,138,59,0)'
            }
          },
          'grow-line': {
            from: {
              transform: 'scaleY(0)'
            },
            to: {
              transform: 'scaleY(1)'
            }
          }
        }
      }
    },
    plugins: []
  };
} catch {}
})(); } catch (e) { __ds_ns.__errors.push({ path: "nextjs/tailwind.config.ts", error: String((e && e.message) || e) }); }

__ds_ns.LoginPage = __ds_scope.LoginPage;

__ds_ns.DrawDetailPage = __ds_scope.DrawDetailPage;

__ds_ns.RootLayout = __ds_scope.RootLayout;

__ds_ns.PortalPage = __ds_scope.PortalPage;

__ds_ns.ActionBanner = __ds_scope.ActionBanner;

__ds_ns.ApproveRail = __ds_scope.ApproveRail;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.CardHeader = __ds_scope.CardHeader;

__ds_ns.CountUp = __ds_scope.CountUp;

__ds_ns.Eyebrow = __ds_scope.Eyebrow;

__ds_ns.InvoiceRow = __ds_scope.InvoiceRow;

__ds_ns.KpiStrip = __ds_scope.KpiStrip;

__ds_ns.Nav = __ds_scope.Nav;

__ds_ns.PageShell = __ds_scope.PageShell;

__ds_ns.Pill = __ds_scope.Pill;

__ds_ns.ScrollProgress = __ds_scope.ScrollProgress;

})();
