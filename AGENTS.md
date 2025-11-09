# Repository Guidelines

## Project Structure & Module Organization
- Backend (Django + DRF): `smartsales_uc1_uc4/smartsales` (project config) and `smartsales_uc1_uc4/sales` (models, serializers, views, signals, admin, migrations, `management/commands/`).
- Frontend (Vite + React + Tailwind): `percy_store_front/src` with `components/`, `pages/`, `api/`, `utils/`, `img/`.
- Data: SQLite by default; safe to switch to PostgreSQL later.

## Build, Test, and Development Commands
- Backend env: `py -m venv .venv && .\\.venv\\Scripts\\activate && pip install -r smartsales_uc1_uc4/requirements.txt`
- Migrate/seed: `python smartsales_uc1_uc4/manage.py migrate` and `python smartsales_uc1_uc4/manage.py seed_catalog`
- Run API: `python smartsales_uc1_uc4/manage.py runserver`
- Frontend: `cd percy_store_front && npm install`
- Dev server: `npm run dev`  | Build: `npm run build`  | Preview: `npm run preview`

## Coding Style & Naming Conventions
- Python: PEP 8, 4-space indent, `snake_case` for functions/vars, `PascalCase` for classes/models. Put business logic in `sales/services.py`; keep request/response in `views.py` and `serializers.py`.
- React: ES6+, functional components with hooks. Filenames in `PascalCase` (e.g., `ProductCard.jsx`, `AdminOrders.jsx`). Keep route views in `src/pages`, UI blocks in `src/components`, helpers in `src/utils`.
- Styling: Tailwind utilities; prefer existing color tokens (cruceño green/red) and subtle motion via Framer Motion.

## Testing Guidelines
- Backend tests under `smartsales_uc1_uc4/sales/tests/test_*.py`; run with `python smartsales_uc1_uc4/manage.py test`.
- Frontend tests can live in `percy_store_front/src/__tests__/*.test.jsx` (Vitest/Jest not set up yet). Keep tests close to components when practical.
- Aim for coverage on core flows: auth (UC1–UC2), cart/checkout (UC5–UC6), orders (UC11–UC13).

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat(frontend): add Orders page`, `fix(backend): prevent double payment`.
- Each PR includes: summary, linked issues, clear testing steps, screenshots for UI, and note any migrations (`makemigrations`/`migrate`).
- Keep changes focused; avoid unrelated refactors.

## Security & Configuration Tips
- Do not commit secrets. Configure `SECRET_KEY`, DB creds, and DEBUG via env vars. Use JWT (`Authorization: Bearer <token>`) for protected endpoints.
- Commit migration files; review seed data before running `seed_catalog`.
