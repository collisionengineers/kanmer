# Checklist

- [ ] `dispatchTicket` takes a task id and uses that task's prompt
- [ ] omitting the task keeps the whole-ticket behaviour
- [ ] `taskFeasibility` in core, pure, beside `DISPATCH_TASKS`
- [ ] execute blocked without `plan/`, with the reason
- [ ] verify blocked before `review`, with the reason
- [ ] the other four enabled, warning when an input is missing
- [ ] unit tests for the matrix
- [ ] `Dispatch ▸ provider ▸ task` nested menu
- [ ] each task row shows its deliverable
- [ ] blocked rows disabled and show why
- [ ] `DispatchStatus` carries `task` + `deliverable`
- [ ] drawer rows show the task
- [ ] dispatch still never pre-creates a worktree
- [ ] `plugin:build` + `plugin:check`
