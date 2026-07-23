export function StatusPill({children,tone="neutral"}:{children:React.ReactNode;tone?:"neutral"|"green"|"amber"|"red"|"cyan"}) { return <span className={`status-pill ${tone}`}><i/>{children}</span> }
