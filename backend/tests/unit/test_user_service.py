from unittest.mock import MagicMock, patch

import pytest

from app.modules.users.service import (
    UserAlreadyExistsError,
    create_user,
)


def test_create_user():
    db = MagicMock()

    with (
        patch(
            "app.modules.users.service.repository.get_by_email",
            return_value=None,
        ) as mock_get,
        patch(
            "app.modules.users.service.repository.create",
        ) as mock_create,
    ):
        create_user(
            db=db,
            email="test@example.com",
            password_hash="fake_hash",
        )

        mock_get.assert_called_once_with(
            db,
            "test@example.com",
        )

        mock_create.assert_called_once_with(
            db=db,
            email="test@example.com",
            password_hash="fake_hash",
        )


def test_duplicate_email_rejected():
    db = MagicMock()
    existing_user = MagicMock()

    with (
        patch(
            "app.modules.users.service.repository.get_by_email",
            return_value=existing_user,
        ),
        patch(
            "app.modules.users.service.repository.create",
        ) as mock_create,
    ):
        with pytest.raises(UserAlreadyExistsError):
            create_user(
                db=db,
                email="test@example.com",
                password_hash="fake_hash",
            )

        mock_create.assert_not_called()