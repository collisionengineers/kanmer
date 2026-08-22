# Research

Hosted verify run `32585991850` failed three `apps/gui/src/main/kanmerGit.test.ts` assertions at CORE-026 head `e794cbf742f6103cee015d11ef51b867915445a1`: Windows Git returned canonical `C:\Users\runneradmin\...` paths while expectations used `C:\Users\RUNNER~1\...`. The test file already provides `pathIdentity` for filesystem-equivalent paths.
