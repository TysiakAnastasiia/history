# Тренажер НМТ з історії України

Інтерактивний сайт для підготовки до НМТ з історії України. Головна мета — запам'ятати матеріал: тренування за темами, пояснення до кожної відповіді, теорія, ігри.

**Сайт:** https://tysiakanastasiia.github.io/history/

**Стек:** Vite · React · TypeScript · Tailwind CSS · Motion (колишній Framer Motion) · React Router (HashRouter) · Zod · GitHub Pages.

---

## Розгортання проєкту з нуля

Інструкція для Windows, macOS і Linux. Команди виконуються в терміналі (на Windows — Git Bash або PowerShell; у VS Code: меню **Terminal → New Terminal**).

### 1. Встановити інструменти

| Що                                                    | Звідки                        | Перевірка            |
| ----------------------------------------------------- | ----------------------------- | -------------------- |
| **Git**                                               | https://git-scm.com/downloads | `git --version`      |
| **Node.js LTS** (версія 22 або новіша, npm іде разом) | https://nodejs.org            | `node -v` і `npm -v` |
| **VS Code**                                           | https://code.visualstudio.com | —                    |

Після встановлення **закрийте й знову відкрийте термінал**, інакше команди `git` / `node` можуть бути «не знайдені».

Один раз налаштуйте ім'я та пошту для комітів:

```bash
git config --global user.name "Ваше Ім'я"
git config --global user.email "ваша@пошта.com"
```

### 2. Налаштувати доступ до GitHub

Потрібно лише якщо ви будете пушити зміни. Найпростіший спосіб — GitHub CLI:

```bash
# встановити: https://cli.github.com
gh auth login
# GitHub.com → HTTPS → Login with a web browser
```

Альтернатива — [персональний токен](https://github.com/settings/tokens) (вводиться замість пароля під час першого `git push`) або [SSH-ключ](https://docs.github.com/en/authentication/connecting-to-github-with-ssh).

### 3. Клонувати репозиторій

```bash
git clone https://github.com/TysiakAnastasiia/history.git
cd history
```

### 4. Встановити залежності

```bash
npm install
```

Команда створить папку `node_modules` (її не комітимо, вона в `.gitignore`).

### 5. Запустити сайт локально

```bash
npm run dev
```

Відкрийте адресу з терміналу — зазвичай **http://localhost:5173/history/**. Сторінка оновлюється сама після збереження файлів. Зупинити сервер: `Ctrl + C`.

### 6. Відкрити сайт на телефоні

Телефон і комп'ютер мають бути в одній Wi-Fi мережі.

```bash
npm run dev -- --host
```

У терміналі з'явиться рядок `Network: http://192.168.x.x:5173/history/` — відкрийте цю адресу на телефоні. Якщо не відкривається, дозвольте Node.js доступ у брандмауері Windows (приватні мережі).

### 7. Налаштувати VS Code

Відкрийте папку проєкту (`code .` або **File → Open Folder**). VS Code запропонує встановити рекомендовані розширення — погодьтеся. Список у [.vscode/extensions.json](.vscode/extensions.json):

- **Prettier** — форматування коду при збереженні;
- **Oxc** — лінтер (oxlint), підсвічує помилки;
- **Tailwind CSS IntelliSense** — підказки класів Tailwind;
- **GitLens** — за бажанням.

Форматування при збереженні вже ввімкнене в [.vscode/settings.json](.vscode/settings.json).

### 8. Перевірити збірку перед пушем

```bash
npm run lint          # лінтер
npm run format:check  # чи відформатований код
npm run build         # перевірка типів + продакшн-збірка в папку dist
npm run preview       # переглянути зібраний сайт: http://localhost:4173/history/
```

---

## Команди

| Команда                | Що робить                               |
| ---------------------- | --------------------------------------- |
| `npm run dev`          | сервер розробки з автооновленням        |
| `npm run build`        | перевірка TypeScript і збірка в `dist/` |
| `npm run preview`      | локальний перегляд зібраної версії      |
| `npm run lint`         | перевірка коду лінтером oxlint          |
| `npm run format`       | відформатувати всі файли Prettier'ом    |
| `npm run format:check` | лише перевірити форматування            |

## Структура

```
.github/workflows/deploy.yml   автодеплой на GitHub Pages
public/                        статичні файли (копіюються як є)
  sounds/                      звукові ефекти
src/
  components/                  спільні UI-компоненти
  games/                       ігри (бліц, картки, хронологія…)
  data/                        JSON з питаннями та контентом тем
  lib/                         утиліти, схеми Zod (questionSchema.ts)
  App.tsx                      маршрути
  main.tsx                     точка входу (HashRouter)
  index.css                    підключення Tailwind
vite.config.ts                 base: '/history/' для GitHub Pages
```

## Щоденний процес роботи

```bash
git checkout main
git pull                          # підтягнути свіжі зміни
git checkout -b feature/назва     # нова гілка на кожне завдання

# ...робота...

npm run lint && npm run build     # перевірка перед комітом
git add .
git commit -m "Короткий опис змін"
git push -u origin feature/назва
```

Далі на GitHub створюємо Pull Request у `main` і зливаємо. Після злиття GitHub Actions сам збирає й публікує сайт (2–3 хвилини). Статус — у вкладці **Actions** репозиторію.

## Деплой (одноразове налаштування)

1. GitHub → репозиторій → **Settings → Pages**.
2. **Build and deployment → Source: GitHub Actions**.
3. У [.github/workflows/deploy.yml](.github/workflows/deploy.yml) прибрати рядок `if: github.event_name == 'workflow_dispatch'` у job `deploy` (поки його не прибрано, push у `main` лише перевіряє збірку, а публікація — тільки вручну).
4. Запушити будь-що в `main` (або **Actions → Deploy to GitHub Pages → Run workflow**).
5. Сайт з'явиться на `https://<логін>.github.io/history/`.

Якщо репозиторій перейменовано, змініть `base` у [vite.config.ts](vite.config.ts) на `'/<нова-назва>/'`.

## Типові проблеми

| Проблема                                             | Рішення                                                                          |
| ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| `node` / `git` / `npm` не знайдено                   | перезапустити термінал (або комп'ютер) після встановлення                        |
| PowerShell: «виконання сценаріїв вимкнено» для `npm` | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` або користуватися Git Bash |
| Порт 5173 зайнятий                                   | Vite сам візьме наступний — дивіться адресу в терміналі                          |
| Після деплою біла сторінка                           | перевірити `base` у `vite.config.ts` — має збігатися з назвою репозиторію        |
| Дивні помилки після `git pull`                       | `npm install` (могли додатися нові залежності)                                   |
| Все зламалось і незрозуміло чому                     | видалити `node_modules` і виконати `npm install` ще раз                          |
| Сайт не відкривається з телефону                     | запуск з `--host`, одна Wi-Fi мережа, дозвіл у брандмауері                       |

## Правила контенту

- Питання та пояснення пишемо самостійно; питання з інших сайтів не копіюємо.
- Підручники та посібники використовуємо лише для перевірки фактів — їх **не кладемо в репозиторій** (він публічний, а матеріали захищені авторським правом).
