'use client';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <img src="/images/logo-guto.png" alt="Guto Bebidas 01" width="130" height="125" />
      <h1>Vamos tentar de novo?</h1>
      <p>Não foi possível carregar o cardápio agora.</p>
      <button className="primary-button" onClick={reset}>
        Carregar cardápio
      </button>
      <a href="https://wa.me/5531995040101">Falar com a loja no WhatsApp</a>
    </main>
  );
}
