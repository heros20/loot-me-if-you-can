import type { UiAction, TavernProgressState } from '../game/uiSnapshot';

const eventTarget = new EventTarget();

export function emitUiState(snapshot: import('../game/uiSnapshot').UiSnapshot): void {
  eventTarget.dispatchEvent(new CustomEvent('ui-state', { detail: snapshot }));
}

export function emitUiAction(action: UiAction): void {
  eventTarget.dispatchEvent(new CustomEvent('ui-action', { detail: action }));
}

export function emitTavernProgress(state: TavernProgressState): void {
  eventTarget.dispatchEvent(new CustomEvent('tavern-progress', { detail: state }));
}

export function onUiAction(handler: (action: UiAction) => void): () => void {
  const listener = (event: Event) => {
    handler((event as CustomEvent<UiAction>).detail);
  };

  eventTarget.addEventListener('ui-action', listener);
  return () => eventTarget.removeEventListener('ui-action', listener);
}

export function onUiState(handler: (snapshot: import('../game/uiSnapshot').UiSnapshot) => void): () => void {
  const listener = (event: Event) => {
    handler((event as CustomEvent<import('../game/uiSnapshot').UiSnapshot>).detail);
  };

  eventTarget.addEventListener('ui-state', listener);
  return () => eventTarget.removeEventListener('ui-state', listener);
}

export function onTavernProgress(handler: (state: TavernProgressState) => void): () => void {
  const listener = (event: Event) => {
    handler((event as CustomEvent<TavernProgressState>).detail);
  };

  eventTarget.addEventListener('tavern-progress', listener);
  return () => eventTarget.removeEventListener('tavern-progress', listener);
}
