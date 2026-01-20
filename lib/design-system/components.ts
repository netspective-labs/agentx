import {
  defineComponent,
  NamingStrategy,
  SlotBuilder,
} from "../universal/fluent-ds.ts";
import * as h from "../universal/fluent-html.ts";

export type CardProps = {
  readonly title?: string;
  readonly subtitle?: string;
  readonly headerRight?: SlotBuilder<Record<PropertyKey, never>, NamingStrategy>;
  readonly body: SlotBuilder<Record<PropertyKey, never>, NamingStrategy>;
  readonly footer?: SlotBuilder<Record<PropertyKey, never>, NamingStrategy>;
  readonly class?: string;
};

export const Card = defineComponent<
  CardProps,
  Record<PropertyKey, never>,
  NamingStrategy
>(
  "Card",
  (ctx, props) => {
    const head = props.title || props.subtitle || props.headerRight;
    const elementId = ctx.naming.elemDataId("Card", "component");
    return h.section(
      {
        class: ctx.cls("fds-card", props.class),
        "data-fds-element-id": elementId,
      },
      head
        ? h.div(
          { class: ctx.cls("fds-card__header") },
          h.div(
            { class: ctx.cls("fds-card__heading") },
            props.title
              ? h.div({ class: ctx.cls("fds-card__title") }, props.title)
              : null,
            props.subtitle
              ? h.div({ class: ctx.cls("fds-card__subtitle") }, props.subtitle)
              : null,
          ),
          props.headerRight
            ? h.div(
              { class: ctx.cls("fds-card__headerRight") },
              props.headerRight(ctx),
            )
            : null,
        )
        : null,
      h.div({ class: ctx.cls("fds-card__body") }, props.body(ctx)),
      props.footer
        ? h.div({ class: ctx.cls("fds-card__footer") }, props.footer(ctx))
        : null,
    );
  },
);

export type Breadcrumb = { readonly label: string; readonly href?: string };

export const Breadcrumbs = defineComponent<
  { readonly items: readonly Breadcrumb[] },
  Record<PropertyKey, never>,
  NamingStrategy
>(
  "Breadcrumbs",
  (ctx, props) => {
    const elementId = ctx.naming.elemDataId("Breadcrumbs", "component");
    return h.nav(
      {
        class: ctx.cls("fds-breadcrumbs"),
        "aria-label": "Breadcrumb",
        "data-fds-element-id": elementId,
      },
      h.ol(
        { class: ctx.cls("fds-breadcrumbs__list") },
        h.each(props.items, (it, i) =>
          h.li(
            { class: ctx.cls("fds-breadcrumbs__item") },
            it.href
              ? h.a(
                { href: it.href, class: ctx.cls("fds-breadcrumbs__link") },
                it.label,
              )
              : h.span(it.label),
            i < props.items.length - 1
              ? h.span({ class: ctx.cls("fds-breadcrumbs__sep") }, "/")
              : null,
          )),
      ),
    );
  },
);
