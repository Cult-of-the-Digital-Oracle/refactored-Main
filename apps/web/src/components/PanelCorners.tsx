export function PanelCorners() {
  const corner =
    "pointer-events-none absolute z-10 h-7 w-7 border-[3px] border-[var(--pixel-border)] opacity-80";

  return (
    <>
      <span className={`${corner} left-3 top-3 border-b-0 border-r-0`} aria-hidden="true" />
      <span className={`${corner} right-3 top-3 border-b-0 border-l-0`} aria-hidden="true" />
      <span className={`${corner} bottom-3 left-3 border-r-0 border-t-0`} aria-hidden="true" />
      <span className={`${corner} bottom-3 right-3 border-l-0 border-t-0`} aria-hidden="true" />
    </>
  );
}
