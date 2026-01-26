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

export type BreadcrumbTrailContext<
  Meta extends Record<PropertyKey, unknown> = Record<PropertyKey, never>,
> = Meta & {
  readonly request: Request;
  readonly segments: readonly string[];
};

export type BreadcrumbTrailOptions<
  Meta extends Record<PropertyKey, unknown> = Record<PropertyKey, never>,
> = {
  readonly metadata?: Meta;
  readonly trail: (
    context: BreadcrumbTrailContext<Meta>,
  ) => readonly BreadcrumbSegment[];
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

  withAutoTrail<
    Meta extends Record<PropertyKey, unknown> = Record<PropertyKey, never>,
  >(opts: BreadcrumbTrailOptions<Meta>): this {
    const metadata = opts.metadata ?? ({} as Meta);
    const ctx: BreadcrumbTrailContext<Meta> = {
      request: new Request("about:blank"),
      segments: [],
      ...metadata,
    };
    opts.trail(ctx).forEach((segment) => this.append(segment));
    return this;
  }

  withRequestTrail<
    Meta extends Record<PropertyKey, unknown> = Record<PropertyKey, never>,
  >(
    request: Request,
    opts: BreadcrumbTrailOptions<Meta>,
  ): this {
    const segments = new URL(request.url).pathname
      .split("/")
      .filter((segment) => segment.length > 0);

    const metadata = opts.metadata ?? ({} as Meta);
    const ctx: BreadcrumbTrailContext<Meta> = {
      request,
      segments,
      ...metadata,
    };
    opts.trail(ctx).forEach((segment) => this.append(segment));
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
