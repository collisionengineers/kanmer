interface WelcomeProps {
  recentProjects: string[];
  onPick: () => void;
  onOpen: (path: string) => void;
  error: string | null;
}

export function Welcome({ recentProjects, onPick, onOpen, error }: WelcomeProps): JSX.Element {
  return (
    <div className="welcome">
      <h1>Kanmer</h1>
      <p>
        Open a project folder to load (or create) its <code>.kanmer</code> board.
      </p>
      <button className="primary" onClick={onPick}>
        Open project folder…
      </button>

      {recentProjects.length > 0 && (
        <div className="recents">
          <div className="recents-title">Recent</div>
          {recentProjects.map((p) => (
            <button key={p} className="recent-row" onClick={() => onOpen(p)} title={p}>
              {p}
            </button>
          ))}
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
