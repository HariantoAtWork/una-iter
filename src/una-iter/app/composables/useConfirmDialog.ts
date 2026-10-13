import { ConfirmDialog } from '#components'

export type ConfirmDialogOptions = {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: 'error' | 'primary' | 'neutral' | 'success' | 'warning' | 'info' | 'secondary'
}

export function useConfirmDialog() {
  const overlay = useOverlay()

  return (options: ConfirmDialogOptions): Promise<boolean> => {
    const modal = overlay.create(ConfirmDialog, {
      destroyOnClose: true,
      props: options,
    })
    return modal.open()
  }
}
