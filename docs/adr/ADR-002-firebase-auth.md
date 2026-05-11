# ADR-002: Firebase Auth с Google SSO

- **Дата**: 2026-05-11
- **Статус**: Принято
- **Автор**: PM (Claude)

## Контекст

Веб-каталог минуток — внутренний инструмент команды. Нужна авторизация.

## Решение

Firebase Authentication с Google Sign-In провайдером.

## Обоснование

- Все сотрудники Lemana имеют корпоративные Google-аккаунты
- Zero backend code для auth — Firebase берёт на себя всё
- Бесплатный тир Firebase достаточен для внутреннего использования
- Интеграция с Firebase Admin SDK для server-side верификации токенов

## Требования для работы

1. Firebase Console → Authentication → Sign-in method → Google → Enable
2. Firebase Console → Authentication → Settings → Authorized domains → добавить `lemana-zoom-agent-web.vercel.app`

## Последствия

- Только пользователи с Google-аккаунтом могут войти
- Нет ролей и прав доступа (все авторизованные пользователи видят всё)
- Расширение на мультипользовательский режим — Phase 3 (LZA-031)
