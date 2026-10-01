/* ---------- Поведение страниц (чистый JavaScript) ---------- */
const products = PRODUCTS;

/* ---------- статистика (Яндекс Метрика, цели) ---------- */
function track(goal, params) {
  try {
    if (METRIKA_ID && typeof ym === "function")
      ym(Number(METRIKA_ID), "reachGoal", goal, params);
  } catch {
    /* статистика не должна ломать сайт */
  }
}
const productName = (id) => products.find((p) => p.id === id)?.shortName ?? "";
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[href]");
  if (!a) return;
  const place = a.closest(".prepared-inquiry")
    ? "заявка"
    : a.closest(".selection-handoff")
      ? "подбор"
      : a.closest("footer")
        ? "подвал"
        : "страница";
  if (a.href.startsWith("tel:"))
    track("click_phone", { страница: location.pathname });
  else if (a.closest(".messenger-links") || a.hasAttribute("data-open-chat"))
    track("click_messenger", {
      мессенджер: a.textContent.replace("↗", "").trim(),
      место: place,
      страница: location.pathname,
    });
});
document.addEventListener(
  "toggle",
  (e) => {
    if (e.target.matches?.("details") && e.target.open)
      track("faq_open", {
        вопрос: e.target.querySelector("summary")?.textContent.replace("+", "").trim(),
      });
  },
  true,
);
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* хранилище недоступно — корзина живёт до перезагрузки */
    }
  },
};

/* ---------- корзина ---------- */
const CART_KEY = "ddru-cart";
function validCartItem(v) {
  return (
    v &&
    typeof v === "object" &&
    typeof v.key === "string" &&
    typeof v.productId === "string" &&
    (v.series === "ddru" || v.series === "loop") &&
    typeof v.variant === "string" &&
    Number.isInteger(v.quantity) &&
    v.quantity >= 1 &&
    v.quantity <= 10000
  );
}
let cartItems = (() => {
  try {
    const stored = JSON.parse(storage.get(CART_KEY) ?? "[]");
    return Array.isArray(stored) ? stored.filter(validCartItem) : [];
  } catch {
    return [];
  }
})();
const cartCount = () => cartItems.reduce((sum, i) => sum + i.quantity, 0);
function saveCart() {
  storage.set(CART_KEY, JSON.stringify(cartItems));
  updateCartBadge();
}
function updateCartBadge() {
  const count = cartCount();
  $$("[data-cart-link]").forEach((el) => {
    el.textContent = count > 0 ? `Корзина (${count})` : "Корзина";
    el.setAttribute("aria-label", `Корзина: ${count}`);
  });
  $$("[data-cart-link-text]").forEach((el) => {
    el.firstChild.textContent = count > 0 ? `Корзина (${count})` : "Корзина";
  });
}
function addCartItem(item) {
  const existing = cartItems.find((i) => i.key === item.key);
  cartItems = existing
    ? cartItems.map((i) =>
        i.key === item.key
          ? { ...i, quantity: Math.min(10000, i.quantity + item.quantity) }
          : i,
      )
    : [...cartItems, item];
  saveCart();
}

/* ---------- шапка ---------- */
(() => {
  const header = $(".site-header");
  const toggle = $(".menu-toggle");
  const menu = $("#mobile-menu");
  if (!header || !toggle || !menu) return;
  function setMenu(open) {
    menu.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Закрыть ×" : "Меню +";
  }
  toggle.addEventListener("click", () => setMenu(menu.hidden));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("pointerdown", (e) => {
    if (!menu.hidden && !header.contains(e.target)) setMenu(false);
  });
  header.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.hidden) {
      setMenu(false);
      toggle.focus();
    }
  });
})();

/* ---------- окно заявки ---------- */
const dialog = $("#inquiry-dialog");
let dialogTrigger = null;
function openInquiry(context, { title, trigger } = {}) {
  if (!dialog) return;
  dialogTrigger = trigger ?? document.activeElement;
  track("open_inquiry", {
    тип: context.inquiryType || "general",
    товар: productName(context.product),
    страница: location.pathname,
  });
  $("#inquiry-title").textContent = title || "Подберём инвентарь вместе";
  mountLeadForm($("#inquiry-body"), context);
  dialog.showModal();
}
if (dialog) {
  dialog.addEventListener("close", () => {
    $("#inquiry-body").innerHTML = "";
    if (dialogTrigger && dialogTrigger.focus) dialogTrigger.focus();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (
      e.clientX < box.left ||
      e.clientX > box.right ||
      e.clientY < box.top ||
      e.clientY > box.bottom
    )
      dialog.close();
  });
  $$("[data-dialog-close]", dialog).forEach((b) =>
    b.addEventListener("click", () => dialog.close()),
  );
}
document.addEventListener("click", (e) => {
  const trigger = e.target.closest("[data-inquiry]");
  if (!trigger) return;
  let context = {};
  try {
    context = JSON.parse(trigger.dataset.inquiry);
  } catch {
    /* пустой контекст */
  }
  openInquiry(context, { title: trigger.dataset.title, trigger });
});

/* ---------- форма заявки ---------- */
async function copyText(text, statusEl, okMessage, failMessage) {
  try {
    await navigator.clipboard.writeText(text);
    if (statusEl) statusEl.textContent = okMessage;
  } catch {
    if (statusEl) statusEl.textContent = failMessage;
  }
}
function mountLeadForm(container, context) {
  let draft = leadDraftFromContext(context, products);
  let prepared = null;
  let summary = "";
  let copyStatus = "";
  const remembered = {};

  function render(focusSelector) {
    if (prepared) {
      summary = buildInquirySummary(prepared, products);
      container.innerHTML = preparedInquiryHtml(prepared, summary, copyStatus);
      const heading = $("[data-prepared-heading]", container);
      if (heading) heading.focus();
      return;
    }
    container.innerHTML = leadFormHtml(draft, context, products);
    if (focusSelector) {
      const el = $(focusSelector, container);
      if (el) el.focus();
    }
  }
  function refreshWholesale() {
    const product = products.find((p) => p.id === draft.product);
    const wholesale = Boolean(
      draft.quantity !== null &&
        draft.quantity >= (product?.wholesaleMinQuantity ?? 30),
    );
    const note = $("[data-lf-wholesale]", container);
    if (note) note.hidden = !wholesale;
    const price = $("[data-lf-price]", container);
    if (price && product)
      price.textContent = formatPrice(
        wholesale ? product.wholesalePrice : product.retailPrice,
      );
  }

  container.oninput = (e) => {
    const { name, value } = e.target;
    if (name === "quantity") {
      draft.quantity = value === "" ? null : Number(value);
      refreshWholesale();
    } else if (["name", "phoneOrContact", "city", "comment"].includes(name)) {
      draft[name] = value;
    }
  };
  container.onchange = (e) => {
    const { name, value } = e.target;
    if (name === "customerType") draft.customerType = value;
    else if (name === "preferredMessenger") draft.preferredMessenger = value;
    else if (name === "variant") draft.variant = value;
    else if (name === "product") {
      draft.product = value;
      draft.series = products.find((p) => p.id === value)?.series;
      draft.variant = "";
      render("[name=product]");
    }
  };
  container.onclick = (e) => {
    const seriesBtn = e.target.closest("[data-lf-series]");
    if (seriesBtn) {
      const current = draft.series;
      if (current) remembered[`${draft.product}:${current}`] = draft.variant;
      draft.series = seriesBtn.dataset.lfSeries;
      draft.variant = remembered[`${draft.product}:${draft.series}`] ?? "";
      render(`[data-lf-series="${draft.series}"]`);
      return;
    }
    if (e.target.closest("[data-lf-copy]")) {
      track("inquiry_copy", { страница: location.pathname });
      copyText(
        summary,
        $("[data-lf-status]", container),
        "Текст скопирован",
        "Выделите и скопируйте текст из поля выше.",
      );
      return;
    }
    if (e.target.closest("[data-lf-edit]")) {
      prepared = null;
      copyStatus = "";
      render();
    }
  };
  container.onsubmit = (e) => {
    e.preventDefault();
    if (!inquiryValid(draft)) return;
    prepared = buildInquiryData(draft, context, products, window.location.href);
    track("inquiry_prepared", {
      тип: prepared.inquiryType,
      товар: productName(prepared.productId),
      количество: prepared.quantity ?? "",
      связь: prepared.preferredMessenger,
    });
    render();
  };
  render();
}

/* ---------- страница товара ---------- */
function mountProduct() {
  const wrap = $("[data-product]");
  const detail = $("#product-detail");
  if (!wrap || !detail) return;
  const product = products.find((p) => p.id === wrap.dataset.product);
  if (!product) return;
  const st = {
    seriesId: product.series,
    selectedColors: {},
    imageIndex: 0,
    quantity: 1,
  };
  const current = () => {
    const series = getSelectedSeries(product, st.seriesId);
    return {
      series,
      variantId: st.selectedColors[st.seriesId] ?? defaultVariantId(series),
    };
  };
  function render(focusSelector) {
    const { variantId } = current();
    detail.innerHTML = productDetailHtml(product, { ...st, variantId });
    if (focusSelector) {
      const el = $(focusSelector, detail);
      if (el) el.focus();
    }
  }
  function refreshQuantity() {
    const wholesale = st.quantity >= product.wholesaleMinQuantity;
    $("#detail-price").textContent = formatPrice(
      wholesale ? product.wholesalePrice : product.retailPrice,
    );
    $("#detail-wholesale").hidden = !wholesale;
    $("#detail-add").disabled = !validQuantityNumber(st.quantity);
  }
  detail.oninput = (e) => {
    if (e.target.id === "detail-qty") {
      st.quantity = Number(e.target.value);
      refreshQuantity();
    }
  };
  detail.onclick = (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const { variantId } = current();
    if (action === "thumb") {
      st.imageIndex = Number(btn.dataset.index);
      render(`[data-action=thumb][data-index="${st.imageIndex}"]`);
    } else if (action === "series") {
      st.seriesId = btn.dataset.series;
      track("choose_series", {
        товар: product.shortName,
        серия: seriesLabel(st.seriesId),
      });
      st.imageIndex = 0;
      render(`[data-action=series][data-series="${st.seriesId}"]`);
    } else if (action === "color") {
      st.selectedColors[st.seriesId] = btn.dataset.variant;
      track("choose_color", {
        товар: product.shortName,
        цвет: btn.getAttribute("aria-label"),
      });
      st.imageIndex = 0;
      render(`[data-action=color][data-variant="${btn.dataset.variant}"]`);
    } else if (action === "add-to-cart") {
      if (!validQuantityNumber(st.quantity)) return;
      addCartItem({
        key: cartItemKey(product.id, st.seriesId, variantId),
        productId: product.id,
        series: st.seriesId,
        variant: variantId,
        quantity: st.quantity,
      });
      $("#detail-added").hidden = false;
      track("add_to_cart", {
        товар: product.shortName,
        серия: seriesLabel(st.seriesId),
        количество: st.quantity,
      });
    } else if (action === "inquire-product") {
      openInquiry(
        {
          inquiryType: "product",
          product: product.id,
          series: st.seriesId,
          variant: variantId,
          quantity: validQuantityNumber(st.quantity) ? st.quantity : undefined,
        },
        { title: "Уточним детали и наличие", trigger: btn },
      );
    } else if (action === "inquire-section") {
      openInquiry(
        {
          inquiryType: "section",
          product: product.id,
          series: st.seriesId,
          variant: variantId,
          customerType: "Тренер",
          quantity: product.wholesaleMinQuantity,
        },
        { trigger: btn },
      );
    }
  };
  // Кнопки уже нарисованы на сервере — повторная отрисовка не нужна до первого действия.
}

/* ---------- корзина ---------- */
function mountCart() {
  const root = $("#cart-root");
  if (!root) return;
  function render(focusSelector) {
    if (cartItems.length === 0) {
      root.innerHTML = `<div class="cart-empty"><h2>Корзина пока пуста.</h2><p>Добавьте подходящие скакалки, чтобы отправить один общий запрос.</p><a class="button" href="/catalog/">Перейти в каталог ↗</a></div>`;
      return;
    }
    const totalQuantity = cartCount();
    const wholesale = totalQuantity >= 30;
    let total = 0;
    const rows = cartItems
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return "";
        const series = getSelectedSeries(product, item.series);
        const variant = series.variants.find((v) => v.id === item.variant);
        const image = variant?.image ?? series.mainImage;
        const unitPrice = wholesale ? product.wholesalePrice : product.retailPrice;
        total += unitPrice * item.quantity;
        return `<article class="cart-item">
<a href="/catalog/${product.slug}/">${mediaHtml(image, series.name)}</a>
<div class="cart-item-copy"><p class="eyebrow">${esc(product.shortName)}</p><h2>${esc(series.name)}</h2><p>Ручки: ${seriesLabel(item.series)}${variant ? ` · Цвет: ${esc(variant.colorName)}` : ""}</p></div>
<label class="cart-quantity">Количество ${product.unitLabel === "комплект" ? "комплектов" : "шт."}<input type="number" min="1" max="10000" step="1" value="${item.quantity}" data-qty="${esc(item.key)}"></label>
<div class="cart-item-price"><strong>${formatPrice(unitPrice)}</strong><span>за ${esc(product.unitLabel)}</span><small>${formatPrice(unitPrice * item.quantity)}</small></div>
<button type="button" class="text-link cart-remove" data-remove="${esc(item.key)}">Удалить</button>
</article>`;
      })
      .join("");
    root.innerHTML = `<div class="cart-list">${rows}</div>
<div class="cart-total" aria-live="polite"><div><p class="eyebrow">${wholesale ? "Оптовые условия" : "Розничные цены"}</p><p>${totalQuantity} ${totalQuantity === 1 ? "единица" : "единиц"}${wholesale ? "" : " · оптовые цены применятся от 30 единиц"}</p></div><p><span>Общая стоимость</span><strong>${formatPrice(total)}</strong></p></div>
<div class="cart-actions"><button type="button" class="text-link" data-clear>Очистить корзину</button><button type="button" class="button" data-cart-inquiry>Подготовить общий запрос<span aria-hidden="true">↗</span></button></div>`;
    if (focusSelector) {
      const el = $(focusSelector, root);
      if (el) el.focus();
    }
  }
  root.onchange = (e) => {
    const key = e.target.dataset?.qty;
    if (!key) return;
    const value = Number(e.target.value);
    if (e.target.value !== "" && Number.isInteger(value)) {
      const clamped = Math.max(1, Math.min(10000, value));
      cartItems = cartItems.map((i) =>
        i.key === key ? { ...i, quantity: clamped } : i,
      );
      saveCart();
    }
    render(`[data-qty="${CSS.escape(key)}"]`);
  };
  root.onclick = (e) => {
    const remove = e.target.closest("[data-remove]");
    if (remove) {
      cartItems = cartItems.filter((i) => i.key !== remove.dataset.remove);
      saveCart();
      render();
    } else if (e.target.closest("[data-clear]")) {
      cartItems = [];
      saveCart();
      render();
    } else if (e.target.closest("[data-cart-inquiry]")) {
      openInquiry(
        { inquiryType: "cart", cartItems },
        { title: "Запрос по корзине", trigger: e.target.closest("button") },
      );
    }
  };
  render();
}

/* ---------- подбор ---------- */
function mountWizard() {
  const root = $("#wizard-root");
  if (!root) return;
  const steps = [
    "Как с вами связаться?",
    "Кто вы?",
    "Для кого подбираем?",
    "Задача",
    "Уровень",
    "Что уже есть?",
    "Мы рекомендуем",
  ];
  const ages = ["До 7 лет", "7–9 лет", "10–12 лет", "13–15 лет", "16+", "Взрослые"];
  let step = 0;
  let fullName = "";
  let phone = "";
  let messenger = "max";
  let prepared = null;
  let inquiryText = "";
  let copyStatus = "";
  let state = {
    customerType: "",
    age: "",
    heightCm: null,
    heightMaxCm: null,
    athleteCount: 1,
    disciplines: [],
    level: "",
    equipment: [],
  };
  const numberOrNull = (v) => (v === "" ? null : Number(v));
  const stepValid = () =>
    step === 0
      ? Boolean(fullName.trim() && phone.trim())
      : selectionStepValid(step - 1, state);
  const radio = (name, value, checked, label) =>
    `<label class="choice"><input type="radio" name="${name}" value="${esc(value)}"${checked ? " checked" : ""}>${esc(label ?? value)}</label>`;
  const check = (name, value, checked, label) =>
    `<label class="choice"><input type="checkbox" name="${name}" value="${esc(value)}"${checked ? " checked" : ""}>${esc(label ?? value)}</label>`;

  function stepFields() {
    const group = isGroupSelection(state);
    if (step === 0)
      return `<div class="selection-contact-fields">
<p class="form-hint">Заполним контакт один раз. После опроса покажем подбор и подготовим сообщение для выбранного мессенджера.</p>
<label>ФИО<input name="fullName" autocomplete="name" required maxlength="100" value="${esc(fullName)}"></label>
<label>Телефон<input name="phone" type="tel" autocomplete="tel" required maxlength="40" value="${esc(phone)}"></label>
<fieldset class="wizard-choices messenger-choice"><legend>Где вам удобно получить ответ?</legend>${contacts.messengers.map((m) => radio("preferredMessenger", m.id, messenger === m.id, m.label)).join("")}</fieldset>
</div>`;
    if (step === 1)
      return `<fieldset class="wizard-choices"><legend class="sr-only">Кто вы?</legend>${customerTypes.map((v) => radio("customerType", v, state.customerType === v)).join("")}</fieldset>`;
    if (step === 2)
      return `<fieldset class="wizard-choices"><legend>Возраст спортсменов</legend>${ages.map((v) => radio("age", v, state.age === v)).join("")}</fieldset>
<div class="selection-height-fields">
<label>${group ? "Рост спортсменов от, см" : "Рост спортсмена, см"}<input type="number" name="heightCm" min="70" max="220" step="1" required value="${state.heightCm ?? ""}"></label>
${group ? `<label>Рост спортсменов до, см<input type="number" name="heightMaxCm" min="${state.heightCm ?? 70}" max="220" step="1" required value="${state.heightMaxCm ?? ""}"></label>` : ""}
</div>
${group ? `<label class="group-count">Количество спортсменов<input class="athlete-count" type="number" name="athleteCount" min="1" max="10000" step="1" required value="${state.athleteCount || ""}"><span class="form-hint">Количество скакалок и комплектов определим отдельно.</span></label>` : ""}`;
    if (step === 3)
      return `<fieldset class="wizard-choices"><legend>Можно выбрать несколько задач и форматов участия</legend>${disciplines.map((v) => check("disciplines", v, state.disciplines.includes(v), v === "Вольные" ? "Вольные упражнения" : v)).join("")}<p class="form-hint">Школьная лига и соревнования уточняют цель. Если известна дисциплина, отметьте её тоже — подбор будет точнее.</p></fieldset>`;
    if (step === 4)
      return `<fieldset class="wizard-choices"><legend class="sr-only">Уровень подготовки</legend>${levels.map((v) => radio("level", v, state.level === v, v === "Начинающие" ? "Начинающий" : v === "Продолжающие" ? "Продолжающий" : v)).join("")}</fieldset>`;
    return `<fieldset class="wizard-choices"><legend>Отметьте имеющийся инвентарь</legend>${equipmentOptions.map((v) => check("equipment", v, state.equipment.includes(v))).join("")}</fieldset>`;
  }

  function resultHtml() {
    const recommended = products.filter((p) =>
      recommendProducts(state).includes(p.slug),
    );
    const matching = recommendProducts({ ...state, equipment: ["Пока ничего"] });
    const selectedMessenger = contacts.messengers.find((m) => m.id === messenger);
    const advice = ropeLengthGuidance(state);
    const oneEach = recommended.reduce((sum, p) => sum + p.retailPrice, 0);
    const group = isGroupSelection(state);
    return `<div class="selection-result">
<p>${
      recommended.length > 0
        ? "Эти модели отвечают выбранным задачам и дополняют имеющийся инвентарь. Точный состав, количество каждой модели и ручки DDRu или LOOP обсудим вместе."
        : matching.length > 0
          ? "Под выбранные задачи у вас уже есть подходящие модели. Если нужна помощь с составом или количеством, обсудим это вместе."
          : "Для выбранного формата участия нужно уточнить дисциплину. Сотрудник поможет составить персональный комплект после вашего сообщения."
    }</p>
<dl class="selection-summary">
<div><dt>Для кого</dt><dd>${esc(state.customerType)} · ${esc(state.age)} · рост ${state.heightCm}${group ? `–${state.heightMaxCm}` : ""} см${group ? ` · ${state.athleteCount} чел.` : ""}</dd></div>
<div><dt>Задачи</dt><dd>${esc(state.disciplines.join(", "))} · ${esc(state.level)}</dd></div>
<div><dt>Уже есть</dt><dd>${esc(state.equipment.join(", "))}</dd></div>
</dl>
${advice.length ? `<div class="selection-length-advice notice"><strong>Ориентир по длине</strong>${advice.map((t) => `<p>${esc(t)}</p>`).join("")}</div>` : ""}
${state.level === "Начинающие" && state.disciplines.some((t) => t !== "Double Dutch") ? `<p class="selection-start-advice">Для первых прыжков начните с бисерной скакалки: её легче ощущать и контролировать. Если она уже есть, используйте её для базы и подберите следующую модель под выбранную задачу.</p>` : ""}
<div class="recommendation-list">${recommended
      .map(
        (p) =>
          `<article class="recommendation"><a href="/catalog/${p.slug}/" aria-label="Подробнее: ${esc(p.name)}">${mediaHtml(p.mainImage, p.name)}</a><div><h3><a href="/catalog/${p.slug}/">${esc(p.name)}</a></h3><p>${esc(recommendationReasons[p.slug])}</p><p class="price">${formatPrice(p.retailPrice)}${p.unitLabel === "комплект" ? "<small> / комплект</small>" : ""}</p><p class="form-hint">Опт от ${p.wholesaleMinQuantity}: ${formatPrice(p.wholesalePrice)} / ${esc(p.unitLabel)}</p></div></article>`,
      )
      .join("")}</div>
${recommended.length > 0 ? `<div class="selection-estimate"><strong>Ориентир: ${formatPrice(oneEach)}</strong><p>По одной единице каждой рекомендованной модели по розничной цене. Это пример расчёта, не итог заказа. Опт действует от 30 единиц; количество спортсменов не определяет количество скакалок автоматически.</p></div>` : ""}
${
  prepared
    ? `<div class="selection-handoff"><h3>Обсудим точный комплект</h3><p>Ваш запрос подготовлен. Он ещё не отправлен: откройте выбранный чат, вставьте текст и нажмите «Отправить». После этого сотрудник свяжется с вами в ${esc(selectedMessenger?.label)}.</p>
<label>Текст запроса<textarea readonly rows="9">${esc(inquiryText)}</textarea></label>
<div class="button-row"><button type="button" class="button button-outline" data-copy>Скопировать запрос</button>${selectedMessenger?.href ? `<a class="button" href="${esc(selectedMessenger.href)}" target="_blank" rel="noopener noreferrer" data-open-chat>Открыть ${esc(selectedMessenger.label)} ↗</a>` : ""}</div>
<p class="form-hint" role="status" data-status>${esc(copyStatus)}</p></div>`
    : ""
}
<button type="button" class="text-link back-result" data-edit>← Изменить ответы</button>
</div>`;
  }

  let firstRender = true;
  function render(focusSelector) {
    const aside = `<aside class="selection-aside"><p class="eyebrow">От задачи к инвентарю</p><ol>${steps
      .map(
        (title, i) =>
          `<li class="${i === step ? "current" : i < step ? "complete" : ""}"${i === step ? ' aria-current="step"' : ""}><span>${i < step ? "✓" : String(i + 1).padStart(2, "0")}</span>${title}</li>`,
      )
      .join("")}</ol><p>Ответы помогут начать подбор. Состав и количество согласуем лично.</p></aside>`;
    const panel = `<div class="wizard-panel">
<div class="wizard-progress" aria-hidden="true"><span style="width:${((step + 1) / steps.length) * 100}%"></span></div>
<p class="eyebrow" aria-live="polite">${step + 1} / ${steps.length}</p>
<h2 tabindex="-1" data-heading>${steps[step]}</h2>
${
  step < 6
    ? `<form>${stepFields()}<div class="wizard-actions">${step > 0 ? '<button type="button" class="text-link" data-back>← Назад</button>' : ""}<button class="button" type="submit" data-next${stepValid() ? "" : " disabled"}>${step === 5 ? "Посмотреть результат" : "Продолжить"} →</button></div></form>`
    : resultHtml()
}
</div>`;
    root.className = "selection-layout conversion-wizard";
    root.innerHTML = aside + panel;
    if (focusSelector) {
      const el = $(focusSelector, root);
      if (el) el.focus();
    } else if (!firstRender) {
      $("[data-heading]", root).focus();
    }
    firstRender = false;
  }
  const refreshNext = () => {
    const next = $("[data-next]", root);
    if (next) next.disabled = !stepValid();
  };

  root.oninput = (e) => {
    const { name, value } = e.target;
    if (name === "fullName") fullName = value;
    else if (name === "phone") phone = value;
    else if (name === "heightCm") state.heightCm = numberOrNull(value);
    else if (name === "heightMaxCm") state.heightMaxCm = numberOrNull(value);
    else if (name === "athleteCount") state.athleteCount = Number(value);
    else return;
    refreshNext();
  };
  root.onchange = (e) => {
    const { name, value, checked } = e.target;
    if (name === "preferredMessenger") messenger = value;
    else if (name === "customerType") state.customerType = value;
    else if (name === "age") state.age = value;
    else if (name === "level") state.level = value;
    else if (name === "disciplines")
      state.disciplines = checked
        ? [...state.disciplines, value]
        : state.disciplines.filter((d) => d !== value);
    else if (name === "equipment") {
      state.equipment = toggleEquipment(state.equipment, value);
      render(`[name=equipment][value="${CSS.escape(value)}"]`);
      return;
    } else return;
    refreshNext();
  };
  root.onsubmit = (e) => {
    e.preventDefault();
    if (!stepValid()) return;
    if (step === 5) {
      prepared = buildInquiryData(
        {
          name: fullName,
          phoneOrContact: phone,
          preferredMessenger: messenger,
          city: "",
          customerType: state.customerType,
          product: "",
          variant: "",
          quantity: null,
          comment: "",
        },
        {
          inquiryType: "selection",
          selection: state,
          recommendedProductIds: recommendProducts(state),
        },
        products,
        window.location.href,
      );
      inquiryText = buildInquirySummary(prepared, products);
    }
    step += 1;
    track("wizard_step", { шаг: step });
    if (step === 6)
      track("wizard_result", {
        задачи: state.disciplines.join(", "),
        рекомендации: recommendProducts(state).join(", "),
      });
    render();
  };
  root.onclick = (e) => {
    if (e.target.closest("[data-back]")) {
      step -= 1;
      render();
    } else if (e.target.closest("[data-edit]")) {
      prepared = null;
      copyStatus = "";
      step = 5;
      render();
    } else if (e.target.closest("[data-copy]") || e.target.closest("[data-open-chat]")) {
      copyText(
        inquiryText,
        $("[data-status]", root),
        "Текст запроса скопирован. Вставьте его в чат и отправьте.",
        "Скопируйте текст запроса из поля ниже и отправьте его в чат.",
      );
    }
  };
  render();
}

/* ---------- запуск ---------- */
updateCartBadge();
mountProduct();
mountCart();
mountWizard();
$$("[data-leadform]").forEach((el) => mountLeadForm(el, {}));
