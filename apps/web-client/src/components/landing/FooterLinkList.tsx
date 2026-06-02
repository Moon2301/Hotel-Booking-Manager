import type { ExternalLinkItem } from '../../data/external-links';

const linkClass =
  'transition-colors hover:text-mango-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mango-accent rounded-sm';

export function FooterLinkList({
  links,
  showIcons = false,
}: {
  links: ExternalLinkItem[];
  showIcons?: boolean;
}) {
  if (!links.length) return null;

  return (
    <ul className="space-y-2.5 text-sm">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <li key={link.id}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 ${linkClass}`}
            >
              {showIcons && (
                <Icon className="h-4 w-4 shrink-0 text-mango-accent" aria-hidden />
              )}
              <span>{link.label}</span>
              <span className="sr-only"> (mở tab mới)</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function FooterSocialIcons({ links }: { links: ExternalLinkItem[] }) {
  if (!links.length) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            title={link.label}
            aria-label={link.label}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300/80 bg-white/80 text-slate-700 transition-colors hover:border-mango-accent hover:text-mango-accent dark:border-white/15 dark:bg-white/5 dark:text-white/80 dark:hover:text-mango-accent"
          >
            <Icon className="h-5 w-5" />
          </a>
        );
      })}
    </div>
  );
}
