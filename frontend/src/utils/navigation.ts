type NavigateFunction = (to: string) => void;

export function navigateWithTransition(navigate: NavigateFunction, path: string): void {
  if (typeof document !== 'undefined' && 'startViewTransition' in document) {
    (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
      navigate(path);
    });
  } else {
    navigate(path);
  }
}
