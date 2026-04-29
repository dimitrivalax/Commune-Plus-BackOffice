export const useFacebookConfigModal = () => {
  const isOpen = useState<boolean>('facebook-config-modal-open', () => false)

  const openFacebookConfigModal = () => {
    isOpen.value = true
  }

  const closeFacebookConfigModal = () => {
    isOpen.value = false
  }

  return {
    isFacebookConfigModalOpen: isOpen,
    openFacebookConfigModal,
    closeFacebookConfigModal
  }
}
