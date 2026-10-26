// The strip at the top of a phone frame: time on the left, signal, Wi-Fi and battery on
// the right, with the dynamic island between them. The frame's page starts below it, so
// the island never covers the cover photo. Sized from the frame's --fw and --pad.
export function PhoneStatusBar() {
  return (
    <div className="iphone-status" aria-hidden="true">
      <span className="iphone-status-time">9:41</span>
      <svg className="iphone-status-icons" viewBox="0 0 66 12" fill="currentColor">
        <rect x="0" y="8" width="3" height="4" rx="1" />
        <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
        <rect x="10" y="3" width="3" height="9" rx="1" />
        <rect x="15" y="0" width="3" height="12" rx="1" />
        <path d="M31 2.2a9.5 9.5 0 0 1 12 0l-1.4 1.6a7.4 7.4 0 0 0-9.2 0zM33.4 5a6 6 0 0 1 7.2 0L39.2 6.6a3.9 3.9 0 0 0-4.4 0zM37 8.4a1.9 1.9 0 0 1 1.4 .6L37 10.8 35.6 9a1.9 1.9 0 0 1 1.4-.6z" />
        <rect x="47" y="0.5" width="17" height="11" rx="3.2" fill="none" stroke="currentColor" strokeOpacity="0.45" />
        <rect x="48.8" y="2.3" width="13.4" height="7.4" rx="1.8" />
      </svg>
    </div>
  );
}
