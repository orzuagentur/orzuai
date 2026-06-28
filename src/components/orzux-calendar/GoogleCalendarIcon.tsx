type GoogleCalendarIconProps = {
  className?: string;
};

/** Official Google Calendar product icon (2020+ style). */
export function GoogleCalendarIcon({ className }: GoogleCalendarIconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#1976D2"
        d="M43,4H5C3.895,4,3,4.895,3,6v36c0,1.105,0.895,2,2,2h38c1.105,0,2-0.895,2-2V6C45,4.895,44.105,4,43,4z"
      />
      <path fill="#FFF" d="M33,29H15c-1.104,0-2-0.896-2-2V11h22V29z" />
      <path fill="#1976D2" d="M37,11H11v-3c0-1.104,0.896-2,2-2h22c1.104,0,2,0.896,2,2V11z" />
      <path fill="#FFF" d="M15,6h2v4h-2V6z M31,6h2v4h-2V6z" />
      <path fill="#1976D2" d="M15,18h4v4h-4V18z M21,18h4v4h-4V18z M27,18h4v4h-4V18z M33,18h4v4h-4V18z M15,24h4v4h-4V24z M21,24h4v4h-4V24z M27,24h4v4h-4V24z M33,24h4v4h-4V24z" />
    </svg>
  );
}
