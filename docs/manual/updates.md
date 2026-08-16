Kanmer keeps itself current. You do not need to check a website or download
anything after the first install.

## How it works

Kanmer looks for a new version shortly after it starts, and every few hours
after that. When it finds one it downloads it in the background and tells you
when it is ready — there is nothing to click to start it.

You can also check whenever you like: **Help → Check for Updates…**. A manual
check tells you either that a download has started or that you are already up to
date. Automatic checks stay silent unless there is something to say, which is
the right behaviour for something that runs every few hours.

## Installing it

When a version is downloaded you get a banner: *Kanmer x.y.z is ready to
install*, with two buttons.

- **Restart now** closes Kanmer, installs, and reopens.
- **Later** dismisses the banner. The update installs the next time you quit
  Kanmer anyway, so "Later" means "not this second", not "not at all".

If you press Later and then quit, Kanmer asks once more before it installs, with
the option to quit without installing.

## Why it asks before restarting

Because restarting can cost you something, and Kanmer checks what before it
interrupts you.

If you have unsaved changes in a ticket, or if agents are connected to this
Kanmer right now, the confirmation names exactly what is at stake — which ticket
has unsaved edits, and how many agent connections will close — before you commit
to it.

## Agent connections close on update

This is the one consequence worth understanding.

When an agent is connected to a project, the thing serving your board to that
agent **is the installed Kanmer**. So the update cannot replace Kanmer while
those connections are open, and Kanmer closes them itself as part of installing.

Your board is not at risk — it is files on disk, and they are untouched. What
drops is the agent's live connection. After the update, **restart the agent**
and it reconnects; an agent left running holds the old version and keeps reading
your board with the old code.

If Kanmer cannot confirm the connections closed, it refuses to install rather
than risk a half-replaced application. The download is kept and it tries again
next time. A refused update is a safe update.

## Going back a version

There is no rollback inside Kanmer. It will not install an older version over a
newer one, and there is no menu item for it.

If you genuinely need to go back, download the older installer from the releases
page and run it — the same manual route as a first install, SmartScreen warning
and all. Your board is unaffected either way: it is files in your project, not
state inside the app.
