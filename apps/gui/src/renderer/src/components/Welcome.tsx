interface WelcomeProps {
  recentProjects: string[];
  onPick: () => void;
  onOpen: (path: string) => void;
  error: string | null;
  opening?: boolean;
}

export function Welcome({
  recentProjects,
  onPick,
  onOpen,
  error,
  opening,
}: WelcomeProps): JSX.Element {
  return (
    <div className="welcome">
      <h1>Kanmer</h1>
      <p>
        Open a project folder to load (or create) its <code>.kanmer</code> board.
      </p>
      <button className="primary" onClick={onPick} disabled={opening}>
        {opening ? "Opening…" : "Open project folder…"}
      </button>

      {recentProjects.length > 0 && (
        <div className="recents">
          <div className="recents-title">Recent</div>
          {recentProjects.map((p) => (
            <button
              key={p}
              className="recent-row"
              onClick={() => onOpen(p)}
              title={p}
              disabled={opening}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
