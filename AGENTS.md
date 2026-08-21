# Instructions for AI agents

**Read [README.md](README.md) before doing anything else.** It is the source of
truth for how to start the stack, how the pieces fit together, where to add
code, and how to get past the two things that block a first run: trusting the
local certificate and finding the sign-in code.

A few rules that are easy to get wrong:

- Run commands from the repository root. `npm run dev` starts all three
  processes (backend, frontend, proxy); do not start them individually unless
  you are debugging one of them.
- Open the app at `https://localhost`, never at `http://localhost:5173`. The
  session cookie is `Secure`, so signing in only works over HTTPS through the
  proxy.
- Never commit `proxy/certs/*` (private keys) or anything else listed in
  [.gitignore](.gitignore).
- Run `npm run check` and `npm test` before reporting work as finished.
- Do not commit or push unless asked.
