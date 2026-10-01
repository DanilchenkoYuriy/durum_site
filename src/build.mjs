// Сборка сайта: node src/build.mjs
// Результат — готовые HTML/CSS/JS-файлы в корне проекта (их и загружают на хостинг).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  contacts,
  esc,
  formatPrice,
  mediaHtml,
  messengerLinksHtml,
  productCardHtml,
  productDetailHtml,
  defaultVariantId,
  wholesaleLabel,
} from "./lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Сайт собирается прямо в корень проекта (index.html лежит рядом с папкой src).
const out = root;
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const SITE_URL = (process.env.SITE_URL || "https://www.double-dutch.ru").replace(/\/$/, "");
const config = JSON.parse(read("src/config.json"));
// Номер счётчика Яндекс Метрики: src/config.json → "metrikaId" (или переменная METRIKA_ID).
const METRIKA_ID = String(process.env.METRIKA_ID || config.metrikaId || "").replace(/\D/g, "");
const metrikaHead = METRIKA_ID
  ? `<script>
(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();
for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
ym(${METRIKA_ID}, "init", {clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true});
</script>
`
  : "";
const metrikaNoscript = METRIKA_ID
  ? `<noscript><div><img src="https://mc.yandex.ru/watch/${METRIKA_ID}" style="position:absolute; left:-9999px;" alt=""></div></noscript>
`
  : "";
const SITE_DESCRIPTION =
  "Профессиональные скакалки DDRu. Экспертный подбор инвентаря для спортсменов, тренеров, секций и федераций.";

const products = JSON.parse(read("src/data/products.json")).sort(
  (a, b) => a.sortOrder - b.sortOrder,
);
const education = JSON.parse(read("src/data/education.json"));
const byId = (id) => products.find((p) => p.id === id);

const navigation = [
  { href: "/catalog/", label: "Каталог" },
  { href: "/for-sections/", label: "Для секций" },
  { href: "/double-dutch/", label: "Double Dutch" },
  { href: "/education/", label: "Обучение" },
  { href: "/about/", label: "О проекте" },
];

/* ---------- каркас страницы ---------- */
function header(current) {
  const cur = (href) =>
    current.startsWith(href) ? ' aria-current="page"' : "";
  const links = [
    ...navigation,
    { href: "/contacts/", label: "Контакты" },
    { href: "/cart/", label: "Корзина", cart: true },
    { href: "/selection/", label: "Подобрать скакалку" },
  ];
  return `<header class="site-header">
<div class="header-inner">
<a class="brand" href="/" aria-label="DDRu — главная">DDRu<span class="brand-dot" aria-hidden="true">·</span><span class="brand-caption">DOUBLE DUTCH<br>RUSSIA</span></a>
<nav class="desktop-nav" aria-label="Основная навигация">${navigation
    .map((n) => `<a href="${n.href}"${cur(n.href)}>${n.label}</a>`)
    .join("")}</nav>
<a class="header-cart" href="/cart/" aria-label="Корзина: 0" data-cart-link>Корзина</a>
<a class="button button-small header-cta" href="/selection/">Подобрать скакалку <span aria-hidden="true">↗</span></a>
<button type="button" class="menu-toggle" aria-expanded="false" aria-controls="mobile-menu">Меню +</button>
</div>
<nav id="mobile-menu" class="mobile-nav" aria-label="Мобильная навигация" hidden>${links
    .map(
      (n) =>
        `<a href="${n.href}"${cur(n.href)}${n.cart ? " data-cart-link-text" : ""}>${n.label}<span aria-hidden="true">↗</span></a>`,
    )
    .join("")}</nav>
</header>`;
}
function footer() {
  return `<footer class="site-footer">
<div class="container footer-top">
<div><a href="/" class="footer-logo">DDRu<span aria-hidden="true">·</span></a><p>Инвентарь. Практика. Команда.</p></div>
<nav aria-label="Навигация в подвале">${[...navigation, { href: "/contacts/", label: "Контакты" }]
    .map((n) => `<a href="${n.href}">${n.label}</a>`)
    .join("")}</nav>
<div><p class="eyebrow">На связи</p>${messengerLinksHtml(undefined, "community")}</div>
</div>
<div class="container footer-bottom"><span>© ${new Date().getFullYear()} Double Dutch Russia</span><span>Подберём инвентарь под вашу задачу.</span></div>
</footer>`;
}
const dialog = `<dialog class="inquiry-dialog" id="inquiry-dialog" aria-labelledby="inquiry-title">
<div class="dialog-header"><div><p class="eyebrow">DDRu / личный подбор</p><h2 id="inquiry-title">Подберём инвентарь вместе</h2></div><button type="button" class="close-button" aria-label="Закрыть форму" data-dialog-close>×</button></div>
<div id="inquiry-body"></div>
</dialog>`;

function page({ path: pth, title, description, body, bodyClass = "", noindex = false }) {
  const full = `${title} — DDRu`;
  const url = SITE_URL + pth;
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">\n' : `<link rel="canonical" href="${url}">\n`}<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ru_RU">
<meta property="og:site_name" content="Double Dutch Russia">
<meta property="og:url" content="${url}">
<link rel="icon" href="data:,">
<link rel="stylesheet" href="/css/style.css">
${metrikaHead}</head>
<body class="${bodyClass}">
<a class="skip-link" href="#main">Перейти к содержимому</a>
${header(pth)}
<main id="main">
${body}
</main>
${footer()}
${dialog}
${metrikaNoscript}<script src="/js/app.js" defer></script>
</body>
</html>
`;
}

/* ---------- кусочки страниц ---------- */
const pageIntro = (eyebrow, title, inner = "") =>
  `<header class="page-intro"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1>${inner ? `<div class="intro-copy">${inner}</div>` : ""}</header>`;
const sectionCTA = (
  title = "Ваша задача. Наш опыт.",
  description = "Расскажите, для кого выбираете скакалку. Поможем с моделью, комплектом и следующими шагами.",
) => `<section class="contact-section container">
<div><p class="eyebrow">Давайте начнём с разговора</p><h2>${title}</h2><p>${description}</p><a class="text-link" href="/selection/">Начать подбор <span aria-hidden="true">↗</span></a></div>
${messengerLinksHtml()}
</section>`;
const inquiryButton = (label, ctx, { className = "button", title, mode } = {}) =>
  `<button type="button" class="${className}" data-inquiry='${esc(JSON.stringify({ ...ctx, ...(mode ? { inquiryType: mode } : {}) }))}'${title ? ` data-title="${esc(title)}"` : ""}>${label}<span aria-hidden="true">↗</span></button>`;

/* ---------- страницы ---------- */
const pages = [];
const add = (p) => pages.push(p);

// Главная
{
  const faq = [
    [
      "Как оформить заявку?",
      "Выберите модель и нажмите «Заказать / уточнить наличие» или пройдите подбор. Форма подготовит текст для личного общения в мессенджере. После согласования состава и наличия обсудим счёт, договор и отправку.",
    ],
    [
      "С какого количества действуют оптовые условия?",
      "От 30 единиц. Для Double Dutch одной единицей считается комплект из двух скакалок. Смешанный состав и условия расчёта согласуем лично.",
    ],
    [
      "Можно собрать разные модели для одной секции?",
      "Да. Расскажите о возрасте, количестве спортсменов, дисциплинах и уже имеющемся инвентаре — поможем подобрать смешанный комплект.",
    ],
    [
      "Как выбрать длину и цвет?",
      "У одиночных моделей длина регулируется. Подходящую настройку обсудим с учётом спортсмена и задачи, а доступность цвета уточним перед согласованием.",
    ],
  ];
  const tasks = [
    ["Первые тренировки", "/catalog/beaded-rope/"],
    ["Вольные", "/catalog/pvc-rope/"],
    ["Скорость/Двойные/Тройные", "/catalog/speed-rope/"],
    ["Китайское колесо", "/catalog/beaded-rope/"],
    ["Дабл Датч", "/double-dutch/"],
  ];
  add({
    path: "/",
    title: "Скакалки и экспертный подбор",
    description:
      "Профессиональный инвентарь DDRu, помощь тренерам и подбор скакалок под вашу задачу. От первых тренировок до командного Double Dutch.",
    body: `<section class="container home-hero">
<div class="hero-copy">
<p class="eyebrow">Double Dutch Russia / Инвентарь</p>
<h1 class="hero-title"><span class="hero-title-line">Ваша тренировка.</span><span class="hero-title-line">Правильная скакалка.</span><span class="hero-title-line hero-title-accent">Лучший результат.</span></h1>
<p class="hero-subtitle"><span class="hero-subtitle-line">Прыгай выше. Беги быстрей. Становись сильнее.</span><span class="hero-subtitle-line">Профессиональные скакалки с тренерским опытом.</span></p>
<div class="button-row"><a class="button" href="/catalog/">Выбрать скакалку ↗</a><a class="text-link" href="/selection/">Подобрать ↗</a></div>
</div>
<div class="hero-media">${mediaHtml(products[1].mainImage, "Бисерная скакалка", "DDRu", true)}</div>
</section>
<section class="container home-catalog">
<div class="section-heading"><div><p class="eyebrow">01 / Коллекция</p><h2>Четыре модели.<br>Под ваши задачи.</h2></div><a class="text-link" href="/catalog/">Весь каталог ↗</a></div>
<div class="product-grid four-columns">${products.map(productCardHtml).join("")}</div>
</section>
<section class="container task-section">
<div><p class="eyebrow">02 / Осознанный выбор</p><h2>Какую скакалку<br>выбрать?</h2><p>Расскажите о целях — мы подберём модель.</p><a class="button button-outline" href="/selection/">Пройти подбор ↗</a></div>
<div class="task-list">${tasks
      .map(
        ([name, href], i) =>
          `<a href="${href}"><span class="task-number">0${i + 1}</span><div><h3>${name}</h3></div><span aria-hidden="true">↗</span></a>`,
      )
      .join("")}</div>
</section>
<section class="expertise-section"><div class="container expertise-inner">
<p class="eyebrow">03 / За выбором — практика</p>
<h2>Инвентарь, который<br>знают <em>все.</em></h2>
<div><p class="expertise-lead">Подходит для всех видов спорта</p><p>Подбираем скакалки с позиции практикующего тренера. Тренировки, соревнования и методическая работа помогают понять, что нужно спортсмену на каждом этапе.</p><a class="text-link" href="/about/">О подходе DDRu ↗</a></div>
</div></section>
<section class="container section-banner home-sections">
<div><p class="eyebrow">04 / Для секций, школ и федераций</p><h2>Укомплектуем ваш заказ</h2><p>Подберём смешанный комплект по возрасту, дисциплинам и числу спортсменов.</p><a class="button" href="/for-sections/">Подобрать для секции ↗</a></div>
<div class="wholesale-mark"><strong>30<span>+</span></strong><p>единиц — оптовые условия</p></div>
</section>
<p class="container dd-direction-note">05 / Запуск направления Double Dutch.</p>
<section class="container double-dutch-feature">
<div class="dd-typography" aria-hidden="true"><span>DOUBLE</span><span>DUTCH<span class="dd-dot">●</span></span><small>Командная дисциплина с двумя скакалками, которые одновременно вращают два участника, а один или несколько спортсменов выполняют прыжки и элементы внутри.</small></div>
<div><h2>Больше, чем<br>прыжки.</h2><p>Две скакалки, общая задача и внимание друг к другу. Командный формат, который объединяет группу — от первой тренировки до выступления.</p><a class="button button-outline" href="/double-dutch/">Открыть Double Dutch ↗</a></div>
</section>
<section class="container education-preview">
<div class="section-heading"><div><p class="eyebrow">06 / Делимся секретами</p><h2>Помогаем двигаться дальше.</h2></div><a class="text-link" href="/education/">Обучение и поддержка ↗</a></div>
<div class="service-strip">${["Обучение", "Методика", "Консультации", "Запуск группы"]
      .map(
        (n, i) =>
          `<a href="/education/"><span>0${i + 1}</span><h3>${n}</h3><span aria-hidden="true">↗</span></a>`,
      )
      .join("")}</div>
</section>
<section class="container faq-section">
<div><p class="eyebrow">07 / Вы не одни такие</p><h2>Частые вопросы.</h2></div>
<div>${faq
      .map(
        ([q, a]) =>
          `<details><summary>${q}<span aria-hidden="true">+</span></summary><p>${a}</p></details>`,
      )
      .join("")}</div>
</section>
${sectionCTA()}`,
  });
}

// Каталог
add({
  path: "/catalog/",
  title: "Каталог скакалок",
  description:
    "ПВХ, бисерные, скоростные скакалки и комплекты Double Dutch. Выберите модель и обсудите подбор с тренером.",
  body: `<div class="container editorial-catalog">
${pageIntro("Каталог", "Скакалки под разные задачи.", `<p>Четыре модели. Разные задачи. Один подход —<br class="desktop-break"> инвентарь, который работает вместе с вами.</p>`)}
<div class="product-grid">${products.map(productCardHtml).join("")}</div>
<div class="catalog-footnote"><p>Для секций — оптовые условия от 30 единиц.<br>Double Dutch: одна единица — комплект из двух скакалок.</p></div>
</div>
${sectionCTA("Выбираете для себя или команды?")}`,
});

// Страницы товаров
for (const product of products) {
  const state = {
    seriesId: product.series,
    variantId: defaultVariantId(product),
    imageIndex: 0,
    quantity: 1,
  };
  const related = products.filter((p) => p.slug !== product.slug).slice(0, 3);
  const descParagraph = (par) => {
    if (!par.emphasizedTerm) return `<p>${esc(par.text)}</p>`;
    const [before, after = ""] = par.text.split(par.emphasizedTerm);
    return `<p>${esc(before)}<strong>${esc(par.emphasizedTerm)}</strong>${esc(after)}</p>`;
  };
  const hasSeries = Boolean(product.seriesOptions?.length);
  add({
    path: `/catalog/${product.slug}/`,
    title: product.name,
    description: product.shortDescription,
    bodyClass: "page-product",
    body: `<div class="container product-page" data-product="${product.id}">
<nav class="breadcrumbs" aria-label="Хлебные крошки"><a href="/">Главная</a><span aria-hidden="true">/</span><a href="/catalog/">Каталог</a><span aria-hidden="true">/</span><span aria-current="page">${esc(product.shortName)}</span></nav>
<div class="product-detail" id="product-detail">${productDetailHtml(product, state)}</div>
<section class="product-editorial product-purpose">
<div><p class="eyebrow">01 / В тренировке</p><h2>Для чего подходит</h2>${hasSeries ? '<p class="form-hint">Об исполнении DDRu</p>' : ""}</div>
<div>${
      product.descriptionLead
        ? `<div class="product-long-description"><p><strong>${esc(product.descriptionLead)}</strong></p>${(product.descriptionParagraphs ?? []).map(descParagraph).join("")}</div>`
        : `<p>${esc(product.description)}</p><ul class="plain-list">${product.recommendedFor.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`
    }<p class="form-hint">Дисциплины: ${esc(product.disciplines.join(" · "))}</p></div>
</section>
<section class="product-editorial product-facts">
<div><p class="eyebrow">02 / В деталях</p><h2>Характеристики</h2>${hasSeries ? '<p class="form-hint">Характеристики исполнения DDRu. Параметры LOOP уточним при общении.</p>' : ""}</div>
<div>${
      product.specificationGroups
        ? `<div class="specification-groups">${product.specificationGroups
            .map(
              (g) =>
                `<section class="specification-group"><h3>${esc(g.title)}</h3><dl class="specifications">${g.items.map(({ label, value }) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl></section>`,
            )
            .join("")}</div>`
        : `<dl class="specifications">${product.specifications.map(({ label, value }) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl><h3>Комплектация</h3><ul class="plain-list">${product.contents.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`
    }</div>
</section>
<aside class="product-editorial coach-note"><div><p class="eyebrow">03 / Взгляд тренера</p><h2>Рекомендация тренера</h2></div><p>${esc(product.coachRecommendation)}</p></aside>
<section class="section-banner"><div><p class="eyebrow">04 / Для секций</p><h2>Нужно 30 и больше?</h2><p>${esc(wholesaleLabel(product))} — для секций, школ, клубов и федераций.</p></div>
${inquiryButton("Получить расчёт", { product: product.id, customerType: "Тренер", quantity: product.wholesaleMinQuantity }, { mode: "section" })}</section>
<section class="related-section">
<div class="section-heading"><div><p class="eyebrow">05 / Коллекция</p><h2>Другие модели</h2></div><a class="text-link" href="/catalog/">Весь каталог ↗</a></div>
<div class="product-grid three-columns">${related.map(productCardHtml).join("")}</div>
</section>
</div>`,
  });
}

// Для секций
{
  const ctx = {
    customerType: "Тренер",
    comment: "Нужен комплект для группы. Состав и количество подберём индивидуально.",
  };
  add({
    path: "/for-sections/",
    title: "Для секций, школ и федераций",
    description:
      "Подбор комплектов для тренеров, секций, школ и федераций. Оптовые условия от 30 единиц.",
    body: `<div class="container sections-page">
${pageIntro("Для секций", "Соберём комплект под вашу группу", `<p>Подбор скакалок зависит от роста, возраста спортсменов, задач и уровня подготовки.</p><div class="button-row">${inquiryButton("Получить расчёт", ctx, { mode: "section" })}<a class="text-link" href="/selection/">Подобрать комплект ↗</a></div>`)}
<p class="section-audience">Для тренеров, спортивных секций, клубов, школ, образовательных учреждений и региональных федераций.</p>
<section class="section-editorial">
<div><p class="eyebrow">01 / Под задачу</p><h2>Разные скакалки.<br>Разные задачи.</h2><p>Подберём инвентарь под вашу группу.</p></div>
<div class="section-models">${products
      .map(
        (p) =>
          `<article><a href="/catalog/${p.slug}/" aria-label="Подробнее: ${esc(p.name)}">${mediaHtml(p.mainImage, p.name)}</a><div><h3>${p.id === "double-dutch-rope" ? "Double Dutch (Дабл Датч)" : esc(p.shortName)}</h3></div></article>`,
      )
      .join("")}</div>
</section>
<section class="section-editorial">
<div><p class="eyebrow">02 / Условия</p><h2>Оптовые условия<br>от 30 единиц</h2><p>Скакалки DDRu и LOOP стоят одинаково в рамках модели.</p></div>
<div><div class="wholesale-prices">${products
      .map(
        (p) =>
          `<div><h3>${esc(p.shortName)}</h3><p><strong>${formatPrice(p.wholesalePrice)}</strong>${p.unitLabel === "комплект" ? "<span> / комплект</span>" : ""}<small>Розница ${formatPrice(p.retailPrice)}</small></p></div>`,
      )
      .join("")}</div><p class="form-hint">Double Dutch: одна единица — комплект из двух скакалок.</p></div>
</section>
<section class="section-editorial">
<div><p class="eyebrow">03 / Пример</p><h2>Пример комплекта<br>для секции</h2></div>
<div><p class="section-large-text">30 единиц могут быть смешанными: бисерные, ПВХ, скоростные и Double Dutch.</p><p>Это пример формата, а не универсальная рекомендация. Состав зависит от задач группы — его подберём индивидуально. Учтём и тот инвентарь, который уже есть.</p><a class="text-link" href="/selection/">Рассказать о группе ↗</a></div>
</section>
<section class="section-editorial">
<div><p class="eyebrow">04 / Сопровождение</p><h2>Не только инвентарь.</h2></div>
<div class="editorial-list">${[
      ["Помощь в подборе", "Сопоставим возраст, задачи и имеющиеся скакалки. Дадим рекомендации по использованию."],
      ["Запуск Double Dutch", "Обсудим старт группы и вопросы тренера."],
      ["Методика и обучение", "На консультации обсудим доступные методические материалы и возможность обучения тренера. Формат и условия согласуем отдельно."],
    ]
      .map(([t, x]) => `<article><h3>${t}</h3><p>${x}</p></article>`)
      .join("")}</div>
</section>
<section class="section-process"><p class="eyebrow">05 / Как это работает</p><h2>От группы — к комплекту.</h2><ol>${[
      "Рассказываете о группе",
      "Подбираем комплект",
      "Согласовываем состав и стоимость",
      "Счёт / договор / отправка",
    ]
      .map((t, i) => `<li><span>0${i + 1}</span><h3>${t}</h3></li>`)
      .join("")}</ol></section>
<section class="section-final"><div><p class="eyebrow">Начнём с вашей группы</p><h2>Состав подберём вместе.</h2><p>Расскажите о спортсменах и задачах. Подготовим основу для расчёта.</p></div>${inquiryButton("Получить расчёт для секции", ctx, { mode: "section" })}</section>
</div>`,
  });
}

// Double Dutch
{
  const p = byId("double-dutch-rope");
  add({
    path: "/double-dutch/",
    title: "Double Dutch для вашей секции",
    description:
      "Командные прыжки через две скакалки: запуск группы, подбор комплектов и поддержка тренеров DDRu.",
    body: `<div class="container">
${pageIntro("DDRu / командный формат", "Две скакалки. Общий ритм.", `<p>Double Dutch — прыжки через две скакалки, которые партнёры вращают навстречу друг другу. Здесь важны и прыгающие, и вращающие: результат создаёт вся команда.</p>`)}
<div class="dd-page-visual dd-typography" aria-hidden="true"><span>DOUBLE DUTCH<span class="dd-dot">●</span></span><small>ДВИЖЕНИЕ, КОТОРОЕ ОБЪЕДИНЯЕТ</small></div>
<section class="content-section"><div class="info-grid">${[
      ["Командная работа", "Участники учатся держать общий ритм, договариваться и менять роли."],
      ["Вовлечённая группа", "Можно организовать несколько рабочих мест и ротацию, чтобы каждый участвовал в тренировке."],
      ["Зрелищность и перспектива", "От простых совместных прыжков — к вольным композициям, скоростным дисциплинам и соревнованиям."],
    ]
      .map(([t, x]) => `<article><h3>${t}</h3><p>${x}</p></article>`)
      .join("")}</div></section>
<section class="content-section dd-equipment">
<div><p class="eyebrow">Инвентарь для старта</p><h2>Один комплект —<br>одно место вращения.</h2>
<p>Комплект включает две бисерные скакалки по 4,2 м. Количество комплектов зависит от числа одновременно работающих групп, пространства и плана ротации.</p>
<p>Расскажите о составе секции — поможем определить количество инвентаря и обсудить первые занятия.</p>
${inquiryButton("Запустить Double Dutch в своей секции", { product: p.id, customerType: "Тренер", comment: "Хочу запустить Double Dutch. Нужна помощь с количеством комплектов и планом старта." })}
<a class="text-link back-result" href="/education/">Обучение и поддержка ↗</a></div>
${productCardHtml(p)}
</section>
</div>`,
  });
}

// Обучение
add({
  path: "/education/",
  title: "Обучение и поддержка тренеров",
  description:
    "Обучение, методические материалы, консультации, мастер-классы и запуск секции с поддержкой DDRu.",
  body: `<div class="container">
${pageIntro("DDRu / знания в движении", "Инвентарь — только начало.", `<p>Помогаем тренерам превращать комплект скакалок в понятную тренировочную практику. От запуска первой группы до развития секции.</p>`)}
<section class="service-grid" aria-label="Направления обучения">${education
    .map(
      (s, i) =>
        `<article id="${s.id}"><span class="eyebrow">0${i + 1} / Практика</span><h2>${esc(s.title)}</h2><p>${esc(s.description)}</p>${inquiryButton("Обсудить формат", { customerType: "Тренер", comment: `Интересует: ${s.title}.` }, { className: "text-link" })}</article>`,
    )
    .join("")}</section>
<section class="section-banner"><div><p class="eyebrow">Программа под вашу задачу</p><h2>Начнём с того,<br>что нужно вашей группе.</h2><p>Формат, содержание и сроки обучения согласуем лично.</p></div>${inquiryButton("Обсудить обучение", { customerType: "Тренер", comment: "Нужна консультация по обучению." })}</section>
</div>`,
});

// О проекте
add({
  path: "/about/",
  title: "О проекте Double Dutch Russia",
  description:
    "DDRu — подбор инвентаря с позиции практикующего тренера. Тренерская и методическая работа, соревнования и Double Dutch.",
  body: `<div class="container">
${pageIntro("DDRu / за инвентарём — человек", "Выбор из практики.", `<p>Инвентарь подбирает и использует практикующий тренер. В основе DDRu — понимание того, как скакалка работает в руках спортсмена и что помогает группе двигаться дальше.</p>`)}
<section class="about-story">
<div class="editorial-placeholder"><span class="eyebrow">Из тренировочной практики</span><p>Здесь появится<br>фото тренера.</p><span>Double Dutch Russia</span></div>
<div><p class="eyebrow">Наш подход</p><h2>Сначала задача.<br>Потом модель.</h2>
<p>Для первых тренировок, изучения элементов и скоростной работы нужен разный подход. Поэтому мы начинаем с вопросов об опыте, дисциплине и составе группы.</p>
<p>Помогаем выбрать инвентарь, разобраться с его настройкой и продумать следующий шаг — для одного спортсмена или целой секции.</p></div>
</section>
<section class="content-section"><h2>Работа, которая стоит за выбором.</h2><div class="info-grid about-areas">${[
    ["Тренерская работа", "Инвентарь в ежедневной практике и помощь спортсменам."],
    ["Методическая работа", "Последовательность обучения и поддержка тренеров."],
    ["Работа с федерацией", "Место для подтверждённых совместных проектов и материалов."],
    ["Соревнования", "Место для репортажей и опыта применения инвентаря."],
    ["Double Dutch", "Командный формат и помощь в запуске групп."],
    ["Фото и видео", "Материалы с тренировок и выступлений появятся здесь."],
  ]
    .map(([t, x]) => `<article><h3>${t}</h3><p>${x}</p></article>`)
    .join("")}</div></section>
</div>
${sectionCTA("Познакомимся через вашу задачу.")}`,
});

// Контакты
{
  const tel = contacts.phone.replace(/[^+\d]/g, "");
  add({
    path: "/contacts/",
    title: "Контакты DDRu",
    description:
      "Обсудите подбор скакалки, комплект для секции или обучение. Telegram, VK и MAX — удобный способ начать разговор с DDRu.",
    body: `<div class="container">
${pageIntro("DDRu / на связи", "Давайте познакомимся.", `<p>Есть модель на примете или только идея для новой группы?<br>Начнём с разговора.</p>`)}
<div class="contacts-layout">
<section><h2>Выберите удобный канал.</h2>${messengerLinksHtml()}
<dl class="contact-details"><div><dt>Телефон</dt><dd><a href="tel:${tel}">${esc(contacts.phone)}</a></dd></div><div><dt>Email</dt><dd>${contacts.email ? `<a href="mailto:${esc(contacts.email)}">${esc(contacts.email)}</a>` : "Скоро появится"}</dd></div></dl>
<p class="form-hint">Уточним наличие, подберём состав комплекта и обсудим доставку в ваш город.</p></section>
<section class="contact-form-panel"><p class="eyebrow">Начните здесь</p><h2>Расскажите о задаче.</h2><div data-leadform></div></section>
</div>
</div>`,
  });
}

// Корзина
add({
  path: "/cart/",
  title: "Корзина",
  description: "Список выбранных скакалок для подготовки общего запроса.",
  noindex: true,
  body: `<div class="container cart-page">
${pageIntro("Корзина", "Ваш комплект", `<p>Соберите несколько моделей и отправьте один общий запрос.</p>`)}
<div id="cart-root"><div class="cart-empty"><h2>Загружаем корзину…</h2></div></div>
</div>`,
});

// Подбор
add({
  path: "/selection/",
  title: "Подбор скакалки и комплекта",
  description:
    "Несколько вопросов о спортсменах, задачах и уровне подготовки — отправная точка для личного подбора DDRu.",
  body: `<div class="container selection-page">
${pageIntro("DDRu / персональный подбор", "Начнём с вашей задачи.", `<p>Для первых прыжков, нового элемента или целой секции.<br>Ответьте на несколько вопросов — дальше разберёмся вместе.</p>`)}
<div id="wizard-root"></div>
</div>`,
});

/* ---------- запись файлов ---------- */
// Удаляем только то, что создаёт сам сборщик (src/, README и .git не трогаем).
for (const name of [
  "index.html", "404.html", "robots.txt", "sitemap.xml",
  "about", "cart", "catalog", "contacts", "double-dutch", "education",
  "for-sections", "selection", "css", "js", "assets",
]) fs.rmSync(path.join(out, name), { recursive: true, force: true });
for (const f of fs.readdirSync(out)) if (/^yandex_.*\.html$/.test(f)) fs.rmSync(path.join(out, f));
const write = (rel, data) => {
  const file = path.join(out, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
};

for (const p of pages) {
  write(p.path === "/" ? "index.html" : `${p.path.slice(1)}index.html`, page(p));
}
write(
  "404.html",
  page({
    path: "/404/",
    title: "Страница не найдена",
    description: "Такой страницы нет. Вернитесь в каталог DDRu.",
    noindex: true,
    body: `<div class="container not-found"><p class="eyebrow">404 / Вне маршрута</p><h1>Здесь пока пусто.</h1><p>Вернёмся туда, где есть подходящий инвентарь.</p><a class="button" href="/catalog/">Открыть каталог ↗</a></div>`,
  }),
);

// CSS: те же стили, что и на прежнем сайте, плюс небольшие дополнения для обычных <img>
const extraCss = `
/* v2: дополнения */
[hidden] { display: none !important; }
.product-image { position: absolute; inset: 0; width: 100%; height: 100%; }
`;
const css = fs
  .readdirSync(path.join(root, "src/styles"))
  .sort()
  .map((f) => read(`src/styles/${f}`))
  .join("\n");
write("css/style.css", css + extraCss);

// JS: lib.mjs (без export) + client.js + данные
const lib = read("src/lib.mjs").replace(/^export /gm, "");
const data = `const METRIKA_ID = ${JSON.stringify(METRIKA_ID)};\nconst PRODUCTS = ${JSON.stringify(products)};\nconst EDUCATION = ${JSON.stringify(education)};\n`;
write("js/app.js", `(() => {\n"use strict";\n${data}\n${lib}\n${read("src/client.js")}\n})();\n`);

// Картинки
fs.cpSync(path.join(root, "src/assets"), path.join(out, "assets"), { recursive: true });

// robots.txt, sitemap.xml, подтверждение Яндекса
write("robots.txt", `User-Agent: *\nAllow: /\nDisallow: /cart/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
const urls = pages.filter((p) => !p.noindex).map((p) => `${SITE_URL}${p.path}`);
write(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${u}</loc></url>`).join("\n")}\n</urlset>\n`,
);
write(
  "yandex_2b32410c505cc69e.html",
  `<html>\n    <head>\n        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">\n    </head>\n    <body>Verification: 2b32410c505cc69e</body>\n</html>\n`,
);

console.log(`Готово: ${pages.length + 1} страниц → ${out}`);
