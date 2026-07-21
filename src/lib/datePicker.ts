// Clicking anywhere in a native date input should open its picker, not just
// the small calendar-icon glyph some browsers restrict it to by default.
export function openDatePicker(e: { currentTarget: HTMLInputElement }): void {
  try {
    e.currentTarget.showPicker?.();
  } catch {
    // Not supported in every browser — focus (which already happens on
    // click) still lets the user type or use the keyboard to open it.
  }
}
