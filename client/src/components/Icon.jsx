const paths = {
  bolt: "m13 2-9 12h7l-1 8L21 9h-8l2-7",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  back: "M19 12H5m6 6-6-6 6-6",
  code: "m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18",
  server: "M4 4h16v6H4zM4 14h16v6H4zM7 7h.01M7 17h.01M11 7h6m-6 10h6",
  database:
    "M20 5c0 2-3.6 3-8 3S4 7 4 5s3.6-3 8-3 8 1 8 3Zm0 0v14c0 2-3.6 3-8 3s-8-1-8-3V5m0 7c0 2 3.6 3 8 3s8-1 8-3",
  cloud:
    "M7 18a5 5 0 1 1 1-9 7 7 0 0 1 13 3 4 4 0 0 1-2 7h-3m-4 3V12m-3 3 3-3 3 3",
  check: "m5 12 4 4L19 6",
  clock: "M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  branch: "M6 3v12a4 4 0 0 0 4 4h8M6 8h7a5 5 0 0 0 5-5M4 3h4m8 0h4m-4 16h4",
  book: "M12 6c-3-3-7-3-10-2v15c3-1 7-1 10 2m0-15c3-3 7-3 10-2v15c-3-1-7-1-10 2V6",
};

export function Icon({ name, size = 20, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] ?? paths.code} />
    </svg>
  );
}
