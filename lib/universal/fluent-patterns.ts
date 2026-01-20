import { defineComponent, NamingStrategy, SlotBuilder } from "./fluent-ds.ts";
import * as h from "./fluent-html.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

export type CardProps<Ctx extends object = Record<PropertyKey, never>> = {
  readonly title?: string;
  readonly subtitle?: string;
  readonly headerRight?: SlotBuilder<Ctx, NamingStrategy>;
  readonly body: SlotBuilder<Ctx, NamingStrategy>;
  readonly footer?: SlotBuilder<Ctx, NamingStrategy>;
  readonly class?: string;
};

export const card = defineComponent<CardProps<Any>, Any, NamingStrategy>(
  "Card",
  (ctx, props) => {
    const head = props.title || props.subtitle || props.headerRight;
    const elementId = ctx.naming.elemIdValue("Card", "component");
    const elementIdAttr = ctx.naming.elemDataAttr(
      "element-id",
      elementId,
      "component",
    );
    return h.section(
      {
        class: ctx.cls("card", props.class),
        [elementIdAttr]: elementId,
      },
      head
        ? h.div(
          { class: ctx.cls("card__header") },
          h.div(
            { class: ctx.cls("card__heading") },
            props.title
              ? h.div({ class: ctx.cls("card__title") }, props.title)
              : null,
            props.subtitle
              ? h.div({ class: ctx.cls("card__subtitle") }, props.subtitle)
              : null,
          ),
          props.headerRight
            ? h.div(
              { class: ctx.cls("card__headerRight") },
              props.headerRight(ctx),
            )
            : null,
        )
        : null,
      h.div({ class: ctx.cls("card__body") }, props.body(ctx)),
      props.footer
        ? h.div({ class: ctx.cls("card__footer") }, props.footer(ctx))
        : null,
    );
  },
);

export type Breadcrumb = { readonly label: string; readonly href?: string };

export const breadcrumbs = defineComponent<
  { readonly items: readonly Breadcrumb[] },
  Any,
  NamingStrategy
>(
  "Breadcrumbs",
  (ctx, props) => {
    const elementId = ctx.naming.elemIdValue("Breadcrumbs", "component");
    const elementIdAttr = ctx.naming.elemDataAttr(
      "element-id",
      elementId,
      "component",
    );
    return h.nav(
      {
        class: ctx.cls("breadcrumbs"),
        "aria-label": "Breadcrumb",
        [elementIdAttr]: elementId,
      },
      h.ol(
        { class: ctx.cls("breadcrumbs__list") },
        h.each(props.items, (it, i) =>
          h.li(
            { class: ctx.cls("breadcrumbs__item") },
            it.href
              ? h.a(
                { href: it.href, class: ctx.cls("breadcrumbs__link") },
                it.label,
              )
              : h.span(it.label),
            i < props.items.length - 1
              ? h.span({ class: ctx.cls("breadcrumbs__sep") }, "/")
              : null,
          )),
      ),
    );
  },
);

export type DocNavSubject<Id extends string = string> = {
  readonly id: Id;
  readonly label: string;
  readonly href?: string;
};

export type DocNavItem = {
  readonly label: string;
  readonly href?: string;
  readonly active?: boolean;
  readonly children?: readonly DocNavItem[];
};

export type DocNavTrees<Id extends string = string> = Readonly<
  Record<Id, readonly DocNavItem[]>
>;

export type DocSubjectSelectProps<Id extends string = string> = {
  readonly subjects: readonly DocNavSubject<Id>[];
  readonly activeSubjectId?: Id;
  readonly label?: string;
  readonly class?: string;
  readonly selectId?: string;
};

export const docSubjectSelect = defineComponent<
  DocSubjectSelectProps<Any>,
  Any,
  NamingStrategy
>("DocSubjectSelect", (ctx, props) => {
  const elementId = ctx.naming.elemIdValue("DocSubjectSelect", "component");
  const elementIdAttr = ctx.naming.elemDataAttr(
    "element-id",
    elementId,
    "component",
  );
  const activeId = props.activeSubjectId ?? props.subjects[0]?.id;
  const selectId = props.selectId ?? `${elementId}-select`;

  return h.div(
    {
      class: ctx.cls("doc-subject", props.class),
      [elementIdAttr]: elementId,
    },
    props.label
      ? h.label(
        { class: ctx.cls("doc-subject__label"), for: selectId },
        props.label,
      )
      : null,
    h.select(
      {
        id: selectId,
        class: ctx.cls("doc-subject__select"),
        "data-active-subject": activeId ?? "",
      },
      h.each(props.subjects, (subject) =>
        h.option(
          {
            value: subject.id,
            selected: subject.id === activeId,
            "data-href": subject.href ?? "",
          },
          subject.label,
        )),
    ),
  );
});

export type DocNavTreeProps = {
  readonly items: readonly DocNavItem[];
  readonly label?: string;
  readonly class?: string;
};

export const docNavTree = defineComponent<DocNavTreeProps, Any, NamingStrategy>(
  "DocNavTree",
  (ctx, props) => {
    const elementId = ctx.naming.elemIdValue("DocNavTree", "component");
    const elementIdAttr = ctx.naming.elemDataAttr(
      "element-id",
      elementId,
      "component",
    );

    const renderItems = (
      items: readonly DocNavItem[],
      depth: number,
    ): h.RawHtml =>
      h.ul(
        {
          class: ctx.cls("doc-tree__list", `doc-tree__list--d${depth}`),
        },
        h.each(items, (item) =>
          h.li(
            {
              class: ctx.cls("doc-tree__item", {
                "doc-tree__item--active": !!item.active,
              }),
            },
            item.href
              ? h.a(
                { href: item.href, class: ctx.cls("doc-tree__link") },
                item.label,
              )
              : h.span({ class: ctx.cls("doc-tree__label") }, item.label),
            item.children && item.children.length > 0
              ? renderItems(item.children, depth + 1)
              : null,
          )),
      );

    return h.nav(
      {
        class: ctx.cls("doc-tree", props.class),
        "aria-label": props.label ?? "Sections",
        [elementIdAttr]: elementId,
      },
      renderItems(props.items, 0),
    );
  },
);

export function selectDocNavTree<Id extends string>(
  trees: DocNavTrees<Id>,
  activeSubjectId: Id,
): readonly DocNavItem[] {
  return trees[activeSubjectId] ?? [];
}
