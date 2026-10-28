import assert from "node:assert/strict";
import React from "react";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import LanguageExchange from "../client/src/components/LanguageExchange";
import { exchangeCopy } from "../client/src/components/language-exchange-copy";

const actor = "fixture-learner", helper = "fixture-helper";
const request = (status: "pending" | "accepted" | "declined" | "cancelled", matchId: number | null = null) => ({
  id: 11, fromUserId: actor, toUserId: helper, language: "en", status, matchId,
  createdAt: "2026-10-09T12:00:00Z",
  otherUser: { id: helper, firstName: "Fictional Helper", profileImageUrl: null },
});
function render(options: {
  language?: "en" | "es" | "fr" | "sv";
  status?: "pending" | "accepted" | "declined" | "cancelled";
  matchId?: number | null;
  incoming?: boolean;
  offeredHelper?: boolean;
}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(["/api/language/exchange/preferences"], { offeredLanguages: [] });
  client.setQueryData(["/api/language/exchange/helpers", "en"], options.offeredHelper ? [{
    id: helper, firstName: "Fictional Helper", profileImageUrl: null,
    offeredLanguages: ["en"], learningLanguages: null, city: null, bio: null,
    matchId: options.matchId ?? null,
  }] : []);
  const entries = options.status ? [request(options.status, options.matchId ?? null)] : [];
  client.setQueryData(["/api/language/exchange/requests"], {
    incoming: options.incoming ? entries : [], outgoing: options.incoming ? [] : entries,
  });
  const markup = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <Router ssrPath="/languages">
        <LanguageExchange selectedLang="en" language={options.language ?? "es"} />
      </Router>
    </QueryClientProvider>,
  );
  client.clear();
  return markup;
}

test("pending language request does not render an open-chat control", () => {
  const markup = render({ status: "pending", offeredHelper: true });
  assert(markup.includes("Solicitud pendiente"));
  assert(markup.includes("Cancelar solicitud"));
  assert(!markup.includes("Abrir chat"));
});
test("recipient sees accept and decline for an incoming pending request", () => {
  const markup = render({ status: "pending", incoming: true });
  assert(markup.includes("Aceptar"));
  assert(markup.includes("Rechazar"));
  assert(!markup.includes("Abrir chat"));
});
test("accepted chat remains visible after the helper withdraws their public offer", () => {
  const markup = render({ status: "accepted", matchId: 22 });
  assert(markup.includes("Aceptada"));
  assert(markup.includes("Abrir chat"));
  assert(markup.includes("Tus conexiones por idiomas"));
});
test("ended accepted chat, declined and cancelled requests render no open-chat control", () => {
  for (const status of ["accepted", "declined", "cancelled"] as const)
    assert(!render({ status, matchId: null }).includes("Abrir chat"));
});
test("language-exchange entry and key actions are localized in all four interface languages", () => {
  for (const language of ["en", "es", "fr", "sv"] as const) {
    const markup = render({ language, status: "pending", incoming: true });
    assert(markup.includes(exchangeCopy[language].offerTitle));
    assert(markup.includes(exchangeCopy[language].accept));
    assert(markup.includes(exchangeCopy[language].decline));
    assert(markup.includes(exchangeCopy[language].save));
    assert(!markup.includes('aria-label="Loading"'));
  }
});
