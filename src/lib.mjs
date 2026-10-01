// Общий модуль: работает и при сборке страниц (Node), и в браузере.
// Без зависимостей. При сборке в js/app.js слово `export` убирается.

/* ---------- контакты и справочники ---------- */
export const contacts = {
  messengers: [
    { id: "telegram", label: "Telegram", href: "https://t.me/ddru_shop?direct" },
    { id: "vk", label: "VK", href: "https://vk.me/ddrussia" },
    {
      id: "max",
      label: "MAX",
      href: "https://max.ru/u/f9LHodD0cOLIBlbRqOddP3RG8del8Zv1kAHP6pXtUPmuZ8OijJcO37mwgFo",
    },
  ],
  communities: [
    { id: "telegram", label: "Telegram канал", href: "https://t.me/ddru_shop" },
    { id: "vk", label: "VK Сообщество", href: "https://vk.com/ddrussia" },
  ],
  phone: "+7 916 837-42-59",
  email: null,
};
export const customerTypes = [
  "Спортсмен",
  "Родитель",
  "Тренер",
  "Клуб / секция",
  "Федерация",
];
export const inquiryCustomerTypes = [
  ...customerTypes,
  "Секция",
  "Клуб",
  "Школа",
  "Другое",
];
export const disciplines = [
  "Первые тренировки",
  "Скорость",
  "Вольные",
  "Двойные и тройные прыжки",
  "Трюки",
  "Танцы",
  "Командные дисциплины",
  "Double Dutch",
  "Китайское колесо",
  "Общая подготовка",
  "Школьная лига",
  "Участие в соревнованиях",
];
export const levels = ["Начинающие", "Продолжающие", "Соревновательный"];
export const equipmentOptions = [
  "Бисерные",
  "ПВХ",
  "Скоростные",
  "Double Dutch",
  "Пока ничего",
];
export const contactMethods = [
  { id: "telegram", label: "Telegram" },
  { id: "vk", label: "VK" },
  { id: "max", label: "MAX" },
  { id: "phone", label: "Телефон" },
];

/* ---------- утилиты ---------- */
export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
export const formatPrice = (price) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(price);
export const seriesLabel = (series) => (series === "ddru" ? "DDRu" : "LOOP");
export const cartItemKey = (productId, series, variant) =>
  `${productId}:${series}:${variant || "default"}`;

/* ---------- каталог ---------- */
export function getProductSeries(product) {
  return [
    {
      series: product.series,
      handleType: product.handleType,
      name: product.name,
      description: product.shortDescription,
      mainImage: product.mainImage,
      gallery: product.gallery,
      variants: product.variants,
      availability: product.availability,
    },
    ...(product.seriesOptions ?? []).filter((s) => s.availability !== "draft"),
  ];
}
export function getSelectedSeries(product, series) {
  const options = getProductSeries(product);
  return options.find((item) => item.series === series) ?? options[0];
}
export function wholesaleLabel(product) {
  return product.unitLabel === "комплект"
    ? `Оптовые условия: ${formatPrice(product.wholesalePrice)} / комплект от ${product.wholesaleMinQuantity} комплектов`
    : `Оптовые условия: ${formatPrice(product.wholesalePrice)} от ${product.wholesaleMinQuantity} шт.`;
}

/* ---------- общие кусочки разметки ---------- */
export function mediaHtml(image, label, index = "01", priority = false) {
  if (!image) {
    return `<div class="product-media"><div class="media-placeholder" role="img" aria-label="${esc(label)}: фотография готовится"><span class="media-index" aria-hidden="true">${esc(index)}</span><span class="media-name">${esc(label)}</span><span class="media-caption">Фотография готовится <span aria-hidden="true">↗</span></span></div></div>`;
  }
  return `<div class="product-media"><img class="product-image" src="${esc(image.src)}" alt="${esc(image.alt)}" width="1000" height="1000" decoding="async" ${priority ? 'fetchpriority="high"' : 'loading="lazy"'}></div>`;
}
export function messengerLinksHtml(preferred, destination = "contact") {
  const source =
    destination === "community" ? contacts.communities : contacts.messengers;
  const links = [...source].sort(
    (a, b) => Number(b.id === preferred) - Number(a.id === preferred),
  );
  return `<div class="messenger-links">${links
    .map(
      (l) =>
        `<a href="${esc(l.href)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}<span aria-hidden="true">↗</span></a>`,
    )
    .join("")}</div>`;
}
export function productCardHtml(p) {
  const url = `/catalog/${p.slug}/`;
  return `<article class="product-card">
<a href="${url}" class="product-card-image" aria-label="Подробнее: ${esc(p.name)}">${mediaHtml(p.mainImage, p.shortName, String(p.sortOrder).padStart(2, "0"))}<span class="round-arrow" aria-hidden="true">↗</span></a>
<div class="product-card-meta"><span>${p.category === "double-dutch" ? "Комплект из 2 скакалок" : "Одиночная скакалка"}</span><span>Опт ${formatPrice(p.wholesalePrice)} / ${esc(p.unitLabel)} от ${p.wholesaleMinQuantity} ${p.unitLabel === "комплект" ? "компл." : "шт."}</span></div>
<h3><a href="${url}">${esc(p.name)}</a></h3>
<p>${esc(p.shortDescription)}</p>
<div class="product-card-bottom"><span class="price">${formatPrice(p.retailPrice)}${p.unitLabel === "комплект" ? "<small> / комплект</small>" : ""}</span><a class="text-link" href="${url}">Подробнее <span aria-hidden="true">↗</span></a></div>
</article>`;
}

/* ---------- карточка товара (шаблон страницы товара) ---------- */
export function defaultVariantId(series) {
  return series.variants.find((v) => v.available !== false)?.id ?? "";
}
export function validQuantityNumber(q) {
  return Number.isInteger(q) && q >= 1 && q <= 10000;
}
export function productDetailHtml(product, st) {
  const options = getProductSeries(product);
  const series = getSelectedSeries(product, st.seriesId);
  const variant = series.variants.find((v) => v.id === st.variantId);
  const images = variant
    ? [...(variant.image ? [variant.image] : []), ...variant.gallery]
    : [...(series.mainImage ? [series.mainImage] : []), ...series.gallery];
  const unique = images.filter(
    (item, i) => images.findIndex((o) => o.src === item.src) === i,
  );
  const quantity = st.quantity;
  const wholesale = quantity >= product.wholesaleMinQuantity;
  const sortIndex = String(product.sortOrder).padStart(2, "0");
  const label = `${product.shortName}${variant ? ` / ${variant.colorName}` : ""}`;
  return `<div class="product-gallery">
${mediaHtml(unique[st.imageIndex] ?? null, label, sortIndex, true)}
${
  unique.length > 1
    ? `<div class="gallery-thumbs" role="group" aria-label="Фотографии товара">${unique
        .map(
          (item, i) =>
            `<button type="button" data-action="thumb" data-index="${i}" aria-label="Фото ${i + 1}: ${esc(item.alt)}" aria-pressed="${i === st.imageIndex}">${mediaHtml(item, item.alt)}</button>`,
        )
        .join("")}</div>`
    : ""
}
<p class="gallery-note">${variant ? "Оттенок и наличие выбранного цвета уточняются при общении." : "Внешний вид и наличие уточняются при общении."}</p>
</div>
<div class="product-info">
<p class="eyebrow">${esc(product.shortName)} / Инвентарь</p>
<h1>${esc(series.name)}</h1>
<p class="product-description">${esc(series.description)}</p>
<p class="detail-price"><span id="detail-price">${formatPrice(wholesale ? product.wholesalePrice : product.retailPrice)}</span><span> / ${product.unitLabel === "комплект" ? "комплект из 2 скакалок" : "шт."}</span></p>
<p class="wholesale-note">${esc(wholesaleLabel(product))}</p>
${
  options.length > 1
    ? `<fieldset class="series-selector"><legend>Серия / ручки</legend><div>${options
        .map(
          (o) =>
            `<button type="button" data-action="series" data-series="${o.series}" aria-pressed="${st.seriesId === o.series}"${o.availability === "unavailable" ? " disabled" : ""}>${seriesLabel(o.series)}</button>`,
        )
        .join("")}</div></fieldset>`
    : ""
}
${
  series.variants.length > 0
    ? `<fieldset class="variant-fieldset"><legend>Цвет <strong aria-live="polite">${esc(variant?.colorName ?? "Уточнить")}</strong></legend><div class="swatches">${series.variants
        .map(
          (v) =>
            `<button type="button" class="swatch" style="--swatch:${esc(v.colorHex)}" data-action="color" data-variant="${esc(v.id)}" aria-label="${esc(v.colorName)}" title="${esc(v.colorName)}" aria-pressed="${v.id === st.variantId}"${v.available === false ? " disabled" : ""}></button>`,
        )
        .join("")}</div></fieldset>`
    : `<p class="gallery-note">Цвет и доступные варианты уточним при подборе.</p>`
}
<div class="detail-actions">
<label class="product-quantity">Количество ${product.unitLabel === "комплект" ? "комплектов" : "единиц"}<input id="detail-qty" type="number" min="1" max="10000" step="1" value="${quantity || ""}"></label>
<p class="form-hint" role="status" id="detail-wholesale"${wholesale ? "" : " hidden"}>Для этого количества действуют оптовые условия.</p>
<button type="button" class="button" data-action="inquire-product">Заказать / уточнить наличие<span aria-hidden="true">↗</span></button>
<button type="button" class="button button-outline" id="detail-add" data-action="add-to-cart"${validQuantityNumber(quantity) ? "" : " disabled"}>Добавить в корзину</button>
<p class="form-hint" role="status" id="detail-added" hidden>Добавлено. <a href="/cart/">Открыть корзину →</a></p>
<button type="button" class="button button-outline" data-action="inquire-section">Подобрать для группы<span aria-hidden="true">↗</span></button>
</div>
<p class="availability"><span aria-hidden="true"></span>${
    series.availability === "available"
      ? "Наличие подтверждено"
      : series.availability === "unavailable"
        ? "Временно недоступно — обсудим альтернативу"
        : "Наличие уточним лично"
  }</p>
<ul class="feature-list">${(st.seriesId === product.series ? product.features : []).map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
</div>`;
}

/* ---------- подбор ---------- */
const taskModels = {
  "Первые тренировки": ["beaded-rope"],
  Вольные: ["beaded-rope", "pvc-rope"],
  Скорость: ["beaded-rope", "pvc-rope", "speed-rope"],
  "Двойные и тройные прыжки": ["beaded-rope", "pvc-rope", "speed-rope"],
  Трюки: ["beaded-rope", "pvc-rope"],
  Танцы: ["beaded-rope", "pvc-rope"],
  "Командные дисциплины": ["beaded-rope", "double-dutch-rope"],
  "Double Dutch": ["double-dutch-rope"],
  "Китайское колесо": ["beaded-rope"],
  "Общая подготовка": ["beaded-rope", "pvc-rope"],
  "Школьная лига": [],
  "Участие в соревнованиях": [],
};
const ownedModels = {
  Бисерные: "beaded-rope",
  ПВХ: "pvc-rope",
  Скоростные: "speed-rope",
  "Double Dutch": "double-dutch-rope",
};
export const recommendationReasons = {
  "beaded-rope": "Бисерная — для изучения и отработки элементов.",
  "pvc-rope": "ПВХ — для дальнейшей работы во вольных упражнениях.",
  "speed-rope": "Скоростная — для работы в скоростных дисциплинах.",
  "double-dutch-rope":
    "Double Dutch — для работы группами и освоения отдельной дисциплины.",
};
export function recommendProducts(selection) {
  const owned = new Set(selection.equipment.map((item) => ownedModels[item]));
  return [
    ...new Set(selection.disciplines.flatMap((task) => taskModels[task] ?? [])),
  ].filter((slug) => !owned.has(slug));
}
export function isGroupSelection(selection) {
  return ["Тренер", "Клуб / секция", "Федерация"].includes(
    selection.customerType,
  );
}
export function validQuantity(value) {
  return (
    value === null || (Number.isInteger(value) && value >= 1 && value <= 10000)
  );
}
export function validHeight(value) {
  return (
    value !== null && Number.isInteger(value) && value >= 70 && value <= 220
  );
}
export function ropeLengthGuidance(selection) {
  const advice = [];
  const soloTasks = selection.disciplines.some((task) =>
    (taskModels[task] ?? []).some((slug) => slug !== "double-dutch-rope"),
  );
  if (soloTasks && validHeight(selection.heightCm)) {
    const highest =
      isGroupSelection(selection) && validHeight(selection.heightMaxCm)
        ? selection.heightMaxCm
        : selection.heightCm;
    const shortestRope = selection.heightCm + 90;
    const longestRope = highest + 90;
    advice.push(
      longestRope > 300
        ? "Ориентир по росту превышает 300 см стандартного шнура. Длину для этих спортсменов уточним отдельно."
        : `Ориентир длины шнура без ручек: ${shortestRope}${longestRope > shortestRope ? `–${longestRope}` : ""} см. Это начальная настройка по росту; окончательную длину проверяют на спортсмене.`,
    );
  }
  if (
    selection.disciplines.some((task) =>
      (taskModels[task] ?? []).includes("double-dutch-rope"),
    )
  ) {
    advice.push(
      "Для Double Dutch — комплект из двух скакалок по 4,2 м; организацию работы группы уточним при личном подборе.",
    );
  }
  return advice;
}
export function toggleEquipment(current, value) {
  if (current.includes(value)) return current.filter((item) => item !== value);
  return value === "Пока ничего"
    ? [value]
    : [...current.filter((item) => item !== "Пока ничего"), value];
}
export function selectionStepValid(step, selection) {
  if (step === 0) return Boolean(selection.customerType);
  if (step === 1)
    return (
      Boolean(selection.age) &&
      validHeight(selection.heightCm) &&
      (!isGroupSelection(selection) ||
        (validHeight(selection.heightMaxCm) &&
          selection.heightMaxCm >= selection.heightCm)) &&
      (!isGroupSelection(selection) || validQuantity(selection.athleteCount))
    );
  if (step === 2) return selection.disciplines.length > 0;
  if (step === 3) return Boolean(selection.level);
  if (step === 4) return selection.equipment.length > 0;
  return true;
}

/* ---------- заявка ---------- */
export function inquiryValid(draft) {
  return (
    Boolean(draft.name.trim() && draft.phoneOrContact.trim()) &&
    validQuantity(draft.quantity)
  );
}
export function buildInquiryData(draft, context, products, url) {
  const product = products.find((item) => item.id === draft.product);
  const series = product ? getSelectedSeries(product, draft.series) : undefined;
  const variant = series?.variants.find((item) => item.id === draft.variant);
  const cartQuantity = (context.cartItems ?? []).reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const cartWholesale = cartQuantity >= 30;
  const cartItems = (context.cartItems ?? []).flatMap((item) => {
    const cartProduct = products.find((entry) => entry.id === item.productId);
    if (!cartProduct) return [];
    const cartSeries = getSelectedSeries(cartProduct, item.series);
    const cartVariant = cartSeries.variants.find((e) => e.id === item.variant);
    return [
      {
        ...item,
        series: cartSeries.series,
        variant: cartVariant?.id ?? "",
        productName: cartSeries.name,
        color: cartVariant?.colorName ?? null,
        unitLabel: cartProduct.unitLabel,
        unitPrice: cartWholesale
          ? cartProduct.wholesalePrice
          : cartProduct.retailPrice,
      },
    ];
  });
  const source = new URL(url);
  return {
    ...draft,
    name: draft.name.trim(),
    phoneOrContact: draft.phoneOrContact.trim(),
    city: draft.city.trim(),
    comment: draft.comment.trim(),
    series: series?.series,
    variant: variant?.id ?? "",
    product: product?.id ?? "",
    inquiryType:
      context.inquiryType ??
      (context.cartItems
        ? "cart"
        : context.selection
          ? "selection"
          : product
            ? "product"
            : "general"),
    productId: product?.id ?? null,
    productName: series?.name ?? null,
    color: variant?.colorName ?? null,
    selectionAnswers: context.selection ?? null,
    recommendedProductIds: [...new Set(context.recommendedProductIds ?? [])].filter(
      (id) => products.some((item) => item.id === id),
    ),
    cartItems,
    cartTotal: cartItems.length
      ? cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
      : null,
    cartWholesale,
    sourcePage: source.pathname,
    preparedAt: new Date().toISOString(),
  };
}
export function buildInquirySummary(inquiry, products) {
  const product = products.find((item) => item.id === inquiry.productId);
  const selection = inquiry.selectionAnswers;
  return [
    "Заявка DDRu",
    inquiry.cartItems.length
      ? "Корзина"
      : (inquiry.productName ?? "Нужен подбор комплекта"),
    inquiry.series ? `Серия / ручки: ${seriesLabel(inquiry.series)}` : "",
    inquiry.color ? `Цвет: ${inquiry.color}` : "",
    inquiry.cartItems.length
      ? inquiry.cartItems
          .map(
            (item, index) =>
              `${index + 1}. ${item.productName}; ручки ${seriesLabel(item.series)}${item.color ? `; цвет ${item.color}` : ""}; количество ${item.quantity} ${item.unitLabel}; цена ${item.unitPrice.toLocaleString("ru-RU")} ₽`,
          )
          .join("\n")
      : inquiry.quantity === null
        ? "Количество: уточнить состав"
        : `Количество: ${inquiry.quantity} ${product?.unitLabel ?? "ед."}`,
    inquiry.cartItems.length
      ? `${inquiry.cartWholesale ? "Оптовые цены" : "Розничные цены"}. Общая стоимость: ${inquiry.cartTotal?.toLocaleString("ru-RU")} ₽`
      : "",
    `Имя: ${inquiry.name}`,
    `Контакт: ${inquiry.phoneOrContact}`,
    inquiry.city ? `Город: ${inquiry.city}` : "",
    inquiry.customerType ? `Клиент: ${inquiry.customerType}` : "",
    selection
      ? `Подбор: возраст ${selection.age}; рост ${selection.heightCm}${isGroupSelection(selection) ? `–${selection.heightMaxCm}` : ""} см${isGroupSelection(selection) ? `; спортсменов ${selection.athleteCount}` : ""}; ${selection.disciplines.join(", ")}; уровень ${selection.level}; инвентарь: ${selection.equipment.join(", ")}`
      : "",
    ...(selection ? ropeLengthGuidance(selection) : []),
    inquiry.recommendedProductIds.length
      ? `Рекомендуемые модели: ${products
          .filter((p) => inquiry.recommendedProductIds.includes(p.id))
          .map((p) => p.name)
          .join(", ")}`
      : "",
    inquiry.comment ? `Комментарий: ${inquiry.comment}` : "",
    `Предпочтительная связь: ${inquiry.preferredMessenger === "phone" ? "Телефон" : inquiry.preferredMessenger}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/* ---------- форма заявки ---------- */
export function leadDraftFromContext(context, products) {
  return {
    name: "",
    phoneOrContact: "",
    city: "",
    customerType: context.customerType ?? context.selection?.customerType ?? "",
    product: context.product ?? "",
    series:
      context.series ?? products.find((p) => p.id === context.product)?.series,
    variant: context.variant ?? "",
    quantity: context.quantity ?? (context.product ? 1 : null),
    comment: context.comment ?? "",
    preferredMessenger: "telegram",
  };
}
export function leadFormHtml(draft, context, products, error = "") {
  const knownProduct = Boolean(context.product);
  const knownCart = Boolean(context.cartItems?.length);
  const product = products.find((p) => p.id === draft.product);
  const series = product ? getSelectedSeries(product, draft.series) : undefined;
  const options = product ? getProductSeries(product) : [];
  const wholesale = Boolean(
    draft.quantity !== null &&
      draft.quantity >= (product?.wholesaleMinQuantity ?? 30),
  );
  const sel = (cond) => (cond ? " selected" : "");
  return `<form class="lead-form">
<p class="form-hint">Обязательны только имя и телефон или удобный контакт. Остальные детали можно уточнить при общении.</p>
${
  knownProduct && product && series
    ? `<div class="inquiry-product-summary"><strong>${esc(series.name)}</strong><p>Ручки: ${seriesLabel(series.series)} · Цвет: ${esc(series.variants.find((v) => v.id === draft.variant)?.colorName ?? "Уточнить")}</p><p><span data-lf-price>${formatPrice(wholesale ? product.wholesalePrice : product.retailPrice)}</span> / ${esc(product.unitLabel)}</p></div>`
    : ""
}
${
  context.selection
    ? `<div class="inquiry-product-summary"><strong>Ваш подбор</strong><p>${esc(context.selection.age)} · ${esc(context.selection.disciplines.join(", "))}</p><p>Рекомендуем: ${esc(products.filter((p) => context.recommendedProductIds?.includes(p.id)).map((p) => p.shortName).join(", "))}</p></div>`
    : ""
}
${
  knownCart
    ? `<div class="inquiry-product-summary cart-inquiry-summary"><strong>Выбрано позиций: ${context.cartItems.length}</strong>${context.cartItems
        .map((item) => {
          const cp = products.find((p) => p.id === item.productId);
          if (!cp) return "";
          const cs = getSelectedSeries(cp, item.series);
          const cv = cs.variants.find((e) => e.id === item.variant);
          return `<p>${esc(cs.name)} · ${seriesLabel(item.series)}${cv ? ` · ${esc(cv.colorName)}` : ""} · ${item.quantity} ${esc(cp.unitLabel)}</p>`;
        })
        .join("")}<p>Итоговая стоимость рассчитывается в корзине с учётом общего количества.</p></div>`
    : ""
}
<div class="form-grid">
<label>Имя<input name="name" autocomplete="name" required maxlength="100" pattern=".*\\S.*" value="${esc(draft.name)}"></label>
<label>Телефон или удобный контакт<input name="phoneOrContact" required maxlength="200" pattern=".*\\S.*" placeholder="Номер, @username или ссылка на профиль" value="${esc(draft.phoneOrContact)}"></label>
<fieldset class="messenger-choice full-width"><legend>Предпочтительный способ связи</legend><div class="choice-row">${contactMethods
    .map(
      (m) =>
        `<label class="choice"><input type="radio" name="preferredMessenger" value="${m.id}"${draft.preferredMessenger === m.id ? " checked" : ""}>${m.label}</label>`,
    )
    .join("")}</div></fieldset>
<label>Город <span class="optional">/ необязательно</span><input name="city" autocomplete="address-level2" maxlength="100" value="${esc(draft.city)}"></label>
<label>Кто вы?<select name="customerType"><option value="">Не указано</option>${inquiryCustomerTypes
    .map((t) => `<option${sel(draft.customerType === t)}>${esc(t)}</option>`)
    .join("")}</select></label>
${
  !knownProduct && !knownCart
    ? `<label>Товар<select name="product"><option value="">Нужен подбор комплекта</option>${products
        .map(
          (p) =>
            `<option value="${esc(p.id)}"${sel(draft.product === p.id)}>${esc(p.name)}</option>`,
        )
        .join("")}</select></label>
${
  options.length > 1
    ? `<fieldset class="series-selector full-width"><legend>Серия / ручки</legend><div>${options
        .map(
          (o) =>
            `<button type="button" data-lf-series="${o.series}" aria-pressed="${series?.series === o.series}"${o.availability === "unavailable" ? " disabled" : ""}>${seriesLabel(o.series)}</button>`,
        )
        .join("")}</div></fieldset>`
    : ""
}
${
  series?.variants.length
    ? `<label>Цвет<select name="variant"><option value="">Уточнить при подборе</option>${series.variants
        .map(
          (v) =>
            `<option value="${esc(v.id)}"${sel(draft.variant === v.id)}${v.available === false ? " disabled" : ""}>${esc(v.colorName)}</option>`,
        )
        .join("")}</select></label>`
    : ""
}`
    : ""
}
${
  !knownCart
    ? `<label>Количество ${product?.unitLabel === "комплект" ? "комплектов (по 2 скакалки)" : "единиц"}<input name="quantity" type="number" min="1" max="10000" step="1" placeholder="Уточним вместе" value="${draft.quantity ?? ""}"></label>`
    : ""
}
<p class="notice full-width" role="status" data-lf-wholesale${wholesale ? "" : " hidden"}>Для этого количества действуют оптовые условия.${!product ? " Состав смешанного комплекта согласуем отдельно." : ""}</p>
<label class="full-width">Комментарий <span class="optional">/ необязательно</span><textarea name="comment" rows="3" maxlength="2000" placeholder="Задачи, состав группы, пожелания">${esc(draft.comment)}</textarea></label>
</div>
${error ? `<p role="alert">${esc(error)}</p>` : ""}
<button class="button" type="submit">Подготовить запрос ↗</button>
<p class="form-hint">Данные остаются на этой странице до перезагрузки. Автоматическая отправка пока не подключена.</p>
</form>`;
}
export function preparedInquiryHtml(prepared, text, copyStatus = "") {
  return `<div class="prepared-inquiry">
<p class="eyebrow">Следующий шаг</p>
<h3 tabindex="-1" data-prepared-heading>Запрос подготовлен</h3>
<p>Он ещё не отправлен и не сохранён на сервере. Скопируйте текст и передайте нам.</p>
<label for="lf-summary">Текст запроса</label>
<textarea id="lf-summary" readonly rows="9">${esc(text)}</textarea>
<div class="button-row">
<button type="button" class="button" data-lf-copy>Скопировать текст ↗</button>
<button type="button" class="text-link" data-lf-edit>Изменить данные</button>
</div>
<p role="status" class="form-hint" data-lf-status>${esc(copyStatus)}</p>
<h4>Выберите удобный способ связи</h4>
${messengerLinksHtml(prepared.preferredMessenger === "phone" ? undefined : prepared.preferredMessenger)}
${prepared.preferredMessenger === "phone" ? '<p class="form-hint">Предпочтение «Телефон» и ваш контакт включены в текст. Автоматический обратный звонок пока не подключён.</p>' : ""}
</div>`;
}
