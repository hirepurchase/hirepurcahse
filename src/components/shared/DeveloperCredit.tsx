/**
 * "System developed by EYO Solutions", linking to the developer's site.
 * `tone` matches the surface it sits on: light pages, the dark staff sidebar,
 * or the customer portal's blue sidebar.
 */
const SITE = 'https://www.eyosolutions.com';

export default function DeveloperCredit({
  tone = 'light',
  phone,
  align = 'center',
  size = 'sm',
  className = '',
}: {
  tone?: 'light' | 'dark' | 'brand';
  phone?: string;
  align?: 'center' | 'left';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}) {
  const colors = {
    light: { text: 'text-gray-400', link: 'text-gray-500 hover:text-blue-600' },
    dark: { text: 'text-slate-600', link: 'text-slate-400 hover:text-white' },
    brand: { text: 'text-white/40', link: 'text-white/70 hover:text-white' },
  }[tone];

  return (
    <p
      className={`${align === 'left' ? 'text-left' : 'text-center'} ${size === 'xs' ? 'text-[10px]' : size === 'md' ? 'text-xs' : 'text-[11px]'} leading-5 ${colors.text} ${className}`}
    >
      System developed by{' '}
      <a href={SITE} target="_blank" rel="noopener noreferrer" className={`font-semibold underline-offset-2 hover:underline ${colors.link}`}>
        EYO Solutions
      </a>
      {phone && <span> · {phone}</span>}
    </p>
  );
}
