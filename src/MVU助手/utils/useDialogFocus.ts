import { nextTick, onBeforeUnmount, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue';

const dialogs: HTMLElement[] = [];
const backgroundLocks = new Map<HTMLElement, { count: number; inert: boolean }>();
const scrollLocks = new Map<Document, { count: number; value: string; priority: string }>();
const selector = 'button, [href], input, select, textarea, [tabindex]';

/** Uses the mounted element's document because the script mounts into the parent page. */
export function useDialogFocus(root: Ref<HTMLElement | null>, open: MaybeRefOrGetter<boolean>, close: () => void) {
  let cleanup: (() => void) | undefined;
  watch(
    () => [toValue(open), root.value] as const,
    async ([visible, element], _, onCleanup) => {
      cleanup?.();
      cleanup = undefined;
      if (!visible || !element) return;
      let disposed = false;
      onCleanup(() => {
        disposed = true;
        cleanup?.();
        cleanup = undefined;
      });
      await nextTick();
      if (disposed) return;
      const document = element.ownerDocument;
      const previous = document.activeElement as HTMLElement | null;
      const scrollLock = scrollLocks.get(document) || {
        count: 0,
        value: document.body.style.getPropertyValue('overflow'),
        priority: document.body.style.getPropertyPriority('overflow'),
      };
      scrollLock.count++;
      scrollLocks.set(document, scrollLock);
      document.body.style.setProperty('overflow', 'hidden');
      dialogs.push(element);
      const locked: HTMLElement[] = [];
      let branch: HTMLElement = element;
      while (branch.parentElement) {
        for (const sibling of branch.parentElement.children) {
          if (sibling === branch || !(sibling instanceof document.defaultView!.HTMLElement)) continue;
          const item = sibling as HTMLElement;
          const lock = backgroundLocks.get(item) || { count: 0, inert: item.inert };
          lock.count++;
          backgroundLocks.set(item, lock);
          item.inert = true;
          locked.push(item);
        }
        branch = branch.parentElement;
        if (branch === document.body) break;
      }
      const top = () => dialogs.filter(item => item.isConnected && item.getClientRects().length).at(-1) === element;
      const focusable = () =>
        [...element.querySelectorAll<HTMLElement>(selector)].filter(
          item =>
            item.tabIndex >= 0 &&
            !item.matches(':disabled, [hidden]') &&
            !item.closest('[inert]') &&
            item.getClientRects().length > 0,
        );
      const focusFirst = () => (element.querySelector<HTMLElement>('[autofocus]') || focusable()[0] || element).focus();
      const keydown = (event: KeyboardEvent) => {
        if (!top() || event.defaultPrevented) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopImmediatePropagation();
          close();
        } else if (event.key === 'Tab') {
          const items = focusable();
          const first = items[0] || element;
          const last = items.at(-1) || element;
          if (event.shiftKey && (document.activeElement === first || !element.contains(document.activeElement))) {
            event.preventDefault();
            last.focus();
          } else if (
            !event.shiftKey &&
            (document.activeElement === last || !element.contains(document.activeElement))
          ) {
            event.preventDefault();
            first.focus();
          }
        }
      };
      const focusin = (event: FocusEvent) => {
        if (top() && !element.contains(event.target as Node)) focusFirst();
      };
      document.addEventListener('keydown', keydown);
      document.addEventListener('focusin', focusin);
      focusFirst();
      cleanup = () => {
        const index = dialogs.indexOf(element);
        if (index >= 0) dialogs.splice(index, 1);
        document.removeEventListener('keydown', keydown);
        document.removeEventListener('focusin', focusin);
        for (const item of locked) {
          const lock = backgroundLocks.get(item)!;
          if (--lock.count === 0) {
            item.inert = lock.inert;
            backgroundLocks.delete(item);
          }
        }
        if (--scrollLock.count === 0) {
          document.body.style.setProperty('overflow', scrollLock.value, scrollLock.priority);
          scrollLocks.delete(document);
        }
        if (previous?.isConnected && previous.getClientRects().length) previous.focus();
      };
    },
    { flush: 'post', immediate: true },
  );
  onBeforeUnmount(() => {
    cleanup?.();
    cleanup = undefined;
  });
}
