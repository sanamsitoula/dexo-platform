import type { PublicMenu, MenuItemNode } from '@/lib/api';

/**
 * Renders a published Menu per its displayTemplate. Grid/List/Table/Accordion
 * are fully implemented; Carousel and Map render as Grid for now (still a
 * correct, working display — just not the bespoke swipe/pin UX) rather than
 * rendering nothing. See docs/MENU_BUILDER.md "Deferred" for the follow-up.
 */
export default function MenuSection({ menu, colorPrimary }: { menu: PublicMenu; colorPrimary?: string }) {
  if (!menu.items.length) return null;
  const color = colorPrimary || '#4F46E5';

  switch (menu.displayTemplate) {
    case 'table':
      return <MenuTable menu={menu} color={color} />;
    case 'list':
      return <MenuList menu={menu} color={color} />;
    case 'accordion':
      return <MenuAccordion menu={menu} color={color} />;
    case 'grid':
    case 'carousel':
    case 'map':
    default:
      return <MenuGrid menu={menu} color={color} />;
  }
}

function ItemLink({ item, children }: { item: MenuItemNode; children: React.ReactNode }) {
  if (!item.linkUrl) return <>{children}</>;
  return <a href={item.linkUrl}>{children}</a>;
}

function MenuGrid({ menu, color }: { menu: PublicMenu; color: string }) {
  return (
    <section id={menu.slug} className="px-4 py-16 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-10">{menu.name}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {menu.items.map((item) => (
          <ItemLink key={item.id} item={item}>
            <article className="p-6 rounded-xl border border-gray-200 h-full flex flex-col gap-3">
              {item.icon && <div className="text-3xl">{item.icon}</div>}
              <h3 className="font-bold text-lg">{item.title}</h3>
              {item.shortDescription && <p className="text-sm opacity-70 flex-1">{item.shortDescription}</p>}
            </article>
          </ItemLink>
        ))}
      </div>
    </section>
  );
}

function MenuList({ menu, color }: { menu: PublicMenu; color: string }) {
  return (
    <section id={menu.slug} className="px-4 py-16 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-10">{menu.name}</h2>
      <ul className="divide-y divide-gray-200 border-y border-gray-200">
        {menu.items.map((item) => (
          <li key={item.id} className="py-4">
            <ItemLink item={item}>
              <div className="flex items-start gap-3">
                {item.icon && <span className="text-xl">{item.icon}</span>}
                <div>
                  <div className="font-semibold">{item.title}</div>
                  {item.shortDescription && <div className="text-sm opacity-70 mt-1">{item.shortDescription}</div>}
                </div>
              </div>
            </ItemLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MenuTable({ menu, color }: { menu: PublicMenu; color: string }) {
  return (
    <section id={menu.slug} className="px-4 py-16 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-10">{menu.name}</h2>
      <table className="w-full text-sm border-collapse">
        <tbody>
          {menu.items.map((item) => (
            <tr key={item.id} className="border-b border-gray-200">
              <td className="py-3 pr-4 font-semibold whitespace-nowrap">
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.title}
              </td>
              <td className="py-3 opacity-70">{item.shortDescription}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function MenuAccordion({ menu, color }: { menu: PublicMenu; color: string }) {
  return (
    <section id={menu.slug} className="px-4 py-16 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-10">{menu.name}</h2>
      <div className="space-y-2">
        {menu.items.map((item) => (
          <details key={item.id} className="border border-gray-200 rounded-lg p-4 group">
            <summary className="font-semibold cursor-pointer flex items-center gap-2">
              {item.icon && <span>{item.icon}</span>}
              {item.title}
            </summary>
            {item.description && <p className="text-sm opacity-70 mt-3">{item.description}</p>}
            {item.children?.length > 0 && (
              <ul className="mt-3 pl-4 space-y-1 border-l-2" style={{ borderColor: color }}>
                {item.children.map((child) => (
                  <li key={child.id} className="text-sm">{child.title}</li>
                ))}
              </ul>
            )}
          </details>
        ))}
      </div>
    </section>
  );
}
