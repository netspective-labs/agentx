import type { RenderCtx } from "../../natural-html/design-system.ts";
import {
  type ComponentStylesheets,
  defineComponent,
  NamingStrategy,
} from "../../natural-html/design-system.ts";
import * as h from "../../natural-html/elements.ts";
import {
  combineHast,
  type Content,
  renderContent,
  type RenderInput,
} from "../../natural-html/patterns.ts";
import type { SidebarNavEntry } from "./sidebar.ts";
import { icons } from "../../natural-html/assets.ts";

const breadcrumbStyles: ComponentStylesheets = [
  {
    "breadcrumb-item": {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "13px",
      color: "#525252",
      textDecoration: "none",
      transition: "color 0.15s ease",
    },
    "breadcrumb-separator-icon": {
      width: "14px",
      height: "14px",
    },
    "breadcrumb-item-home": {
      color: "#737373",
    },
    "breadcrumb-item-current": {
      color: "#0a0a0a",
      fontWeight: 500,
      cursor: "default",
    },
    "breadcrumb-separator": {
      color: "#d4d4d4",
      display: "flex",
      alignItems: "center",
    },
  },
];

export type BreadcrumbItemProps<Ctx extends object = RenderInput> = {
  readonly label?: string;
  readonly href?: string;
  readonly icon?: Content<Ctx, NamingStrategy>;
  readonly current?: boolean;
  readonly home?: boolean;
};

export const breadcrumbItem = defineComponent<
  BreadcrumbItemProps,
  RenderInput
>(
  "BreadcrumbItem",
  breadcrumbStyles,
  (ctx, props) => {
    const icon = renderContent(ctx, props.icon);
    const className = ctx.cls(
      "breadcrumb-item",
      props.home ? "breadcrumb-item-home" : null,
      props.current ? "breadcrumb-item-current" : null,
    );
    if (props.current) {
      return h.span(
        { class: className, "aria-current": "page" },
        icon,
        props.label,
      );
    }
    return h.a(
      { class: className, href: props.href ?? "#" },
      icon,
      props.label,
    );
  },
);

export const breadcrumbSeparator = defineComponent<
  Record<PropertyKey, never>,
  RenderInput
>(
  "BreadcrumbSeparator",
  breadcrumbStyles,
  () =>
    h.span(
      { class: "breadcrumb-separator", "aria-hidden": "true" },
      icons.breadcrumbChevron,
    ),
);

export type BreadcrumbSegment = {
  readonly label: string;
  readonly href?: string;
  readonly icon?: Content<RenderInput, NamingStrategy>;
};

export type BreadcrumbTrailOptions = {
  readonly contextNavId?: string;
  readonly contextMap?: Record<
    string,
    { readonly label: string; readonly href?: string }
  >;
  readonly subject?: BreadcrumbSubject;
  readonly repo?: { readonly label: string; readonly href?: string };
};

export type BreadcrumbSubjectMetadata = {
  readonly id: string;
  readonly href?: string;
  readonly label?: string;
  readonly title?: string;
};

export type BreadcrumbRequestTrailOptions<
  Subject extends BreadcrumbSubjectMetadata = BreadcrumbSubjectMetadata,
> = BreadcrumbTrailOptions & {
  readonly request: Request;
  readonly defaultContextId?: string;
  readonly contextSegmentIndex?: number;
  readonly contextIdFromPath?: (
    segments: readonly string[],
  ) => string | undefined;
  readonly subjectSegmentIndex?: number;
  readonly subjectIdFromPath?: (
    segments: readonly string[],
  ) => string | undefined;
  readonly repoSegmentIndex?: number;
  readonly repoSlugFromPath?: (
    segments: readonly string[],
  ) => string | undefined;
  readonly subjects?: readonly Subject[];
  readonly subjectLabel?: (subject: Subject) => string;
  readonly subjectHref?: (subject: Subject) => string | undefined;
  readonly repoResolver?: (
    slug: string,
    subject?: Subject,
  ) => BreadcrumbSegment | undefined;
  readonly navEntries?: readonly SidebarNavEntry[];
  readonly navEntryResolver?: (
    segments: readonly string[],
    entries: readonly SidebarNavEntry[],
  ) => BreadcrumbSegment | undefined;
};

export type BreadcrumbSubject = {
  readonly label: string;
  readonly href?: string;
};

export class NaturalBreadcrumbsBuilder {
  readonly #ctx: RenderCtx<RenderInput, NamingStrategy>;
  #home?: BreadcrumbSegment;
  #segments: BreadcrumbSegment[] = [];

  constructor(ctx: RenderCtx<RenderInput, NamingStrategy>) {
    this.#ctx = ctx;
  }

  withHome(home: BreadcrumbSegment): this {
    this.#home = home;
    return this;
  }

  append(segment: BreadcrumbSegment): this {
    this.#segments.push(segment);
    return this;
  }

  appendMany(segments: readonly BreadcrumbSegment[]): this {
    this.#segments.push(...segments);
    return this;
  }

  withAutoTrail(opts: BreadcrumbTrailOptions): this {
    if (opts.contextNavId && opts.contextMap) {
      const nav = opts.contextMap[opts.contextNavId];
      if (nav) {
        this.append({ label: nav.label, href: nav.href });
      }
    }
    if (opts.subject) {
      this.append({ label: opts.subject.label, href: opts.subject.href });
    }
    if (opts.repo) {
      this.append({ label: opts.repo.label, href: opts.repo.href });
    }
    return this;
  }

  withRequestTrail<Subject extends BreadcrumbSubjectMetadata>(
    opts: BreadcrumbRequestTrailOptions<Subject>,
  ): this {
    const segments = new URL(opts.request.url).pathname
      .split("/")
      .filter((segment) => segment.length > 0);

    const contextId = opts.contextIdFromPath?.(segments) ??
      segments[opts.contextSegmentIndex ?? 0] ??
      opts.contextNavId ??
      opts.defaultContextId;

    if (contextId && opts.contextMap) {
      const entry = opts.contextMap[contextId];
      if (entry) {
        this.append({ label: entry.label, href: entry.href });
      }
    }

    const subjectId = opts.subjectIdFromPath?.(segments) ??
      segments[opts.subjectSegmentIndex ?? 1];
    const subject = subjectId
      ? opts.subjects?.find((value) => value.id === subjectId)
      : undefined;
    if (subject) {
      this.append({
        label: opts.subjectLabel?.(subject) ??
          subject.label ??
          subject.title ??
          subject.id,
        href: opts.subjectHref?.(subject) ?? subject.href,
      });
    } else if (opts.subject) {
      this.append({
        label: opts.subject.label,
        href: opts.subject.href,
      });
    }

    if (opts.navEntries && opts.navEntryResolver) {
      const navSegment = opts.navEntryResolver(segments, opts.navEntries);
      if (navSegment) {
        this.append(navSegment);
      }
    }

    const repoSlug = opts.repoSlugFromPath?.(segments) ??
      segments[opts.repoSegmentIndex ?? 2];
    let repoSegment = repoSlug && opts.repoResolver
      ? opts.repoResolver(repoSlug, subject)
      : undefined;
    if (!repoSegment && opts.repo) {
      repoSegment = opts.repo;
    }
    if (repoSegment) {
      this.append(repoSegment);
    }

    return this;
  }

  build(): h.RawHtml {
    const items: BreadcrumbSegment[] = [
      ...(this.#home ? [this.#home] : []),
      ...this.#segments,
    ];

    if (items.length === 0) {
      return h.span();
    }

    const lastIndex = items.length - 1;
    const nodes: h.RawHtml[] = [];

    items.forEach((item, index) => {
      const current = index === lastIndex;
      nodes.push(
        breadcrumbItem(this.#ctx, {
          label: item.label,
          href: current ? undefined : item.href,
          icon: item.icon,
          current,
          home: index === 0 && !!this.#home,
        }),
      );
      if (index < lastIndex) {
        nodes.push(breadcrumbSeparator(this.#ctx, {}));
      }
    });

    return combineHast(...nodes);
  }
}
