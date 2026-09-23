import { Icon, type IconName } from '@/components/Icon/Icon'
import { useUiStore, type ToastType } from '@/store'
import './Toaster.scss'

const ICONS: Record<ToastType, IconName> = {
  success: 'check-circle',
  error: 'alert',
  info: 'info',
}

export function Toaster() {
  const toasts = useUiStore((state) => state.toasts)

  return (
    <div className="toaster">
      {toasts.map((item) => (
        <div key={item.id} className={`toast toast--${item.type}`}>
          <Icon name={ICONS[item.type]} size={16} />
          <span className="toast__text">{item.message}</span>
        </div>
      ))}
    </div>
  )
}
