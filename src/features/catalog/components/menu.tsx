'use client';

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { Icon } from './icons';
import { money, normalize } from '@/shared/lib/format';
import { orderSchema } from '@/features/orders/validation';
import type { Catalog, Product } from '@/features/catalog/types';
import type { OrderReceipt } from '@/features/orders/types';

type Basket = Record<string, number>;
const storageKey = 'guto-bebidas:cart:v1';
const attemptKey = 'guto-bebidas:checkout:v1';
const whatsapp = 'https://wa.me/5531995040101';

function categoryInk(color: string) {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5]
      .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
      .map((channel) =>
        channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
      );
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const background = luminance(color);
  return (background + 0.05) / (luminance('#0c0b07') + 0.05) >= 1.05 / (background + 0.05)
    ? '#0c0b07'
    : '#ffffff';
}

function Quantity({
  product,
  value,
  change,
  disabled,
}: {
  product: Product;
  value: number;
  change: (id: number, value: number, relative?: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`quantity ${value ? 'has-value' : ''}`}>
      {value > 0 && (
        <>
          <button
            type="button"
            aria-label={`Diminuir ${product.name}`}
            onClick={() => change(product.id, -1, true)}
            disabled={disabled}
          >
            <Icon name="minus" />
          </button>
          <output aria-label={`Quantidade de ${product.name}`}>{value}</output>
        </>
      )}
      <button
        type="button"
        aria-label={`Adicionar ${product.name}`}
        onClick={() => change(product.id, 1, true)}
        disabled={disabled || value >= 99}
      >
        <Icon name="plus" />
      </button>
    </div>
  );
}

export function Menu({ catalog }: { catalog: Catalog }) {
  const [active, setActive] = useState(catalog.categories[0]?.id || '');
  const [query, setQuery] = useState('');
  const [basket, setBasket] = useState<Basket>({});
  const [hydrated, setHydrated] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>('delivery');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [storageNotice, setStorageNotice] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const menuHeading = useRef<HTMLDivElement>(null);
  const attemptRef = useRef<{ key: string; fingerprint: string } | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const checkoutTrigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        const clean: Basket = {};
        for (const product of catalog.products) {
          const value = (saved as Basket)[product.id];
          if (Number.isInteger(value) && value > 0 && value <= 99) clean[product.id] = value;
        }
        setBasket(clean);
      }
    } catch {
      /* A fresh cart is safe if storage is unavailable or invalid. */
    }
    setHydrated(true);
  }, [catalog.products]);

  useEffect(() => {
    if (hydrated) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(basket));
      } catch {
        setStorageNotice(true);
      }
    }
  }, [basket, hydrated]);

  useEffect(() => {
    if (checkout && !dialog.current?.open) dialog.current?.showModal();
    if (!checkout && dialog.current?.open) {
      dialog.current.close();
      (checkoutTrigger.current?.isConnected ? checkoutTrigger.current : searchInput.current)?.focus(
        { preventScroll: true },
      );
    }
    document.body.style.overflow = checkout ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [checkout]);

  useEffect(() => {
    if (receipt) {
      dialog.current?.scrollTo({ top: 0 });
      dialog.current
        ?.querySelector<HTMLAnchorElement>('.order-success .primary-button')
        ?.focus({ preventScroll: true });
    }
  }, [receipt]);

  const category = catalog.categories.find((item) => item.id === active) || catalog.categories[0];
  const selected = catalog.products.filter((product) => basket[product.id]);
  const count = selected.reduce((sum, product) => sum + basket[product.id], 0);
  const total = selected.reduce(
    (sum, product) => sum + basket[product.id] * product.price_cents,
    0,
  );
  const searching = Boolean(query.trim());
  const shown = catalog.products.filter((product) =>
    searching
      ? normalize(
          `${product.name} ${product.subcategory} ${catalog.categories.find((c) => c.id === product.category_id)?.name}`,
        ).includes(normalize(query.trim()))
      : product.category_id === active,
  );
  const groups = [
    ...new Set(shown.map((product) => (searching ? product.category_id : product.subcategory))),
  ];

  useEffect(() => {
    if (checkout && !count && !receipt)
      dialog.current?.querySelector<HTMLButtonElement>('.checkout-empty button')?.focus();
  }, [checkout, count, receipt]);

  function change(id: number, value: number, relative = false) {
    if (busy || !hydrated) return;
    setBasket((current) => {
      const next = { ...current };
      const quantity = relative ? (current[id] || 0) + value : value;
      if (quantity <= 0) delete next[id];
      else next[id] = Math.min(99, quantity);
      return next;
    });
    const product = catalog.products.find((item) => item.id === id);
    setAnnouncement(
      `${product?.name}: ${relative ? (value > 0 ? 'adicionado ao pedido' : 'quantidade reduzida') : 'removido do pedido'}.`,
    );
  }

  function pickCategory(id: string) {
    setActive(id);
    setQuery('');
    setCategoriesOpen(false);
    if (window.matchMedia('(max-width: 760px)').matches)
      menuHeading.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
        block: 'start',
      });
  }

  function openCheckout() {
    if (!count) return;
    checkoutTrigger.current = document.activeElement as HTMLElement;
    setReceipt(null);
    setError('');
    setFieldErrors({});
    setCheckout(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !count) return;
    const data = new FormData(event.currentTarget);
    const fields = {
      customer_name: String(data.get('name') || '').trim(),
      customer_phone: String(data.get('phone') || ''),
      expected_total_cents: total,
      fulfillment,
      address: fulfillment === 'delivery' ? String(data.get('address') || '').trim() : '',
      notes: String(data.get('notes') || '').trim(),
      age_confirmed: data.get('age') === 'on',
      items: selected.map((product) => ({ product_id: product.id, quantity: basket[product.id] })),
    };
    const validation = orderSchema.safeParse({
      ...fields,
      idempotency_key: '00000000-0000-4000-8000-000000000000',
    });
    if (!validation.success) {
      const messages: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const field = String(issue.path[0]);
        if (!messages[field]) messages[field] = issue.message;
      }
      setFieldErrors(messages);
      const names: Record<string, string> = {
        customer_name: 'name',
        customer_phone: 'phone',
        address: 'address',
        age_confirmed: 'age',
      };
      if (!names[Object.keys(messages)[0]])
        setError('Confira os itens e o valor do pedido antes de concluir.');
      (
        event.currentTarget.elements.namedItem(
          names[Object.keys(messages)[0]],
        ) as HTMLElement | null
      )?.focus();
      return;
    }
    setFieldErrors({});
    const fingerprint = JSON.stringify(fields);
    let key =
      attemptRef.current?.fingerprint === fingerprint
        ? attemptRef.current.key
        : crypto.randomUUID();
    try {
      const previous = JSON.parse(sessionStorage.getItem(attemptKey) || 'null');
      if (previous?.fingerprint === fingerprint && typeof previous?.key === 'string')
        key = previous.key;
      sessionStorage.setItem(attemptKey, JSON.stringify({ key, fingerprint }));
    } catch {
      /* The in-memory attempt still supports retry when storage is blocked. */
    }
    attemptRef.current = { key, fingerprint };
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, idempotency_key: key }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || 'Não foi possível concluir. Tente novamente.');
      setReceipt(result.order);
      setBasket({});
      attemptRef.current = null;
      try {
        sessionStorage.removeItem(attemptKey);
        localStorage.removeItem(storageKey);
      } catch {
        /* Optional browser storage. */
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Não foi possível conectar. Tente novamente.',
      );
    } finally {
      setBusy(false);
    }
  }

  function clearFieldError(event: FormEvent<HTMLFormElement>) {
    const names: Record<string, string> = {
      name: 'customer_name',
      phone: 'customer_phone',
      address: 'address',
      age: 'age_confirmed',
    };
    const field = names[(event.target as HTMLInputElement).name];
    if (field && fieldErrors[field])
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
  }

  function fieldMessage(field: string) {
    return fieldErrors[field] ? (
      <span id={`${field}-error`} className="field-error">
        {fieldErrors[field]}
      </span>
    ) : null;
  }

  const categoryNavigation = (
    <nav aria-label="Categorias do cardápio">
      {catalog.categories.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`category-link ${active === item.id && !searching ? 'active' : ''}`}
          style={
            {
              '--category-color': item.color,
              '--category-ink': categoryInk(item.color),
            } as CSSProperties
          }
          onClick={() => pickCategory(item.id)}
          aria-current={active === item.id && !searching ? 'true' : undefined}
        >
          <span className="category-number">{String(item.position).padStart(2, '0')}</span>
          <span className="category-name">{item.name}</span>
          <span className="category-count">
            {catalog.products.filter((p) => p.category_id === item.id).length}
            <span> itens</span>
          </span>
        </button>
      ))}
    </nav>
  );

  const basketItems = (
    <ul className="basket-items">
      {selected.map((product) => (
        <li key={product.id}>
          <div className="basket-item-title">
            <span>{product.name}</span>
            <button
              type="button"
              className="remove-item"
              aria-label={`Remover ${product.name}`}
              disabled={busy}
              onClick={() => change(product.id, 0)}
            >
              <Icon name="close" width="15" height="15" />
            </button>
          </div>
          <div className="basket-item-bottom">
            <Quantity
              product={product}
              value={basket[product.id]}
              change={change}
              disabled={busy}
            />
            <strong>{money(product.price_cents * basket[product.id])}</strong>
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <a className="skip-link" href="#produtos">
        Ir para os produtos
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="/" aria-label="Guto Bebidas 01, início">
            <img src="/images/logo-guto.png" width="48" height="46" alt="" />
            <span>
              GUTO BEBIDAS <b>01</b>
            </span>
          </a>
          <span className="header-location">
            <Icon name="pin" width="16" height="16" />
            Ouro Preto · Belo Horizonte
          </span>
          <a
            className="whatsapp-link"
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            aria-label="Fale com a gente no WhatsApp"
          >
            <Icon name="phone" />
            <span>Fale com a gente</span>
          </a>
        </div>
      </header>

      <main className="site-main">
        <section className="intro" aria-label="Guto Bebidas, delivery em Belo Horizonte">
          <img
            className="hero-logo"
            src="/images/logo-guto.png"
            width="132"
            height="127"
            alt="Guto Bebidas 01"
          />
          <div className="intro-copy">
            <h1>Cardápio</h1>
            <p className="intro-description">Guto Bebidas 01 · Delivery em Belo Horizonte</p>
            <p className="intro-address">
              <Icon name="pin" width="15" height="15" />
              Rua João Antônio Cardoso, 50 · Ouro Preto · BH
            </p>
          </div>
          <p className="intro-hint">
            Escolha seus favoritos.
            <br />
            <strong>A gente cuida do resto.</strong>
          </p>
        </section>

        <div className="menu-layout">
          <aside className="categories-panel">
            <div className="panel-label">
              Explore o cardápio<span>9 categorias</span>
            </div>
            {categoryNavigation}
            <a className="sidebar-contact" href={whatsapp} target="_blank" rel="noreferrer">
              <Icon name="phone" />
              <span>
                Pedir no WhatsApp<strong>(31) 99504-0101</strong>
              </span>
            </a>
          </aside>

          <section
            className="products-panel"
            id="produtos"
            aria-label="Produtos do cardápio"
            tabIndex={-1}
          >
            <div className="menu-tools" ref={menuHeading}>
              <label className="search-label" htmlFor="menu-search">
                Buscar produtos
              </label>
              <div className="search">
                <Icon name="search" />
                <input
                  id="menu-search"
                  ref={searchInput}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar no cardápio..."
                  aria-label="Buscar produtos em todas as categorias"
                  type="search"
                  maxLength={100}
                />
              </div>
              <button
                type="button"
                className="mobile-category-toggle"
                aria-controls="category-options"
                aria-expanded={categoriesOpen}
                onClick={() => setCategoriesOpen(!categoriesOpen)}
              >
                <span>{category?.name}</span>
                <Icon name="chevron" />
              </button>
            </div>
            {categoriesOpen && (
              <div
                className="mobile-categories"
                id="category-options"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setCategoriesOpen(false);
                    menuHeading.current
                      ?.querySelector<HTMLButtonElement>('.mobile-category-toggle')
                      ?.focus();
                  }
                }}
              >
                {categoryNavigation}
              </div>
            )}

            {!searching && category && (
              <div
                className="category-banner"
                style={{ '--category-color': category.color } as CSSProperties}
              >
                <div>
                  <h2>{category.name}</h2>
                  <span className="banner-kicker">
                    {String(category.position).padStart(2, '0')} · {shown.length} itens
                  </span>
                  <p>{category.description}</p>
                </div>
                <img src={category.image} alt="" width="122" height="160" />
              </div>
            )}
            {searching && (
              <div className="search-heading">
                <h2>Resultado da busca</h2>
                <p role="status">
                  {shown.length}{' '}
                  {shown.length === 1 ? 'produto encontrado' : 'produtos encontrados'} para “
                  {query.trim()}”
                </p>
              </div>
            )}

            <div className="product-groups">
              {groups.map((group) => (
                <section
                  className="product-group"
                  key={group}
                  aria-label={
                    searching
                      ? catalog.categories.find((c) => c.id === group)?.name
                      : group || category?.name
                  }
                >
                  {group && (
                    <h3>
                      {searching ? catalog.categories.find((c) => c.id === group)?.name : group}
                    </h3>
                  )}
                  <ul>
                    {shown
                      .filter(
                        (product) =>
                          (searching ? product.category_id : product.subcategory) === group,
                      )
                      .map((product) => (
                        <li
                          className={`product-row ${basket[product.id] ? 'is-selected' : ''}`}
                          key={product.id}
                        >
                          <span className="product-name">{product.name}</span>
                          <span className="dot-leader" />
                          <span className="product-price">
                            <span>R$</span>
                            {(product.price_cents / 100).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                          <Quantity
                            product={product}
                            value={basket[product.id] || 0}
                            change={change}
                            disabled={busy || !hydrated}
                          />
                        </li>
                      ))}
                  </ul>
                </section>
              ))}
              {shown.length === 0 && (
                <div className="no-results">
                  <Icon name="search" width="36" height="36" />
                  <h3>Nenhum produto por aqui</h3>
                  <p>Tente outro nome ou escolha uma categoria.</p>
                  <button type="button" className="text-button" onClick={() => setQuery('')}>
                    Limpar busca
                  </button>
                </div>
              )}
            </div>
            <p className="price-note">
              Preços do cardápio de 25/11/2026, sujeitos a alteração. Disponibilidade e entrega
              confirmadas no atendimento.
            </p>
          </section>

          <aside className="order-panel" aria-label="Seu pedido">
            <div className="order-title">
              <Icon name="bag" />
              <h2>Seu pedido</h2>
              <span>{count}</span>
            </div>
            {count ? (
              <>
                {basketItems}
                <div className="cart-total">
                  <span>Subtotal</span>
                  <strong>{money(total)}</strong>
                </div>
                <p className="delivery-note">Taxa de entrega confirmada no atendimento.</p>
                <button type="button" className="primary-button" onClick={openCheckout}>
                  Concluir pedido
                  <Icon name="bag" />
                </button>
                <p className="order-footnote">Revise os itens e informe seu contato.</p>
              </>
            ) : (
              <div className="empty-basket">
                <div className="empty-icon">
                  <Icon name="bag" width="34" height="34" />
                </div>
                <h3>O que vai ser hoje?</h3>
                <p>
                  Adicione os produtos ao lado
                  <br />
                  para montar seu pedido.
                </p>
              </div>
            )}
          </aside>
        </div>
        {storageNotice && (
          <p className="storage-notice" role="status">
            O navegador não permitiu guardar o carrinho. Mantenha esta página aberta até concluir.
          </p>
        )}

        <div className="store-contact">
          <Icon name="phone" />
          <span>
            Peça no WhatsApp{' '}
            <a href={whatsapp} target="_blank" rel="noreferrer">
              (31) 99504-0101
            </a>
          </span>
        </div>
      </main>

      <footer className="site-footer">
        <strong>BEBA COM MODERAÇÃO</strong>
        <span>VENDA PROIBIDA PARA MENORES DE 18 ANOS</span>
      </footer>
      <div className="sr-only" aria-live="polite" role="status">
        {announcement}
      </div>
      {count > 0 && (
        <div className="mobile-cart">
          <button type="button" onClick={openCheckout}>
            <span className="mobile-cart-count">
              <Icon name="bag" />
              {count}
            </span>
            <span>Ver pedido</span>
            <strong>{money(total)}</strong>
          </button>
        </div>
      )}

      <dialog
        ref={dialog}
        className="checkout-dialog"
        aria-labelledby="checkout-title"
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else setCheckout(false);
        }}
        onClose={() => setCheckout(false)}
      >
        <div className="dialog-header">
          <div>
            <h2 id="checkout-title">{receipt ? 'Pedido enviado!' : 'Concluir pedido'}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Fechar pedido"
            disabled={busy}
            onClick={() => setCheckout(false)}
          >
            <Icon name="close" />
          </button>
        </div>
        {receipt ? (
          <div className="order-success">
            <div className="success-icon">
              <Icon name="check" width="34" height="34" />
            </div>
            <h3>Valeu pelo seu pedido!</h3>
            <p>Guarde o número abaixo para acompanhar com a loja.</p>
            <div className="receipt">
              <span>SEU PEDIDO</span>
              <strong>{receipt.reference}</strong>
              <span>Subtotal dos produtos: {money(receipt.total_cents)}</span>
            </div>
            <p>
              Seu pedido foi encaminhado para o atendimento. A equipe vai confirmar a
              disponibilidade, a entrega e o pagamento pelo WhatsApp.
            </p>
            <a
              className="primary-button"
              href={`${whatsapp}?text=${encodeURIComponent(`Olá! Quero confirmar meu pedido ${receipt.reference} feito pelo cardápio digital.`)}`}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="phone" />
              Falar com a loja
            </a>
            <button type="button" className="text-button" onClick={() => setCheckout(false)}>
              Voltar ao cardápio
            </button>
          </div>
        ) : count > 0 ? (
          <form onSubmit={submit} onInput={clearFieldError} noValidate aria-busy={busy}>
            <div className="checkout-summary">
              <h3>
                Confira seu pedido{' '}
                <span>
                  {count} {count === 1 ? 'item' : 'itens'}
                </span>
              </h3>
              {basketItems}
              <div className="cart-total">
                <span>Subtotal dos produtos</span>
                <strong>{money(total)}</strong>
              </div>
              <p className="delivery-note">Entrega e pagamento serão combinados no atendimento.</p>
            </div>
            <fieldset disabled={busy} className="checkout-fields">
              <legend>Como falamos com você?</legend>
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="checkout-name">Seu nome</label>
                  <input
                    id="checkout-name"
                    name="name"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder="Como podemos te chamar?"
                    aria-invalid={Boolean(fieldErrors.customer_name)}
                    aria-describedby={fieldErrors.customer_name ? 'customer_name-error' : undefined}
                  />
                  {fieldMessage('customer_name')}
                </div>
                <div className="form-field">
                  <label htmlFor="checkout-phone">WhatsApp com DDD</label>
                  <input
                    id="checkout-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    required
                    maxLength={22}
                    placeholder="(31) 99999-9999"
                    aria-invalid={Boolean(fieldErrors.customer_phone)}
                    aria-describedby={
                      fieldErrors.customer_phone ? 'customer_phone-error' : undefined
                    }
                  />
                  {fieldMessage('customer_phone')}
                </div>
              </div>
              <div className="fulfillment-options">
                <label>
                  <input
                    type="radio"
                    name="fulfillment"
                    value="delivery"
                    checked={fulfillment === 'delivery'}
                    onChange={() => setFulfillment('delivery')}
                  />
                  Quero receber
                </label>
                <label>
                  <input
                    type="radio"
                    name="fulfillment"
                    value="pickup"
                    checked={fulfillment === 'pickup'}
                    onChange={() => setFulfillment('pickup')}
                  />
                  Vou retirar
                </label>
              </div>
              {fulfillment === 'delivery' ? (
                <div className="form-field">
                  <label htmlFor="checkout-address">Endereço de entrega</label>
                  <textarea
                    id="checkout-address"
                    name="address"
                    autoComplete="street-address"
                    rows={2}
                    required
                    minLength={8}
                    maxLength={400}
                    placeholder="Rua, número, bairro e complemento"
                    aria-invalid={Boolean(fieldErrors.address)}
                    aria-describedby={fieldErrors.address ? 'address-error' : undefined}
                  />
                  {fieldMessage('address')}
                </div>
              ) : (
                <p className="pickup-address">
                  <Icon name="pin" />
                  Retirada: Rua João Antônio Cardoso, 50 · Ouro Preto · BH
                </p>
              )}
              <label>
                Alguma observação? <span className="optional">(opcional)</span>
                <textarea
                  name="notes"
                  rows={2}
                  maxLength={1000}
                  placeholder="Deixe aqui o que a gente precisa saber."
                />
              </label>
              <div>
                <label className="age-confirmation">
                  <input
                    type="checkbox"
                    name="age"
                    required
                    aria-invalid={Boolean(fieldErrors.age_confirmed)}
                    aria-describedby={fieldErrors.age_confirmed ? 'age_confirmed-error' : undefined}
                  />
                  <span>Confirmo que tenho 18 anos ou mais.</span>
                </label>
                {fieldMessage('age_confirmed')}
              </div>
              <p className="privacy-note">
                Seu contato e endereço serão usados para atender este pedido.
              </p>
            </fieldset>
            {error && (
              <div className="form-error" role="alert">
                <p>{error}</p>
                <a href={whatsapp} target="_blank" rel="noreferrer">
                  Falar com a loja no WhatsApp
                </a>
              </div>
            )}
            <div className="dialog-actions">
              <button type="submit" className="primary-button" disabled={busy || !count}>
                {busy ? 'Enviando pedido...' : 'Concluir pedido'}
                {!busy && <Icon name="check" />}
              </button>
              <span>Subtotal: {money(total)}</span>
            </div>
          </form>
        ) : (
          <div className="checkout-empty">
            <Icon name="bag" width="40" height="40" />
            <h3>Seu pedido está vazio</h3>
            <p>Escolha os produtos para continuar.</p>
            <button type="button" className="primary-button" onClick={() => setCheckout(false)}>
              Continuar escolhendo
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
