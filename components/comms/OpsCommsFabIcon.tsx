type OpsCommsFabIconProps = {
  className?: string
}

export function OpsCommsFabIcon({ className }: OpsCommsFabIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M6 5.5C6 4.67 6.67 4 7.5 4H13.5C14.33 4 15 4.67 15 5.5V9.5C15 10.33 14.33 11 13.5 11H10.5L8 12.5V11H7.5C6.67 11 6 10.33 6 9.5V5.5Z"
        fill="currentColor"
        fillOpacity="0.3"
      />
      <path
        d="M10 8.5C10 7.67 10.67 7 11.5 7H17.5C18.33 7 19 7.67 19 8.5V12.5C19 13.33 18.33 14 17.5 14H15L12.5 15.5V14H11.5C10.67 14 10 13.33 10 12.5V8.5Z"
        fill="currentColor"
      />
    </svg>
  )
}
