# Research

GUI-118's independent review found that `connectProject` iterates every open
project but emits each status update with the initiating project id. Renderer
contexts filter by their own project id, so the second project drops the
update. The smallest fix is to use the loop id; no new IPC surface or state
model is required.
