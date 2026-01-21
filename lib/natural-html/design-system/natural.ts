/**
 * @module lib/natural-html/design-system/natural.ts
 *
 * Natural DS derived from natural-ds.html reference.
 */
import {
  ComponentStylesheets,
  createDesignSystem,
  defineComponent,
  defineLayout,
  defineRegion,
  NamingStrategy,
  RenderCtx,
  SlotBuilder,
  slots,
} from "../design-system.ts";
import * as h from "../elements.ts";
import { HeadSlotInput, headSlots, headSlotSpec } from "../patterns.ts";

type RenderInput = Record<PropertyKey, never>;

type Content<Ctx extends object, NS extends NamingStrategy> =
  | SlotBuilder<Ctx, NS>
  | h.RawHtml
  | string
  | null
  | undefined;

function renderContent<Ctx extends object, NS extends NamingStrategy>(
  ctx: RenderCtx<Ctx, NS>,
  content: Content<Ctx, NS>,
): h.RawHtml | null {
  if (!content) return null;
  if (typeof content === "function") return content(ctx);
  if (typeof content === "string") return h.text(content);
  return content;
}

function renderContents<Ctx extends object, NS extends NamingStrategy>(
  ctx: RenderCtx<Ctx, NS>,
  items: readonly Content<Ctx, NS>[],
): Array<h.RawHtml | null> {
  return items.map((item) => renderContent(ctx, item));
}

function combineHast(...parts: h.RawHtml[]): h.RawHtml {
  const nodes = parts.flatMap((p) => p.__nodes ?? []);
  const raw = parts.map((p) => p.__rawHtml).join("");
  return { __rawHtml: raw, __nodes: nodes };
}

export const naturalNaming: NamingStrategy = {
  elemIdValue: (suggested) => suggested,
  elemDataAttr: (suggestedKeyName) => `data-${suggestedKeyName}`,
  className: (suggested) => suggested,
};

/* -----------------------------------------------------------------------------
 * Components: Context Header
 * -------------------------------------------------------------------------- */

const contextHeaderStyles: ComponentStylesheets = [
  {
    "context-header-left": {
      display: "flex",
      alignItems: "center",
      gap: "24px",
    },
    "context-brand": {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      textDecoration: "none",
      color: "#ffffff",
      fontWeight: 600,
      fontSize: "15px",
    },
    "context-brand-icon": {
      width: "28px",
      height: "28px",
      background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontSize: "12px",
      fontWeight: "bold",
    },
    "context-nav": {
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    "context-nav-link": {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 12px",
      borderRadius: "6px",
      textDecoration: "none",
      color: "#a3a3a3",
      fontSize: "13px",
      fontWeight: 500,
    },
    "context-nav-link-active": {
      color: "#ffffff",
      background: "#262626",
    },
    "context-header-right": {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    "context-icon-btn": {
      width: "36px",
      height: "36px",
      border: "none",
      background: "transparent",
      borderRadius: "6px",
      color: "#a3a3a3",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    "notification-badge": {
      position: "absolute",
      top: "6px",
      right: "6px",
      width: "8px",
      height: "8px",
      background: "#f97316",
      borderRadius: "50%",
      border: "2px solid #0a0a0a",
    },
    "context-divider": {
      width: "1px",
      height: "24px",
      background: "#333333",
      margin: "0 8px",
    },
    "context-user": {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "4px 8px 4px 4px",
      borderRadius: "6px",
      cursor: "pointer",
    },
    "context-avatar": {
      width: "28px",
      height: "28px",
      borderRadius: "50%",
      background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontSize: "11px",
      fontWeight: 600,
    },
    "context-user-name": {
      fontSize: "13px",
      color: "#e5e5e5",
      fontWeight: 500,
    },
    "context-user-chevron": {
      color: "#737373",
    },
  },
];

export type ContextBrandProps<Ctx extends object = RenderInput> = {
  readonly label: string;
  readonly href?: string;
  readonly icon?: Content<Ctx, NamingStrategy>;
  readonly iconText?: string;
};

export const contextBrand = defineComponent<
  ContextBrandProps,
  RenderInput,
  NamingStrategy
>(
  "ContextBrand",
  contextHeaderStyles,
  (ctx, props) => {
    const icon = renderContent(ctx, props.icon) ??
      h.text(props.iconText ?? "DS");
    return h.a(
      { href: props.href ?? "#", class: ctx.cls("context-brand") },
      h.span({ class: ctx.cls("context-brand-icon") }, icon),
      h.span(props.label),
    );
  },
);

export type ContextNavLinkProps<Ctx extends object = RenderInput> = {
  readonly label: string;
  readonly href?: string;
  readonly icon?: Content<Ctx, NamingStrategy>;
  readonly active?: boolean;
};

export const contextNavLink = defineComponent<
  ContextNavLinkProps,
  RenderInput,
  NamingStrategy
>(
  "ContextNavLink",
  contextHeaderStyles,
  (ctx, props) => {
    const icon = renderContent(ctx, props.icon);
    return h.a(
      {
        href: props.href ?? "#",
        class: ctx.cls(
          "context-nav-link",
          props.active ? "context-nav-link-active" : null,
        ),
      },
      icon,
      h.span(props.label),
    );
  },
);

export type ContextIconButtonProps<Ctx extends object = RenderInput> = {
  readonly label: string;
  readonly icon: Content<Ctx, NamingStrategy>;
  readonly badge?: boolean;
};

export const contextIconButton = defineComponent<
  ContextIconButtonProps,
  RenderInput,
  NamingStrategy
>(
  "ContextIconButton",
  contextHeaderStyles,
  (ctx, props) =>
    h.button(
      { class: ctx.cls("context-icon-btn"), "aria-label": props.label },
      renderContent(ctx, props.icon),
      props.badge ? h.span({ class: ctx.cls("notification-badge") }) : null,
    ),
);

export type ContextUserProps = {
  readonly initials: string;
  readonly name: string;
  readonly chevron?: h.RawHtml;
};

export const contextUser = defineComponent<ContextUserProps, RenderInput>(
  "ContextUser",
  contextHeaderStyles,
  (_ctx, props) =>
    h.div(
      { class: "context-user" },
      h.div({ class: "context-avatar" }, props.initials),
      h.span({ class: "context-user-name" }, props.name),
      props.chevron
        ? h.span({ class: "context-user-chevron" }, props.chevron)
        : null,
    ),
);

export type ContextHeaderContentProps<Ctx extends object = RenderInput> = {
  readonly brand: Content<Ctx, NamingStrategy>;
  readonly nav: readonly Content<Ctx, NamingStrategy>[];
  readonly actions: readonly Content<Ctx, NamingStrategy>[];
  readonly user: Content<Ctx, NamingStrategy>;
};

export const contextHeaderContent = defineComponent<
  ContextHeaderContentProps,
  RenderInput
>(
  "ContextHeaderContent",
  contextHeaderStyles,
  (ctx, props) =>
    combineHast(
      h.div(
        { class: ctx.cls("context-header-left") },
        renderContent(ctx, props.brand),
        h.nav(
          { class: ctx.cls("context-nav") },
          ...renderContents(ctx, props.nav),
        ),
      ),
      h.div(
        { class: ctx.cls("context-header-right") },
        ...renderContents(ctx, props.actions),
        h.div({ class: ctx.cls("context-divider") }),
        renderContent(ctx, props.user),
      ),
    ),
);

/* -----------------------------------------------------------------------------
 * Components: Sidebar and Navigation
 * -------------------------------------------------------------------------- */

const sidebarStyles: ComponentStylesheets = [
  {
    "sidebar-header": {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      paddingBottom: "16px",
      borderBottom: "1px solid #e5e5e5",
    },
    logo: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontWeight: 600,
      fontSize: "15px",
      color: "#0a0a0a",
      textDecoration: "none",
    },
    "logo-icon": {
      width: "24px",
      height: "24px",
      background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontSize: "12px",
      fontWeight: "bold",
    },
    "theme-toggle": {
      width: "32px",
      height: "32px",
      border: "1px solid #e5e5e5",
      borderRadius: "6px",
      background: "transparent",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#737373",
    },
    "search-bar": {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 12px",
      background: "#f5f5f5",
      border: "1px solid #e5e5e5",
      borderRadius: "8px",
      cursor: "pointer",
    },
    "search-left": {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      color: "#737373",
    },
    "search-icon": {
      width: "16px",
      height: "16px",
    },
    "search-placeholder": {
      fontSize: "13px",
    },
    "search-shortcut": {
      display: "flex",
      gap: "4px",
    },
    kbd: {
      padding: "2px 6px",
      background: "#ffffff",
      border: "1px solid #e5e5e5",
      borderRadius: "4px",
      fontSize: "11px",
      fontFamily: "inherit",
      color: "#737373",
    },
    "subject-selector-wrapper": {
      position: "relative",
      marginBottom: "0",
    },
    "subject-selector": {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "8px 12px",
      background: "#ffffff",
      border: "1px solid #e5e5e5",
      borderRadius: "8px",
      cursor: "pointer",
      width: "100%",
      textAlign: "left",
    },
    "subject-selector-icon": {
      width: "24px",
      height: "24px",
      background: "linear-gradient(135deg, #f59e0b, #d97706)",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    "subject-selector-name": {
      flex: "1",
      fontSize: "14px",
      fontWeight: 500,
      color: "#0a0a0a",
    },
    "selector-chevrons": {
      width: "16px",
      height: "16px",
      color: "#737373",
      flexShrink: 0,
    },
    "subject-popup": {
      position: "absolute",
      top: "calc(100% + 8px)",
      left: 0,
      right: 0,
      background: "#ffffff",
      border: "1px solid #e5e5e5",
      borderRadius: "12px",
      boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
      zIndex: 100,
      overflow: "hidden",
      opacity: 0,
      visibility: "hidden",
      transform: "translateY(-8px)",
    },
    "subject-option": {
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
      padding: "12px 16px",
      cursor: "pointer",
    },
    "option-icon": {
      width: "28px",
      height: "28px",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      background: "#f3f4f6",
    },
    "option-info": {
      flex: "1",
    },
    "option-title": {
      fontSize: "14px",
      fontWeight: 500,
      color: "#0a0a0a",
    },
    "option-description": {
      fontSize: "12px",
      color: "#737373",
      marginTop: "2px",
    },
    "nav-section": {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
    },
    "nav-category": {
      fontSize: "11px",
      fontWeight: 600,
      color: "#737373",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      padding: "8px 0 4px 0",
      marginTop: "8px",
    },
    "nav-link": {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 12px",
      borderRadius: "6px",
      textDecoration: "none",
      color: "#525252",
      fontSize: "13px",
      position: "relative",
    },
    "nav-link-active": {
      background: "#fff7ed",
      color: "#ea580c",
      fontWeight: 500,
    },
    "nav-link-indicator": {
      position: "absolute",
      left: 0,
      width: "3px",
      height: "24px",
      background: "#f97316",
      borderRadius: "0 2px 2px 0",
      top: "50%",
      transform: "translateY(-50%)",
    },
    "nav-icon": {
      width: "16px",
      height: "16px",
      opacity: 0.7,
    },
    "nav-expandable": {
      display: "flex",
      flexDirection: "column",
    },
    "nav-toggle": {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 12px",
      borderRadius: "6px",
      textDecoration: "none",
      color: "#525252",
      fontSize: "13px",
      cursor: "pointer",
      background: "none",
      border: "none",
      width: "100%",
      textAlign: "left",
      fontFamily: "inherit",
    },
    "nav-chevron": {
      width: "14px",
      height: "14px",
      marginLeft: "auto",
      opacity: 0.6,
    },
    "nav-children": {
      marginLeft: "20px",
      paddingLeft: "12px",
      borderLeft: "1px solid #e5e5e5",
      display: "flex",
      flexDirection: "column",
      gap: "2px",
      marginTop: "2px",
    },
    "nav-child-link": {
      display: "block",
      padding: "6px 12px",
      fontSize: "13px",
      color: "#525252",
      textDecoration: "none",
      borderRadius: "4px",
    },
    "nav-child-link-active": {
      color: "#ea580c",
      background: "#fff7ed",
    },
  },
];

export type SidebarHeaderProps<Ctx extends object = RenderInput> = {
  readonly label: string;
  readonly href?: string;
  readonly icon?: Content<Ctx, NamingStrategy>;
  readonly iconText?: string;
  readonly toggleIcon?: Content<Ctx, NamingStrategy>;
};

export const sidebarHeader = defineComponent<
  SidebarHeaderProps,
  RenderInput
>(
  "SidebarHeader",
  sidebarStyles,
  (ctx, props) =>
    h.div(
      { class: ctx.cls("sidebar-header") },
      h.a(
        { class: ctx.cls("logo"), href: props.href ?? "#" },
        h.span(
          { class: ctx.cls("logo-icon") },
          renderContent(ctx, props.icon) ?? h.text(props.iconText ?? "DS"),
        ),
        h.span(props.label),
      ),
      h.button(
        { class: ctx.cls("theme-toggle"), "aria-label": "Toggle theme" },
        renderContent(ctx, props.toggleIcon),
      ),
    ),
);

export type SearchBarProps<Ctx extends object = RenderInput> = {
  readonly placeholder: string;
  readonly icon?: Content<Ctx, NamingStrategy>;
  readonly shortcut?: readonly string[];
};

export const searchBar = defineComponent<SearchBarProps, RenderInput>(
  "SearchBar",
  sidebarStyles,
  (ctx, props) => {
    const shortcut = props.shortcut ?? ["Cmd", "K"];
    return h.div(
      { class: ctx.cls("search-bar") },
      h.div(
        { class: ctx.cls("search-left") },
        renderContent(ctx, props.icon),
        h.span({ class: ctx.cls("search-placeholder") }, props.placeholder),
      ),
      h.div(
        { class: ctx.cls("search-shortcut") },
        ...shortcut.map((key) => h.kbd({ class: ctx.cls("kbd") }, key)),
      ),
    );
  },
);

export type SubjectOptionProps<Ctx extends object = RenderInput> = {
  readonly title: string;
  readonly description: string;
  readonly icon?: Content<Ctx, NamingStrategy>;
};

export const subjectOption = defineComponent<SubjectOptionProps, RenderInput>(
  "SubjectOption",
  sidebarStyles,
  (ctx, props) =>
    h.div(
      { class: ctx.cls("subject-option") },
      h.div(
        { class: ctx.cls("option-icon") },
        renderContent(ctx, props.icon),
      ),
      h.div(
        { class: ctx.cls("option-info") },
        h.div({ class: ctx.cls("option-title") }, props.title),
        h.div({ class: ctx.cls("option-description") }, props.description),
      ),
    ),
);

export type SubjectSelectorProps<Ctx extends object = RenderInput> = {
  readonly name: string;
  readonly icon?: Content<Ctx, NamingStrategy>;
  readonly chevron?: Content<Ctx, NamingStrategy>;
  readonly options?: readonly Content<Ctx, NamingStrategy>[];
};

export const subjectSelector = defineComponent<
  SubjectSelectorProps,
  RenderInput
>(
  "SubjectSelector",
  sidebarStyles,
  (ctx, props) =>
    h.div(
      { class: ctx.cls("subject-selector-wrapper") },
      h.button(
        {
          class: ctx.cls("subject-selector"),
          "aria-haspopup": "listbox",
          "aria-expanded": "false",
        },
        h.div(
          { class: ctx.cls("subject-selector-icon") },
          renderContent(ctx, props.icon),
        ),
        h.span({ class: ctx.cls("subject-selector-name") }, props.name),
        renderContent(ctx, props.chevron),
      ),
      props.options && props.options.length > 0
        ? h.div(
          { class: ctx.cls("subject-popup") },
          ...renderContents(ctx, props.options),
        )
        : null,
    ),
);

export type NavCategoryProps = {
  readonly label: string;
};

export const navCategory = defineComponent<NavCategoryProps, RenderInput>(
  "NavCategory",
  sidebarStyles,
  (_ctx, props) => h.div({ class: "nav-category" }, props.label),
);

export type NavLinkProps<Ctx extends object = RenderInput> = {
  readonly label: string;
  readonly href?: string;
  readonly icon?: Content<Ctx, NamingStrategy>;
  readonly active?: boolean;
};

export const navLink = defineComponent<NavLinkProps, RenderInput>(
  "NavLink",
  sidebarStyles,
  (ctx, props) =>
    h.a(
      {
        class: ctx.cls("nav-link", props.active ? "nav-link-active" : null),
        href: props.href ?? "#",
      },
      props.active ? h.span({ class: ctx.cls("nav-link-indicator") }) : null,
      renderContent(ctx, props.icon),
      h.span(props.label),
    ),
);

export type NavChildLinkProps = {
  readonly label: string;
  readonly href?: string;
  readonly active?: boolean;
};

export const navChildLink = defineComponent<NavChildLinkProps, RenderInput>(
  "NavChildLink",
  sidebarStyles,
  (_ctx, props) =>
    h.a(
      {
        class: props.active
          ? "nav-child-link nav-child-link-active"
          : "nav-child-link",
        href: props.href ?? "#",
      },
      props.label,
    ),
);

export type NavExpandableProps<Ctx extends object = RenderInput> = {
  readonly label: string;
  readonly icon?: Content<Ctx, NamingStrategy>;
  readonly chevron?: Content<Ctx, NamingStrategy>;
  readonly expanded?: boolean;
  readonly children: readonly Content<Ctx, NamingStrategy>[];
};

export const navExpandable = defineComponent<
  NavExpandableProps,
  RenderInput
>(
  "NavExpandable",
  sidebarStyles,
  (ctx, props) =>
    h.div(
      { class: ctx.cls("nav-expandable") },
      h.button(
        {
          class: ctx.cls("nav-toggle"),
          "aria-expanded": props.expanded ? "true" : "false",
        },
        renderContent(ctx, props.icon),
        h.span(props.label),
        renderContent(ctx, props.chevron),
      ),
      h.div(
        { class: ctx.cls("nav-children") },
        ...renderContents(ctx, props.children),
      ),
    ),
);

export type NavSectionProps<Ctx extends object = RenderInput> = {
  readonly children: readonly Content<Ctx, NamingStrategy>[];
};

export const navSection = defineComponent<NavSectionProps, RenderInput>(
  "NavSection",
  sidebarStyles,
  (ctx, props) =>
    h.nav(
      { class: ctx.cls("nav-section") },
      ...renderContents(ctx, props.children),
    ),
);

/* -----------------------------------------------------------------------------
 * Components: Breadcrumbs
 * -------------------------------------------------------------------------- */

const breadcrumbStyles: ComponentStylesheets = [
  {
    "breadcrumb-item": {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "13px",
      color: "#525252",
      textDecoration: "none",
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
  () => h.span({ class: "breadcrumb-separator", "aria-hidden": "true" }),
);

/* -----------------------------------------------------------------------------
 * Components: Main Content
 * -------------------------------------------------------------------------- */

const contentStyles: ComponentStylesheets = [
  {
    "content-wrapper": {
      maxWidth: "100%",
    },
    "page-header": {
      marginBottom: "40px",
      paddingTop: "16px",
    },
    "page-title": {
      fontSize: "32px",
      fontWeight: 700,
      color: "#0a0a0a",
      marginBottom: "12px",
      letterSpacing: "-0.5px",
    },
    "page-description": {
      fontSize: "16px",
      color: "#525252",
      lineHeight: 1.7,
      marginBottom: "20px",
    },
    "page-actions": {
      display: "flex",
      gap: "8px",
    },
    "action-btn": {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "8px 14px",
      background: "#ffffff",
      border: "1px solid #e5e5e5",
      borderRadius: "6px",
      fontSize: "13px",
      fontWeight: 500,
      color: "#525252",
      cursor: "pointer",
    },
    "action-btn-primary": {
      background: "#0a0a0a",
      borderColor: "#0a0a0a",
      color: "#ffffff",
    },
    "section-heading": {
      fontSize: "22px",
      fontWeight: 600,
      color: "#0a0a0a",
      marginTop: "48px",
      marginBottom: "16px",
      paddingBottom: "8px",
      borderBottom: "1px solid #e5e5e5",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    "anchor-link": {
      color: "#737373",
      textDecoration: "none",
    },
    "subsection-heading": {
      fontSize: "18px",
      fontWeight: 600,
      color: "#0a0a0a",
      marginTop: "32px",
      marginBottom: "12px",
    },
    "body-text": {
      fontSize: "15px",
      color: "#404040",
      lineHeight: 1.8,
      marginBottom: "20px",
    },
    "feature-grid": {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: "16px",
      margin: "24px 0",
    },
    "feature-card": {
      background: "#ffffff",
      border: "1px solid #e5e5e5",
      borderRadius: "12px",
      padding: "20px",
      cursor: "pointer",
    },
    "feature-icon": {
      width: "40px",
      height: "40px",
      background: "#f5f5f5",
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "12px",
      fontSize: "18px",
    },
    "feature-title": {
      fontSize: "15px",
      fontWeight: 600,
      color: "#0a0a0a",
      marginBottom: "6px",
    },
    "feature-desc": {
      fontSize: "13px",
      color: "#737373",
      lineHeight: 1.6,
    },
    callout: {
      background: "#fffbeb",
      border: "1px solid #fde68a",
      borderLeft: "4px solid #f59e0b",
      borderRadius: "8px",
      padding: "16px 20px",
      margin: "24px 0",
    },
    "callout-header": {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontWeight: 600,
      fontSize: "14px",
      color: "#0a0a0a",
      marginBottom: "8px",
    },
    "callout-content": {
      fontSize: "14px",
      color: "#404040",
      lineHeight: 1.7,
    },
    "definition-list": {
      margin: "24px 0",
    },
    "definition-item": {
      padding: "16px 0",
      borderBottom: "1px solid #e5e5e5",
    },
    "definition-term": {
      fontWeight: 600,
      fontSize: "15px",
      color: "#0a0a0a",
      marginBottom: "4px",
    },
    "definition-desc": {
      fontSize: "14px",
      color: "#525252",
      lineHeight: 1.7,
    },
    "code-block": {
      background: "#1e1e1e",
      borderRadius: "8px",
      padding: "16px 20px",
      margin: "16px 0",
      overflowX: "auto",
    },
    "code-block-enhanced": {
      background: "#1e1e1e",
      borderRadius: "10px",
      margin: "20px 0",
      overflow: "hidden",
      border: "1px solid #333",
    },
    "code-header": {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 16px",
      background: "#2d2d2d",
      borderBottom: "1px solid #404040",
    },
    "code-header-left": {
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    "code-filename": {
      fontSize: "13px",
      fontWeight: 500,
      color: "#e0e0e0",
      fontFamily: "SF Mono, Monaco, monospace",
    },
    "code-lang-badge": {
      fontSize: "10px",
      fontWeight: 600,
      textTransform: "uppercase",
      padding: "2px 8px",
      borderRadius: "4px",
      background: "#404040",
      color: "#a0a0a0",
    },
    "code-copy-btn": {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 10px",
      background: "transparent",
      border: "1px solid #404040",
      borderRadius: "6px",
      color: "#a0a0a0",
      fontSize: "12px",
      cursor: "pointer",
    },
    "code-content": {
      padding: "16px 20px",
      overflowX: "auto",
    },
    "tabs-container": {
      margin: "24px 0",
      border: "1px solid #e5e5e5",
      borderRadius: "10px",
      overflow: "hidden",
      background: "#fff",
    },
    "tabs-header": {
      display: "flex",
      background: "#f5f5f5",
      borderBottom: "1px solid #e5e5e5",
    },
    "tab-button": {
      padding: "12px 20px",
      fontSize: "13px",
      fontWeight: 500,
      color: "#525252",
      background: "transparent",
      border: "none",
      cursor: "pointer",
      position: "relative",
    },
    "tab-content": {
      padding: "0",
    },
    "steps-container": {
      margin: "24px 0",
      position: "relative",
    },
    step: {
      display: "flex",
      gap: "20px",
      paddingBottom: "32px",
      position: "relative",
    },
    "step-indicator": {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      flexShrink: 0,
    },
    "step-number": {
      width: "32px",
      height: "32px",
      background: "#f97316",
      color: "white",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "14px",
      fontWeight: 600,
      position: "relative",
      zIndex: 1,
    },
    "step-line": {
      width: "2px",
      flex: 1,
      background: "#e5e5e5",
      marginTop: "8px",
    },
    "step-content": {
      flex: 1,
      paddingTop: "4px",
    },
    "step-title": {
      fontSize: "16px",
      fontWeight: 600,
      color: "#0a0a0a",
      marginBottom: "8px",
    },
    "step-description": {
      fontSize: "14px",
      color: "#525252",
      lineHeight: 1.7,
    },
    "file-tree": {
      background: "#fafafa",
      border: "1px solid #e5e5e5",
      borderRadius: "10px",
      padding: "16px 20px",
      margin: "20px 0",
      fontFamily: "SF Mono, Monaco, monospace",
      fontSize: "13px",
    },
    "file-tree-item": {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "4px 0",
      color: "#404040",
    },
    "file-tree-children": {
      paddingLeft: "24px",
      borderLeft: "1px dashed #d4d4d4",
      marginLeft: "7px",
    },
    accordion: {
      margin: "20px 0",
      border: "1px solid #e5e5e5",
      borderRadius: "10px",
      overflow: "hidden",
    },
    "accordion-item": {
      borderBottom: "1px solid #e5e5e5",
    },
    "accordion-header": {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 20px",
      background: "#fff",
      cursor: "pointer",
    },
    "accordion-title": {
      fontSize: "15px",
      fontWeight: 500,
      color: "#0a0a0a",
    },
    "accordion-content": {
      padding: "0 20px 16px",
      fontSize: "14px",
      color: "#525252",
      lineHeight: 1.7,
    },
    "api-table": {
      width: "100%",
      margin: "20px 0",
      border: "1px solid #e5e5e5",
      borderRadius: "10px",
      overflow: "hidden",
      borderCollapse: "separate",
      borderSpacing: "0",
    },
    "api-table-header": {
      textAlign: "left",
      padding: "12px 16px",
      background: "#f5f5f5",
      fontSize: "12px",
      fontWeight: 600,
      color: "#525252",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      borderBottom: "1px solid #e5e5e5",
    },
    "api-table-cell": {
      padding: "12px 16px",
      fontSize: "14px",
      color: "#404040",
      borderBottom: "1px solid #e5e5e5",
      verticalAlign: "top",
    },
    "prop-name": {
      fontFamily: "SF Mono, Monaco, monospace",
      fontSize: "13px",
      color: "#e11d48",
      background: "#fef2f2",
      padding: "2px 6px",
      borderRadius: "4px",
    },
    "prop-type": {
      fontFamily: "SF Mono, Monaco, monospace",
      fontSize: "12px",
      color: "#3b82f6",
    },
    "prop-default": {
      fontFamily: "SF Mono, Monaco, monospace",
      fontSize: "12px",
      color: "#737373",
    },
    "prop-required": {
      fontFamily: "SF Mono, Monaco, monospace",
      fontSize: "11px",
      color: "#dc2626",
      background: "#fef2f2",
      padding: "2px 6px",
      borderRadius: "4px",
      marginLeft: "6px",
    },
    badge: {
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      padding: "3px 8px",
      fontSize: "11px",
      fontWeight: 600,
      borderRadius: "6px",
      textTransform: "uppercase",
      letterSpacing: "0.3px",
    },
    "badge-default": {
      background: "#f5f5f5",
      color: "#525252",
    },
    "badge-primary": {
      background: "#fff7ed",
      color: "#ea580c",
    },
    "badge-success": {
      background: "#f0fdf4",
      color: "#16a34a",
    },
    "badge-warning": {
      background: "#fffbeb",
      color: "#d97706",
    },
    "badge-error": {
      background: "#fef2f2",
      color: "#dc2626",
    },
    "badge-info": {
      background: "#eff6ff",
      color: "#2563eb",
    },
    "image-container": {
      margin: "24px 0",
      border: "1px solid #e5e5e5",
      borderRadius: "10px",
      overflow: "hidden",
      background: "#fafafa",
    },
    "image-caption": {
      padding: "12px 16px",
      fontSize: "13px",
      color: "#737373",
      textAlign: "center",
      borderTop: "1px solid #e5e5e5",
      background: "#fff",
    },
    "keyboard-shortcut": {
      display: "inline-flex",
      gap: "4px",
    },
    key: {
      padding: "4px 8px",
      background: "#f5f5f5",
      border: "1px solid #d4d4d4",
      borderRadius: "6px",
      fontSize: "12px",
      fontFamily: "SF Mono, Monaco, monospace",
      color: "#404040",
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
    },
    "example-wrapper": {
      margin: "20px 0",
      border: "1px solid #e5e5e5",
      borderRadius: "10px",
      overflow: "hidden",
    },
    "example-label": {
      padding: "8px 16px",
      background: "#f5f5f5",
      borderBottom: "1px solid #e5e5e5",
      fontSize: "11px",
      fontWeight: 600,
      color: "#737373",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    "example-content": {
      padding: "20px",
      background: "#fff",
    },
    "color-grid": {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "16px",
      margin: "20px 0",
    },
    "color-swatch": {
      border: "1px solid #e5e5e5",
      borderRadius: "10px",
      overflow: "hidden",
    },
    "color-preview": {
      height: "64px",
    },
    "color-info": {
      padding: "12px",
      background: "#fff",
    },
    "color-name": {
      fontSize: "13px",
      fontWeight: 600,
      color: "#0a0a0a",
      marginBottom: "4px",
    },
    "color-value": {
      fontSize: "12px",
      fontFamily: "SF Mono, Monaco, monospace",
      color: "#737373",
    },
    "footer-nav": {
      display: "flex",
      justifyContent: "space-between",
      marginTop: "60px",
      paddingTop: "24px",
      borderTop: "1px solid #e5e5e5",
    },
    "footer-link": {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      textDecoration: "none",
      padding: "12px 16px",
      border: "1px solid #e5e5e5",
      borderRadius: "8px",
      minWidth: "180px",
    },
    "footer-label": {
      fontSize: "11px",
      color: "#737373",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    "footer-title": {
      fontSize: "14px",
      fontWeight: 500,
      color: "#0a0a0a",
    },
  },
];

export type PageHeaderProps<Ctx extends object = RenderInput> = {
  readonly title: string;
  readonly description: Content<Ctx, NamingStrategy>;
  readonly actions?: readonly Content<Ctx, NamingStrategy>[];
};

export const pageHeader = defineComponent<PageHeaderProps, RenderInput>(
  "PageHeader",
  contentStyles,
  (ctx, props) =>
    h.header(
      { class: ctx.cls("page-header") },
      h.h1({ class: ctx.cls("page-title") }, props.title),
      h.p(
        { class: ctx.cls("page-description") },
        renderContent(ctx, props.description),
      ),
      props.actions
        ? h.div(
          { class: ctx.cls("page-actions") },
          ...renderContents(ctx, props.actions),
        )
        : null,
    ),
);

export type SectionHeadingProps = {
  readonly title: string;
  readonly href?: string;
};

export const sectionHeading = defineComponent<SectionHeadingProps, RenderInput>(
  "SectionHeading",
  contentStyles,
  (ctx, props) =>
    h.h2(
      { class: ctx.cls("section-heading") },
      props.title,
      h.a(
        { class: ctx.cls("anchor-link"), href: props.href ?? "#" },
        "#",
      ),
    ),
);

export const subsectionHeading = defineComponent<
  SectionHeadingProps,
  RenderInput
>(
  "SubsectionHeading",
  contentStyles,
  (ctx, props) => h.h3({ class: ctx.cls("subsection-heading") }, props.title),
);

export type BodyTextProps<Ctx extends object = RenderInput> = {
  readonly content: Content<Ctx, NamingStrategy>;
};

export const bodyText = defineComponent<BodyTextProps, RenderInput>(
  "BodyText",
  contentStyles,
  (ctx, props) =>
    h.p({ class: ctx.cls("body-text") }, renderContent(ctx, props.content)),
);

export type FeatureCardProps<Ctx extends object = RenderInput> = {
  readonly icon?: Content<Ctx, NamingStrategy>;
  readonly title: string;
  readonly description: string;
};

export const featureCard = defineComponent<FeatureCardProps, RenderInput>(
  "FeatureCard",
  contentStyles,
  (ctx, props) =>
    h.div(
      { class: ctx.cls("feature-card") },
      h.div({ class: ctx.cls("feature-icon") }, renderContent(ctx, props.icon)),
      h.div({ class: ctx.cls("feature-title") }, props.title),
      h.div({ class: ctx.cls("feature-desc") }, props.description),
    ),
);

export type FeatureGridProps<Ctx extends object = RenderInput> = {
  readonly cards: readonly Content<Ctx, NamingStrategy>[];
};

export const featureGrid = defineComponent<FeatureGridProps, RenderInput>(
  "FeatureGrid",
  contentStyles,
  (ctx, props) =>
    h.div(
      { class: ctx.cls("feature-grid") },
      ...renderContents(ctx, props.cards),
    ),
);

export type CalloutProps<Ctx extends object = RenderInput> = {
  readonly title: string;
  readonly icon?: Content<Ctx, NamingStrategy>;
  readonly content: Content<Ctx, NamingStrategy>;
};

export const callout = defineComponent<CalloutProps, RenderInput>(
  "Callout",
  contentStyles,
  (ctx, props) =>
    h.div(
      { class: ctx.cls("callout") },
      h.div(
        { class: ctx.cls("callout-header") },
        renderContent(ctx, props.icon),
        h.span(props.title),
      ),
      h.div(
        { class: ctx.cls("callout-content") },
        renderContent(ctx, props.content),
      ),
    ),
);

export type DefinitionItemProps<Ctx extends object = RenderInput> = {
  readonly term: string;
  readonly description: Content<Ctx, NamingStrategy>;
};

export const definitionItem = defineComponent<DefinitionItemProps, RenderInput>(
  "DefinitionItem",
  contentStyles,
  (ctx, props) =>
    h.div(
      { class: ctx.cls("definition-item") },
      h.div({ class: ctx.cls("definition-term") }, props.term),
      h.div(
        { class: ctx.cls("definition-desc") },
        renderContent(ctx, props.description),
      ),
    ),
);

export type DefinitionListProps<Ctx extends object = RenderInput> = {
  readonly items: readonly Content<Ctx, NamingStrategy>[];
};

export const definitionList = defineComponent<DefinitionListProps, RenderInput>(
  "DefinitionList",
  contentStyles,
  (ctx, props) =>
    h.div(
      { class: ctx.cls("definition-list") },
      ...renderContents(ctx, props.items),
    ),
);

export type CodeBlockProps<Ctx extends object = RenderInput> = {
  readonly content: Content<Ctx, NamingStrategy>;
};

export const codeBlock = defineComponent<CodeBlockProps, RenderInput>(
  "CodeBlock",
  contentStyles,
  (ctx, props) =>
    h.pre({ class: ctx.cls("code-block") }, renderContent(ctx, props.content)),
);

export type CodeBlockEnhancedProps<Ctx extends object = RenderInput> = {
  readonly filename: string;
  readonly language: string;
  readonly content: Content<Ctx, NamingStrategy>;
  readonly copyLabel?: string;
};

export const codeBlockEnhanced = defineComponent<
  CodeBlockEnhancedProps,
  RenderInput
>(
  "CodeBlockEnhanced",
  contentStyles,
  (ctx, props) =>
    h.div(
      { class: ctx.cls("code-block-enhanced") },
      h.div(
        { class: ctx.cls("code-header") },
        h.div(
          { class: ctx.cls("code-header-left") },
          h.span({ class: ctx.cls("code-filename") }, props.filename),
          h.span({ class: ctx.cls("code-lang-badge") }, props.language),
        ),
        h.button(
          { class: ctx.cls("code-copy-btn") },
          props.copyLabel ?? "Copy",
        ),
      ),
      h.div(
        { class: ctx.cls("code-content") },
        renderContent(ctx, props.content),
      ),
    ),
);

export type TabsProps<Ctx extends object = RenderInput> = {
  readonly tabs: readonly {
    readonly label: string;
    readonly content: Content<Ctx, NamingStrategy>;
  }[];
};

export const tabs = defineComponent<TabsProps, RenderInput>(
  "Tabs",
  contentStyles,
  (ctx, props) =>
    h.div(
      { class: ctx.cls("tabs-container") },
      h.div(
        { class: ctx.cls("tabs-header") },
        ...props.tabs.map((tab) =>
          h.button({ class: ctx.cls("tab-button") }, tab.label)
        ),
      ),
      ...props.tabs.map((tab) =>
        h.div(
          { class: ctx.cls("tab-content") },
          renderContent(ctx, tab.content),
        )
      ),
    ),
);

export type StepsProps<Ctx extends object = RenderInput> = {
  readonly steps: readonly {
    readonly title: string;
    readonly description: Content<Ctx, NamingStrategy>;
  }[];
};

export const steps = defineComponent<StepsProps, RenderInput>(
  "Steps",
  contentStyles,
  (ctx, props) =>
    h.div(
      { class: ctx.cls("steps-container") },
      ...props.steps.map((step, index) =>
        h.div(
          { class: ctx.cls("step") },
          h.div(
            { class: ctx.cls("step-indicator") },
            h.div({ class: ctx.cls("step-number") }, String(index + 1)),
            h.div({ class: ctx.cls("step-line") }),
          ),
          h.div(
            { class: ctx.cls("step-content") },
            h.div({ class: ctx.cls("step-title") }, step.title),
            h.div(
              { class: ctx.cls("step-description") },
              renderContent(ctx, step.description),
            ),
          ),
        )
      ),
    ),
);

export type FileTreeProps<Ctx extends object = RenderInput> = {
  readonly items: readonly Content<Ctx, NamingStrategy>[];
};

export const fileTree = defineComponent<FileTreeProps, RenderInput>(
  "FileTree",
  contentStyles,
  (ctx, props) =>
    h.div({ class: ctx.cls("file-tree") }, ...renderContents(ctx, props.items)),
);

export type AccordionItemProps<Ctx extends object = RenderInput> = {
  readonly title: string;
  readonly content: Content<Ctx, NamingStrategy>;
};

export type AccordionProps<Ctx extends object = RenderInput> = {
  readonly items: readonly AccordionItemProps<Ctx>[];
};

export const accordion = defineComponent<AccordionProps, RenderInput>(
  "Accordion",
  contentStyles,
  (ctx, props) =>
    h.div(
      { class: ctx.cls("accordion") },
      ...props.items.map((item) =>
        h.div(
          { class: ctx.cls("accordion-item") },
          h.div(
            { class: ctx.cls("accordion-header") },
            h.span({ class: ctx.cls("accordion-title") }, item.title),
          ),
          h.div(
            { class: ctx.cls("accordion-content") },
            renderContent(ctx, item.content),
          ),
        )
      ),
    ),
);

export type ApiTableProps = {
  readonly head: readonly string[];
  readonly rows: readonly string[][];
};

export const apiTable = defineComponent<ApiTableProps, RenderInput>(
  "ApiTable",
  contentStyles,
  (_ctx, props) =>
    h.table(
      { class: "api-table" },
      h.thead(
        h.tr(
          ...props.head.map((label) =>
            h.th({ class: "api-table-header" }, label)
          ),
        ),
      ),
      h.tbody(
        ...props.rows.map((row) =>
          h.tr(
            ...row.map((cell) => h.td({ class: "api-table-cell" }, cell)),
          )
        ),
      ),
    ),
);

export type BadgeProps = {
  readonly label: string;
  readonly variant?: string;
};

export const badge = defineComponent<BadgeProps, RenderInput>(
  "Badge",
  contentStyles,
  (_ctx, props) =>
    h.span(
      {
        class: `badge${props.variant ? ` badge-${props.variant}` : ""}`,
      },
      props.label,
    ),
);

export type ImageWithCaptionProps<Ctx extends object = RenderInput> = {
  readonly src: string;
  readonly alt?: string;
  readonly caption?: Content<Ctx, NamingStrategy>;
};

export const imageWithCaption = defineComponent<
  ImageWithCaptionProps,
  RenderInput
>(
  "ImageWithCaption",
  contentStyles,
  (ctx, props) =>
    h.figure(
      { class: ctx.cls("image-container") },
      h.img({ src: props.src, alt: props.alt ?? "" }),
      props.caption
        ? h.figcaption(
          { class: ctx.cls("image-caption") },
          renderContent(ctx, props.caption),
        )
        : null,
    ),
);

export type KeyboardShortcutProps = {
  readonly keys: readonly string[];
};

export const keyboardShortcut = defineComponent<
  KeyboardShortcutProps,
  RenderInput
>(
  "KeyboardShortcut",
  contentStyles,
  (_ctx, props) =>
    h.span(
      { class: "keyboard-shortcut" },
      ...props.keys.map((key) => h.kbd({ class: "key" }, key)),
    ),
);

export type ExampleWrapperProps<Ctx extends object = RenderInput> = {
  readonly label: string;
  readonly content: Content<Ctx, NamingStrategy>;
};

export const exampleWrapper = defineComponent<
  ExampleWrapperProps,
  RenderInput
>(
  "ExampleWrapper",
  contentStyles,
  (ctx, props) =>
    h.div(
      { class: ctx.cls("example-wrapper") },
      h.div({ class: ctx.cls("example-label") }, props.label),
      h.div(
        { class: ctx.cls("example-content") },
        renderContent(ctx, props.content),
      ),
    ),
);

export type ColorSwatchProps = {
  readonly name: string;
  readonly value: string;
};

export const colorSwatch = defineComponent<ColorSwatchProps, RenderInput>(
  "ColorSwatch",
  contentStyles,
  (_ctx, props) =>
    h.div(
      { class: "color-swatch" },
      h.div({ class: "color-preview", style: `background:${props.value};` }),
      h.div(
        { class: "color-info" },
        h.div({ class: "color-name" }, props.name),
        h.div({ class: "color-value" }, props.value),
      ),
    ),
);

export type ColorGridProps<Ctx extends object = RenderInput> = {
  readonly swatches: readonly Content<Ctx, NamingStrategy>[];
};

export const colorGrid = defineComponent<ColorGridProps, RenderInput>(
  "ColorGrid",
  contentStyles,
  (ctx, props) =>
    h.div(
      { class: ctx.cls("color-grid") },
      ...renderContents(ctx, props.swatches),
    ),
);

export type FooterNavProps<Ctx extends object = RenderInput> = {
  readonly previous?: {
    readonly label: string;
    readonly title: string;
    readonly href?: string;
  };
  readonly next?: {
    readonly label: string;
    readonly title: string;
    readonly href?: string;
  };
};

export const footerNav = defineComponent<FooterNavProps, RenderInput>(
  "FooterNav",
  contentStyles,
  (_ctx, props) =>
    h.div(
      { class: "footer-nav" },
      props.previous
        ? h.a(
          { class: "footer-link prev", href: props.previous.href ?? "#" },
          h.span({ class: "footer-label" }, props.previous.label),
          h.span({ class: "footer-title" }, props.previous.title),
        )
        : null,
      props.next
        ? h.a(
          { class: "footer-link next", href: props.next.href ?? "#" },
          h.span({ class: "footer-label" }, props.next.label),
          h.span({ class: "footer-title" }, props.next.title),
        )
        : null,
    ),
);

/* -----------------------------------------------------------------------------
 * Components: TOC
 * -------------------------------------------------------------------------- */

const tocStyles: ComponentStylesheets = [
  {
    "toc-title": {
      fontSize: "11px",
      fontWeight: 600,
      color: "#737373",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      marginBottom: "16px",
    },
    "toc-list": {
      listStyle: "none",
      display: "flex",
      flexDirection: "column",
      gap: "2px",
      position: "relative",
      paddingLeft: "0",
      marginLeft: "0",
    },
    "toc-link": {
      display: "block",
      fontSize: "13px",
      color: "#525252",
      textDecoration: "none",
      padding: "6px 0 6px 16px",
      position: "relative",
      borderLeft: "1px solid #e5e5e5",
      marginLeft: "0",
    },
    "toc-link-active": {
      color: "#d97706",
      fontWeight: 500,
      borderLeft: "2px solid #f97316",
      paddingLeft: "15px",
    },
    "toc-link-nested": {
      paddingLeft: "28px",
      fontSize: "12px",
      color: "#737373",
    },
    "toc-link-nested-active": {
      color: "#d97706",
      paddingLeft: "27px",
    },
  },
];

export type TocLinkProps = {
  readonly label: string;
  readonly href?: string;
  readonly nested?: boolean;
  readonly active?: boolean;
};

export const tocLink = defineComponent<TocLinkProps, RenderInput>(
  "TocLink",
  tocStyles,
  (ctx, props) =>
    h.a(
      {
        class: ctx.cls(
          "toc-link",
          props.nested ? "toc-link-nested" : null,
          props.active
            ? props.nested ? "toc-link-nested-active" : "toc-link-active"
            : null,
        ),
        href: props.href ?? "#",
      },
      props.label,
    ),
);

export type TocListProps<Ctx extends object = RenderInput> = {
  readonly title: string;
  readonly items: readonly Content<Ctx, NamingStrategy>[];
};

export const tocList = defineComponent<TocListProps, RenderInput>(
  "TocList",
  tocStyles,
  (ctx, props) =>
    h.div(
      {},
      h.div({ class: ctx.cls("toc-title") }, props.title),
      h.ul(
        { class: ctx.cls("toc-list") },
        ...props.items.map((item) => h.li(renderContent(ctx, item))),
      ),
    ),
);

/* -----------------------------------------------------------------------------
 * Regions
 * -------------------------------------------------------------------------- */

export const contextHeaderRegion = defineRegion({
  name: "ContextHeader",
  slots: slots({
    required: ["content"] as const,
  }),
  render: (ctx: RenderCtx<RenderInput, NamingStrategy>, s) =>
    h.header(
      {
        class: "context-header",
        style: ctx.css({
          gridColumn: "1 / -1",
          gridRow: "1",
          position: "sticky",
          top: 0,
          zIndex: 200,
          background: "#0a0a0a",
          height: "48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          borderBottom: "1px solid #262626",
        }),
      },
      s.content(ctx),
    ),
});

export const leftSidebarRegion = defineRegion({
  name: "LeftSidebar",
  slots: slots({
    required: ["content"] as const,
  }),
  render: (ctx: RenderCtx<RenderInput, NamingStrategy>, s) =>
    h.aside(
      {
        class: "left-sidebar",
        style: ctx.css({
          position: "fixed",
          top: "48px",
          left: 0,
          width: "280px",
          height: "calc(100vh - 48px)",
          background: "#ffffff",
          borderRight: "1px solid #e5e5e5",
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }),
      },
      s.content(ctx),
    ),
});

export const breadcrumbRowRegion = defineRegion({
  name: "BreadcrumbRow",
  slots: slots({
    required: ["crumbs"] as const,
  }),
  render: (ctx: RenderCtx<RenderInput, NamingStrategy>, s) =>
    h.nav(
      {
        class: "breadcrumb-row",
        "aria-label": "Breadcrumb",
        style: ctx.css({
          gridColumn: "2 / 4",
          gridRow: "2",
          position: "sticky",
          top: "48px",
          zIndex: 100,
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderBottom: "1px solid #e5e5e5",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }),
      },
      s.crumbs(ctx),
    ),
});

export const mainContentRegion = defineRegion({
  name: "MainContent",
  slots: slots({
    required: ["content"] as const,
  }),
  render: (ctx: RenderCtx<RenderInput, NamingStrategy>, s) =>
    h.main(
      {
        class: "main-content",
        style: ctx.css({
          gridColumn: "2",
          gridRow: "3",
          padding: "24px 24px 40px 24px",
        }),
      },
      h.div({ class: "content-wrapper" }, s.content(ctx)),
    ),
});

export const rightSidebarRegion = defineRegion({
  name: "RightSidebar",
  slots: slots({
    required: ["content"] as const,
  }),
  render: (ctx: RenderCtx<RenderInput, NamingStrategy>, s) =>
    h.aside(
      {
        class: "right-sidebar",
        style: ctx.css({
          position: "fixed",
          top: "93px",
          right: 0,
          width: "200px",
          height: "calc(100vh - 93px)",
          padding: "24px 20px",
          overflowY: "auto",
        }),
      },
      s.content(ctx),
    ),
});

/* -----------------------------------------------------------------------------
 * Layout
 * -------------------------------------------------------------------------- */

export const naturalLayout = defineLayout({
  name: "NaturalDoc",
  slots: slots({
    required: [
      "contextHeader",
      "sidebar",
      "breadcrumbs",
      "content",
      "toc",
    ] as const,
  }),
  headSlots: headSlotSpec,
  render: (ctx, api, s) =>
    h.div(
      {
        class: "page-layout",
        style: ctx.css({
          display: "grid",
          gridTemplateColumns: "280px 1fr 200px",
          gridTemplateRows: "auto auto 1fr",
          minHeight: "100vh",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif",
          fontSize: "14px",
          lineHeight: 1.6,
          color: "#0a0a0a",
          backgroundColor: "#fafafa",
        }),
      },
      api.region("ContextHeader", { content: s.contextHeader }),
      api.region("LeftSidebar", { content: s.sidebar }),
      api.region("BreadcrumbRow", { crumbs: s.breadcrumbs }),
      api.region("MainContent", { content: s.content }),
      api.region("RightSidebar", { content: s.toc }),
    ),
});

/* -----------------------------------------------------------------------------
 * Design System Factory
 * -------------------------------------------------------------------------- */

export function naturalDesignSystem(dsName = "natural-ds") {
  const ds = createDesignSystem<RenderInput>(dsName, naturalNaming)
    .policies({ wrappers: { enabled: false } })
    .region(contextHeaderRegion)
    .region(leftSidebarRegion)
    .region(breadcrumbRowRegion)
    .region(mainContentRegion)
    .region(rightSidebarRegion)
    .layout(naturalLayout)
    .build();

  const defaultHead = headSlots({
    styles: [
      h.style(`
        html { scroll-behavior: smooth; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `),
    ],
  });

  const mergeHead = (
    input?: HeadSlotInput<RenderInput, NamingStrategy>,
  ) => {
    const overrides = input ? headSlots(input) : {};
    const merged = { ...defaultHead } as Record<string, unknown>;
    for (const [key, value] of Object.entries(overrides)) {
      if (value) merged[key] = value;
    }
    return merged;
  };

  const page: typeof ds.page = (layoutName, renderCtx, options) =>
    ds.page(layoutName, renderCtx, {
      ...options,
      headSlots: mergeHead(options.headSlots),
    });

  return {
    ...ds,
    page,
  };
}
