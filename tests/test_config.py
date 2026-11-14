from pydantic import SecretStr

from backend.app.config import Settings, get_configuration_report


def test_configuration_report_never_includes_secret_values():
    secret = "test-gemini-secret-do-not-print"
    config = Settings(
        GEMINI_API_KEY=SecretStr(secret),
        SUPABASE_SECRET_KEY=SecretStr("test-supabase-secret-do-not-print"),
    )

    report = str(get_configuration_report(config))

    assert secret not in report
    assert "test-supabase-secret-do-not-print" not in report
    assert "Not tested" in report


def test_configuration_report_distinguishes_optional_integrations():
    report = get_configuration_report(
        Settings(
            GEMINI_API_KEY=None,
            SUPABASE_URL="",
            SUPABASE_PUBLISHABLE_KEY=None,
            SUPABASE_SECRET_KEY=None,
            GOOGLE_CLIENT_ID="",
            GOOGLE_CLIENT_SECRET=None,
            GROQ_API_KEY=None,
            GOOGLE_CLOUD_PROJECT_ID="",
            GOOGLE_DOCUMENT_AI_PROCESSOR_ID="",
            GOOGLE_DOCUMENT_AI_LOCATION="",
        )
    )
    integrations = {
        entry["integration"]: entry for entry in report["integrations"]
    }

    assert integrations["Gemini"]["status"] == "Missing configuration"
    assert integrations["Supabase"]["status"] == "Missing configuration"
    assert integrations["Google OAuth"]["status"] == "Missing configuration"
    assert integrations["Groq"]["status"] == "Not configured (optional)"
    assert integrations["Google Document AI"]["status"] == "Not configured (optional)"
