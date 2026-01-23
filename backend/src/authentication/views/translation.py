import re
from typing import Dict, List, Tuple

from django.conf import settings
from django.db.models import Q
from django.db.models.functions import Lower
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.models.translation import Translation
from authentication.services.aws_translate import aws_translate


def _norm(txt: str) -> str:
    return (txt or "").strip()


def _norm_lang(lang: str) -> str:
    if not lang:
        return ""
    return str(lang).split("-")[0].split("_")[0].lower()


def _filter_qs(text: str, lang: str, ns: str):
    qs = Translation.objects.filter(target_lang=_norm_lang(lang)).filter(
        Q(source_text__iexact=_norm(text))
    )
    if ns:
        qs = qs.filter(namespace=ns)
    return qs


def _maybe_autosave(source_text: str, target_lang: str, namespace: str, translated: str):
    if not translated or not getattr(settings, "I18N_AUTOSAVE", False):
        return False
    lang_norm = _norm_lang(target_lang)
    Translation.objects.update_or_create(
        source_text=source_text,
        target_lang=lang_norm,
        namespace=namespace or "",
        defaults={"translated_text": translated},
    )
    return True


text_param = openapi.Parameter(
    "text", openapi.IN_QUERY, description="Texto original", type=openapi.TYPE_STRING, required=True
)
lang_param = openapi.Parameter(
    "lang",
    openapi.IN_QUERY,
    description="Idioma de destino (ex.: pt, es, ru)",
    type=openapi.TYPE_STRING,
    required=True,
)
ns_param = openapi.Parameter(
    "namespace",
    openapi.IN_QUERY,
    description="Namespace opcional (ex.: common, users)",
    type=openapi.TYPE_STRING,
    required=False,
)

post_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        "namespace": openapi.Schema(type=openapi.TYPE_STRING, description="Namespace opcional"),
        "items": openapi.Schema(
            type=openapi.TYPE_ARRAY,
            items=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    "text": openapi.Schema(type=openapi.TYPE_STRING),
                    "lang": openapi.Schema(type=openapi.TYPE_STRING, description="pt, es, ru…"),
                },
                required=["text", "lang"],
            ),
            description="Lista de textos para traduzir",
        ),
    },
    required=["items"],
)


class TranslateBatchView(APIView):
    permission_classes = [AllowAny]

    MAX_ITEMS = 500
    MAX_TEXT_LEN = 5000

    @swagger_auto_schema(request_body=post_schema, responses={200: "OK"})
    def post(self, request):
        data = request.data or {}
        ns = (data.get("namespace") or "").strip()
        items: List[Dict] = data.get("items", [])

        if not isinstance(items, list) or not items:
            return Response(
                {"detail": "Provide 'items': [ {text, lang}, ... ]"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(items) > self.MAX_ITEMS:
            return Response(
                {"detail": f"Too many items. Max {self.MAX_ITEMS}."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        normalized: List[Dict] = []
        for it in items:
            t = _norm(it.get("text", ""))
            l = _norm_lang(it.get("lang", ""))
            if not t or not l:
                normalized.append({"text": t, "lang": l})
                continue
            if len(t) > self.MAX_TEXT_LEN:
                return Response(
                    {"detail": f"Item text exceeds {self.MAX_TEXT_LEN} characters."},
                    status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                )
            normalized.append({"text": t, "lang": l})

        # coleções para lookup
        lowers: List[str] = []
        langs: List[str] = []
        for it in normalized:
            if it.get("text") and it.get("lang"):
                lowers.append(it["text"].lower())
                langs.append(it["lang"])

        if not lowers or not langs:
            return Response(
                {
                    "results": [
                        {"text": _norm(it.get("text", "")), "found": False, "auto": False}
                        for it in items
                    ]
                }
            )

        query_pairs: List[Tuple[str, str]] = []
        seen = set()
        for it in normalized:
            if it.get("text") and it.get("lang"):
                key = (it["text"].lower(), it["lang"])
                if key not in seen:
                    seen.add(key)
                    query_pairs.append(key)

        qs = Translation.objects.filter(target_lang__in=set(l for _, l in query_pairs))
        if ns:
            qs = qs.filter(namespace=ns)
        qs = qs.annotate(source_text_lower=Lower("source_text")).filter(
            source_text_lower__in=[t for t, _ in query_pairs]
        )

        table: Dict[Tuple[str, str], str] = {}
        for t in qs:
            table[(t.source_text.lower(), t.target_lang)] = t.translated_text

        results = []
        lookup_only = getattr(settings, "I18N_LOOKUP_ONLY", False)

        for it in normalized:
            src = it.get("text") or ""
            lang = it.get("lang") or ""
            if not src or not lang:
                results.append({"text": src, "found": False, "auto": False})
                continue

            key = (src.lower(), lang)
            translated = table.get(key)
            auto_flag = False

            if not translated and not lookup_only:
                translated = aws_translate(src, lang)
                auto_flag = translated is not None
                if translated:
                    _maybe_autosave(src, lang, ns, translated)
                    table[key] = translated

            results.append(
                {
                    "text": translated if translated else src,
                    "found": translated is not None,
                    "auto": auto_flag,
                }
            )

        return Response({"results": results}, status=status.HTTP_200_OK)


class TranslateLookupView(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(
        manual_parameters=[text_param, lang_param, ns_param],
        responses={
            200: openapi.Response(
                "OK",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "text": openapi.Schema(type=openapi.TYPE_STRING),
                        "found": openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        "auto": openapi.Schema(
                            type=openapi.TYPE_BOOLEAN,
                            description="True quando veio do provedor externo",
                        ),
                    },
                ),
            )
        },
    )
    def get(self, request):
        text = _norm(request.query_params.get("text", ""))
        lang = _norm_lang(request.query_params.get("lang", ""))
        ns = (request.query_params.get("namespace") or "").strip()

        if not text or not lang:
            return Response(
                {"detail": "Missing 'text' and/or 'lang'."}, status=status.HTTP_400_BAD_REQUEST
            )

        tr = _filter_qs(text, lang, ns).first()
        if tr:
            return Response({"text": tr.translated_text, "found": True, "auto": False})

        if not getattr(settings, "I18N_LOOKUP_ONLY", False):
            translated = aws_translate(text, lang)
            if translated:
                _maybe_autosave(text, lang, ns, translated)
                return Response({"text": translated, "found": True, "auto": True})

        return Response({"text": text, "found": False, "auto": False})
