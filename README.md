# DDRu v2 — сайт на чистом HTML, CSS и JavaScript

Без Next.js, без сборщиков и зависимостей. Тот же вид, тексты, фото, ссылки и логика,
что у прежнего сайта (подбор, корзина, форма заявки, выбор цвета и серии LOOP).

## Что загружать на хостинг
Содержимое папки **`site/`** (или готовый архив `ddru-v2-site.zip`) целиком
в корень сайта (`public_html`). `index.html` должен лежать прямо в `public_html`.

## Как внести правки
Нужен Node.js 22+. Правки делаются в `src/`, потом сборка:

```sh
cd ddru_v2
node src/build.mjs          # пересобирает папку site/
```

- `src/data/products.json` — товары, цены, характеристики, цвета, серии LOOP
- `src/data/education.json` — направления обучения
- `src/build.mjs` — тексты и разметка всех страниц
- `src/lib.mjs` — общие шаблоны и логика (форма заявки, подбор, цены)
- `src/client.js` — поведение страниц в браузере (меню, корзина, подбор, окно заявки)
- `src/styles/` — стили (взяты из прежнего сайта без изменений)
- `src/assets/products/` — фотографии

Контакты (Telegram, VK, MAX, телефон, email) — в `src/lib.mjs`, объект `contacts`.
Адрес сайта для canonical и sitemap — переменная `SITE_URL`
(по умолчанию `https://www.double-dutch.ru`):

```sh
SITE_URL=https://double-dutch.ru node src/build.mjs
```
