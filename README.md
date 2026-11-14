# minearena

## External service configuration

The backend reads `backend/.env` (without overriding variables already set in
the process environment). Start with `backend/.env.example`; copy it to
`backend/.env` and fill in credentials from the providers listed below. Actual
`.env` files are ignored by Git. Never place a Supabase secret key or Google
OAuth client secret in frontend variables or source code.

The frontend template, `frontend/.env.example`, is reserved for public
Supabase URL and publishable-key values if a browser-side Supabase client is
introduced. The current frontend continues to use the existing backend auth
API; these variables are not consumed by the UI today.

### Required integrations

| Integration | Backend variables | Developer setup |
|---|---|---|
| Gemini | `GEMINI_API_KEY`, `GEMINI_MODEL` | Create a key at [Google AI Studio](https://aistudio.google.com/api-keys). The configured model remains exactly `gemini-3.8-flash`; verify that exact ID is available to your account with Google's API before enabling its use. The readiness report does not verify model access. |
| SEC EDGAR | `SEC_USER_AGENT`, `SEC_BASE_URL`, `SEC_ARCHIVES_URL` | No API key is required. Confirm `SEC_USER_AGENT` uses a monitored team contact before production use. Requests use the configured SEC base and archive URLs. |
| Supabase | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | Copy values from the Supabase project dashboard. Keep the secret key backend-only and enable/verify Row Level Security for user-specific data. |
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Create an OAuth client in Google Cloud; set its audience to **External** and add the exact callback URL provided by Supabase. Configure publishing status, verification, and test users as required for production. Keep the client secret backend-only. |

### Optional integrations

- **Groq:** `GROQ_API_KEY` from [Groq Console](https://console.groq.com/keys).
  Leave it empty unless deliberately enabling the backup provider.
- **Document AI:** `GOOGLE_CLOUD_PROJECT_ID`,
  `GOOGLE_DOCUMENT_AI_PROCESSOR_ID`, and `GOOGLE_DOCUMENT_AI_LOCATION`.
  This optional OCR service is not required for text-based PDFs. If implemented,
  use backend service-account authentication; do not put credentials in the
  frontend.

To print an integration readiness report without exposing credential values,
run from the repository root:

```powershell
python -m backend.app.config
```

The report distinguishes missing required credentials from unconfigured
optional services and labels every connection test as **Not tested**. It does
not make network requests, so a configured variable is not evidence that a
provider or model is reachable. Google OAuth callback setup and Supabase RLS
must also be completed in their respective dashboards. This change prepares
configuration only; it does not implement Gemini, Supabase Auth, Google OAuth,
Groq, or Document AI provider calls. Existing SEC EDGAR requests use the
configured SEC URLs and still require an actual request to verify connectivity.