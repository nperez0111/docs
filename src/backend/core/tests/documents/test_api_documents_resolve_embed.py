"""Document-scoped bookmark and embed resolution."""

from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

from core import factories
from core.services.converter_services import ServiceUnavailableError

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize("reach", ["restricted", "authenticated", "public"])
@pytest.mark.parametrize("authenticated", [False, True])
def test_resolve_embed_link_permissions(reach, authenticated):
    """Only readers may cause outgoing metadata requests."""
    document = factories.DocumentFactory(link_reach=reach, link_role="reader")
    client = APIClient()
    if authenticated:
        client.force_login(factories.UserFactory())
    allowed = reach == "public" or (reach == "authenticated" and authenticated)
    with patch(
        "core.services.converter_services.YdocConverter.resolve_embed"
    ) as resolve:
        resolve.return_value = {"version": "1.0", "type": "link"}
        response = client.get(
            f"/api/v1.0/documents/{document.id}/resolve-embed/",
            {"url": "https://example.com/article"},
        )
    if allowed:
        assert response.status_code == 200
        assert response["Cache-Control"] == "no-store"
        resolve.assert_called_once_with("https://example.com/article")
    else:
        assert response.status_code == (403 if authenticated else 401)
        resolve.assert_not_called()


@pytest.mark.parametrize(
    "role", ["reader", "commenter", "editor", "administrator", "owner"]
)
def test_resolve_embed_document_access(role):
    """Every explicit document reader can resolve a saved live embed."""
    access = factories.UserDocumentAccessFactory(role=role)
    client = APIClient()
    client.force_login(access.user)
    with patch(
        "core.services.converter_services.YdocConverter.resolve_embed"
    ) as resolve:
        resolve.return_value = {"version": "1.0", "type": "link"}
        response = client.get(
            f"/api/v1.0/documents/{access.document_id}/resolve-embed/",
            {"url": "https://example.com/article"},
        )
    assert response.status_code == 200


@pytest.mark.parametrize(
    "url",
    [
        "",
        "javascript:alert(1)",
        "file:///etc/passwd",
        "ftp://example.com/file",
        "https://user:password@example.com/",
    ],
)
def test_resolve_embed_invalid_url(url):
    """Reject invalid URL schemes before calling the resolver."""
    document = factories.DocumentFactory(link_reach="public", link_role="reader")
    with patch(
        "core.services.converter_services.YdocConverter.resolve_embed"
    ) as resolve:
        response = APIClient().get(
            f"/api/v1.0/documents/{document.id}/resolve-embed/", {"url": url}
        )
    assert response.status_code == 400
    resolve.assert_not_called()


def test_resolve_embed_unavailable():
    """An unavailable resolver fails without exposing internal details."""
    document = factories.DocumentFactory(link_reach="public", link_role="reader")
    with patch(
        "core.services.converter_services.YdocConverter.resolve_embed",
        side_effect=ServiceUnavailableError("internal host"),
    ):
        response = APIClient().get(
            f"/api/v1.0/documents/{document.id}/resolve-embed/",
            {"url": "https://example.com/article"},
        )
    assert response.status_code == 503
