import { NavigationMenu } from './NavigationMenu';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const SIDEBAR_WIDTH = '15rem';
const SIDEBAR_WIDTH_MOBILE = '13rem';

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = true,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  return (
    <aside
      role="complementary"
      aria-label="Main navigation sidebar"
      // usamos variáveis para que tudo (largura + fundo) acompanhe
      style={
        {
          ['--sidebar-width' as string]: SIDEBAR_WIDTH,
          ['--sidebar-width-mobile' as string]: SIDEBAR_WIDTH_MOBILE,
        } as React.CSSProperties
      }
      className={[
        'relative flex items-start bg-sidebar transition-all duration-300 ease-in-out p-0 z-0',
        'max-sm:fixed max-sm:top-16 max-sm:h-[calc(100vh_-_64px)] max-sm:z-[1000] max-sm:mt-0',
        isCollapsed
          ? 'w-16 min-w-16'
          : 'w-[--sidebar-width] min-w-[--sidebar-width]',
        'max-sm:w-[--sidebar-width-mobile] max-sm:min-w-[--sidebar-width-mobile]',
        isOpen
          ? 'max-sm:left-0'
          : 'max-sm:left-[calc(var(--sidebar-width-mobile)*-1)]',
      ].join(' ')}
    >
      <div className="relative flex w-full flex-col items-start gap-6 self-stretch p-0 transition-all duration-300 ease-in-out overflow-visible h-[calc(100vh-64px)]">
        <NavigationMenu isCollapsed={isCollapsed} />
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[-1] sm:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    </aside>
  );
};
