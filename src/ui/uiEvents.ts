import type { UiAction, UiSnapshot } from '../game/uiSnapshot';

const eventTarget = new EventTarget();

export function emitUiState(snapshot: UiSnapshot): void {
  eventTarget.dispatchEvent(new CustomEvent<UiSnapshot>('ui-state', { detail: snapshot }));
}

export function emitUiAction(action: UiAction): void {
  eventTarget.dispatchEvent(new CustomEvent<UiAction>('ui-action', { detail: action }));
}

export function onUiAction(handler: (action: UiAction) => void): () => void {
  const listener = (event: Event) => {
    handler((event as CustomEvent<UiAction>).detail);
  };

  eventTarget.addEventListener('ui-action', listener);
  return () => eventTarget.removeEventListener('ui-action', listener);
}

export function onUiState(handler: (snapshot: UiSnapshot) => void): () => void {
  const listener = (event: Event) => {
    handler((event as CustomEvent<UiSnapshot>).detail);
  };

  eventTarget.addEventListener('ui-state', listener);
  return () => eventTarget.removeEventListener('ui-state', listener);
}
