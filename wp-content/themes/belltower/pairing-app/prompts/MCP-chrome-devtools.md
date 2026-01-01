USE MCP: chrome-devtools
TASK: collect_console
PARAMS: {"level":"error","sinceMs":60000}

USE-MCP: <server> # chrome-devtools OR context7
TASK: <toolname / sequence> # e.g. evaluate_script / call_webmcp_tool / performance_start_trace
PARAMS: {...} # JSON params
RESPONSE-FORMAT: JSON { ... }# exact schema expected
CONSTRAINTS: short 1-2 sentence diagnosis OR save artifact trace.json

ORIGINOL:
beer-card is still not getting the recommended class when they are recommended

NEW:
USE-MCP: chrome-devtools
TASK: evaluate_script
PARAMS: {
"expression": "Array.from(document.querySelectorAll('.beer-card')).map(n=>({slug:n.dataset.slug, dataRecommended:n.dataset.recommended, classList: n.className}))"
}
RESPONSE-FORMAT: JSON [{slug:string, dataRecommended:string, classList:string}]
INSTRUCTION: Return only the JSON array. Then one-sentence hypothesis if any slug has dataRecommended=='true' but classList does not contain 'recommended'.

ORIGINOL:
only seeing this after clicking Find Pairing

NEW:
USE-MCP: chrome-devtools
SEQUENCE:

- navigate {"url":"http://belltower.local/beer"}
- click {"selector":"#find-pairing"}
- waitFor {"ms":500}
- evaluate_script {"expression":"window.\_\_BT_PAIRING_RESULT || {pairing:null}"}
  RESPONSE-FORMAT: JSON { pairingResult: any }

# APPEND THIS (paste directly AFTER your request)

USE-MCP: context7, chrome-devtools

SAFETY & SCOPE:

- NO branches, NO diffs, NO PRs. Edit files in-place only.
- MAX_ATTEMPTS: 2
- ALLOWED_PATHS: ["src/", "public/", "src/components/"]
- DO_NOT_TOUCH: ["package.json","build/","server/"]

WORKFLOW (minimal):

1. PLAN: return 1 sentence listing exact files to change.
2. APPLY: make the minimal file edits directly in the repo (respect ALLOWED_PATHS and keep changes small).
3. VERIFY:
   - context7: if available, call getAppState() or runSmokeChecks(); return state.
   - chrome-devtools: navigate to the relevant page, wait for load, collect console errors (last 2000ms).
4. IF verification passes: return success.

OUTPUT (JSON only):
{ "success": boolean, "attempts": number, "files_changed": [string], "console": [string], "assertion": {ok:boolean, before:any, after:any, reason?:string}, "notes": string|null }
