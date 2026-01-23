import boto3
from django.conf import settings


def aws_translate(text: str, target_lang: str) -> str | None:
    if not text:
        return ""
    target = (target_lang or "").split("-")[0].split("_")[0].lower()
    if not target:
        return None
    try:
        session = boto3.Session(
            aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", None)
            or getattr(settings, "AWS_ACCESS_KEY", None),
            aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", None)
            or getattr(settings, "AWS_ACCESS_SECRET", None),
            region_name=getattr(settings, "AWS_REGION", "eu-central-1"),
        )
        client = session.client("translate")
        resp = client.translate_text(
            Text=text, SourceLanguageCode="auto", TargetLanguageCode=target
        )
        return resp.get("TranslatedText")
    except Exception as e:
        print("AWS Translate error:", repr(e))
        return None
