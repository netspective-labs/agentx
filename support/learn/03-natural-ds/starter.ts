#!/usr/bin/env -S deno run -A --watch --unstable-bundle --node-modules-dir=auto
/**
 * Starter app for Natural DS.
 *
 * Demonstrates how to compose context bars, sidebar subjects, breadcrumbs,
 * and component-heavy content while keeping an emphasis on type-safe patterns.
 * Engineers can copy sections, tweak props, and stay confident because every
 * builder call here respects the Natural DS typings (no raw strings or untyped
 * HTML fragments).
 */
import { Application, htmlResponse } from "../../../lib/continuux/http.ts";
import {
  badge,
  bodyText,
  type BreadcrumbSegment,
  callout,
  codeBlock,
  exampleWrapper,
  featureCard,
  featureGrid,
  NaturalBreadcrumbsBuilder,
  NaturalContextBarBuilder,
  naturalDesignSystem,
  NaturalSidebarBuilder,
  sectionHeading,
  type SidebarNavEntry,
  type SidebarSubject,
  steps,
  subsectionHeading,
  tabs,
  tocLink,
  tocList,
} from "../../../lib/natural-ds/mod.ts";
import { icons } from "../../../lib/natural-html/assets.ts";
import type {
  NamingStrategy,
  RenderCtx,
} from "../../../lib/natural-html/design-system.ts";
import * as H from "../../../lib/natural-html/elements.ts";
import {
  headSlots,
  type RenderInput,
} from "../../../lib/natural-html/patterns.ts";

type State = Record<string, never>;
type Vars = Record<string, never>;

const app = Application.sharedState<State, Vars>({});
const ds = naturalDesignSystem();

type ContextPageId = "components" | "patterns";

// Define the top-level context navigation entries used by the context bar and breadcrumbs;
// keeping this centralized keeps labels and hrefs consistent across builders.
const contextNavDefinitions = [
  {
    id: "components",
    label: "Components",
    href: "/components",
    icon: icons.docs,
  },
  { id: "patterns", label: "Patterns", href: "/patterns", icon: icons.grid },
];

// Keep a strongly typed lookup for context labels so breadcrumbs stay in sync.
// Use const assertions where possible to narrow literal types that feed into builders.
const contextNavMap = contextNavDefinitions.reduce<
  Record<string, { readonly label: string; readonly href?: string }>
>((map, entry) => {
  map[entry.id] = { label: entry.label, href: entry.href };
  return map;
}, {} as Record<string, { readonly label: string; readonly href?: string }>);

type SubjectDefinition = SidebarSubject & {
  readonly navEntries: readonly SidebarNavEntry[];
};

// Each context defines its own subjects and nav trees to demonstrate reuse.
// Map contexts to their subjects/nav trees—reusing the same metadata makes sidebar rendering predictable.
// Note: keep nav entry arrays readonly and define their `kind` (`link`, `category`, etc.)
// literally so TypeScript infers the precise discriminated union required by the builder.
const subjectsByContext: Record<ContextPageId, readonly SubjectDefinition[]> = {
  components: [
    {
      id: "primitives",
      title: "Primitives",
      description: "Standalone tokens, badge helpers, and helper components.",
      icon: icons.home,
      navEntries: [
        { kind: "category", label: "Foundation" },
        { kind: "link", label: "Overview", href: "#components-hero" },
        { kind: "link", label: "Simple Examples", href: "#components-simple" },
        { kind: "category", label: "Pattern Samples" },
        { kind: "link", label: "Medium Patterns", href: "#components-medium" },
        { kind: "link", label: "Complex Mix", href: "#components-complex" },
      ],
    },
    {
      id: "layouts",
      title: "Layouts & Grids",
      description: "Grid/panel helpers and responsive layout patterns.",
      icon: icons.grid,
      navEntries: [
        { kind: "category", label: "Layout Tools" },
        { kind: "link", label: "Stack Layouts", href: "#components-layouts" },
        {
          kind: "expandable",
          label: "Feature Groups",
          expanded: true,
          children: [
            { label: "Feature Cards", href: "#components-feature" },
            { label: "Complex Mix", href: "#components-flows" },
          ],
        },
        { kind: "link", label: "Composed Flows", href: "#components-flows" },
      ],
    },
  ],
  patterns: [
    {
      id: "flows",
      title: "Flows",
      description: "Guided interaction patterns and decision helpers.",
      icon: icons.chat,
      navEntries: [
        { kind: "category", label: "Reading Flow" },
        { kind: "link", label: "Reading Flow", href: "#patterns-guide" },
        { kind: "link", label: "Action Flow", href: "#patterns-actions" },
      ],
    },
    {
      id: "docs",
      title: "Documentation",
      description:
        "Documentation scaffolding, sections, and narrative helpers.",
      icon: icons.docs,
      navEntries: [
        { kind: "category", label: "Docs Layout" },
        { kind: "link", label: "Docs Layout", href: "#patterns-docs" },
        { kind: "link", label: "TOC & Breadcrumbs", href: "#patterns-toc" },
      ],
    },
  ],
};

const defaultContext: ContextPageId = "components";

const buildContextHeader = (
  ctx: RenderCtx<RenderInput, NamingStrategy>,
  active: ContextPageId,
) =>
  new NaturalContextBarBuilder(ctx)
    .withBrand({ label: "Natural DS Lab", iconText: "ND" })
    // Keep nav entries typed as `link` so we never pass arbitrary kinds.
    .withNavEntries(
      contextNavDefinitions.map((entry) => ({
        kind: "link" as const,
        label: entry.label,
        href: entry.href,
        icon: entry.icon,
        active: entry.id === active,
      })),
    )
    .withActions([
      { label: "Search", icon: icons.search },
      { label: "Feedback", icon: icons.chat },
    ])
    .withUser({
      initials: "NL",
      name: "Natural Learner",
      chevron: icons.chevronDown,
    })
    .build();

// Sidebar builder stays declarative: pass typed subjects/nav entries and let it render.
// Sidebar rendering is shared between contexts; the builder just receives typed nav data and subjects.
// Sidebar rendering is shared between contexts; keep the subjects/nav trees defined above
// and reuse them to avoid re-typing the same entries in each page.
const renderSidebar = (
  ctx: RenderCtx<RenderInput, NamingStrategy>,
  contextId: ContextPageId,
  subjectId: string,
) => {
  const subjects = subjectsByContext[contextId];
  const active = subjects.find((subject) => subject.id === subjectId) ??
    subjects[0];
  return new NaturalSidebarBuilder(ctx)
    .withHeader({
      label: "Component Catalog",
      iconText: "CC",
      toggleIcon: icons.toggle,
    })
    .withSubjectSelector({
      subjects,
      activeId: active.id,
      icon: icons.grid,
      chevron: icons.chevronsUpDown,
      triggerId: "subject-trigger",
      popupId: "subject-popup",
      // Sidebar builder stays agnostic of routing; just return an href string.
      onSelect: (subject) => `/${contextId}/${subject.id}`,
    })
    .withNavEntries([...active.navEntries])
    .build();
};

// Breadcrumbs rely on path metadata, so we keep the builder pure and typed here.
// Breadcrumbs derive their trail from the request path metadata and subject info, keeping links consistent.
const renderBreadcrumbs = (
  ctx: RenderCtx<RenderInput, NamingStrategy>,
  contextId: ContextPageId,
  subjectId: string,
  request: Request,
) =>
  // Breadcrumb builder derives segments from the request path so we stay consistent with routing metadata.
  new NaturalBreadcrumbsBuilder(ctx)
    .withHome({ label: "Home", href: "/", icon: icons.home })
    .withRequestTrail(request, {
      metadata: { contextId, subjectId },
      trail: (
        { segments, contextId: resolvedContext, subjectId: resolvedSubject },
      ) => {
        const crumbs: BreadcrumbSegment[] = [];
        const ctx = contextNavMap[resolvedContext ?? contextId] ??
          contextNavMap[defaultContext];
        if (ctx) crumbs.push({ label: ctx.label, href: ctx.href });
        const subject = subjectsByContext[contextId].find((subject) =>
          subject.id === resolvedSubject
        ) ??
          subjectsByContext[contextId][0];
        crumbs.push({
          label: subject.title,
          href: `/${contextId}/${subject.id}`,
        });
        const sectionIdx = contextId === "components" ? 2 : 1;
        const sectionId = segments[sectionIdx];
        if (sectionId) {
          crumbs.push({
            label: sectionId.replace(/-/g, " "),
            href: `#${sectionId}`,
          });
        }
        return crumbs;
      },
    })
    .build();

export type BadgeVariant = {
  readonly label: string;
  readonly variant?: string;
};

// Helper that simplifies creating badge rows with typed variants.
export const badgeRow = (
  ctx: RenderCtx<RenderInput, NamingStrategy>,
  variants: readonly BadgeVariant[],
) =>
  // Compose badges from typed props so callers can rely on variants being defined.
  H.div(
    { class: "badge-row" },
    ...variants.map((variant) =>
      badge(ctx, {
        label: variant.label,
        variant: variant.variant,
      })
    ),
  );

const renderComponentsContent = (
  ctx: RenderCtx<RenderInput, NamingStrategy>,
  subject: SubjectDefinition,
) =>
  H.div(
    H.section(
      { id: "components-hero" },
      sectionHeading(ctx, { title: "Component Fundamentals" }),
      bodyText(ctx, {
        content:
          `Exploring ${subject.title} within Natural DS surfaces the building blocks we use everywhere.`,
      }),
      exampleWrapper(ctx, {
        label: "Badge Tokens",
        content: H.div(
          badgeRow(ctx, [
            { label: "Default" },
            { label: "Primary", variant: "primary" },
            { label: "Info", variant: "info" },
          ]),
        ),
      }),
    ),
    H.section(
      { id: "components-layouts" },
      sectionHeading(ctx, { title: "Layout Helpers" }),
      bodyText(ctx, {
        content:
          "Combine grid cards and stack helpers as responsive sections for dashboards and product pages.",
      }),
      featureGrid(ctx, {
        cards: [
          featureCard(ctx, {
            icon: "📦",
            title: "Stacked Panels",
            description:
              "Use cards inside a horizontal wrap to display grouped content.",
          }),
          featureCard(ctx, {
            icon: "🧩",
            title: "Responsive Tiles",
            description:
              "Cards automatically adjust to the available width while retaining padding + gap.",
          }),
        ],
      }),
    ),
    H.section(
      { id: "components-flows" },
      sectionHeading(ctx, { title: "Complex Mix" }),
      callout(ctx, {
        title: "Layered Interactions",
        icon: icons.info,
        variant: "info",
        content:
          "Compose tabs, callouts, and custom grids to deliver content-heavy dashboards without overwhelming layouts.",
      }),
      tabs(ctx, {
        tabs: [
          {
            label: "Simple",
            content: bodyText(ctx, {
              content:
                "Stacked components require minimal markup and keep spacing consistent.",
            }),
          },
          {
            label: "Medium",
            content: bodyText(ctx, {
              content:
                "Medium complexity flows combine accordions or steps with inline badges to surface context.",
            }),
          },
          {
            label: "Complex",
            content: bodyText(ctx, {
              content:
                "Complex flows orchestrate data tables, graphs, and helper callouts with guided steps.",
            }),
          },
        ],
      }),
    ),
  );

const renderPatternsContent = (
  ctx: RenderCtx<RenderInput, NamingStrategy>,
  subject: SubjectDefinition,
) =>
  H.div(
    H.section(
      { id: "patterns-guide" },
      sectionHeading(ctx, { title: `Guided ${subject.title}` }),
      bodyText(ctx, {
        content:
          "Narrative flows keep users oriented while we sprinkle callouts to highlight decisions.",
      }),
      steps(ctx, {
        steps: [
          {
            title: "Define the signal",
            description: "Know exactly what the user should do next.",
          },
          {
            title: "Visualize it",
            description: "Use diagram grids + callouts to explain reasons.",
          },
          {
            title: "Enable action",
            description:
              "End with a primary action and a supportive secondary link.",
          },
        ],
      }),
    ),
    H.section(
      { id: "patterns-actions" },
      sectionHeading(ctx, { title: "Actionable Pattern" }),
      bodyText(ctx, {
        content:
          "You can pair callouts with highlighted examples when the user needs context before acting.",
      }),
      callout(ctx, {
        title: "Proactive help",
        icon: icons.tip,
        variant: "tip",
        content:
          "Provide inline guidance with a badge or icon to emphasize the recommended path forward.",
      }),
    ),
    H.section(
      { id: "patterns-docs" },
      subsectionHeading(ctx, { title: "Docs Layout" }),
      codeBlock(ctx, {
        content: H.pre(
          H.codeTag(
            "section>h2+div",
            H.br(),
            "section>h3+div",
          ),
        ),
      }),
    ),
  );

const pageHtml = (
  contextId: ContextPageId,
  subjectId: string,
  request: Request,
): string => {
  const subjectList = subjectsByContext[contextId];
  const subject = subjectList.find((item) => item.id === subjectId) ??
    subjectList[0];

  const page = ds.page("NaturalDoc", {}, {
    slots: {
      contextHeader: (ctx) => buildContextHeader(ctx, contextId),
      sidebar: (ctx) => renderSidebar(ctx, contextId, subject.id),
      breadcrumbs: (ctx) =>
        renderBreadcrumbs(ctx, contextId, subject.id, request),
      content: (ctx) =>
        contextId === "components"
          ? renderComponentsContent(ctx, subject)
          : renderPatternsContent(ctx, subject),
      toc: (ctx) =>
        contextId === "components"
          ? tocList(ctx, {
            title: "This section",
            items: [
              tocLink(ctx, {
                label: "Overview",
                href: "#components-hero",
                active: true,
              }),
              tocLink(ctx, { label: "Layouts", href: "#components-layouts" }),
              tocLink(ctx, { label: "Flows", href: "#components-flows" }),
            ],
          })
          : H.span(),
    },
    headSlots: headSlots({
      title: `${contextNavMap[contextId]?.label ?? "Components"} • Natural DS`,
    }),
    styleAttributeEmitStrategy: "head",
  });

  return H.render(page);
};

const contexts: readonly ContextPageId[] = ["components", "patterns"];

const respondPage = (
  request: Request,
  contextId: ContextPageId,
  subjectId?: string,
) => {
  const ctxId = contexts.includes(contextId) ? contextId : defaultContext;
  const subjects = subjectsByContext[ctxId];
  const resolvedSubject =
    subjects.find((subject) => subject.id === subjectId) ?? subjects[0];
  return htmlResponse(pageHtml(ctxId, resolvedSubject.id, request));
};

app.get("/", (c) => respondPage(c.req, defaultContext));
app.get("/components", (c) => respondPage(c.req, "components"));
app.get(
  "/components/:subject",
  (c) => respondPage(c.req, "components", c.params.subject),
);
app.get("/patterns", (c) => respondPage(c.req, "patterns"));
app.get(
  "/patterns/:subject",
  (c) => respondPage(c.req, "patterns", c.params.subject),
);

app.serve({ port: 7601 });
