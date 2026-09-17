interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

let deferred: BeforeInstallPromptEvent | null = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferred = event as BeforeInstallPromptEvent;
});

export function hasInstallPrompt(): boolean {
  return deferred !== null;
}

export async function promptInstall(): Promise<void> {
  const event = deferred;
  if (!event) return;
  deferred = null;
  await event.prompt();
}
