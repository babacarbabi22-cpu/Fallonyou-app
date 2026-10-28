import test from "node:test";
import assert from "node:assert/strict";
import { communicationLocale, recipientLocale, requestCommunicationLocale } from "@shared/communication-locale";
import { eventReminderNotice, localizeAutomaticNotice, localizedReward, scheduledNotice } from "@shared/communication-notices";
import { renderAutomaticEmail } from "./emailTemplates";
import { createPasswordRecoveryHandlers, type RecoveryDependencies } from "./passwordRecovery";

const locales = ["en", "es", "fr", "sv"] as const;
test("English is the communications default; supported preferences and explicit request locales win", () => {
  assert.equal(communicationLocale(undefined), "en");
  assert.equal(communicationLocale("de"), "en");
  assert.equal(recipientLocale(null), "en");
  assert.equal(recipientLocale("{}"), "en");
  for (const locale of locales) {
    assert.equal(recipientLocale(JSON.stringify({ interfaceLanguage: locale, messages: false })), locale);
    assert.equal(requestCommunicationLocale(locale, '{"interfaceLanguage":"es"}'), locale);
  }
  assert.equal(requestCommunicationLocale(["en"], '{"interfaceLanguage":"fr"}'), "fr");
  assert.throws(() => recipientLocale("broken-json"), "unreadable preferences must not be silently reset");
});
for (const locale of locales) {
  test(`all user email variants render complete localized content and escaped data in ${locale}`, () => {
    for (const kind of ["passwordReset", "verification", "photoReminder", "onboardingReminder", "referral"] as const) {
      const message = renderAutomaticEmail(kind, {
        firstName: "Fictional <script>alert(0)</script>", refereeName: "Fixture <img>", newCount: 5,
        tierLabel: "1 semana Premium", link: "https://example.invalid/reset-password?token=fictional-token",
      }, locale);
      assert.ok(message.html.startsWith(`<!doctype html><html lang="${locale}">`));
      assert.ok(message.subject && message.text);
      assert.ok(!message.html.includes("<script>") && !message.html.includes("<img>"));
      assert.ok(!message.html.includes("undefined"));
      if (kind === "passwordReset" || kind === "verification") {
        assert.ok(message.text.includes(`ui_lang=${locale}`));
        assert.ok(message.text.includes("token=fictional-token"));
      }
      if (locale === "en") {
        assert.ok(!/Hola|Restablece|Tu perfil|CONECTA|semana Premium|viajero|invitados/u.test(message.subject + message.text + message.html));
      }
    }
    const ambassador = renderAutomaticEmail("referral", { isAmbassador: true, tierLabel: "Embajador Oficial", newCount: 50 }, locale);
    assert.ok(ambassador.html.includes(localizedReward("Embajador Oficial", locale)));
  });
  test(`scheduled notices and event reminders respect ${locale} without changing user content`, () => {
    for (const kind of ["weekly", "noPhoto", "noEvent", "incompleteProfile"] as const) {
      for (let index = 0; index < 4; index++) {
        const notice = scheduledNotice(kind, index, locale);
        assert.ok(notice.title && notice.body && notice.url.startsWith("/"));
        if (locale === "en") assert.ok(!/perfil|viajeros|actividades|semana|Añade/u.test(notice.title + notice.body));
      }
    }
    const reminder = eventReminderNotice("Cena española", "Fictional City", "18:00", locale);
    assert.ok(reminder.title.includes("Cena española"));
    assert.ok(reminder.body.includes("Fictional City") && reminder.body.includes("18:00"));
  });
}
test("every legacy outbound automatic template has an English rendering, preserving names and message text", () => {
  const templates = [
    { title: "✈️ Nuevo viajero en Fictional City", body: "Fixture acaba de llegar. ¡Abre FallonYou para conocerle!" },
    { title: "✈️ Nuevo viajero en Fictional City", body: "Fixture acaba de llegar a tu ciudad. ¡Conéctate con él!" },
    { title: "Fixture ✉️", body: "📸 Te envió una foto" },
    { title: "New Match! ✈️", body: "You and Fixture are a match! Start chatting now." },
    { title: "Super Like! ⭐", body: "Fixture sent you a super like!" },
    { title: '🎉 Nueva actividad en Fictional City', body: 'Fixture creó "Cena española" — ¡únete!' },
    { title: '🎉 Nuevo participante en "Cena española"', body: "Fixture se ha apuntado a tu actividad." },
    { title: '💬 Nuevo comentario en "Cena española"', body: "Fixture: Mensaje escrito por un usuario" },
    { title: "👀 Alguien vio tu perfil", body: "Una persona ha visitado tu perfil hoy. ¡Abre FallonYou para verlo!" },
    { title: "👀 Alguien vio tu perfil", body: "Una persona ha visitado tu perfil hoy. ¡Toca para ver quién fue!" },
    { title: "🤝 Fixture quiere ayudarte", body: "Ha respondido a tu petición en Fictional City" },
    { title: "🤝 Fixture quiere ayudarte", body: "Ha respondido a tu petición de ayuda en Fictional City" },
    { title: "🤝 Fixture puede ayudarte", body: "Se ha ofrecido a ayudarte sin pedir nada a cambio ❤️" },
    { title: "🤝 Fixture puede ayudarte", body: "Se ha ofrecido a ayudarte a cambio de un mínimo de 10€ 💶" },
    { title: "🎉 ¡Nuevo invitado en FallonYou!", body: "Fixture se ha unido usando tu código. Llevas 5 invitados — ¡1 semana Premium desbloqueado! 🏆" },
    { title: "⭐ ¡1 semana Premium desbloqueada!", body: "Has conseguido 5 invitados. ¡Tu semana Premium ya está activa!" },
    { title: "👑 ¡1 mes Premium desbloqueado!", body: "¡Increíble! 10 invitados. ¡Tu mes Premium ya está activo!" },
    { title: "🏆 ¡3 meses Premium desbloqueados!", body: "¡Eres una estrella! 25 invitados. ¡3 meses Premium para ti!" },
    { title: "🌟 ¡Embajador Oficial FallonYou!", body: "¡50+ invitados! Eres Embajador Oficial." },
    { title: "¡Solicitud de embajador enviada!", body: "Revisaremos tu solicitud y te contactaremos pronto." },
  ];
  for (const original of templates) {
    const translated = localizeAutomaticNotice(original, "en");
    assert.notDeepEqual(translated, original, original.title);
    assert.ok(!/Nueva actividad|Nuevo participante|Nuevo comentario|quiere ayudarte|puede ayudarte|se ha unido|semana Premium|Embajador Oficial/u.test(translated.title + translated.body));
    if (original.title.startsWith("💬")) assert.equal(translated.body, original.body);
  }
  const chat = { title: "Fixture ✉️", body: "Hola, ¿cómo estás?", url: "/matches" };
  assert.deepEqual(localizeAutomaticNotice(chat, "en"), chat, "user-written Spanish is not automatic copy");
  const unknown = { title: "Aviso escrito por el administrador", body: "Información original" };
  assert.deepEqual(localizeAutomaticNotice(unknown, "en"), unknown);
});
test("recovery email receives the selected locale, including stored preferences and English fallback, without sending", async () => {
  const cases = [
    ...locales.map(language => ({ language, preferences: '{"interfaceLanguage":"sv","messages":false}', expected: language })),
    { language: undefined, preferences: undefined, expected: "en" },
    { language: undefined, preferences: '{"interfaceLanguage":"es","messages":false}', expected: "es" },
    { language: "unsupported", preferences: '{"interfaceLanguage":"fr","messages":false}', expected: "fr" },
  ];
  for (const { language, preferences, expected } of cases) {
    let sentLocale: string | undefined;
    const deps: RecoveryDependencies = {
      deliveryReady: () => true, findUser: async () => ({ id: "fixture", email: "fixture@example.invalid", firstName: "Fixture", password: "fictional-hash", notificationPrefs: preferences }),
      issue: async () => {}, revoke: async () => {},
      deliver: async (_email, _name, _link, locale) => { sentLocale = locale; return true; },
      hashPassword: async () => "fictional-hash", consume: async () => true,
      baseUrl: () => "https://example.invalid", now: () => new Date(), token: () => "a".repeat(64), report: () => {},
    };
    const response = { setHeader() {}, status() { return this; }, json() {} };
    await createPasswordRecoveryHandlers(deps).request({ body: { email: "fixture@example.invalid", language } } as any, response as any, () => {});
    assert.equal(sentLocale, expected);
  }
});
